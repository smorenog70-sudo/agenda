"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

type Counts = Record<string, number | null>;

type StateResult = {
  ok: boolean;
  source?: Counts;
  destination?: Counts;
  error?: string;
};

type TableReport = {
  table: string;
  source: number;
  copied: number;
  skipped: number;
  error?: string;
};

type MigrateResult = {
  ok: boolean;
  report?: TableReport[];
  destination?: Counts;
  error?: string;
  errors?: string[];
};

export default function MigratePage() {
  const [state, setState] = useState<StateResult | null>(null);
  const [loadingState, setLoadingState] = useState(true);
  const [running, setRunning] = useState(false);
  const [result, setResult] = useState<MigrateResult | null>(null);

  const loadState = useCallback(async () => {
    setLoadingState(true);
    try {
      const res = await fetch("/api/admin/migrate");
      setState((await res.json()) as StateResult);
    } catch {
      setState({ ok: false, error: "No se pudo conectar con el servidor." });
    } finally {
      setLoadingState(false);
    }
  }, []);

  useEffect(() => {
    void loadState();
  }, [loadState]);

  async function run() {
    setRunning(true);
    setResult(null);
    try {
      const res = await fetch("/api/admin/migrate", { method: "POST" });
      setResult((await res.json()) as MigrateResult);
    } catch {
      setResult({ ok: false, error: "No se pudo conectar con el servidor." });
    } finally {
      setRunning(false);
      void loadState();
    }
  }

  const tables = Object.keys(state?.source ?? state?.destination ?? {});

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Migrar a otra base de Neon
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Copia todos los datos de la base <strong>vieja</strong>{" "}
          (<code>OLD_DATABASE_URL</code>) a la base <strong>nueva</strong>{" "}
          (<code>DATABASE_URL</code>, la que ya usa la app). Crea las tablas en
          la nueva si faltan y no toca la vieja. Es seguro repetir: las filas
          que ya existen en destino se saltan.
        </p>
      </header>

      {state?.error && (
        <div className="mb-6 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {state.error}
        </div>
      )}

      {state?.ok && state.source && state.destination && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-4">
          <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
            Estado actual
          </h2>
          <table className="w-full text-sm text-slate-600">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                <th className="py-1 font-medium">Tabla</th>
                <th className="py-1 font-medium">Vieja (origen)</th>
                <th className="py-1 font-medium">Nueva (destino)</th>
              </tr>
            </thead>
            <tbody>
              {tables.map((t) => (
                <tr key={t} className="border-t border-slate-100">
                  <td className="py-1.5 font-mono text-xs">{t}</td>
                  <td className="py-1.5">{fmt(state.source?.[t])}</td>
                  <td className="py-1.5">{fmt(state.destination?.[t])}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-xs text-slate-400">
            &quot;—&quot; significa que la tabla aún no existe en esa base.
          </p>
        </section>
      )}

      <button
        onClick={run}
        disabled={running || loadingState || !state?.ok}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800 disabled:opacity-60"
      >
        {running ? "Copiando…" : "Copiar datos a la base nueva"}
      </button>

      {running && (
        <p className="mt-3 text-center text-xs text-slate-400">
          Esto puede tardar unos segundos según cuántas filas haya.
        </p>
      )}

      {result && (
        <section className="mt-6 space-y-4">
          {result.error && (
            <div className="rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
              {result.error}
              {result.errors && result.errors.length > 0 && (
                <ul className="mt-2 space-y-0.5 font-mono text-xs">
                  {result.errors.map((e, i) => (
                    <li key={i}>{e}</li>
                  ))}
                </ul>
              )}
            </div>
          )}

          {result.ok && (
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
              ¡Listo! Los datos quedaron copiados en la base nueva. Verifica en{" "}
              <Link href="/connect" className="font-medium underline">
                /connect
              </Link>{" "}
              que tus cuentas sigan ahí y luego quita{" "}
              <code>OLD_DATABASE_URL</code> de Vercel.
            </div>
          )}

          {result.report && (
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h2 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                Resultado por tabla
              </h2>
              <table className="w-full text-sm text-slate-600">
                <thead>
                  <tr className="text-left text-xs uppercase tracking-wide text-slate-400">
                    <th className="py-1 font-medium">Tabla</th>
                    <th className="py-1 font-medium">Origen</th>
                    <th className="py-1 font-medium">Copiadas</th>
                    <th className="py-1 font-medium">Ya existían</th>
                  </tr>
                </thead>
                <tbody>
                  {result.report.map((r) => (
                    <tr key={r.table} className="border-t border-slate-100">
                      <td className="py-1.5 font-mono text-xs">{r.table}</td>
                      <td className="py-1.5">{r.source}</td>
                      <td className="py-1.5">{r.copied}</td>
                      <td className="py-1.5">
                        {r.error ? (
                          <span className="text-red-600">{r.error}</span>
                        ) : (
                          r.skipped
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      )}

      <div className="mt-8 text-center">
        <Link href="/setup" className="text-sm text-slate-500 underline">
          Volver a setup
        </Link>
      </div>
    </main>
  );
}

function fmt(n: number | null | undefined): string {
  return n === null || n === undefined ? "—" : String(n);
}
