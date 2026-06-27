"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type { MeetingType } from "@/config";

type Slot = { start: string; end: string };

type Props = {
  mt: MeetingType;
  ownerName: string;
  ownerTimezone: string;
  reschedule?: { token: string; durationMinutes: number };
};

function detectTimezone(fallback: string): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || fallback;
  } catch {
    return fallback;
  }
}

const pad = (n: number) => String(n).padStart(2, "0");
const cap = (s: string) => (s ? s.charAt(0).toUpperCase() + s.slice(1) : s);
const monthIndex = (y: number, m: number) => y * 12 + m;

function parseKey(key: string): { y: number; m: number; d: number } {
  const [y, m, d] = key.split("-").map(Number);
  return { y, m: m - 1, d };
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
    weekday: "long",
    day: "numeric",
    month: "long",
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

function todayKeyInTz(tz: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: tz,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

const TZ_OPTIONS = [
  "America/Mexico_City",
  "America/Bogota",
  "America/New_York",
  "America/Los_Angeles",
  "Europe/Madrid",
  "UTC",
];

const WEEKDAYS = ["lun", "mar", "mié", "jue", "vie", "sáb", "dom"];

export default function BookingClient({
  mt,
  ownerName,
  ownerTimezone,
  reschedule,
}: Props) {
  const accent = mt.color;
  const isReschedule = Boolean(reschedule);
  const durationOptions = isReschedule
    ? [reschedule!.durationMinutes]
    : mt.durationOptions ?? [mt.durationMinutes];
  const showDurationPicker = !isReschedule && durationOptions.length > 1;

  const [tz, setTz] = useState<string>(ownerTimezone);
  const [duration, setDuration] = useState<number>(
    isReschedule ? reschedule!.durationMinutes : mt.durationMinutes
  );
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
    duration: number;
  } | null>(null);

  useEffect(() => {
    setTz(detectTimezone(ownerTimezone));
  }, [ownerTimezone]);

  async function loadSlots(forDuration: number) {
    setLoading(true);
    setLoadError(null);
    try {
      const from = new Date().toISOString();
      const res = await fetch(
        `/api/availability?slug=${encodeURIComponent(mt.slug)}&from=${encodeURIComponent(
          from
        )}&duration=${forDuration}`
      );
      const data = await res.json();
      if (!res.ok)
        throw new Error(data?.error || "No se pudo cargar la disponibilidad.");
      setSlots(data.slots as Slot[]);
    } catch (e) {
      setLoadError(e instanceof Error ? e.message : "Error al cargar.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadSlots(duration);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mt.slug, duration]);

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

  const availableDays = useMemo(() => Array.from(byDay.keys()).sort(), [byDay]);
  const availableSet = useMemo(() => new Set(availableDays), [availableDays]);

  const [viewMonth, setViewMonth] = useState<{ y: number; m: number } | null>(
    null
  );

  // Mantiene el mes visible dentro del rango con disponibilidad.
  useEffect(() => {
    if (availableDays.length === 0) return;
    const first = parseKey(availableDays[0]);
    const last = parseKey(availableDays[availableDays.length - 1]);
    setViewMonth((cur) => {
      if (!cur) return { y: first.y, m: first.m };
      const k = monthIndex(cur.y, cur.m);
      if (k < monthIndex(first.y, first.m)) return { y: first.y, m: first.m };
      if (k > monthIndex(last.y, last.m)) return { y: last.y, m: last.m };
      return cur;
    });
  }, [availableDays]);

  // Selecciona automáticamente el primer día disponible.
  useEffect(() => {
    if (availableDays.length === 0) {
      setSelectedDay(null);
      return;
    }
    setSelectedDay((cur) => (cur && availableSet.has(cur) ? cur : availableDays[0]));
  }, [availableDays, availableSet]);

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
          duration,
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
          await loadSlots(duration);
        } else {
          setFormError(data?.error || "No se pudo agendar.");
        }
        return;
      }
      setConfirmed({
        meetLink: data.meetLink ?? null,
        start: selectedSlot.start,
        duration,
      });
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
    void loadSlots(duration);
  }

  async function submitReschedule() {
    if (!selectedSlot || !reschedule) return;
    setFormError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/cita/reschedule", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          token: reschedule.token,
          startISO: selectedSlot.start,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setFormError("Ese horario se acaba de ocupar. Elige otro, por favor.");
          setSelectedSlot(null);
          await loadSlots(duration);
        } else {
          setFormError(data?.error || "No se pudo reagendar.");
        }
        return;
      }
      setConfirmed({ meetLink: null, start: selectedSlot.start, duration });
    } catch {
      setFormError("Hubo un problema de conexión. Intenta de nuevo.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-5 py-10">
      <Link
        href={isReschedule ? `/cita/${reschedule!.token}` : "/"}
        className="mb-6 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        {isReschedule ? "Volver a mi cita" : "Todos los motivos"}
      </Link>

      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full" style={{ backgroundColor: accent }} />

        <div className="grid md:grid-cols-[260px_1fr]">
          {/* Panel de contexto */}
          <aside className="border-b border-slate-100 p-6 md:border-b-0 md:border-r">
            {mt.image && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={mt.image}
                alt=""
                width={48}
                height={48}
                className="mb-4 h-12 w-12 rounded-xl object-cover ring-1 ring-slate-200"
              />
            )}
            {isReschedule && (
              <span className="mb-3 inline-block rounded-full bg-amber-50 px-2.5 py-1 text-xs font-medium text-amber-700">
                Reagendando
              </span>
            )}
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
                {duration} minutos
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
                mode={isReschedule ? "rescheduled" : "created"}
                accent={accent}
                start={confirmed.start}
                duration={confirmed.duration}
                tz={tz}
                meetLink={confirmed.meetLink}
                email={email}
                onReset={reset}
              />
            ) : selectedSlot ? (
              isReschedule ? (
                <RescheduleConfirm
                  accent={accent}
                  slot={selectedSlot}
                  duration={duration}
                  tz={tz}
                  onBack={() => {
                    setSelectedSlot(null);
                    setFormError(null);
                  }}
                  onConfirm={submitReschedule}
                  submitting={submitting}
                  error={formError}
                />
              ) : (
                <FormStep
                  accent={accent}
                  slot={selectedSlot}
                  duration={duration}
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
              )
            ) : (
              <SelectStep
                accent={accent}
                tz={tz}
                setTz={setTz}
                duration={duration}
                setDuration={setDuration}
                durationOptions={durationOptions}
                showDurationPicker={showDurationPicker}
                loading={loading}
                loadError={loadError}
                viewMonth={viewMonth}
                setViewMonth={setViewMonth}
                availableDays={availableDays}
                availableSet={availableSet}
                selectedDay={selectedDay}
                setSelectedDay={(d) => {
                  setSelectedDay(d);
                  setSelectedSlot(null);
                }}
                daySlots={daySlots}
                tzNow={todayKeyInTz(tz)}
                onPick={(s) => setSelectedSlot(s)}
                onRetry={() => loadSlots(duration)}
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
  duration: number;
  setDuration: (v: number) => void;
  durationOptions: number[];
  showDurationPicker: boolean;
  loading: boolean;
  loadError: string | null;
  viewMonth: { y: number; m: number } | null;
  setViewMonth: (v: { y: number; m: number }) => void;
  availableDays: string[];
  availableSet: Set<string>;
  selectedDay: string | null;
  setSelectedDay: (v: string) => void;
  daySlots: Slot[];
  tzNow: string;
  onPick: (s: Slot) => void;
  onRetry: () => void;
}) {
  const {
    accent,
    tz,
    setTz,
    duration,
    setDuration,
    durationOptions,
    showDurationPicker,
    loading,
    loadError,
    viewMonth,
    setViewMonth,
    availableDays,
    availableSet,
    selectedDay,
    setSelectedDay,
    daySlots,
    tzNow,
    onPick,
    onRetry,
  } = props;

  const bounds = useMemo(() => {
    if (availableDays.length === 0) return null;
    const first = parseKey(availableDays[0]);
    const last = parseKey(availableDays[availableDays.length - 1]);
    return {
      min: monthIndex(first.y, first.m),
      max: monthIndex(last.y, last.m),
    };
  }, [availableDays]);

  return (
    <div>
      {/* Duración + zona horaria */}
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        {showDurationPicker ? (
          <div className="inline-flex rounded-xl border border-slate-200 p-0.5">
            {durationOptions.map((opt) => {
              const active = opt === duration;
              return (
                <button
                  key={opt}
                  onClick={() => setDuration(opt)}
                  className="rounded-lg px-3 py-1.5 text-sm font-medium transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                  style={
                    active
                      ? { backgroundColor: accent, color: "white" }
                      : { color: "#475569" }
                  }
                >
                  {opt} min
                </button>
              );
            })}
          </div>
        ) : (
          <span className="text-sm font-medium text-slate-900">
            Elige un horario
          </span>
        )}

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
        <p className="py-16 text-center text-sm text-slate-400">
          Cargando disponibilidad…
        </p>
      ) : loadError ? (
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {loadError}{" "}
          <button onClick={onRetry} className="font-medium underline">
            Reintentar
          </button>
        </div>
      ) : availableDays.length === 0 || !viewMonth || !bounds ? (
        <p className="py-16 text-center text-sm text-slate-400">
          No hay horarios disponibles por ahora.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-[1fr_200px]">
          <Calendar
            accent={accent}
            viewMonth={viewMonth}
            setViewMonth={setViewMonth}
            availableSet={availableSet}
            selectedDay={selectedDay}
            setSelectedDay={setSelectedDay}
            tzNow={tzNow}
            minIndex={bounds.min}
            maxIndex={bounds.max}
          />

          <div>
            <h3 className="mb-3 text-sm font-medium capitalize text-slate-900">
              {selectedDay
                ? dayLabel(`${selectedDay}T12:00:00Z`, "UTC")
                : "Elige un día"}
            </h3>
            {selectedDay && daySlots.length > 0 ? (
              <div className="grid max-h-[19rem] grid-cols-2 gap-2 overflow-y-auto pr-1 sm:grid-cols-1">
                {daySlots.map((s) => (
                  <button
                    key={s.start}
                    onClick={() => onPick(s)}
                    className="tabular rounded-xl border px-3 py-2.5 text-sm font-medium text-slate-700 transition hover:border-slate-400 focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
                    style={{ borderColor: "#e2e8f0" }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = accent)}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = "#e2e8f0")}
                  >
                    {timeLabel(s.start, tz)}
                  </button>
                ))}
              </div>
            ) : (
              <p className="text-sm text-slate-400">
                Selecciona un día con disponibilidad.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function Calendar(props: {
  accent: string;
  viewMonth: { y: number; m: number };
  setViewMonth: (v: { y: number; m: number }) => void;
  availableSet: Set<string>;
  selectedDay: string | null;
  setSelectedDay: (v: string) => void;
  tzNow: string;
  minIndex: number;
  maxIndex: number;
}) {
  const {
    accent,
    viewMonth,
    setViewMonth,
    availableSet,
    selectedDay,
    setSelectedDay,
    tzNow,
    minIndex,
    maxIndex,
  } = props;

  const { y, m } = viewMonth;
  const idx = monthIndex(y, m);
  const prevDisabled = idx <= minIndex;
  const nextDisabled = idx >= maxIndex;

  const title = cap(
    new Intl.DateTimeFormat("es-MX", { month: "long", year: "numeric" }).format(
      new Date(y, m, 1)
    )
  );

  // Construye la cuadrícula (semanas que empiezan en lunes).
  const firstWeekday = (new Date(y, m, 1).getDay() + 6) % 7; // 0 = lunes
  const daysInMonth = new Date(y, m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < firstWeekday; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  while (cells.length % 7 !== 0) cells.push(null);

  function go(delta: number) {
    const ni = idx + delta;
    if (ni < minIndex || ni > maxIndex) return;
    setViewMonth({ y: Math.floor(ni / 12), m: ni % 12 });
  }

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-slate-900">{title}</span>
        <div className="flex gap-1">
          <NavBtn dir="prev" disabled={prevDisabled} onClick={() => go(-1)} />
          <NavBtn dir="next" disabled={nextDisabled} onClick={() => go(1)} />
        </div>
      </div>

      <div className="mb-1 grid grid-cols-7 gap-1">
        {WEEKDAYS.map((w) => (
          <div
            key={w}
            className="py-1 text-center text-[11px] font-medium uppercase tracking-wide text-slate-400"
          >
            {w}
          </div>
        ))}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {cells.map((d, i) => {
          if (d === null) return <div key={`e${i}`} />;
          const key = `${y}-${pad(m + 1)}-${pad(d)}`;
          const available = availableSet.has(key);
          const selected = key === selectedDay;
          const isToday = key === tzNow;

          return (
            <button
              key={key}
              disabled={!available}
              onClick={() => available && setSelectedDay(key)}
              className="relative flex aspect-square items-center justify-center rounded-lg text-sm transition focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
              style={
                selected
                  ? { backgroundColor: accent, color: "white", fontWeight: 600 }
                  : available
                  ? {
                      backgroundColor: `${accent}12`,
                      color: "#0f172a",
                      fontWeight: 600,
                    }
                  : { color: "#cbd5e1" }
              }
            >
              {d}
              {isToday && !selected && (
                <span
                  aria-hidden
                  className="absolute bottom-1 h-1 w-1 rounded-full"
                  style={{ backgroundColor: accent }}
                />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function NavBtn({
  dir,
  disabled,
  onClick,
}: {
  dir: "prev" | "next";
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={dir === "prev" ? "Mes anterior" : "Mes siguiente"}
      className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:border-slate-300 hover:text-slate-800 disabled:opacity-30 disabled:hover:border-slate-200 disabled:hover:text-slate-500"
    >
      <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
        {dir === "prev" ? <path d="M12.5 4.5 7 10l5.5 5.5" /> : <path d="M7.5 4.5 13 10l-5.5 5.5" />}
      </svg>
    </button>
  );
}

function FormStep(props: {
  accent: string;
  slot: Slot;
  duration: number;
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
    duration,
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
        <span className="tabular">{timeLabel(slot.start, tz)}</span> · {duration} min
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
  mode: "created" | "rescheduled";
  accent: string;
  start: string;
  duration: number;
  tz: string;
  meetLink: string | null;
  email: string;
  onReset: () => void;
}) {
  const { mode, accent, start, duration, tz, meetLink, email, onReset } = props;
  const rescheduled = mode === "rescheduled";
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
        {rescheduled ? "Cita reagendada" : "Cita agendada"}
      </h2>
      <p className="mt-1.5 text-sm text-slate-600">
        <span className="capitalize">{dayLabel(start, tz)}</span> a las{" "}
        <span className="tabular">{timeLabel(start, tz)}</span> · {duration} min.
      </p>
      <p className="mt-3 text-sm text-slate-500">
        {rescheduled
          ? "Te enviamos la invitación con el nuevo horario por correo."
          : (
            <>
              Te llegó la invitación a{" "}
              <span className="font-medium">{email}</span>. Acéptala para que
              quede en tu calendario.
            </>
          )}
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

      {!rescheduled && (
        <div className="mt-6">
          <button
            onClick={onReset}
            className="text-sm font-medium underline"
            style={{ color: accent }}
          >
            Agendar otra
          </button>
        </div>
      )}
    </div>
  );
}

function RescheduleConfirm(props: {
  accent: string;
  slot: Slot;
  duration: number;
  tz: string;
  onBack: () => void;
  onConfirm: () => void;
  submitting: boolean;
  error: string | null;
}) {
  const { accent, slot, duration, tz, onBack, onConfirm, submitting, error } = props;
  return (
    <div>
      <button
        onClick={onBack}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-slate-500 transition hover:text-slate-800"
      >
        <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
          <path d="M12.5 4.5 7 10l5.5 5.5" />
        </svg>
        Elegir otro horario
      </button>

      <h2 className="text-sm font-medium text-slate-900">Mover tu cita a:</h2>
      <div className="mt-3 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
        <span className="capitalize">{dayLabel(slot.start, tz)}</span> ·{" "}
        <span className="tabular">{timeLabel(slot.start, tz)}</span> · {duration} min
      </div>

      {error && (
        <p className="mt-3 text-sm text-red-600" role="alert">
          {error}
        </p>
      )}

      <button
        onClick={onConfirm}
        disabled={submitting}
        className="mt-5 w-full rounded-xl px-4 py-3 text-sm font-medium text-white transition disabled:opacity-60"
        style={{ backgroundColor: accent }}
      >
        {submitting ? "Moviendo…" : "Confirmar nuevo horario"}
      </button>
    </div>
  );
}
