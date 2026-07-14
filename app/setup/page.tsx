"use client";

import { useState } from "react";
import Link from "next/link";

type Result = {
  ok: boolean;
  created?: string[];
  existing?: string[];
  pending?: string[];
  errors?: string[];
  error?: string;
};

export default function SetupPage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<Result | null>(null);

  async function run() {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch("/api/setup", { method: "POST" });
      const data = (await res.json()) as Result;
      setResult(data);
    } catch {
      setResult({ ok: false, error: "No se pudo conectar con el servidor." });
    } finally {
      setLoading(false);
    }
  }

  const needsRetry =
    result && (result.pending?.length || (!result.ok && !result.error));

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Crear la base de datos
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Esto crea automáticamente en tu base de datos Neon todo lo que la app
          necesita (tablas e índices). No tienes que crear nada a mano.
          Es seguro repetirlo: lo que ya exista se respeta.
        </p>
      </header>

      <button
        onClick={run}
        disabled={loading}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {loading ? "Creando…" : "Crear / verificar la base de datos"}
      </button>

      {loading && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Esto puede tardar unos segundos mientras se crean las tablas.
        </p>
      )}

      {result && (
        <section className="mt-6 space-y-4">
          {result.error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {result.error}
            </div>
          )}

          {result.ok && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
              ¡Listo! La base de datos quedó configurada. Sigue con{" "}
              <Link href="/connect" className="font-medium underline">
                conectar tus cuentas
              </Link>
              .
            </div>
          )}

          {needsRetry && (
            <div className="rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
              Casi listo. Algunos índices necesitan que los atributos terminen de
              procesarse. Espera unos segundos y vuelve a darle al botón para
              terminar.
            </div>
          )}

          {result.errors && result.errors.length > 0 && (
            <Block title="Errores" tone="red" items={result.errors} />
          )}
          {result.pending && result.pending.length > 0 && (
            <Block title="Pendiente (reintenta)" tone="amber" items={result.pending} />
          )}
          {result.created && result.created.length > 0 && (
            <Block title="Creado" tone="emerald" items={result.created} />
          )}
          {result.existing && result.existing.length > 0 && (
            <Block title="Ya existía" tone="slate" items={result.existing} />
          )}
        </section>
      )}

      <div className="mt-8 text-center">
        <Link href="/connect" className="text-sm text-slate-500 underline">
          Ir a conectar cuentas
        </Link>
      </div>
    </main>
  );
}

function Block({
  title,
  tone,
  items,
}: {
  title: string;
  tone: "red" | "amber" | "emerald" | "slate";
  items: string[];
}) {
  const colors: Record<string, string> = {
    red: "text-red-700",
    amber: "text-amber-800",
    emerald: "text-emerald-700",
    slate: "text-slate-500",
  };
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4">
      <h2 className={`mb-2 text-xs font-semibold uppercase tracking-wide ${colors[tone]}`}>
        {title}
      </h2>
      <ul className="space-y-0.5 font-mono text-xs leading-relaxed text-slate-600">
        {items.map((it, i) => (
          <li key={i} className="whitespace-pre">
            {it}
          </li>
        ))}
      </ul>
    </div>
  );
}
