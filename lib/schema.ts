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
