"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Props = {
  token: string;
  typeName: string;
  ownerName: string;
  color: string;
  start: string;
  end: string;
  status: string;
};

function detectTz(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || "America/Mexico_City";
  } catch {
    return "America/Mexico_City";
  }
}

export default function ManageClient(props: Props) {
  const { token, typeName, ownerName, color, start } = props;
  const [tz, setTz] = useState("America/Mexico_City");
  const [status, setStatus] = useState(props.status);
  const [confirmCancel, setConfirmCancel] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setTz(detectTz()), []);

  const dayStr = new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    weekday: "long",
    day: "numeric",
    month: "long",
  }).format(new Date(start));
  const timeStr = new Intl.DateTimeFormat("es-MX", {
    timeZone: tz,
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  }).format(new Date(start));

  async function doCancel() {
    setCancelling(true);
    setError(null);
    try {
      const res = await fetch("/api/cita/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data?.error || "No se pudo cancelar.");
        return;
      }
      setStatus("cancelled");
      setConfirmCancel(false);
    } catch {
      setError("Problema de conexión.");
    } finally {
      setCancelling(false);
    }
  }

  const cancelled = status === "cancelled";

  return (
    <main className="mx-auto max-w-md px-5 py-12">
      <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm">
        <div className="h-1.5 w-full" style={{ backgroundColor: color }} />
        <div className="p-6">
          <p className="text-xs font-medium uppercase tracking-[0.16em] text-slate-400">
            Tu cita con {ownerName}
          </p>
          <h1 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900">
            {typeName}
          </h1>

          <div className="mt-4 rounded-xl bg-slate-50 px-4 py-3 text-sm text-slate-700">
            <span className="capitalize">{dayStr}</span>
            <br />
            <span className="tabular">{timeStr}</span>
          </div>

          {cancelled ? (
            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-3 text-sm text-slate-600">
              Esta cita está cancelada.
            </div>
          ) : (
            <>
              {error && (
                <p className="mt-4 text-sm text-red-600" role="alert">
                  {error}
                </p>
              )}

              {confirmCancel ? (
                <div className="mt-5">
                  <p className="mb-3 text-sm text-slate-600">
                    ¿Seguro que quieres cancelar esta cita?
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={doCancel}
                      disabled={cancelling}
                      className="flex-1 rounded-xl bg-red-600 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-red-700 disabled:opacity-60"
                    >
                      {cancelling ? "Cancelando…" : "Sí, cancelar"}
                    </button>
                    <button
                      onClick={() => setConfirmCancel(false)}
                      className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                    >
                      No
                    </button>
                  </div>
                </div>
              ) : (
                <div className="mt-5 flex flex-col gap-2">
                  <Link
                    href={`/cita/${token}/reagendar`}
                    className="w-full rounded-xl px-4 py-2.5 text-center text-sm font-medium text-white transition"
                    style={{ backgroundColor: color }}
                  >
                    Reagendar
                  </Link>
                  <button
                    onClick={() => setConfirmCancel(true)}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:border-slate-300"
                  >
                    Cancelar cita
                  </button>
                </div>
              )}
            </>
          )}

          <div className="mt-6 text-center">
            <Link href="/" className="text-sm text-slate-500 underline">
              Ir al inicio
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
