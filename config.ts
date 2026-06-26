// =============================================================================
// CONFIGURACIÓN — Edita SOLO este archivo para personalizar tu agenda.
// =============================================================================

export type MeetingType = {
  slug: string; // aparece en la URL: /book/<slug>
  name: string; // título visible
  description: string; // subtítulo en la página de reserva
  durationMinutes: number; // duración por defecto de la cita
  // Si tiene varias opciones, el invitado puede elegir la duración (ej. [30, 45]).
  durationOptions?: number[];
  // Correo de la cuenta de Google que ORGANIZA la cita.
  // Determina desde qué correo sale la invitación y en qué calendario cae el evento.
  // DEBE coincidir EXACTO con uno de los correos de Google que conectas en /connect.
  accountEmail: string;
  color: string; // color de acento (hex) para el branding de cada contexto
  image?: string; // logo o foto (en /public), ej. "/logos/heru.png"
  location: "meet" | "phone" | "custom"; // tipo de ubicación de la cita
  locationDetail?: string; // para "phone" o "custom" (ej. un número o link)
  bufferBeforeMinutes?: number; // colchón antes de cada cita (opcional)
  bufferAfterMinutes?: number; // colchón después de cada cita (opcional)
  enabled?: boolean; // si es false, no se muestra ni se puede reservar
};

// Tu nombre (aparece en la página y en la descripción del evento).
export const OWNER_NAME = "Santiago";

// Zona horaria con la que se interpretan tus horarios de trabajo (IANA).
export const TIMEZONE = "America/Mexico_City";

// Paso entre horarios candidatos (en minutos). 30 = se ofrecen citas cada media hora.
export const SLOT_GRANULARITY_MINUTES = 30;

// Anticipación mínima: no se puede agendar dentro de las próximas X horas.
export const MIN_NOTICE_MINUTES = 120;

// Hasta cuántos días hacia adelante se puede agendar.
export const BOOKING_WINDOW_DAYS = 30;

// Horario laboral en TIMEZONE. Índice 0 = Domingo ... 6 = Sábado.
// null = día no disponible.
export const WORKING_HOURS: ({ start: string; end: string } | null)[] = [
  null, // Domingo
  { start: "09:00", end: "18:00" }, // Lunes
  { start: "09:00", end: "18:00" }, // Martes
  { start: "09:00", end: "18:00" }, // Miércoles
  { start: "09:00", end: "18:00" }, // Jueves
  { start: "09:00", end: "18:00" }, // Viernes
  null, // Sábado
];

// -----------------------------------------------------------------------------
// TUS TIPOS DE CITA
// Cambia los `accountEmail` por tus correos reales. El resto (nombre, color,
// duración, descripción) es libre.
// -----------------------------------------------------------------------------
export const meetingTypes: MeetingType[] = [
  {
    slug: "personal",
    name: "Personal",
    description: "Para temas personales.",
    durationMinutes: 30,
    durationOptions: [30, 45],
    accountEmail: "smorenog70@gmail.com",
    color: "#0EA5E9",
    image: "/logos/personal.png",
    location: "meet",
  },
  {
    slug: "basalto",
    name: "Basalto Capital",
    description: "Reuniones de Basalto Capital.",
    durationMinutes: 30,
    durationOptions: [30, 45],
    accountEmail: "santiago@basaltocapital.co",
    color: "#1E3A8A",
    image: "/logos/basalto.png",
    location: "meet",
  },
  {
    slug: "crezes",
    name: "Crezes",
    description: "Reuniones de Crezes.",
    durationMinutes: 30,
    durationOptions: [30, 45],
    accountEmail: "santiago@crezes.com",
    color: "#059669",
    image: "/logos/crezes.png",
    location: "meet",
  },
  {
    slug: "heru",
    name: "heru",
    description: "Reuniones de heru.",
    durationMinutes: 30,
    durationOptions: [30, 45],
    accountEmail: "santiago@heru-app.com",
    color: "#0B1F3A",
    image: "/logos/heru.png",
    location: "meet",
  },
];

export function getMeetingType(slug: string): MeetingType | undefined {
  return meetingTypes.find((m) => m.slug === slug);
}
