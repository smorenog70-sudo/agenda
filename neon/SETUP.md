# Configurar Neon (Postgres)

La app usa **Neon** (Postgres serverless) como base de datos. Solo necesitas una cosa:
la **cadena de conexión** (`DATABASE_URL`). Las tablas las crea sola la página `/setup`.

---

## ✅ Puesta en marcha (sin SQL, sin terminal)

1. Entra a <https://neon.tech>, crea una cuenta y un **proyecto** (elige la región más
   cercana a donde despliegas en Vercel).
2. Al crear el proyecto, Neon te muestra la **Connection string**. Copia la variante
   **Pooled connection** (recomendada para funciones serverless). Tiene esta forma:

   ```
   postgresql://USER:PASSWORD@ep-xxxx-pooler.REGION.aws.neon.tech/neondb?sslmode=require
   ```

   Ese valor va en la variable de entorno **`DATABASE_URL`**.
   (Si no la ves, está en **Dashboard → Connection Details**.)
3. Pon `DATABASE_URL` en Vercel (Project → Settings → Environment Variables) y despliega
   (ver README).
4. Entra a `https://TU-URL.vercel.app/setup` (te pedirá tu `ADMIN_PASSWORD`) y dale al
   botón **"Crear / verificar la base de datos"**. Esto crea las 5 tablas con sus índices.

> Es seguro repetirlo: usa `CREATE TABLE IF NOT EXISTS`, así que lo que ya existe se
> respeta (no duplica ni borra nada).

Cuando termine, sigue con `/connect` para conectar tus cuentas de Google.

---

## Modelo de datos (referencia)

La página `/setup` ejecuta el DDL a partir de `lib/schema.ts`. Cada tabla lleva
`id text PRIMARY KEY DEFAULT gen_random_uuid()::text` y `created_at timestamptz`.

- **`accounts`** — `email` (UNIQUE), `access_token`, `refresh_token`, `expiry_date`,
  `scope`, `token_type`. Tokens OAuth de cada cuenta de Google conectada.
- **`calendars`** — `google_id` (UNIQUE), `account_id` (FK → `accounts.id`), `summary`,
  `check_for_conflicts` (default `true`). Índice en `account_id`.
- **`bookings`** — `meeting_type`, `invitee_name`, `invitee_email`, `start_time`,
  `end_time` (ISO UTC en texto), `google_event_id`, `notes`, `subject`, `status`,
  `cancel_token` (UNIQUE), `account_email`. Índice en `start_time`.
- **`settings`** — una sola fila con `id = 'config'` y `data` (JSON de la configuración).
- **`waitlist`** — `email` (UNIQUE), `source`.

> Nota: `start_time`/`end_time` se guardan como cadenas ISO 8601 en UTC. El orden
> lexicográfico coincide con el cronológico, por eso las comparaciones y el `ORDER BY`
> sobre esas columnas de texto funcionan correctamente.

---

## Migrar a otra base de Neon

Si quieres mover la app a **otra base de Neon** (otro proyecto, otra región, otra
cuenta…), la app trae una herramienta que copia todos los datos sola. No necesitas
SQL ni terminal:

1. Crea el proyecto/base **nuevo** en Neon y copia su **Connection string**
   (variante *Pooled connection*, igual que siempre).
2. En Vercel (Project → Settings → Environment Variables):
   - Cambia **`DATABASE_URL`** → ponle la connection string de la base **NUEVA**.
   - Agrega **`OLD_DATABASE_URL`** → ponle la connection string de la base **VIEJA**
     (el valor que tenía `DATABASE_URL` hasta ahora).
3. Redespliega (Deployments → ⋯ → Redeploy) para que tome las variables.
4. Entra a `https://TU-URL.vercel.app/migrate` (te pedirá tu `ADMIN_PASSWORD`).
   Verás cuántas filas hay en cada base. Dale al botón
   **"Copiar datos a la base nueva"**.
5. Verifica que todo esté bien (revisa `/connect` y `/admin`). Cuando confirmes,
   **borra `OLD_DATABASE_URL`** de Vercel y redespliega. La base vieja queda intacta
   por si necesitas volver; puedes borrarla en Neon cuando quieras.

Notas:

- La migración **crea las tablas en la base nueva** si faltan (mismo DDL que `/setup`)
  y **no modifica la base vieja** (solo lee de ella).
- Es **idempotente**: si la repites, las filas que ya existen en destino se saltan
  (`ON CONFLICT DO NOTHING`). Se preservan los `id` y `created_at` originales.
- Lo ideal es migrar hacia una base **vacía**. Si la nueva ya tiene datos propios
  (p. ej. una cuenta con el mismo correo pero otro `id`), esas filas se saltan y las
  filas que dependían de ellas pueden fallar por la referencia (FK).

---

## Forma manual (opcional)

Si prefieres crear el esquema tú desde el **SQL Editor** de Neon, ejecuta el DDL
equivalente a `lib/schema.ts`. Ejemplo de una tabla:

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS accounts (
  id text PRIMARY KEY DEFAULT gen_random_uuid()::text,
  created_at timestamptz NOT NULL DEFAULT now(),
  email text NOT NULL UNIQUE,
  access_token text,
  refresh_token text,
  expiry_date bigint,
  scope text,
  token_type text
);
```

Pero lo normal es no hacer nada de esto: basta con `DATABASE_URL` + el botón en `/setup`.
