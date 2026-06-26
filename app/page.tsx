import Link from "next/link";
import { meetingTypes, OWNER_NAME } from "@/config";

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
      <header className="mb-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Agenda
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Reserva un horario con {OWNER_NAME}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
          Elige el motivo de la reunión. La disponibilidad ya considera todos
          mis calendarios, así que cualquier horario que veas está libre.
        </p>
      </header>

      <ul className="space-y-3">
        {meetingTypes.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/book/${m.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-5 transition hover:border-slate-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              <span
                aria-hidden
                className="h-10 w-1.5 shrink-0 rounded-full"
                style={{ backgroundColor: m.color }}
              />
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900">
                  {m.name}
                </span>
                <span className="mt-0.5 block truncate text-sm text-slate-500">
                  {m.description}
                </span>
              </span>
              <span className="shrink-0 text-sm tabular text-slate-400">
                {m.durationMinutes} min
              </span>
              <svg
                aria-hidden
                viewBox="0 0 20 20"
                className="h-5 w-5 shrink-0 text-slate-300 transition group-hover:translate-x-0.5 group-hover:text-slate-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M7.5 4.5 13 10l-5.5 5.5" />
              </svg>
            </Link>
          </li>
        ))}
      </ul>
    </main>
  );
}
