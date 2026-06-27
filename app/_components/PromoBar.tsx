// Barra promocional visible en todas las pantallas del booking.
// Muestra el logo + mensaje + CTA hacia la landing (crear tu propio calendario).
export default function PromoBar({ url }: { url: string }) {
  const href = url && url.trim() ? url : "/landing";
  return (
    <div className="w-full border-b border-[#2563EB]/15 bg-[#2563EB]/[0.06]">
      <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-2.5 sm:px-6">
        <div className="flex min-w-0 items-center gap-3">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src="/icons/icon-192.png"
            alt="SMG-Calendar"
            width={36}
            height={36}
            className="h-9 w-9 shrink-0 rounded-lg ring-1 ring-slate-200"
          />
          <p className="min-w-0 text-sm leading-tight text-slate-600">
            <span className="font-semibold text-[#0B1F3A]">
              Crea tu propio calendario
            </span>
            <span className="hidden text-slate-500 sm:inline">
              {" "}— conecta tus correos de Google y comparte tu link con SMG-Calendar.
            </span>
          </p>
        </div>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="shrink-0 rounded-xl bg-[#2563EB] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#1d4ed8]"
        >
          Crear el mío
        </a>
      </div>
    </div>
  );
}
