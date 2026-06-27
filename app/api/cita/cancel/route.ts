import { NextRequest, NextResponse } from "next/server";
import { findBookingByToken, cancelBooking } from "@/lib/bookings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { token?: string };
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
    return NextResponse.json({ ok: true, alreadyCancelled: true });
  }

  try {
    await cancelBooking(doc);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("cita cancel error:", e);
    return NextResponse.json({ error: "No se pudo cancelar." }, { status: 500 });
  }
}
