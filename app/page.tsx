import Link from "next/link";
import { getSettings } from "@/lib/settings";

export const dynamic = "force-dynamic";

function durationLabel(durationMinutes: number, options?: number[]): string {
  if (options && options.length > 1) {
    const min = Math.min(...options);
    const max = Math.max(...options);
    return `${min}–${max} min`;
  }
  return `${durationMinutes} min`;
}

export default async function Home() {
  const settings = await getSettings();
  const types = settings.meetingTypes.filter(
    (m) => m.enabled !== false && m.listed !== false
  );

  return (
    <main className="mx-auto flex min-h-screen max-w-xl flex-col justify-center px-5 py-16">
      <header className="mb-10">
        <p className="mb-2 text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
          Agenda
        </p>
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">
          Reserva un horario con {settings.ownerName}
        </h1>
        <p className="mt-3 text-[15px] leading-relaxed text-slate-500">
          Elige el motivo de la reunión. La disponibilidad ya considera todos
          mis calendarios, así que cualquier horario que veas está libre.
        </p>
      </header>

      <ul className="space-y-3">
        {types.map((m) => (
          <li key={m.slug}>
            <Link
              href={`/book/${m.slug}`}
              className="group flex items-center gap-4 rounded-2xl border border-slate-200 bg-white p-4 transition hover:border-slate-300 hover:shadow-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
            >
              {m.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={m.image}
                  alt=""
                  width={48}
                  height={48}
                  className="h-12 w-12 shrink-0 rounded-xl object-cover ring-1 ring-slate-200"
                />
              ) : (
                <span
                  aria-hidden
                  className="h-12 w-1.5 shrink-0 rounded-full"
                  style={{ backgroundColor: m.color }}
                />
              )}
              <span className="min-w-0 flex-1">
                <span className="block font-medium text-slate-900">{m.name}</span>
                <span className="mt-0.5 block truncate text-sm text-slate-500">
                  {m.description}
                </span>
              </span>
              <span
                className="shrink-0 rounded-full px-2.5 py-1 text-xs font-medium tabular"
                style={{ backgroundColor: `${m.color}14`, color: m.color }}
              >
                {durationLabel(m.durationMinutes, m.durationOptions)}
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
