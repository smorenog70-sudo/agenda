// Definición de las tablas de Postgres (Neon). La usa /api/setup para crear todo
// automáticamente con DDL idempotente. Si algún día cambias el modelo, edítalo aquí.

export type TableDef = {
  id: string; // nombre de la tabla
  // Cada columna es una línea de DDL, ya con tipo/constraints/default.
  columns: string[];
  // Índices adicionales (los UNIQUE de columna se declaran en `columns`).
  indexes: { name: string; unique: boolean; columns: string[] }[];
};

// Todas las tablas llevan estas dos columnas (equivalen a $id / $createdAt de Appwrite).
const BASE = [
  `id text PRIMARY KEY DEFAULT gen_random_uuid()::text`,
  `created_at timestamptz NOT NULL DEFAULT now()`,
];

// Nombre de cada columna de una tabla (primer token de cada línea de DDL).
export function tableColumns(def: TableDef): string[] {
  return def.columns.map((c) => c.trim().split(/\s+/)[0]);
}

type SqlFn = (query: string, params?: unknown[]) => Promise<unknown>;

// Ejecuta el DDL idempotente (CREATE ... IF NOT EXISTS) sobre la conexión dada.
// Lo usan /api/setup (base actual) y /api/admin/migrate (base destino).
export async function ensureSchema(
  sql: SqlFn
): Promise<{ created: string[]; errors: string[] }> {
  const created: string[] = [];
  const errors: string[] = [];
  const msg = (e: unknown) => (e instanceof Error ? e.message : String(e));

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
      await sql(`CREATE TABLE IF NOT EXISTS "${table.id}" (\n  ${cols}\n)`);
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

  return { created, errors };
}

export const SCHEMA: TableDef[] = [
  {
    id: "accounts",
    columns: [
      ...BASE,
      `email text NOT NULL UNIQUE`,
      `access_token text`,
      `refresh_token text`,
      `expiry_date bigint`,
      `scope text`,
      `token_type text`,
    ],
    indexes: [],
  },
  {
    id: "calendars",
    columns: [
      ...BASE,
      `google_id text NOT NULL UNIQUE`,
      `account_id text REFERENCES accounts(id) ON DELETE CASCADE`,
      `summary text`,
      `check_for_conflicts boolean NOT NULL DEFAULT true`,
    ],
    indexes: [{ name: "calendars_account_idx", unique: false, columns: ["account_id"] }],
  },
  {
    id: "bookings",
    columns: [
      ...BASE,
      `meeting_type text NOT NULL`,
      `invitee_name text NOT NULL`,
      `invitee_email text NOT NULL`,
      `start_time text NOT NULL`,
      `end_time text NOT NULL`,
      `google_event_id text`,
      `notes text`,
      `subject text`,
      `status text`,
      `cancel_token text UNIQUE`,
      `account_email text`,
    ],
    indexes: [{ name: "bookings_start_idx", unique: false, columns: ["start_time"] }],
  },
  {
    id: "settings",
    // Una sola fila (id "config") con toda la configuración en JSON (texto).
    columns: [...BASE, `data text`],
    indexes: [],
  },
  {
    id: "waitlist",
    columns: [...BASE, `email text NOT NULL UNIQUE`, `source text`],
    indexes: [],
  },
];
