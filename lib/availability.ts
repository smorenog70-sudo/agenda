import { DateTime, Interval } from "luxon";
import {
  WORKING_HOURS,
  SLOT_GRANULARITY_MINUTES,
  MIN_NOTICE_MINUTES,
  TIMEZONE,
} from "@/config";
import type { BusyInterval } from "./google";

// Une intervalos ocupados que se traslapan o se tocan, para checar conflictos rápido.
function mergeBusy(busy: BusyInterval[]): Interval[] {
  const intervals = busy
    .map((b) =>
      Interval.fromDateTimes(DateTime.fromISO(b.start), DateTime.fromISO(b.end))
    )
    .filter((i): i is Interval => i.isValid && i.start !== null && i.end !== null)
    .sort((a, b) => a.start!.toMillis() - b.start!.toMillis());

  const merged: Interval[] = [];
  for (const cur of intervals) {
    const last = merged[merged.length - 1];
    if (last && cur.start! <= last.end!) {
      merged[merged.length - 1] = Interval.fromDateTimes(
        last.start!,
        DateTime.fromMillis(Math.max(last.end!.toMillis(), cur.end!.toMillis()))
      );
    } else {
      merged.push(cur);
    }
  }
  return merged;
}

export type Slot = { start: string; end: string }; // ISO en UTC

export function computeSlots(opts: {
  fromISO: string;
  toISO: string;
  durationMinutes: number;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  busy: BusyInterval[];
  now?: DateTime;
}): Slot[] {
  const tz = TIMEZONE;
  const bufBefore = opts.bufferBeforeMinutes ?? 0;
  const bufAfter = opts.bufferAfterMinutes ?? 0;
  const now = (opts.now ?? DateTime.now()).setZone(tz);
  const earliest = now.plus({ minutes: MIN_NOTICE_MINUTES });
  const merged = mergeBusy(opts.busy);

  const rangeStart = DateTime.fromISO(opts.fromISO).setZone(tz);
  const rangeEnd = DateTime.fromISO(opts.toISO).setZone(tz);
  if (!rangeStart.isValid || !rangeEnd.isValid) return [];

  const slots: Slot[] = [];
  let day = rangeStart.startOf("day");

  while (day <= rangeEnd) {
    // Luxon: weekday 1=Lun ... 7=Dom. Nuestro arreglo: 0=Dom ... 6=Sáb.
    const idx = day.weekday % 7;
    const wh = WORKING_HOURS[idx];
    if (wh) {
      const [sh, sm] = wh.start.split(":").map(Number);
      const [eh, em] = wh.end.split(":").map(Number);
      const windowStart = day.set({
        hour: sh,
        minute: sm,
        second: 0,
        millisecond: 0,
      });
      const windowEnd = day.set({
        hour: eh,
        minute: em,
        second: 0,
        millisecond: 0,
      });

      let cursor = windowStart;
      while (cursor.plus({ minutes: opts.durationMinutes }) <= windowEnd) {
        const slotStart = cursor;
        const slotEnd = cursor.plus({ minutes: opts.durationMinutes });

        // El bloque incluye los colchones para checar conflictos.
        const blockStart = slotStart.minus({ minutes: bufBefore });
        const blockEnd = slotEnd.plus({ minutes: bufAfter });
        const candidate = Interval.fromDateTimes(blockStart, blockEnd);

        const inRange = slotStart >= rangeStart && slotEnd <= rangeEnd;
        const afterNotice = slotStart >= earliest;
        const overlaps = merged.some((m) => m.overlaps(candidate));

        if (inRange && afterNotice && !overlaps) {
          slots.push({
            start: slotStart.toUTC().toISO()!,
            end: slotEnd.toUTC().toISO()!,
          });
        }

        cursor = cursor.plus({ minutes: SLOT_GRANULARITY_MINUTES });
      }
    }
    day = day.plus({ days: 1 });
  }

  return slots;
}
