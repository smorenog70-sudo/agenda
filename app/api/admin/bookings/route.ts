import { NextRequest, NextResponse } from "next/server";
import {
  listUpcomingBookings,
  getBookingById,
  cancelBooking,
} from "@/lib/bookings";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const [bookings, settings] = await Promise.all([
      listUpcomingBookings(),
      getSettings(),
    ]);
    const nameBySlug = new Map(settings.meetingTypes.map((m) => [m.slug, m.name]));
    const items = bookings.map((b) => ({
      id: b.$id,
      typeName: nameBySlug.get(b.meeting_type) ?? b.meeting_type,
      inviteeName: b.invitee_name,
      inviteeEmail: b.invitee_email,
      subject: b.subject ?? "",
      start: b.start_time,
      end: b.end_time,
    }));
    return NextResponse.json({ bookings: items });
  } catch (e) {
    console.error("admin bookings GET error:", e);
    return NextResponse.json(
      { error: "No se pudieron leer las citas." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { id?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }
  if (!body.id) {
    return NextResponse.json({ error: "Falta id." }, { status: 400 });
  }
  const doc = await getBookingById(body.id);
  if (!doc) {
    return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });
  }
  try {
    await cancelBooking(doc);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("admin cancel error:", e);
    return NextResponse.json({ error: "No se pudo cancelar." }, { status: 500 });
  }
}
