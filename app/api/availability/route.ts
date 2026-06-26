import { NextRequest, NextResponse } from "next/server";
import { DateTime } from "luxon";
import { getAllBusy } from "@/lib/google";
import { computeSlots } from "@/lib/availability";
import { getSettings, findMeetingType } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const slug = req.nextUrl.searchParams.get("slug") ?? "";
  const settings = await getSettings();
  const mt = findMeetingType(settings, slug);
  if (!mt || mt.enabled === false) {
    return NextResponse.json({ error: "Tipo de cita no encontrado." }, { status: 404 });
  }

  const fromParam = req.nextUrl.searchParams.get("from");
  const from = fromParam ? DateTime.fromISO(fromParam) : DateTime.now();
  const start = from.isValid ? from : DateTime.now();
  const end = start.plus({ days: settings.bookingWindowDays });

  // Duración elegida por el invitado (validada contra las opciones permitidas).
  const allowed = mt.durationOptions ?? [mt.durationMinutes];
  const durationParam = Number(req.nextUrl.searchParams.get("duration"));
  const duration = allowed.includes(durationParam)
    ? durationParam
    : mt.durationMinutes;

  try {
    const busy = await getAllBusy(start.toUTC().toISO()!, end.toUTC().toISO()!);
    const slots = computeSlots({
      fromISO: start.toUTC().toISO()!,
      toISO: end.toUTC().toISO()!,
      durationMinutes: duration,
      bufferBeforeMinutes: mt.bufferBeforeMinutes,
      bufferAfterMinutes: mt.bufferAfterMinutes,
      busy,
      timezone: settings.timezone,
      workingHours: settings.workingHours,
      slotGranularityMinutes: settings.slotGranularityMinutes,
      minNoticeMinutes: settings.minNoticeMinutes,
    });
    return NextResponse.json({ slots, durationMinutes: duration });
  } catch (e) {
    console.error("availability error:", e);
    return NextResponse.json(
      { error: "No se pudo calcular la disponibilidad." },
      { status: 500 }
    );
  }
}
