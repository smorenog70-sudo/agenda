"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MeetingType } from "@/config";

type Slot = { start: string; end: string };

type Props = {
  mt: MeetingType;
  ownerName: string;
  ownerTimezone: string;
};

function detectTimezone(fallback: string): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

function dayKey(iso: string, tz: string): string {
  // "YYYY-MM-DD" en la zona elegida (en-CA produce formato ISO).
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function dayLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    weekday: "short",
    day: "numeric",
    month: "short",
  }).format(new Date(iso));
}

function timeLabel(iso: string, tz: string): string {
  return new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(iso));
}

const TZ_OPTIONS = [
  "America/Mexico_City",
  "America/Bogota",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

export default function BookingClient({ mt, ownerName, ownerTimezone }: Props) {
  const accent = mt.color;

  const [tz, setTz] = useState<string>(ownerTimezone);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);

  const [selectedDay, setSelectedDay] = useState<string | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<Slot | null>(null);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<{
    meetLink: string | null;
    start: string;
  } | null>(null);

  useEffect(() => {
    setTz(detectTimezone(ownerTimezone));
  }, [ownerTimezone]);

  async function loadSlots() {
    setLoading(true);
    setLoadError(null);
    try {
      const from = new Date().toISOString();
      const res = await fetch(
        `/api/availability?slug=${encodeURIComponent(mt.slug)}&from=${encodeURIComponent(from)}`
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "No se pudo cargar la disponibilidad.");
      setSlots(data.slots as Slot[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSlots();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mt.slug]);

  // Agrupa los horarios por día en la zona elegida.
  const byDay = useMemo(() => {
    const map = new Map<string, Slot[]>();
    for (const s of slots) {
      const k = dayKey(s.start, tz);
      const arr = map.get(k) ?? [];
      arr.push(s);
      map.set(k, arr);
    }
    return map;
  }, [slots, tz]);

  const days = useMemo(() => Array.from(byDay.keys()).sort(), [byDay]);

  // Mantiene un día válido seleccionado cuando cambian los datos.
  useEffect(() => {
    if (days.length === 0) {
      setSelectedDay(null);
    } else if (!selectedDay || !days.includes(selectedDay)) {
      setSelectedDay(days[0]);
    }
  }, [days, selectedDay]);

  const daySlots = selectedDay ? byDay.get(selectedDay) ?? [] : [];

  async function submit() {
    if (!selectedSlot) return;
    setFormError(null);
    if (!name.trim()) return setFormError("Escribe tu nombre.");
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email))
      return setFormError("Escribe un correo válido.");

    setSubmitting(true);
    try {
      const res = await fetch("/api/book", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          slug: mt.slug,
          startISO: selectedSlot.start,
          name: name.trim(),
          email: email.trim(),
          notes: notes.trim(),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setFormError("Ese horario se acaba de ocupar. Elige otro, por favor.");
          setSelectedSlot(null);
          await loadSlots();
        } else {
          setFormError(data?.error || "No se pudo agendar.");
        }
        return;
      }
      setConfirmed({ meetLink: data.meetLink ?? null, start: selectedSlot.start });
    } catch {
      setFormError("Hubo un problema de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  function reset() {
    setConfirmed(null);
    setSelectedSlot(null);
    setName("");
    setEmail("");
    setNotes("");
    setFormError(null);
    void loadSlots();
  }

  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <Link
        href="/"
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        Todos los motivos
      </Link>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

        <div className="grid md:grid-cols-[260px_1fr]">
          {/* Panel de contexto */}
          <aside className="border-b border-slate-100 p-6 md:border-b-0 md:border-r">
            <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
              Con {ownerName}
            </p>
            <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
              {mt.name}
            </h1>
            <p className="mt-2 text-sm leading-relaxed text-slate-500">
              {mt.description}
            </p>
            <dl className="mt-5 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-slate-600">
                <Dot color={accent} />
                {mt.durationMinutes} minutos
              </div>
              <div className="flex items-center gap-2 text-slate-600">
                <Dot color={accent} />
                {mt.location === "meet"
                  ? "Google Meet"
                  : mt.location === "phone"
                  ? "Llamada"
                  : mt.locationDetail || "Por confirmar"}
              </div>
            </dl>
          </aside>

          {/* Panel de selección / formulario / confirmación */}
          <section className="p-6">
            {confirmed ? (
              <Confirmation
                accent={accent}
                start={confirmed.start}
                tz={tz}
                meetLink={confirmed.meetLink}
                email={email}
                onReset={reset}
              />
            ) : selectedSlot ? (
              <FormStep
                accent={accent}
                slot={selectedSlot}
                tz={tz}
                name={name}
                email={email}
                notes={notes}
                setName={setName}
                setEmail={setEmail}
                setNotes={setNotes}
                onBack={() => {
                  setSelectedSlot(null);
                  setFormError(null);
                }}
                onSubmit={submit}
                submitting={submitting}
                error={formError}
              />
            ) : (
              <SelectStep
                accent={accent}
                tz={tz}
                setTz={setTz}
                loading={loading}
                loadError={loadError}
                days={days}
                selectedDay={selectedDay}
                setSelectedDay={setSelectedDay}
                daySlots={daySlots}
                onPick={(s) => setSelectedSlot(s)}
                onRetry={loadSlots}
              />
            )}
          </section>
        </div>
      </div>
    </main>
  );
}

function Dot({ color }: { color: string }) {
  return (
    <span
      aria-hidden
      className="inline-block h-2 w-2 rounded-full"
      style={{ backgroundColor: color }}
    />
  );
}

function tzList(current: string): string[] {
  const set = new Set<string>([current, ...TZ_OPTIONS]);
  return Array.from(set);
}

function SelectStep(props: {
  accent: string;
  tz: string;
  setTz: (v: string) => void;
  loading: boolean;
  loadError: string | null;
  days: string[];
  selectedDay: string | null;
  setSelectedDay: (v: string) => void;
  daySlots: Slot[];
  onPick: (s: Slot) => void;
  onRetry: () => void;
}) {
  const {
    accent,
    tz,
    setTz,
    loading,
    loadError,
    days,
    selectedDay,
    setSelectedDay,
    daySlots,
    onPick,
    onRetry,
  } = props;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-slate-900">Elige un horario</h2>
        <label className="flex items-center gap-2 text-xs text-slate-500">
          <span className="hidden sm:inline">Zona horaria</span>
          <select
            value={tz}
            onChange={(e) => setTz(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-2 py-1 text-xs text-slate-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          >
            {tzList(tz).map((z) => (
              <option key={z} value={z}>
                {z.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </label>
      </div>

      {loading ? (
        <p className="py-10 text-center text-sm text-slate-400">
          Cargando disponibilidad…
        </p>
      ) : loadError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {loadError}{" "}
          <button onClick={onRetry} className="font-medium underline">
            Reintentar
          </button>
        </div>
      ) : days.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-400">
          No hay horarios disponibles por ahora.
        </p>
      ) : (
        <>
          <div className="mb-5 flex flex-wrap gap-2">
            {days.map((d) => {
              const active = d === selectedDay;
              // d viene como YYYY-MM-DD; lo convertimos a una fecha estable a mediodía UTC.
              const labelIso = `${d}T12:00:00Z`;
              return (
                <button
                  key={d}
                  onClick={() => setSelectedDay(d)}
                  className="rounded-xl border px-3 py-2 text-sm capitalize transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  style={
                    active
                      ? { backgroundColor: accent, borderColor: accent, color: "white" }
                      : { borderColor: "#e2e8f0", color: "#334155" }
                  }
                >
                  {dayLabel(labelIso, tz)}
                </button>
              );
            })}
          </div>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {daySlots.map((s) => (
              <button
                key={s.start}
                onClick={() => onPick(s)}
                className="tabular rounded-xl border border-slate-200 px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                style={{ borderColor: "#e2e8f0" }}
                onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
              >
                {timeLabel(s.start, tz)}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function FormStep(props: {
  accent: string;
  slot: Slot;
  tz: string;
  name: string;
  email: string;
  notes: string;
  setName: (v: string) => void;
  setEmail: (v: string) => void;
  setNotes: (v: string) => void;
  onBack: () => void;
  onSubmit: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const {
    accent,
    slot,
    tz,
    name,
    email,
    notes,
    setName,
    setEmail,
    setNotes,
    onBack,
    onSubmit,
    submitting,
    error,
  } = props;

  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        Cambiar horario
      </button>

      <div className="mb-5 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span className="capitalize">{dayLabel(slot.start, tz)}</span> ·{" "}
        <span className="tabular">{timeLabel(slot.start, tz)}</span>
      </div>

      <div className="space-y-3">
        <Field label="Nombre">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            placeholder="Tu nombre"
          />
        </Field>
        <Field label="Correo">
          <input
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            type="email"
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            placeholder="tu@correo.com"
          />
        </Field>
        <Field label="Notas (opcional)">
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={3}
            className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            placeholder="¿De qué quieres hablar?"
          />
        </Field>
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        onClick={onSubmit}
        disabled={submitting}
        className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition disabled:opacity-60"
        style={{ backgroundColor: accent }}
      >
        {submitting ? "Agendando…" : "Confirmar cita"}
      </button>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">
        {label}
      </span>
      {children}
    </label>
  );
}

function Confirmation(props: {
  accent: string;
  start: string;
  tz: string;
  meetLink: string | null;
  email: string;
  onReset: () => void;
}) {
  const { accent, start, tz, meetLink, email, onReset } = props;
  return (
    <div className="py-2">
      <div
        className="mb-4 flex h-11 w-11 items-center justify-center rounded-full"
        style={{ backgroundColor: accent }}
      >
        <svg viewBox="0 0 20 20" className="h-6 w-6 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m5 10.5 3.5 3.5L15 6.5" />
        </svg>
      </div>
      <h2 className="text-lg font-semibold tracking-tight text-slate-900">
        Cita agendada
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        <span className="capitalize">{dayLabel(start, tz)}</span> a las{" "}
        <span className="tabular">{timeLabel(start, tz)}</span>.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        Te llegó la invitación a <span className="font-medium">{email}</span>.
        Acéptala para que quede en tu calendario.
      </p>

      {meetLink && (
        <a
          href={meetLink}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 inline-flex items-center gap-2 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400"
        >
          Abrir Google Meet
        </a>
      )}

      <div className="mt-6">
        <button
          onClick={onReset}
          className="text-sm font-medium underline"
          style={{ color: accent }}
        >
          Agendar otra
        </button>
      </div>
    </div>
  );
}
