import { NextRequest, NextResponse } from "next/server";
import { DateTime, Interval } from "luxon";
import { getAllBusy, createEvent } from "@/lib/google";
import { createDoc, COL } from "@/lib/appwrite";
import { getSettings, findMeetingType } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: {
    slug?: string;
    startISO?: string;
    duration?: number;
    name?: string;
    email?: string;
    notes?: string;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const { slug, startISO, duration, name, email, notes } = body;
  const settings = await getSettings();
  const mt = slug ? findMeetingType(settings, slug) : undefined;
  if (!mt || mt.enabled === false) {
    return NextResponse.json({ error: "Tipo de cita no encontrado." }, { status: 404 });
  }
  if (!startISO || !name || !email) {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
  }

  // Duración elegida por el invitado (validada contra las opciones permitidas).
  const allowed = mt.durationOptions ?? [mt.durationMinutes];
  const durationMinutes =
    typeof duration === "number" && allowed.includes(duration)
      ? duration
      : mt.durationMinutes;

  const start = DateTime.fromISO(startISO);
  if (!start.isValid) {
    return NextResponse.json({ error: "Fecha inválida." }, { status: 400 });
  }
  const end = start.plus({ minutes: durationMinutes });

  try {
    // Re-checamos contra todos los calendarios para evitar doble reserva.
    const busy = await getAllBusy(start.toUTC().toISO()!, end.toUTC().toISO()!);
    const candidate = Interval.fromDateTimes(start, end);
    const conflict = busy.some((b) =>
      Interval.fromDateTimes(
        DateTime.fromISO(b.start),
        DateTime.fromISO(b.end)
      ).overlaps(candidate)
    );
    if (conflict) {
      return NextResponse.json(
        { error: "Ese horario ya no está disponible." },
        { status: 409 }
      );
    }

    const ev = await createEvent({
      accountEmail: mt.accountEmail,
      summary: `${mt.name}: ${name}`,
      description:
        `Cita agendada desde la página de ${settings.ownerName}.` +
        (notes ? `\n\nNotas del invitado:\n${notes}` : ""),
      startISO: start.toUTC().toISO()!,
      endISO: end.toUTC().toISO()!,
      timezone: settings.timezone,
      attendeeEmail: email,
      attendeeName: name,
      location: mt.location,
      locationDetail: mt.locationDetail,
    });

    await createDoc(COL.bookings, {
      meeting_type: slug,
      invitee_name: name,
      invitee_email: email,
      start_time: start.toUTC().toISO(),
      end_time: end.toUTC().toISO(),
      google_event_id: ev.id ?? null,
      notes: notes ?? null,
    });

    const meetLink =
      (ev.conferenceData?.entryPoints ?? []).find(
        (e) => e.entryPointType === "video"
      )?.uri ?? null;

    return NextResponse.json({
      ok: true,
      eventId: ev.id,
      meetLink,
      htmlLink: ev.htmlLink ?? null,
    });
  } catch (e) {
    console.error("book error:", e);
    return NextResponse.json(
      { error: "No se pudo crear la cita. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
