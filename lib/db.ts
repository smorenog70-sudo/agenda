import { neon, NeonQueryFunction } from "@neondatabase/serverless";

// Cliente de Neon (Postgres serverless, solo servidor — usa DATABASE_URL).
// Se inicializa de forma perezosa para que el `build` no falle si falta la variable.
let cached: NeonQueryFunction<false, false> | null = null;

export function getSql(): NeonQueryFunction<false, false> {
  if (cached) return cached;
  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("Falta DATABASE_URL en el entorno.");
  }
  // IMPORTANTE: el driver de Neon consulta por HTTP con `fetch`, y Next.js
  // cachea las respuestas de `fetch` en Server Components (Data Cache). Sin esto,
  // páginas como /connect devolverían datos viejos (p. ej. cuentas de cuando la
  // tabla estaba vacía). `cache: "no-store"` fuerza a leer siempre en vivo.
  cached = neon(url, { fetchOptions: { cache: "no-store" } });
  return cached;
}

// Nombres de tabla — deben coincidir EXACTO con los que crea /api/setup.
export const COL = {
  accounts: "accounts",
  calendars: "calendars",
  bookings: "bookings",
  settings: "settings",
  waitlist: "waitlist",
} as const;

// Filas devueltas: incluyen los alias "$id"/"$createdAt" para que el resto del
// código (que venía de Appwrite) siga funcionando sin cambios.
export type Row = Record<string, unknown> & {
  $id: string;
  $createdAt: string;
};

// Quita claves undefined/null para no escribir columnas que no toca la operación.
function clean(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

// Sólo permitimos identificadores simples (nombres de tabla/columna internos).
// Todos los valores viajan como parámetros ($1, $2, …), nunca interpolados.
function ident(name: string): string {
  if (!/^[a-z_][a-z0-9_]*$/i.test(name)) {
    throw new Error(`Identificador inválido: ${name}`);
  }
  return `"${name}"`;
}

const RETURNING = `RETURNING *, id AS "$id", created_at AS "$createdAt"`;
const SELECT_ALL = `*, id AS "$id", created_at AS "$createdAt"`;

// Crea una fila (limpiando nulls/undefined) y la devuelve con sus alias.
export async function createDoc(
  table: string,
  data: Record<string, unknown>
): Promise<Row> {
  const sql = getSql();
  const clean_ = clean(data);
  const cols = Object.keys(clean_);
  const vals = Object.values(clean_);
  const colList = cols.map(ident).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  const query = cols.length
    ? `INSERT INTO ${ident(table)} (${colList}) VALUES (${placeholders}) ${RETURNING}`
    : `INSERT INTO ${ident(table)} DEFAULT VALUES ${RETURNING}`;
  const rows = (await sql(query, vals)) as Row[];
  return rows[0];
}

// Busca una fila por un campo (con índice) y devuelve la primera o null.
export async function findOneByField(
  table: string,
  field: string,
  value: string
): Promise<Row | null> {
  const sql = getSql();
  const query = `SELECT ${SELECT_ALL} FROM ${ident(table)} WHERE ${ident(
    field
  )} = $1 LIMIT 1`;
  const rows = (await sql(query, [value])) as Row[];
  return rows[0] ?? null;
}

// "Upsert" nativo de Postgres: inserta o, si ya existe el valor único, actualiza.
// (El campo debe tener un índice/constraint UNIQUE — ver /api/setup.)
export async function upsertByField(
  table: string,
  field: string,
  value: string,
  data: Record<string, unknown>
): Promise<Row> {
  const sql = getSql();
  // Aseguramos que el campo único esté en el payload a insertar.
  const clean_ = clean({ ...data, [field]: value });
  const cols = Object.keys(clean_);
  const vals = Object.values(clean_);
  const colList = cols.map(ident).join(", ");
  const placeholders = cols.map((_, i) => `$${i + 1}`).join(", ");
  // En el UPDATE actualizamos todas las columnas menos la de conflicto.
  const updates = cols
    .filter((c) => c !== field)
    .map((c) => `${ident(c)} = EXCLUDED.${ident(c)}`)
    .join(", ");
  const conflictAction = updates
    ? `DO UPDATE SET ${updates}`
    : `DO NOTHING`;
  const query =
    `INSERT INTO ${ident(table)} (${colList}) VALUES (${placeholders}) ` +
    `ON CONFLICT (${ident(field)}) ${conflictAction} ${RETURNING}`;
  const rows = (await sql(query, vals)) as Row[];
  // DO NOTHING no devuelve fila si hubo conflicto; recuperamos la existente.
  if (rows[0]) return rows[0];
  const existing = await findOneByField(table, field, value);
  if (!existing) throw new Error(`upsertByField: no se pudo obtener ${table}.${field}`);
  return existing;
}

export { clean, ident, RETURNING, SELECT_ALL };
