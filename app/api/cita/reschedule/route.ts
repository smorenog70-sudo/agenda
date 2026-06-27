import { NextRequest, NextResponse } from "next/server";
import { findBookingByToken, rescheduleBooking } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string; startISO?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const doc = await findBookingByToken(body.token ?? "");
  if (!doc) {
    return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });
  }
  if (doc.status === "cancelled") {
    return NextResponse.json({ error: "Esta cita está cancelada." }, { status: 400 });
  }
  if (!body.startISO) {
    return NextResponse.json({ error: "Falta el horario." }, { status: 400 });
  }

  try {
    const r = await rescheduleBooking(doc, body.startISO);
    return NextResponse.json({ ok: true, start: r.start });
  } catch (e) {
    const code = (e as { code?: number })?.code;
    if (code === 409) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible." },
        { status: 409 }
      );
    }
    console.error("cita reschedule error:", e);
    return NextResponse.json({ error: "No se pudo reagendar." }, { status: 500 });
  }
}
