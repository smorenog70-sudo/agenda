"use client";

import { useState } from "react";

export default function WaitlistForm({
  variant = "light",
  source = "landing",
}: {
  variant?: "light" | "dark";
  source?: string;
}) {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "done" | "error">("idle");
  const [msg, setMsg] = useState("");

  const dark = variant === "dark";

  async function submit() {
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
      setState("error");
      setMsg("Escribe un correo válido.");
      return;
    }
    setState("loading");
    setMsg("");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), source }),
      });
      const data = await res.json();
      if (!res.ok) {
        setState("error");
        setMsg(data?.error || "No se pudo registrar.");
        return;
      }
      setState("done");
      setMsg(
        data.already
          ? "Ya estabas en la lista — te avisamos pronto."
          : "Listo. Te avisamos apenas puedas crear la tuya."
      );
    } catch {
      setState("error");
      setMsg("Problema de conexión. Intenta de nuevo.");
    }
  }

  if (state === "done") {
    return (
      <div
        className={`flex items-center gap-2.5 rounded-2xl px-4 py-3.5 text-sm font-medium ${
          dark ? "bg-white/10 text-white" : "bg-emerald-50 text-emerald-700"
        }`}
      >
        <svg viewBox="0 0 20 20" className="h-5 w-5 shrink-0" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="m4 10.5 3.5 3.5L16 6" />
        </svg>
        {msg}
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col gap-2.5 sm:flex-row">
        <input
          type="email"
          value={email}
          onChange={(e) => {
            setEmail(e.target.value);
            if (state === "error") setState("idle");
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") submit();
          }}
          placeholder="tu@correo.com"
          className={`flex-1 rounded-2xl border px-4 py-3.5 text-sm outline-none transition focus-visible:ring-2 ${
            dark
              ? "border-white/15 bg-white/10 text-white placeholder:text-white/40 focus-visible:ring-white/40"
              : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus-visible:ring-[#2563EB]/40"
          }`}
        />
        <button
          onClick={submit}
          disabled={state === "loading"}
          className={`shrink-0 rounded-2xl px-5 py-3.5 text-sm font-semibold transition disabled:opacity-60 ${
            dark
              ? "bg-white text-[#0B1F3A] hover:bg-slate-100"
              : "bg-[#2563EB] text-white hover:bg-[#1d4ed8]"
          }`}
        >
          {state === "loading" ? "Enviando…" : "Quiero mi agenda"}
        </button>
      </div>
      {state === "error" ? (
        <p className={`mt-2 text-xs ${dark ? "text-rose-300" : "text-rose-600"}`} role="alert">
          {msg}
        </p>
      ) : (
        <p className={`mt-2.5 text-xs ${dark ? "text-white/50" : "text-slate-400"}`}>
          Sin spam. Solo te escribimos cuando puedas crear tu cuenta.
        </p>
      )}
    </div>
  );
}
