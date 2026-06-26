import Link from "next/link";
import { meetingTypes } from "@/config";
import { Query } from "node-appwrite";
import { getDb, getDatabaseId, COL } from "@/lib/appwrite";

export const dynamic = "force-dynamic";

async function getConnectedEmails(): Promise<{
  emails: string[];
  error: string | null;
}> {
  try {
    const db = getDb();
    const res = await db.listDocuments(getDatabaseId(), COL.accounts, [
      Query.limit(100),
    ]);
    return {
      emails: res.documents.map((a) => a.email as string),
      error: null,
    };
  } catch (e) {
    return {
      emails: [],
      error:
        e instanceof Error
          ? e.message
          : "No se pudo conectar con la base de datos.",
    };
  }
}

export default async function ConnectPage({
  searchParams,
}: {
  searchParams: { connected?: string; error?: string };
}) {
  const { emails, error } = await getConnectedEmails();
  const connected = new Set(emails.map((e) => e.toLowerCase()));

  // Correos únicos requeridos por tus tipos de cita.
  const required = Array.from(
    new Set(meetingTypes.map((m) => m.accountEmail.toLowerCase()))
  );
  const extra = emails.filter((e) => !required.includes(e.toLowerCase()));

  return (
    <main className="mx-auto max-w-xl px-5 py-12">
      <header className="mb-8">
        <h1 className="text-2xl font-semibold tracking-tight text-slate-900">
          Conectar calendarios
        </h1>
        <p className="mt-2 text-sm leading-relaxed text-slate-500">
          Conecta cada cuenta de Google que uses. La disponibilidad se calcula
          cruzando todas, y cada tipo de cita usa la cuenta que definiste en{" "}
          <code className="rounded bg-slate-100 px-1 py-0.5 text-xs">config.ts</code>.
        </p>
      </header>

      {searchParams.connected && (
        <div className="mb-5 rounded-xl border border-emerald-100 bg-emerald-50 p-3 text-sm text-emerald-700">
          Cuenta conectada correctamente.
        </div>
      )}
      {searchParams.error && (
        <div className="mb-5 rounded-xl border border-red-100 bg-red-50 p-3 text-sm text-red-700">
          {searchParams.error === "state"
            ? "La sesión de autorización expiró. Inténtalo otra vez."
            : "Hubo un problema al conectar la cuenta. Inténtalo otra vez."}
        </div>
      )}
      {error && (
        <div className="mb-5 rounded-xl border border-amber-100 bg-amber-50 p-3 text-sm text-amber-800">
          {error} Revisa tus variables de entorno y que hayas creado{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 text-xs">
            las colecciones en Appwrite
          </code>.
        </div>
      )}

      <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-sm font-medium text-slate-900">
          Cuentas que necesitas
        </h2>
        <ul className="space-y-2.5">
          {required.map((email) => {
            const isOn = connected.has(email);
            return (
              <li
                key={email}
                className="flex items-center justify-between gap-3 text-sm"
              >
                <span className="truncate text-slate-700">{email}</span>
                {isOn ? (
                  <span className="shrink-0 rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-medium text-emerald-700">
                    Conectada
                  </span>
                ) : (
                  <span className="shrink-0 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-500">
                    Falta conectar
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      </section>

      {extra.length > 0 && (
        <section className="mb-6 rounded-2xl border border-slate-200 bg-white p-5">
          <h2 className="mb-3 text-sm font-medium text-slate-900">
            Otras cuentas conectadas
          </h2>
          <p className="mb-2 text-xs text-slate-500">
            Cuentan para la disponibilidad, aunque no organicen citas.
          </p>
          <ul className="space-y-1.5 text-sm text-slate-700">
            {extra.map((e) => (
              <li key={e} className="truncate">
                {e}
              </li>
            ))}
          </ul>
        </section>
      )}

      <a
        href="/api/auth/google"
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-slate-900 px-4 py-3 text-sm font-medium text-white transition hover:bg-slate-800"
      >
        Conectar una cuenta de Google
      </a>
      <p className="mt-3 text-center text-xs text-slate-400">
        En la pantalla de Google, elige la cuenta exacta que quieres conectar.
        Repite para cada una.
      </p>

      <div className="mt-8 text-center">
        <Link href="/" className="text-sm text-slate-500 underline">
          Ver la página pública
        </Link>
      </div>
    </main>
  );
}
