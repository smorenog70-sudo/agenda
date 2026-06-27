import { DateTime, Interval } from "luxon";
import { Query } from "node-appwrite";
import { getDb, getDatabaseId, COL } from "./appwrite";
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
  const db = getDb();
  const res = await db.listDocuments(getDatabaseId(), COL.bookings, [
    Query.equal("cancel_token", [token]),
    Query.limit(1),
  ]);
  return (res.documents[0] as unknown as BookingDoc) ?? null;
}

export async function getBookingById(id: string): Promise<BookingDoc | null> {
  try {
    const db = getDb();
    const doc = await db.getDocument(getDatabaseId(), COL.bookings, id);
    return doc as unknown as BookingDoc;
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
  const db = getDb();
  await db.updateDocument(getDatabaseId(), COL.bookings, doc.$id, {
    status: "cancelled",
  });
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

  const db = getDb();
  await db.updateDocument(getDatabaseId(), COL.bookings, doc.$id, {
    start_time: start.toUTC().toISO(),
    end_time: end.toUTC().toISO(),
  });
  return { start: start.toUTC().toISO()!, end: end.toUTC().toISO()! };
}

export async function listUpcomingBookings(): Promise<BookingDoc[]> {
  const db = getDb();
  const nowISO = DateTime.now().toUTC().toISO()!;
  const res = await db.listDocuments(getDatabaseId(), COL.bookings, [
    Query.greaterThan("start_time", nowISO),
    Query.orderAsc("start_time"),
    Query.limit(100),
  ]);
  return (res.documents as unknown as BookingDoc[]).filter(
    (b) => b.status !== "cancelled"
  );
}
