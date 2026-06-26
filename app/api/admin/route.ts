import { NextRequest, NextResponse } from "next/server";
import {
  getSettings,
  saveSettings,
  normalizeSettings,
  validateSettings,
} from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const settings = await getSettings();
    return NextResponse.json({ settings });
  } catch (e) {
    console.error("admin GET error:", e);
    return NextResponse.json(
      { error: "No se pudo leer la configuración." },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  let body: { settings?: unknown };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (!body.settings || typeof body.settings !== "object") {
    return NextResponse.json({ error: "Faltan datos." }, { status: 400 });
  }

  // Coercionamos a una forma válida y validamos antes de guardar.
  const settings = normalizeSettings(body.settings);
  const errors = validateSettings(settings);
  if (errors.length > 0) {
    return NextResponse.json({ error: errors[0], errors }, { status: 400 });
  }

  try {
    await saveSettings(settings);
    return NextResponse.json({ ok: true, settings });
  } catch (e) {
    console.error("admin POST error:", e);
    return NextResponse.json(
      { error: "No se pudo guardar la configuración." },
      { status: 500 }
    );
  }
}
