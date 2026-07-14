import { google } from "googleapis";
import {
  getSql,
  COL,
  SELECT_ALL,
  Row,
  upsertByField,
  findOneByField,
} from "./db";

// Scopes mínimos: leer calendarios (para free/busy) y crear eventos.
const SCOPES = [
  "https://www.googleapis.com/auth/calendar.readonly",
  "https://www.googleapis.com/auth/calendar.events",
  "openid",
  "email",
  "profile",
];

export type BusyInterval = { start: string; end: string };

function oauthClient() {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  const redirectUri = process.env.GOOGLE_REDIRECT_URI;
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Faltan GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET o GOOGLE_REDIRECT_URI en el entorno."
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

// URL a la que mandamos al usuario para que autorice el acceso a su Google.
export function consentUrl(state: string): string {
  const client = oauthClient();
  return client.generateAuthUrl({
    access_type: "offline", // necesario para obtener refresh_token
    prompt: "consent", // fuerza a Google a devolver siempre el refresh_token
    scope: SCOPES,
    state,
    include_granted_scopes: true,
  });
}

// Procesa el callback de OAuth: intercambia el code, detecta el correo,
// guarda los tokens y lista los calendarios de la cuenta.
export async function handleCallback(code: string): Promise<string> {
  const client = oauthClient();
  const { tokens } = await client.getToken(code);
  client.setCredentials(tokens);

  const oauth2 = google.oauth2({ version: "v2", auth: client });
  const me = await oauth2.userinfo.get();
  const email = me.data.email;
  if (!email) throw new Error("No se pudo obtener el correo de la cuenta de Google.");

  const update: Record<string, unknown> = {
    email,
    access_token: tokens.access_token ?? null,
    expiry_date: tokens.expiry_date ?? null,
    scope: tokens.scope ?? null,
    token_type: tokens.token_type ?? null,
  };
  // Solo guardamos refresh_token si Google nos mandó uno nuevo.
  if (tokens.refresh_token) update.refresh_token = tokens.refresh_token;

  const acc = await upsertByField(COL.accounts, "email", email, update);

  const cal = google.calendar({ version: "v3", auth: client });
  const list = await cal.calendarList.list({ maxResults: 250 });
  const items = (list.data.items ?? []).filter((it) => it.id);
  await Promise.all(
    items.map((it) => {
      const owned =
        it.accessRole === "owner" ||
        it.accessRole === "writer" ||
        it.primary === true;
      return upsertByField(COL.calendars, "google_id", it.id!, {
        google_id: it.id,
        account_id: acc.$id,
        summary: it.summary ?? it.id,
        // Por defecto contamos como ocupado lo que esté en calendarios propios.
        check_for_conflicts: owned,
      });
    })
  );

  return email;
}

// Construye un cliente autenticado a partir de un documento de cuenta ya cargado,
// refrescando y persistiendo los tokens cuando hace falta.
function buildClientForAccount(acc: Row) {
  const client = oauthClient();
  client.setCredentials({
    access_token: (acc.access_token as string) ?? undefined,
    refresh_token: (acc.refresh_token as string) ?? undefined,
    expiry_date: (acc.expiry_date as number) ?? undefined,
  });

  // Cuando googleapis refresca el access_token, lo guardamos de vuelta.
  const sql = getSql();
  client.on("tokens", (t) => {
    const sets: string[] = [];
    const vals: unknown[] = [];
    if (t.access_token) {
      vals.push(t.access_token);
      sets.push(`access_token = $${vals.length}`);
    }
    if (t.expiry_date) {
      vals.push(t.expiry_date);
      sets.push(`expiry_date = $${vals.length}`);
    }
    if (t.refresh_token) {
      vals.push(t.refresh_token);
      sets.push(`refresh_token = $${vals.length}`);
    }
    if (sets.length > 0) {
      vals.push(acc.$id);
      void sql(
        `UPDATE "${COL.accounts}" SET ${sets.join(", ")} WHERE id = $${vals.length}`,
        vals
      );
    }
  });

  return client;
}

// Busca la cuenta por correo y construye su cliente autenticado.
async function clientForAccount(email: string) {
  const acc = await findOneByField(COL.accounts, "email", email);
  if (!acc) {
    throw new Error(`La cuenta ${email} no está conectada. Conéctala en /connect.`);
  }
  return { client: buildClientForAccount(acc), account: acc };
}

// Free/busy combinado de TODAS las cuentas conectadas y sus calendarios marcados.
export async function getAllBusy(
  timeMin: string,
  timeMax: string
): Promise<BusyInterval[]> {
  const sql = getSql();
  const accounts = (await sql(
    `SELECT ${SELECT_ALL} FROM "${COL.accounts}" LIMIT 100`
  )) as Row[];
  if (accounts.length === 0) return [];

  // Cada cuenta es independiente: las consultamos en paralelo. Si una falla
  // (token revocado, etc.) devolvemos [] para ella y seguimos con las demás.
  const perAccount = await Promise.all(
    accounts.map(async (a): Promise<BusyInterval[]> => {
      try {
        // Traemos los calendarios de la cuenta (account_id tiene índice) y
        // filtramos en JS los marcados para conflictos.
        const calsRows = (await sql(
          `SELECT ${SELECT_ALL} FROM "${COL.calendars}" WHERE account_id = $1 LIMIT 200`,
          [a.$id]
        )) as Row[];
        const cals = calsRows.filter((c) => c.check_for_conflicts);
        if (cals.length === 0) return [];

        // Reusamos el documento de cuenta ya cargado (sin releer de la BD).
        const client = buildClientForAccount(a);
        const cal = google.calendar({ version: "v3", auth: client });
        const fb = await cal.freebusy.query({
          requestBody: {
            timeMin,
            timeMax,
            items: cals.map((c) => ({ id: c.google_id as string })),
          },
        });
        const calendarsObj = fb.data.calendars ?? {};
        const busy: BusyInterval[] = [];
        for (const key of Object.keys(calendarsObj)) {
          for (const b of calendarsObj[key].busy ?? []) {
            if (b.start && b.end) busy.push({ start: b.start, end: b.end });
          }
        }
        return busy;
      } catch (e) {
        console.error(`Error de free/busy para ${a.email}:`, e);
        return [];
      }
    })
  );

  return perAccount.flat();
}

// Crea el evento en el calendario primario de la cuenta del tipo de cita.
// Esto hace que la invitación salga de ESE correo y caiga en ESE calendario.
export async function createEvent(opts: {
  accountEmail: string;
  summary: string;
  description: string;
  startISO: string;
  endISO: string;
  timezone: string;
  attendeeEmail: string;
  attendeeName?: string;
  location: "meet" | "phone" | "custom";
  locationDetail?: string;
}) {
  const { client } = await clientForAccount(opts.accountEmail);
  const cal = google.calendar({ version: "v3", auth: client });

  const requestBody: Record<string, unknown> = {
    summary: opts.summary,
    description: opts.description,
    start: { dateTime: opts.startISO, timeZone: opts.timezone },
    end: { dateTime: opts.endISO, timeZone: opts.timezone },
    attendees: [{ email: opts.attendeeEmail, displayName: opts.attendeeName }],
  };

  let conferenceDataVersion = 0;
  if (opts.location === "meet") {
    requestBody.conferenceData = {
      createRequest: {
        requestId: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
        conferenceSolutionKey: { type: "hangoutsMeet" },
      },
    };
    conferenceDataVersion = 1;
  } else if (opts.locationDetail) {
    requestBody.location = opts.locationDetail;
  }

  const res = await cal.events.insert({
    calendarId: "primary",
    requestBody,
    conferenceDataVersion,
    sendUpdates: "all", // envía la invitación por correo al invitado
  });

  return res.data;
}

// Cancela (borra) un evento del calendario primario de la cuenta dada.
export async function deleteEvent(accountEmail: string, eventId: string) {
  const { client } = await clientForAccount(accountEmail);
  const cal = google.calendar({ version: "v3", auth: client });
  try {
    await cal.events.delete({
      calendarId: "primary",
      eventId,
      sendUpdates: "all",
    });
  } catch (e: unknown) {
    // Si ya no existe (404/410), lo damos por cancelado.
    const code = (e as { code?: number })?.code;
    if (code !== 404 && code !== 410) throw e;
  }
}

// Mueve un evento existente a un nuevo horario (conserva el link de Meet).
export async function patchEventTime(opts: {
  accountEmail: string;
  eventId: string;
  startISO: string;
  endISO: string;
  timezone: string;
}) {
  const { client } = await clientForAccount(opts.accountEmail);
  const cal = google.calendar({ version: "v3", auth: client });
  const res = await cal.events.patch({
    calendarId: "primary",
    eventId: opts.eventId,
    requestBody: {
      start: { dateTime: opts.startISO, timeZone: opts.timezone },
      end: { dateTime: opts.endISO, timeZone: opts.timezone },
    },
    sendUpdates: "all",
  });
  return res.data;
}
