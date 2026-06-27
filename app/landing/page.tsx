import Link from "next/link";
import WaitlistForm from "./WaitlistForm";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "SMG-Calendar — Todos tus calendarios, una sola agenda",
  description:
    "Conecta tus cuentas de Google y comparte un solo link para que te agenden. Tu disponibilidad se cruza entre todos tus calendarios para que nunca te pongan dos cosas a la misma hora.",
};

// Las 4 cuentas de ejemplo (los contextos reales) pintadas con la paleta de Google,
// porque el producto unifica tus calendarios de Google.
const SOURCES = [
  { name: "Personal", color: "#4285F4", busy: [[12, 22], [60, 78]] },
  { name: "Heru", color: "#34A853", busy: [[34, 50]] },
  { name: "Basalto", color: "#FBBC05", busy: [[5, 14], [82, 95]] },
  { name: "Crezes", color: "#EA4335", busy: [[52, 66]] },
];

const SLOTS = ["9:00", "9:30", "11:30", "12:00", "3:00", "4:30"];

const STYLES = `
.smg { font-family: 'Inter', system-ui, -apple-system, sans-serif; color: #0B1F3A; }
.smg .display { font-family: 'Bricolage Grotesque', 'Inter', sans-serif; letter-spacing: -0.025em; }
@keyframes smgFloat { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-3px); } }
@keyframes smgPop { from { opacity: 0; transform: translateY(8px) scale(.95); } to { opacity: 1; transform: none; } }
@keyframes smgGrow { from { transform: scaleX(0); } to { transform: scaleX(1); } }
.smg-src { animation: smgFloat 7s ease-in-out infinite; }
.smg-busy { transform-origin: left center; animation: smgGrow .7s cubic-bezier(.2,.8,.2,1) both; }
.smg-slot { animation: smgPop .5s ease both; }
@media (prefers-reduced-motion: reduce) {
  .smg-src, .smg-busy, .smg-slot { animation: none !important; }
}
`;

export default function LandingPage() {
  return (
    <>
      {/* Fuentes (se cargan en el navegador, no en el build) */}
      <link rel="preconnect" href="https://fonts.googleapis.com" />
      <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
      <link
        href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,700;12..96,800&family=Inter:wght@400;500;600&display=swap"
        rel="stylesheet"
      />
      <style dangerouslySetInnerHTML={{ __html: STYLES }} />

      <div className="smg min-h-screen bg-[#F7F9FC]">
        {/* Nav */}
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-6 py-5">
          <div className="flex items-center gap-2.5">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/icons/icon-192.png"
              alt="SMG-Calendar"
              width={34}
              height={34}
              className="h-8 w-8 rounded-lg ring-1 ring-slate-200"
            />
            <span className="display text-lg font-bold">SMG-Calendar</span>
          </div>
          <Link
            href="/"
            className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 transition hover:text-[#0B1F3A]"
          >
            Ver una agenda en vivo
            <svg viewBox="0 0 20 20" className="h-4 w-4 transition group-hover:translate-x-0.5" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round">
              <path d="M7.5 4.5 13 10l-5.5 5.5" />
            </svg>
          </Link>
        </nav>

        {/* Hero */}
        <header className="mx-auto grid max-w-6xl items-center gap-12 px-6 pb-20 pt-10 md:grid-cols-[1.05fr_1fr] md:pt-16">
          <div>
            <span className="inline-block rounded-full bg-[#2563EB]/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.14em] text-[#2563EB]">
              Para quien usa varios sombreros
            </span>
            <h1 className="display mt-5 text-[2.6rem] font-extrabold leading-[1.04] sm:text-6xl">
              Todos tus calendarios.
              <br />
              <span className="text-[#2563EB]">Una sola agenda.</span>
            </h1>
            <p className="mt-5 max-w-lg text-[17px] leading-relaxed text-slate-600">
              Conecta tus cuentas de Google —la personal, la del trabajo, la de
              cada proyecto— y comparte un solo link para que te agenden. Tu
              disponibilidad se cruza entre todos tus calendarios, así que nunca
              te ponen dos cosas a la misma hora.
            </p>
            <div className="mt-7 max-w-md">
              <WaitlistForm variant="light" source="landing-hero" />
            </div>
          </div>

          {/* Signature: varios calendarios → una disponibilidad */}
          <div className="relative">
            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-[0_24px_60px_-30px_rgba(11,31,58,0.35)] sm:p-7">
              <p className="mb-4 text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">
                Tus cuentas de Google
              </p>

              <div className="space-y-3">
                {SOURCES.map((s, i) => (
                  <div
                    key={s.name}
                    className="smg-src flex items-center gap-3"
                    style={{ animationDelay: `${i * 0.4}s` }}
                  >
                    <span className="flex w-20 shrink-0 items-center gap-1.5">
                      <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                      <span className="truncate text-xs font-medium text-slate-600">{s.name}</span>
                    </span>
                    <span className="relative h-2.5 flex-1 overflow-hidden rounded-full bg-slate-100">
                      {s.busy.map(([start, width], j) => (
                        <span
                          key={j}
                          className="smg-busy absolute top-0 h-full rounded-full"
                          style={{
                            left: `${start}%`,
                            width: `${width}%`,
                            backgroundColor: s.color,
                            opacity: 0.85,
                            animationDelay: `${0.3 + i * 0.15 + j * 0.1}s`,
                          }}
                        />
                      ))}
                    </span>
                  </div>
                ))}
              </div>

              {/* Merge */}
              <div className="my-5 flex items-center gap-3">
                <span className="h-px flex-1 bg-slate-200" />
                <span className="flex items-center gap-1.5 text-xs font-semibold text-[#0B1F3A]">
                  <svg viewBox="0 0 20 20" className="h-4 w-4 text-[#2563EB]" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M10 4v12M5 11l5 5 5-5" />
                  </svg>
                  Disponibilidad combinada
                </span>
                <span className="h-px flex-1 bg-slate-200" />
              </div>

              <div className="grid grid-cols-3 gap-2">
                {SLOTS.map((t, i) => (
                  <span
                    key={t}
                    className="smg-slot rounded-xl border border-[#2563EB]/20 bg-[#2563EB]/[0.06] py-2 text-center text-sm font-semibold text-[#2563EB]"
                    style={{ animationDelay: `${0.9 + i * 0.08}s` }}
                  >
                    {t}
                  </span>
                ))}
              </div>
              <p className="mt-3 text-center text-xs text-slate-400">
                Solo los huecos libres en <span className="font-medium text-slate-500">todas</span> tus cuentas
              </p>
            </div>
          </div>
        </header>

        {/* Thesis band */}
        <section className="mx-auto max-w-4xl px-6 py-10 text-center">
          <p className="display text-2xl font-semibold leading-snug text-[#0B1F3A] sm:text-[1.75rem]">
            Vives entre tu correo personal, el del trabajo y el de tu proyecto.
            <span className="text-slate-400">
              {" "}Tres calendarios, cero sincronía, y siempre un empalme.
            </span>
          </p>
        </section>

        {/* Value props */}
        <section className="mx-auto max-w-6xl px-6 py-12">
          <div className="grid gap-4 sm:grid-cols-2">
            <Feature
              color="#4285F4"
              title="Una disponibilidad de verdad"
              body="Cruzamos todos tus calendarios de Google. Si estás ocupado en cualquiera, ese horario simplemente no aparece. Adiós al doble-booking."
              icon={
                <>
                  <path d="M3 7l9-4 9 4-9 4-9-4Z" />
                  <path d="M3 12l9 4 9-4" />
                  <path d="M3 17l9 4 9-4" />
                </>
              }
            />
            <Feature
              color="#34A853"
              title="Cada proyecto, su identidad"
              body="La reunión sale desde el correo correcto y cae en el calendario correcto. Lo de Heru en Heru, lo personal en lo personal."
              icon={
                <>
                  <path d="M7.5 7.5h.01" />
                  <path d="M3 6v5.2a2 2 0 0 0 .6 1.4l7 7a2 2 0 0 0 2.8 0l4.8-4.8a2 2 0 0 0 0-2.8l-7-7A2 2 0 0 0 11.8 4H6a3 3 0 0 0-3 3Z" />
                </>
              }
            />
            <Feature
              color="#FBBC05"
              title="Cero fricción para el invitado"
              body="No necesitan crear cuenta ni instalar nada. Reciben la invitación de Google con su link de Meet y listo."
              icon={
                <>
                  <path d="M9 13a5 5 0 0 0 7 0l2-2a5 5 0 0 0-7-7l-1 1" />
                  <path d="M15 11a5 5 0 0 0-7 0l-2 2a5 5 0 0 0 7 7l1-1" />
                </>
              }
            />
            <Feature
              color="#EA4335"
              title="Tú pones las reglas"
              body="Define tus motivos de reunión, tu horario y tus colchones. Quien agenda puede cancelar o reagendar en un clic, sin escribirte."
              icon={
                <>
                  <path d="M4 6h16M4 12h16M4 18h16" />
                  <circle cx="9" cy="6" r="2" fill="currentColor" stroke="none" />
                  <circle cx="15" cy="12" r="2" fill="currentColor" stroke="none" />
                  <circle cx="8" cy="18" r="2" fill="currentColor" stroke="none" />
                </>
              }
            />
          </div>
        </section>

        {/* How it works */}
        <section className="mx-auto max-w-5xl px-6 py-12">
          <h2 className="display text-center text-3xl font-bold">
            Listo en tres pasos
          </h2>
          <div className="mt-10 grid gap-8 sm:grid-cols-3">
            <Step
              n="1"
              title="Conecta tus correos"
              body="Inicia sesión y enlaza tus cuentas de Google. Cada una con un clic."
            />
            <Step
              n="2"
              title="Arma tu agenda"
              body="Crea tus motivos de reunión, define tu horario laboral y tus reglas."
            />
            <Step
              n="3"
              title="Comparte tu link"
              body="Mándalo, ponlo en tu bio o tu firma. Que el resto lo haga SMG-Calendar."
            />
          </div>
        </section>

        {/* CTA final (oscuro) */}
        <section className="px-6 py-14">
          <div className="mx-auto max-w-4xl overflow-hidden rounded-[2rem] bg-[#0B1F3A] px-7 py-12 text-center sm:px-14 sm:py-16">
            <h2 className="display text-3xl font-extrabold text-white sm:text-[2.5rem]">
              Sé de los primeros
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-[15px] leading-relaxed text-white/60">
              SMG-Calendar está en construcción. Déjanos tu correo y te
              escribimos apenas puedas crear la tuya y conectar tus calendarios.
            </p>
            <div className="mx-auto mt-8 max-w-md text-left">
              <WaitlistForm variant="dark" source="landing-cta" />
            </div>
          </div>
        </section>

        {/* Footer */}
        <footer className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-6 py-8 text-sm text-slate-400 sm:flex-row">
          <span>SMG-Calendar</span>
          <Link href="/" className="transition hover:text-slate-600">
            Ver una agenda en vivo →
          </Link>
        </footer>
      </div>
    </>
  );
}

function Feature({
  color,
  title,
  body,
  icon,
}: {
  color: string;
  title: string;
  body: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="rounded-3xl border border-slate-200 bg-white p-6 transition hover:shadow-[0_18px_40px_-26px_rgba(11,31,58,0.4)]">
      <span
        className="mb-4 inline-flex h-11 w-11 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${color}14`, color }}
      >
        <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round">
          {icon}
        </svg>
      </span>
      <h3 className="display text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}

function Step({ n, title, body }: { n: string; title: string; body: string }) {
  return (
    <div className="text-center">
      <span className="display mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-[#0B1F3A] text-xl font-bold text-white">
        {n}
      </span>
      <h3 className="display mt-4 text-lg font-bold">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-500">{body}</p>
    </div>
  );
}
