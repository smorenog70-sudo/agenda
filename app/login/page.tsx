export const dynamic = "force-dynamic";

export default function LoginPage({
  searchParams,
}: {
  searchParams: { error?: string; next?: string };
}) {
  const error = searchParams.error;
  const next = searchParams.next ?? "/connect";

  return (
    <main className="mx-auto flex min-h-screen max-w-sm flex-col justify-center px-5">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <h1 className="text-lg font-semibold tracking-tight text-slate-900">
          Acceso de administración
        </h1>
        <p className="mt-1.5 text-sm text-slate-500">
          Ingresa la contraseña para conectar tus calendarios.
        </p>

        <form action="/api/auth/login" method="post" className="mt-5 space-y-3">
          <input type="hidden" name="next" value={next} />
          <input
            type="password"
            name="password"
            placeholder="Contraseña"
            autoFocus
            className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm focus:outline-none focus-visible:ring-2 focus-visible:ring-slate-400"
          />
          {error && (
            <p className="text-sm text-red-600" role="alert">
              Contraseña incorrecta.
            </p>
          )}
          <button
            type="submit"
            className="w-full rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Entrar
          </button>
        </form>
      </div>
    </main>
  );
}
