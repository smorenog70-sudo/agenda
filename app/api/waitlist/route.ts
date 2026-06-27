import { NextRequest, NextResponse } from "next/server";
import { findOneByField, createDoc, COL } from "@/lib/appwrite";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  let body: { email?: string; source?: string };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const email = (body.email ?? "").trim().toLowerCase();
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return NextResponse.json({ error: "Correo inválido." }, { status: 400 });
  }

  try {
    const existing = await findOneByField(COL.waitlist, "email", email);
    if (existing) {
      return NextResponse.json({ ok: true, already: true });
    }
    await createDoc(COL.waitlist, {
      email,
      source: (body.source ?? "landing").slice(0, 64),
    });
    return NextResponse.json({ ok: true, already: false });
  } catch (e) {
    console.error("waitlist error:", e);
    return NextResponse.json(
      { error: "No se pudo registrar. Intenta de nuevo." },
      { status: 500 }
    );
  }
}
