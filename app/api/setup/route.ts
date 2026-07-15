import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { ensureSchema } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Crea todas las tablas e índices con DDL idempotente (CREATE ... IF NOT EXISTS).
// Se puede volver a ejecutar sin problema: no borra ni duplica nada.
export async function POST() {
  let sql: ReturnType<typeof getSql>;
  try {
    sql = getSql();
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }

  const { created, errors } = await ensureSchema(sql);
  const ok = errors.length === 0;
  return NextResponse.json({ ok, created, existing: [], pending: [], errors });
}
