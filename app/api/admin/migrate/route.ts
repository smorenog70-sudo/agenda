import { NextResponse } from "next/server";
import { neon, NeonQueryFunction } from "@neondatabase/serverless";
import { getSql } from "@/lib/db";
import { SCHEMA, ensureSchema, tableColumns } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cuántas filas se insertan por consulta al copiar (mantiene cada request pequeño).
const BATCH_SIZE = 50;

type SqlClient = NeonQueryFunction<false, false>;
type AnyRow = Record<string, unknown>;

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

// Conexión a la base VIEJA (origen). La nueva es DATABASE_URL (la usa getSql()).
function getSourceSql(): SqlClient {
  const url = process.env.OLD_DATABASE_URL;
  if (!url) {
    throw new Error(
      "Falta OLD_DATABASE_URL en el entorno. Pon ahí la connection string de la base " +
        "VIEJA de Neon (la nueva va en DATABASE_URL) y vuelve a desplegar."
    );
  }
  if (url === process.env.DATABASE_URL) {
    throw new Error(
      "OLD_DATABASE_URL y DATABASE_URL apuntan a la misma base. DATABASE_URL debe ser " +
        "la base NUEVA y OLD_DATABASE_URL la vieja."
    );
  }
  return neon(url, { fetchOptions: { cache: "no-store" } });
}

// Filas por tabla; null = la tabla no existe en esa base.
async function tableCounts(sql: SqlClient): Promise<Record<string, number | null>> {
  const out: Record<string, number | null> = {};
  for (const table of SCHEMA) {
    try {
      const rows = (await sql(
        `SELECT count(*)::int AS n FROM "${table.id}"`
      )) as AnyRow[];
      out[table.id] = Number(rows[0]?.n ?? 0);
    } catch {
      out[table.id] = null;
    }
  }
  return out;
}

// GET: estado actual — cuántas filas hay en la base vieja y en la nueva.
export async function GET() {
  try {
    const src = getSourceSql();
    const dst = getSql();
    const source = await tableCounts(src);
    const destination = await tableCounts(dst);
    return NextResponse.json({ ok: true, source, destination });
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }
}

type TableReport = {
  table: string;
  source: number;
  copied: number;
  skipped: number;
  error?: string;
};

// POST: copia todos los datos de la base vieja (OLD_DATABASE_URL) a la nueva
// (DATABASE_URL). Idempotente: las filas que ya existen en destino se saltan
// (ON CONFLICT DO NOTHING), así que se puede repetir sin duplicar nada.
export async function POST() {
  let src: SqlClient;
  let dst: SqlClient;
  try {
    src = getSourceSql();
    dst = getSql();
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }

  // 1) Asegura el esquema en la base nueva (mismo DDL que /setup).
  const schema = await ensureSchema(dst);
  if (schema.errors.length > 0) {
    return NextResponse.json(
      { ok: false, error: "No se pudo crear el esquema en la base nueva.", errors: schema.errors },
      { status: 500 }
    );
  }

  // 2) Copia tabla por tabla, en el orden del esquema (accounts va antes que
  //    calendars, que tiene FK hacia ella). Se preservan id y created_at.
  const report: TableReport[] = [];
  for (const table of SCHEMA) {
    const cols = tableColumns(table);
    const colList = cols.map((c) => `"${c}"`).join(", ");

    let rows: AnyRow[];
    try {
      rows = (await src(`SELECT ${colList} FROM "${table.id}"`)) as AnyRow[];
    } catch (e) {
      report.push({
        table: table.id,
        source: 0,
        copied: 0,
        skipped: 0,
        error: `no se pudo leer del origen: ${msg(e)}`,
      });
      continue;
    }

    let copied = 0;
    let error: string | undefined;
    for (let i = 0; i < rows.length; i += BATCH_SIZE) {
      const batch = rows.slice(i, i + BATCH_SIZE);
      const placeholders = batch
        .map(
          (_, r) =>
            `(${cols.map((_, c) => `$${r * cols.length + c + 1}`).join(", ")})`
        )
        .join(", ");
      const values = batch.flatMap((row) => cols.map((c) => row[c] ?? null));
      try {
        const inserted = (await dst(
          `INSERT INTO "${table.id}" (${colList}) VALUES ${placeholders} ` +
            `ON CONFLICT DO NOTHING RETURNING id`,
          values
        )) as AnyRow[];
        copied += inserted.length;
      } catch (e) {
        error = msg(e);
        break;
      }
    }

    report.push({
      table: table.id,
      source: rows.length,
      copied,
      skipped: error ? 0 : rows.length - copied,
      error,
    });
  }

  // 3) Estado final del destino para verificar de un vistazo.
  const destination = await tableCounts(dst);
  const ok = report.every((r) => !r.error);
  return NextResponse.json({ ok, report, destination });
}
