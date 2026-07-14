import { NextResponse } from "next/server";
import { getSql } from "@/lib/db";
import { SCHEMA } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Crea todas las tablas e índices con DDL idempotente (CREATE ... IF NOT EXISTS).
// Se puede volver a ejecutar sin problema: no borra ni duplica nada.
export async function POST() {
  const created: string[] = [];
  const errors: string[] = [];

  let sql: ReturnType<typeof getSql>;
  try {
    sql = getSql();
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }

  // pgcrypto aporta gen_random_uuid() para los IDs por defecto.
  try {
    await sql(`CREATE EXTENSION IF NOT EXISTS pgcrypto`);
    created.push('extensión "pgcrypto"');
  } catch (e) {
    errors.push(`pgcrypto: ${msg(e)}`);
  }

  for (const table of SCHEMA) {
    try {
      const cols = table.columns.join(",\n  ");
      await sql(
        `CREATE TABLE IF NOT EXISTS "${table.id}" (\n  ${cols}\n)`
      );
      created.push(`tabla "${table.id}"`);
    } catch (e) {
      errors.push(`tabla ${table.id}: ${msg(e)}`);
      continue;
    }

    for (const idx of table.indexes) {
      try {
        const unique = idx.unique ? "UNIQUE " : "";
        const colList = idx.columns.map((c) => `"${c}"`).join(", ");
        await sql(
          `CREATE ${unique}INDEX IF NOT EXISTS "${idx.name}" ON "${table.id}" (${colList})`
        );
        created.push(`  índice ${table.id}.${idx.name}`);
      } catch (e) {
        errors.push(`índice ${table.id}.${idx.name}: ${msg(e)}`);
      }
    }
  }

  const ok = errors.length === 0;
  return NextResponse.json({ ok, created, existing: [], pending: [], errors });
}
