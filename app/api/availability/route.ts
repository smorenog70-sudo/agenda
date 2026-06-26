import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getMeetingType, BOOKING_WINDOW_DAYS } from "@/config";
import { getAllBusy } from "@/lib/google";
import { computeSlots } from "@/lib/availability";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const mt = getMeetingType(slug);
  if (!mt) {
    return NextResponse.json({ error: "Tipo de cita no encontrado." }, { status: 404 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const from = fromParam ? DateTime.fromISO(fromParam) : DateTime.now();
  const start = from.isValid ? from : DateTime.now();
  const end = start.plus({ days: BOOKING_WINDOW_DAYS });

  try {
    const busy = await getAllBusy(start.toUTC().toISO()!, end.toUTC().toISO()!);
    const slots = computeSlots({
      fromISO: start.toUTC().toISO()!,
      toISO: end.toUTC().toISO()!,
      durationMinutes: mt.durationMinutes,
      bufferBeforeMinutes: mt.bufferBeforeMinutes,
      bufferAfterMinutes: mt.bufferAfterMinutes,
      busy,
    });
    return NextResponse.json({ slots, durationMinutes: mt.durationMinutes });
  } catch (e) {
    console.error("availability error:", e);
    return NextResponse.json(
      { error: "No se pudo calcular la disponibilidad." },
      { status: 500 }
    );
  }
}
