import { NextRequest, NextResponse } from "next/server";

// Protege la página de administración (conectar cuentas) y sus APIs.
// El callback de OAuth NO se protege aquí: se valida con el parámetro `state`.
export const config = {
  matcher: [
    "/connect",
    "/setup",
    "/migrate",
    "/admin",
    "/api/auth/google",
    "/api/accounts",
    "/api/setup",
    "/api/admin",
    "/api/admin/bookings",
    "/api/admin/waitlist",
    "/api/admin/migrate",
  ],
};

export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get("admin")?.value;
  const authed = Boolean(expected) && cookie === expected;

  if (authed) return NextResponse.next();

  const path = req.nextUrl.pathname;
  if (
    path === "/connect" ||
    path === "/setup" ||
    path === "/migrate" ||
    path === "/admin"
  ) {
    return NextResponse.redirect(new URL(`/login?next=${path}`, req.url));
  }
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}
