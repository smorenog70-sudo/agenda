import { NextRequest, NextResponse } from "next/server";

// Protege la página de administración (conectar cuentas) y sus APIs.
// El callback de OAuth NO se protege aquí: se valida con el parámetro `state`.
export const config = {
  matcher: ["/connect", "/api/auth/google", "/api/accounts"],
};

export function middleware(req: NextRequest) {
  const expected = process.env.ADMIN_PASSWORD;
  const cookie = req.cookies.get("admin")?.value;
  const authed = Boolean(expected) && cookie === expected;

  if (authed) return NextResponse.next();

  if (req.nextUrl.pathname === "/connect") {
    return NextResponse.redirect(new URL("/login?next=/connect", req.url));
  }
  return NextResponse.json({ error: "No autorizado." }, { status: 401 });
}
