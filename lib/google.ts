import { google } from "googleapis";
import { Query } from "node-appwrite";
import {
  getDb,
  getDatabaseId,
  COL,
  upsertByField,
  findOneByField,
} from "./appwrite";

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
  const items = list.data.items ?? [];
  for (const it of items) {
    if (!it.id) continue;
    const owned =
      it.accessRole === "owner" ||
      it.accessRole === "writer" ||
      it.primary === true;
    await upsertByField(COL.calendars, "google_id", it.id, {
      google_id: it.id,
      account_id: acc.$id,
      summary: it.summary ?? it.id,
      // Por defecto contamos como ocupado lo que esté en calendarios propios.
      check_for_conflicts: owned,
    });
  }

  return email;
}

// Construye un cliente autenticado para una cuenta, refrescando y persistiendo
// los tokens cuando hace falta.
async function clientForAccount(email: string) {
  const acc = await findOneByField(COL.accounts, "email", email);
  if (!acc) {
    throw new Error(`La cuenta ${email} no está conectada. Conéctala en /connect.`);
  }

  const client = oauthClient();
  client.setCredentials({
    access_token: acc.access_token ?? undefined,
    refresh_token: acc.refresh_token ?? undefined,
    expiry_date: acc.expiry_date ?? undefined,
  });

  // Cuando googleapis refresca el access_token, lo guardamos de vuelta.
  const db = getDb();
  const dbId = getDatabaseId();
  client.on("tokens", (t) => {
    const upd: Record<string, unknown> = {};
    if (t.access_token) upd.access_token = t.access_token;
    if (t.expiry_date) upd.expiry_date = t.expiry_date;
    if (t.refresh_token) upd.refresh_token = t.refresh_token;
    if (Object.keys(upd).length > 0) {
      void db.updateDocument(dbId, COL.accounts, acc.$id, upd);
    }
  });

  return { client, account: acc };
}

// Free/busy combinado de TODAS las cuentas conectadas y sus calendarios marcados.
export async function getAllBusy(
  timeMin: string,
  timeMax: string
): Promise<BusyInterval[]> {
  const db = getDb();
  const dbId = getDatabaseId();
  const accountsRes = await db.listDocuments(dbId, COL.accounts, [
    Query.limit(100),
  ]);
  const accounts = accountsRes.documents;
  if (accounts.length === 0) return [];

  const all: BusyInterval[] = [];

  for (const a of accounts) {
    // Traemos los calendarios de la cuenta (account_id tiene índice) y
    // filtramos en JS los marcados para conflictos.
    const calsRes = await db.listDocuments(dbId, COL.calendars, [
      Query.equal("account_id", [a.$id]),
      Query.limit(200),
    ]);
    const cals = calsRes.documents.filter((c) => c.check_for_conflicts);
    if (cals.length === 0) continue;

    try {
      const { client } = await clientForAccount(a.email);
      const cal = google.calendar({ version: "v3", auth: client });
      const fb = await cal.freebusy.query({
        requestBody: {
          timeMin,
          timeMax,
          items: cals.map((c) => ({ id: c.google_id as string })),
        },
      });
      const calendarsObj = fb.data.calendars ?? {};
      for (const key of Object.keys(calendarsObj)) {
        const busy = calendarsObj[key].busy ?? [];
        for (const b of busy) {
          if (b.start && b.end) all.push({ start: b.start, end: b.end });
        }
      }
    } catch (e) {
      // Si una cuenta falla (token revocado, etc.) seguimos con las demás,
      // pero lo dejamos en el log para que lo notes.
      console.error(`Error de free/busy para ${a.email}:`, e);
    }
  }

  return all;
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
