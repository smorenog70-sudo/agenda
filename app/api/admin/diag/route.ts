import { NextResponse } from "next/server";
import { getSql, COL } from "@/lib/db";

export const dynamic = "force-dynamic";

// Diagnóstico protegido (solo admin, ver middleware). Ayuda a detectar cuando la
// app lee/escribe en una base distinta a la que /setup creó las tablas.
// NO expone credenciales: del DATABASE_URL solo muestra host y nombre de la base.

function dbTarget(): { present: boolean; host: string; database: string } {
  const url = process.env.DATABASE_URL;
  if (!url) return { present: false, host: "", database: "" };
  try {
    const u = new URL(url);
    return {
      present: true,
      host: u.host, // ej. ep-xxxx-pooler.us-east-1.aws.neon.tech
      database: u.pathname.replace(/^\//, ""),
    };
  } catch {
    return { present: true, host: "(no parseable)", database: "" };
  }
}

async function count(table: string): Promise<number | string> {
  try {
    const sql = getSql();
    const rows = (await sql(`SELECT count(*)::int AS n FROM "${table}"`)) as {
      n: number;
    }[];
    return rows[0]?.n ?? 0;
  } catch (e) {
    return e instanceof Error ? `ERROR: ${e.message}` : "ERROR";
  }
}

export async function GET() {
  const target = dbTarget();
  const counts: Record<string, number | string> = {};
  for (const t of Object.values(COL)) {
    counts[t] = await count(t);
  }

  // Prueba real de escritura → lectura → borrado sobre la tabla settings.
  let writeTest: string;
  try {
    const sql = getSql();
    const marker = "diag-ok";
    await sql(
      `INSERT INTO "${COL.settings}" (id, data) VALUES ('__diag__', $1)
       ON CONFLICT (id) DO UPDATE SET data = EXCLUDED.data`,
      [marker]
    );
    const read = (await sql(
      `SELECT data FROM "${COL.settings}" WHERE id = '__diag__' LIMIT 1`
    )) as { data: string }[];
    await sql(`DELETE FROM "${COL.settings}" WHERE id = '__diag__'`);
    writeTest =
      read[0]?.data === marker
        ? "OK — escritura y lectura funcionan en esta base"
        : `FALLO — se escribió pero se leyó: ${JSON.stringify(read[0]?.data)}`;
  } catch (e) {
    writeTest = e instanceof Error ? `ERROR: ${e.message}` : "ERROR";
  }

  return NextResponse.json({
    databaseUrlPresent: target.present,
    host: target.host,
    database: target.database,
    rowCounts: counts,
    writeReadTest: writeTest,
  });
}
