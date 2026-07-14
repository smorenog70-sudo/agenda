import { DateTime, Interval } from "luxon";
import { getSql, COL, SELECT_ALL } from "./db";
import { getAllBusy, deleteEvent, patchEventTime } from "./google";
import { getSettings } from "./settings";

export type BookingDoc = {
  $id: string;
  meeting_type: string;
  invitee_name: string;
  invitee_email: string;
  start_time: string;
  end_time: string;
  google_event_id?: string | null;
  notes?: string | null;
  subject?: string | null;
  status?: string | null;
  cancel_token?: string | null;
  account_email?: string | null;
};

export async function findBookingByToken(
  token: string
): Promise<BookingDoc | null> {
  if (!token) return null;
  const sql = getSql();
  const rows = (await sql(
    `SELECT ${SELECT_ALL} FROM "${COL.bookings}" WHERE cancel_token = $1 LIMIT 1`,
    [token]
  )) as unknown as BookingDoc[];
  return rows[0] ?? null;
}

export async function getBookingById(id: string): Promise<BookingDoc | null> {
  try {
    const sql = getSql();
    const rows = (await sql(
      `SELECT ${SELECT_ALL} FROM "${COL.bookings}" WHERE id = $1 LIMIT 1`,
      [id]
    )) as unknown as BookingDoc[];
    return rows[0] ?? null;
  } catch {
    return null;
  }
}

export async function cancelBooking(doc: BookingDoc): Promise<void> {
  if (doc.google_event_id && doc.account_email) {
    try {
      await deleteEvent(doc.account_email, doc.google_event_id);
    } catch (e) {
      console.error("cancel: error al borrar evento de Google:", e);
      // Seguimos: marcamos la cita como cancelada de todos modos.
    }
  }
  const sql = getSql();
  await sql(
    `UPDATE "${COL.bookings}" SET status = $1 WHERE id = $2`,
    ["cancelled", doc.$id]
  );
}

export async function rescheduleBooking(
  doc: BookingDoc,
  newStartISO: string
): Promise<{ start: string; end: string }> {
  const start = DateTime.fromISO(newStartISO);
  if (!start.isValid) throw new Error("Fecha inválida.");

  const oldStart = DateTime.fromISO(doc.start_time);
  const oldEnd = DateTime.fromISO(doc.end_time);
  const durationMin = Math.round(oldEnd.diff(oldStart, "minutes").minutes) || 30;
  const end = start.plus({ minutes: durationMin });

  // Re-chequeo de conflictos, ignorando el propio evento en su horario viejo.
  const busy = await getAllBusy(start.toUTC().toISO()!, end.toUTC().toISO()!);
  const candidate = Interval.fromDateTimes(start, end);
  const conflict = busy.some((b) => {
    const bs = DateTime.fromISO(b.start);
    const be = DateTime.fromISO(b.end);
    const isSelf =
      Math.abs(bs.toMillis() - oldStart.toMillis()) < 1000 &&
      Math.abs(be.toMillis() - oldEnd.toMillis()) < 1000;
    if (isSelf) return false;
    return Interval.fromDateTimes(bs, be).overlaps(candidate);
  });
  if (conflict) {
    const err = new Error("conflict") as Error & { code?: number };
    err.code = 409;
    throw err;
  }

  const settings = await getSettings();
  if (doc.google_event_id && doc.account_email) {
    await patchEventTime({
      accountEmail: doc.account_email,
      eventId: doc.google_event_id,
      startISO: start.toUTC().toISO()!,
      endISO: end.toUTC().toISO()!,
      timezone: settings.timezone,
    });
  }

  const sql = getSql();
  await sql(
    `UPDATE "${COL.bookings}" SET start_time = $1, end_time = $2 WHERE id = $3`,
    [start.toUTC().toISO(), end.toUTC().toISO(), doc.$id]
  );
  return { start: start.toUTC().toISO()!, end: end.toUTC().toISO()! };
}

export async function listUpcomingBookings(): Promise<BookingDoc[]> {
  const sql = getSql();
  const nowISO = DateTime.now().toUTC().toISO()!;
  // start_time se guarda como ISO UTC en texto: el orden lexicográfico coincide
  // con el cronológico, así que la comparación ">" funciona igual que antes.
  const rows = (await sql(
    `SELECT ${SELECT_ALL} FROM "${COL.bookings}"
     WHERE start_time > $1
     ORDER BY start_time ASC
     LIMIT 100`,
    [nowISO]
  )) as unknown as BookingDoc[];
  return rows.filter((b) => b.status !== "cancelled");
}
