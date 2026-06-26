import {
  MeetingType,
  OWNER_NAME,
  TIMEZONE,
  SLOT_GRANULARITY_MINUTES,
  MIN_NOTICE_MINUTES,
  BOOKING_WINDOW_DAYS,
  WORKING_HOURS,
  meetingTypes as DEFAULT_MEETING_TYPES,
} from "@/config";
import { getDb, getDatabaseId, COL } from "./appwrite";

export type WorkingDay = { start: string; end: string } | null;

export type Settings = {
  ownerName: string;
  timezone: string;
  slotGranularityMinutes: number;
  minNoticeMinutes: number;
  bookingWindowDays: number;
  workingHours: WorkingDay[]; // longitud 7, índice 0 = Domingo
  meetingTypes: MeetingType[];
};

const SETTINGS_DOC_ID = "config";

export function defaultSettings(): Settings {
  return {
    ownerName: OWNER_NAME,
    timezone: TIMEZONE,
    slotGranularityMinutes: SLOT_GRANULARITY_MINUTES,
    minNoticeMinutes: MIN_NOTICE_MINUTES,
    bookingWindowDays: BOOKING_WINDOW_DAYS,
    workingHours: WORKING_HOURS,
    meetingTypes: DEFAULT_MEETING_TYPES,
  };
}

/* eslint-disable @typescript-eslint/no-explicit-any */

function num(v: any, fallback: number, min = -Infinity): number {
  const n = Number(v);
  return Number.isFinite(n) && n >= min ? n : fallback;
}

function normalizeMeetingType(raw: any): MeetingType | null {
  if (!raw || typeof raw !== "object") return null;
  const slug = typeof raw.slug === "string" ? raw.slug.trim() : "";
  if (!slug) return null;
  const location = ["meet", "phone", "custom"].includes(raw.location)
    ? raw.location
    : "meet";
  const durationMinutes = num(raw.durationMinutes, 30, 1);
  const durationOptions = Array.isArray(raw.durationOptions)
    ? raw.durationOptions.map((x: any) => Number(x)).filter((n: number) => n > 0)
    : undefined;
  return {
    slug,
    name: typeof raw.name === "string" ? raw.name : slug,
    description: typeof raw.description === "string" ? raw.description : "",
    durationMinutes,
    durationOptions:
      durationOptions && durationOptions.length > 0 ? durationOptions : undefined,
    accountEmail: typeof raw.accountEmail === "string" ? raw.accountEmail.trim() : "",
    color: typeof raw.color === "string" ? raw.color : "#0EA5E9",
    image: typeof raw.image === "string" && raw.image.trim() ? raw.image.trim() : undefined,
    location,
    locationDetail:
      typeof raw.locationDetail === "string" ? raw.locationDetail : undefined,
    bufferBeforeMinutes: Number.isFinite(Number(raw.bufferBeforeMinutes))
      ? Number(raw.bufferBeforeMinutes)
      : undefined,
    bufferAfterMinutes: Number.isFinite(Number(raw.bufferAfterMinutes))
      ? Number(raw.bufferAfterMinutes)
      : undefined,
    enabled: raw.enabled === false ? false : true,
  };
}

function normalizeWorkingHours(raw: any, fallback: WorkingDay[]): WorkingDay[] {
  if (!Array.isArray(raw) || raw.length !== 7) return fallback;
  return raw.map((d: any) => {
    if (
      d &&
      typeof d === "object" &&
      typeof d.start === "string" &&
      typeof d.end === "string"
    ) {
      return { start: d.start, end: d.end };
    }
    return null;
  });
}

export function normalizeSettings(raw: any): Settings {
  const def = defaultSettings();
  if (!raw || typeof raw !== "object") return def;

  const meetingTypes = Array.isArray(raw.meetingTypes)
    ? (raw.meetingTypes
        .map((m: any) => normalizeMeetingType(m))
        .filter(Boolean) as MeetingType[])
    : def.meetingTypes;

  return {
    ownerName: typeof raw.ownerName === "string" ? raw.ownerName : def.ownerName,
    timezone: typeof raw.timezone === "string" ? raw.timezone : def.timezone,
    slotGranularityMinutes: num(raw.slotGranularityMinutes, def.slotGranularityMinutes, 1),
    minNoticeMinutes: num(raw.minNoticeMinutes, def.minNoticeMinutes, 0),
    bookingWindowDays: num(raw.bookingWindowDays, def.bookingWindowDays, 1),
    workingHours: normalizeWorkingHours(raw.workingHours, def.workingHours),
    meetingTypes: meetingTypes.length > 0 ? meetingTypes : def.meetingTypes,
  };
}

// Lee la configuración guardada; si no existe o falla Appwrite, usa los defaults.
export async function getSettings(): Promise<Settings> {
  try {
    const db = getDb();
    const doc = await db.getDocument(getDatabaseId(), COL.settings, SETTINGS_DOC_ID);
    const data = (doc as any).data;
    if (typeof data === "string" && data.length > 0) {
      return normalizeSettings(JSON.parse(data));
    }
    return defaultSettings();
  } catch {
    return defaultSettings();
  }
}

// Guarda la configuración en un único documento (id fijo "config").
export async function saveSettings(settings: Settings): Promise<void> {
  const db = getDb();
  const dbId = getDatabaseId();
  const payload = JSON.stringify(settings);
  try {
    await db.updateDocument(dbId, COL.settings, SETTINGS_DOC_ID, { data: payload });
  } catch {
    await db.createDocument(dbId, COL.settings, SETTINGS_DOC_ID, { data: payload });
  }
}

export function findMeetingType(
  settings: Settings,
  slug: string
): MeetingType | undefined {
  return settings.meetingTypes.find((m) => m.slug === slug);
}

// Validaciones legibles para el panel de admin. Devuelve mensajes de error.
export function validateSettings(s: Settings): string[] {
  const errs: string[] = [];
  if (!s.ownerName.trim()) errs.push("El nombre no puede estar vacío.");
  if (!s.timezone.trim()) errs.push("La zona horaria no puede estar vacía.");

  const dayNames = [
    "Domingo",
    "Lunes",
    "Martes",
    "Miércoles",
    "Jueves",
    "Viernes",
    "Sábado",
  ];
  s.workingHours.forEach((d, i) => {
    if (d && d.start >= d.end) {
      errs.push(`${dayNames[i]}: la hora de inicio debe ser antes que la de fin.`);
    }
  });

  if (s.meetingTypes.length === 0) errs.push("Debe haber al menos un tipo de cita.");
  const slugs = new Set<string>();
  for (const m of s.meetingTypes) {
    if (!m.slug.trim()) errs.push("Un tipo de cita tiene el identificador (slug) vacío.");
    if (slugs.has(m.slug)) errs.push(`El slug "${m.slug}" está repetido.`);
    slugs.add(m.slug);
    if (!m.name.trim()) errs.push(`El tipo "${m.slug}" no tiene nombre.`);
    if (m.accountEmail && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(m.accountEmail)) {
      errs.push(`El correo de "${m.name}" no es válido.`);
    }
  }
  return errs;
}
