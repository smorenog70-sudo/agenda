"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type WorkingDay = { start: string; end: string } | null;

type MeetingType = {
  slug: string;
  name: string;
  description: string;
  durationMinutes: number;
  durationOptions?: number[];
  accountEmail: string;
  color: string;
  image?: string;
  location: "meet" | "phone" | "custom";
  locationDetail?: string;
  bufferBeforeMinutes?: number;
  bufferAfterMinutes?: number;
  enabled?: boolean;
  listed?: boolean;
};

type Settings = {
  ownerName: string;
  timezone: string;
  slotGranularityMinutes: number;
  minNoticeMinutes: number;
  bookingWindowDays: number;
  workingHours: WorkingDay[];
  meetingTypes: MeetingType[];
};

const TZ_OPTIONS = [
  "America/Mexico_City",
  "America/Bogota",
  "America/New_York",
  "America/Los_Angeles",
  "America/Chicago",
  "Europe/Madrid",
  "UTC",
];

const DURATION_CHIPS = [15, 30, 45, 60, 90];

// Índice 0 = Domingo. Mostramos de Lunes a Domingo.
const DAY_NAMES = ["Domingo", "Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado"];
const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0];

export default function AdminPage() {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [origin, setOrigin] = useState("");
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState<{ ok: boolean; msg: string } | null>(null);

  useEffect(() => {
    setOrigin(window.location.origin);
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch("/api/admin");
        const data = await res.json();
        if (!res.ok) throw new Error(data?.error || "No se pudo cargar.");
        setSettings(data.settings as Settings);
      } catch (e) {
        setLoadError(e instanceof Error ? e.message : "Error al cargar.");
      }
    })();
  }, []);

  function patch(p: Partial<Settings>) {
    setSettings((s) => (s ? { ...s, ...p } : s));
  }

  function patchMT(index: number, p: Partial<MeetingType>) {
    setSettings((s) =>
      s
        ? {
            ...s,
            meetingTypes: s.meetingTypes.map((m, i) =>
              i === index ? { ...m, ...p } : m
            ),
          }
        : s
    );
  }

  function setDay(realIndex: number, day: WorkingDay) {
    setSettings((s) =>
      s
        ? {
            ...s,
            workingHours: s.workingHours.map((d, i) =>
              i === realIndex ? day : d
            ),
          }
        : s
    );
  }

  function toggleDuration(index: number, value: number) {
    setSettings((s) => {
      if (!s) return s;
      return {
        ...s,
        meetingTypes: s.meetingTypes.map((m, i) => {
          if (i !== index) return m;
          const cur = new Set(m.durationOptions ?? [m.durationMinutes]);
          if (cur.has(value)) {
            if (cur.size > 1) cur.delete(value);
          } else {
            cur.add(value);
          }
          const opts = Array.from(cur).sort((a, b) => a - b);
          const durationMinutes = opts.includes(m.durationMinutes)
            ? m.durationMinutes
            : opts[0];
          return { ...m, durationOptions: opts, durationMinutes };
        }),
      };
    });
  }

  function addMeetingType() {
    setSettings((s) => {
      if (!s) return s;
      const n = s.meetingTypes.length + 1;
      const nuevo: MeetingType = {
        slug: `motivo-${n}`,
        name: "Nuevo motivo",
        description: "",
        durationMinutes: 30,
        durationOptions: [30],
        accountEmail: "",
        color: "#0EA5E9",
        location: "meet",
        enabled: true,
        listed: true,
      };
      return { ...s, meetingTypes: [...s.meetingTypes, nuevo] };
    });
  }

  function removeMeetingType(index: number) {
    setSettings((s) =>
      s
        ? { ...s, meetingTypes: s.meetingTypes.filter((_, i) => i !== index) }
        : s
    );
  }

  async function save() {
    if (!settings) return;
    setSaving(true);
    setStatus(null);
    try {
      const res = await fetch("/api/admin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const data = await res.json();
      if (!res.ok) {
        setStatus({ ok: false, msg: data?.error || "No se pudo guardar." });
      } else {
        setSettings(data.settings as Settings);
        setStatus({ ok: true, msg: "Cambios guardados." });
      }
    } catch {
      setStatus({ ok: false, msg: "Problema de conexión." });
    } finally {
      setSaving(false);
    }
  }

  if (loadError) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-12">
        <div className="rounded-xl border border-red-100 bg-red-50 p-4 text-sm text-red-700">
          {loadError}
        </div>
      </main>
    );
  }

  if (!settings) {
    return (
      <main className="mx-auto max-w-2xl px-5 py-12">
        <p className="py-16 text-center text-sm text-slate-400">Cargando…</p>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-2xl px-5 py-10 pb-28">
      <header className="mb-8 flex items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
            Configuración
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Cambia tu agenda sin tocar código. Guarda al terminar.
          </p>
        </div>
        <nav className="flex shrink-0 gap-3 text-sm">
          <Link href="/connect" className="text-slate-500 underline">
            Cuentas
          </Link>
          <Link href="/" className="text-slate-500 underline">
            Ver agenda
          </Link>
        </nav>
      </header>

      {/* General */}
      <Card title="General">
        <Grid>
          <Field label="Tu nombre">
            <Input
              value={settings.ownerName}
              onChange={(v) => patch({ ownerName: v })}
            />
          </Field>
          <Field label="Zona horaria">
            <Select
              value={settings.timezone}
              options={Array.from(new Set([settings.timezone, ...TZ_OPTIONS]))}
              onChange={(v) => patch({ timezone: v })}
            />
          </Field>
          <Field label="Intervalo entre horarios (min)">
            <NumberInput
              value={settings.slotGranularityMinutes}
              min={5}
              onChange={(v) => patch({ slotGranularityMinutes: v })}
            />
          </Field>
          <Field label="Anticipación mínima (min)">
            <NumberInput
              value={settings.minNoticeMinutes}
              min={0}
              onChange={(v) => patch({ minNoticeMinutes: v })}
            />
          </Field>
          <Field label="Ventana de reserva (días)">
            <NumberInput
              value={settings.bookingWindowDays}
              min={1}
              onChange={(v) => patch({ bookingWindowDays: v })}
            />
          </Field>
        </Grid>
      </Card>

      {/* Enlaces para compartir */}
      <Card title="Enlaces para compartir">
        <Field label="Página con todos los motivos">
          <CopyLink url={origin ? `${origin}/` : ""} />
        </Field>
        <p className="mt-2 text-[11px] text-slate-400">
          El link único de cada motivo está dentro de su tarjeta, más abajo.
        </p>
      </Card>

      {/* Horario laboral */}
      <Card title="Horario laboral">
        <div className="space-y-2">
          {DAY_ORDER.map((real) => {
            const day = settings.workingHours[real];
            const on = day !== null;
            return (
              <div
                key={real}
                className="flex flex-wrap items-center gap-3 rounded-xl border border-slate-100 px-3 py-2"
              >
                <label className="flex w-28 items-center gap-2 text-sm text-slate-700">
                  <input
                    type="checkbox"
                    checked={on}
                    onChange={(e) =>
                      setDay(real, e.target.checked ? { start: "09:00", end: "18:00" } : null)
                    }
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  {DAY_NAMES[real]}
                </label>
                {on ? (
                  <div className="flex items-center gap-2 text-sm">
                    <input
                      type="time"
                      value={day!.start}
                      onChange={(e) => setDay(real, { start: e.target.value, end: day!.end })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                    <span className="text-slate-400">a</span>
                    <input
                      type="time"
                      value={day!.end}
                      onChange={(e) => setDay(real, { start: day!.start, end: e.target.value })}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-sm"
                    />
                  </div>
                ) : (
                  <span className="text-sm text-slate-400">No disponible</span>
                )}
              </div>
            );
          })}
        </div>
      </Card>

      {/* Tipos de cita */}
      <Card title="Tipos de cita">
        <div className="space-y-4">
          {settings.meetingTypes.map((m, i) => (
            <div
              key={i}
              className="rounded-2xl border border-slate-200 p-4"
              style={{ opacity: m.enabled === false ? 0.6 : 1 }}
            >
              <div className="mb-3 flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span
                    aria-hidden
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: m.color }}
                  />
                  <span className="text-sm font-medium text-slate-900">
                    {m.name || m.slug}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={m.enabled !== false}
                      onChange={(e) => patchMT(i, { enabled: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Activo
                  </label>
                  <label className="flex items-center gap-1.5 text-xs text-slate-500">
                    <input
                      type="checkbox"
                      checked={m.listed !== false}
                      onChange={(e) => patchMT(i, { listed: e.target.checked })}
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    En la lista
                  </label>
                  <button
                    onClick={() => removeMeetingType(i)}
                    className="text-xs font-medium text-red-500 hover:text-red-700"
                  >
                    Eliminar
                  </button>
                </div>
              </div>

              <Grid>
                <Field label="Nombre">
                  <Input value={m.name} onChange={(v) => patchMT(i, { name: v })} />
                </Field>
                <Field label="Identificador en la URL (slug)" hint="No lo cambies si ya compartiste el link.">
                  <Input value={m.slug} onChange={(v) => patchMT(i, { slug: v })} />
                </Field>
              </Grid>

              <div className="mt-3">
                <Field label="Descripción">
                  <Input
                    value={m.description}
                    onChange={(v) => patchMT(i, { description: v })}
                  />
                </Field>
              </div>

              <Grid>
                <Field label="Color">
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={m.color}
                      onChange={(e) => patchMT(i, { color: e.target.value })}
                      className="h-9 w-12 cursor-pointer rounded border border-slate-200"
                    />
                    <Input value={m.color} onChange={(v) => patchMT(i, { color: v })} />
                  </div>
                </Field>
                <Field
                  label="Correo organizador"
                  hint="Debe coincidir con una cuenta conectada en /connect."
                >
                  <Input
                    value={m.accountEmail}
                    onChange={(v) => patchMT(i, { accountEmail: v })}
                  />
                </Field>
              </Grid>

              <div className="mt-3">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Duraciones que puede elegir el invitado (min)
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {DURATION_CHIPS.map((d) => {
                    const sel = (m.durationOptions ?? [m.durationMinutes]).includes(d);
                    return (
                      <button
                        key={d}
                        onClick={() => toggleDuration(i, d)}
                        className="rounded-lg border px-3 py-1.5 text-sm transition"
                        style={
                          sel
                            ? { backgroundColor: m.color, borderColor: m.color, color: "white" }
                            : { borderColor: "#e2e8f0", color: "#475569" }
                        }
                      >
                        {d}
                      </button>
                    );
                  })}
                </div>
              </div>

              <Grid>
                <Field label="Duración por defecto">
                  <Select
                    value={String(m.durationMinutes)}
                    options={(m.durationOptions ?? [m.durationMinutes]).map(String)}
                    onChange={(v) => patchMT(i, { durationMinutes: Number(v) })}
                  />
                </Field>
                <Field label="Lugar">
                  <Select
                    value={m.location}
                    options={["meet", "phone", "custom"]}
                    labels={{ meet: "Google Meet", phone: "Llamada", custom: "Personalizado" }}
                    onChange={(v) =>
                      patchMT(i, { location: v as MeetingType["location"] })
                    }
                  />
                </Field>
              </Grid>

              {m.location !== "meet" && (
                <div className="mt-3">
                  <Field
                    label="Detalle del lugar"
                    hint={m.location === "phone" ? "Número de teléfono." : "Dirección o link."}
                  >
                    <Input
                      value={m.locationDetail ?? ""}
                      onChange={(v) => patchMT(i, { locationDetail: v })}
                    />
                  </Field>
                </div>
              )}

              <div className="mt-3">
                <Field
                  label="Imagen / logo"
                  hint="Ruta en /public (ej. /logos/heru.png) o un link http."
                >
                  <Input
                    value={m.image ?? ""}
                    onChange={(v) => patchMT(i, { image: v })}
                  />
                </Field>
              </div>

              <div className="mt-4 border-t border-slate-100 pt-3">
                <span className="mb-1.5 block text-xs font-medium text-slate-600">
                  Link único de este motivo
                </span>
                <CopyLink url={origin ? `${origin}/book/${m.slug}` : ""} />
                <span className="mt-1 block text-[11px] text-slate-400">
                  {m.enabled === false
                    ? "Está desactivado: el link no funciona hasta que lo actives."
                    : m.listed === false
                    ? "Oculto de la página principal, pero este link directo sí funciona."
                    : "Aparece en la página principal y funciona por link directo."}
                </span>
              </div>
            </div>
          ))}

          <button
            onClick={addMeetingType}
            className="w-full rounded-xl border border-dashed border-slate-300 py-3 text-sm font-medium text-slate-500 transition hover:border-slate-400 hover:text-slate-700"
          >
            + Agregar tipo de cita
          </button>
        </div>
      </Card>

      {/* Barra de guardar */}
      <div className="sticky bottom-0 -mx-5 mt-8 border-t border-slate-200 bg-white/90 px-5 py-3 backdrop-blur">
        <div className="mx-auto flex max-w-2xl items-center justify-between gap-3">
          {status ? (
            <span
              className={`text-sm ${status.ok ? "text-emerald-600" : "text-red-600"}`}
            >
              {status.msg}
            </span>
          ) : (
            <span className="text-xs text-slate-400">
              Los cambios aplican apenas guardas.
            </span>
          )}
          <button
            onClick={save}
            disabled={saving}
            className="rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
          >
            {saving ? "Guardando…" : "Guardar cambios"}
          </button>
        </div>
      </div>
    </main>
  );
}

function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-lg bg-slate-50 px-2 py-1.5 text-xs text-slate-600">
        {url || "…"}
      </code>
      <button
        onClick={async () => {
          if (!url) return;
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
          } catch {
            /* ignore */
          }
        }}
        className="shrink-0 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-medium text-slate-600 transition hover:border-slate-300"
      >
        {copied ? "Copiado" : "Copiar"}
      </button>
    </div>
  );
}

function Card({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5">
      <h2 className="mb-4 text-sm font-semibold text-slate-900">{title}</h2>
      {children}
    </section>
  );
}

function Grid({ children }: { children: React.ReactNode }) {
  return <div className="grid gap-3 sm:grid-cols-2">{children}</div>;
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-xs font-medium text-slate-600">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-[11px] text-slate-400">{hint}</span>}
    </label>
  );
}

function Input({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    />
  );
}

function NumberInput({
  value,
  min,
  onChange,
}: {
  value: number;
  min?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={String(value)}
      min={min}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    />
  );
}

function Select({
  value,
  options,
  labels,
  onChange,
}: {
  value: string;
  options: string[];
  labels?: Record<string, string>;
  onChange: (v: string) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
    >
      {options.map((o) => (
        <option key={o} value={o}>
          {labels?.[o] ?? o.replace(/_/g, " ")}
        </option>
      ))}
    </select>
  );
}
