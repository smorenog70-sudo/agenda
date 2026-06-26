import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const password = String(form.get("password") ?? "");
  const next = String(form.get("next") ?? "/connect");
  const expected = process.env.ADMIN_PASSWORD;

  if (expected && password === expected) {
    const res = NextResponse.redirect(new URL(next, req.url));
    res.cookies.set("admin", password, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  }

  return NextResponse.redirect(
    new URL(`/login?error=1&next=${encodeURIComponent(next)}`, req.url)
  );
}
