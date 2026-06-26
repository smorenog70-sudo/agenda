# Configurar Appwrite (todo por la consola, sin terminal)

Crea estas 3 colecciones con sus atributos e índices **exactamente** como aquí.
Los IDs en minúscula deben coincidir con lo que espera el código.

## 0. Proyecto, base de datos y API key

1. Entra a <https://cloud.appwrite.io>, crea cuenta y un **proyecto**.
2. Copia el **Project ID** y el **API Endpoint** (Project Settings / Overview).
   El endpoint suele ser regional, ej. `https://nyc.cloud.appwrite.io/v1`. Usa el
   que te muestre tu proyecto → va en `APPWRITE_ENDPOINT`.
3. Ve a **Databases → Create database**. Ponle el nombre que quieras y, en
   **Database ID**, escribe algo simple (ej. `main`). Eso va en `APPWRITE_DATABASE_ID`.
4. Ve a **Project Settings → API keys → Create API key**.
   - Nombre: lo que quieras (ej. `server`).
   - **Scopes**: marca al menos `documents.read` y `documents.write`
     (puedes marcar todo el grupo *Databases* sin problema).
   - Crea la key y copia el secreto → va en `APPWRITE_API_KEY`.
     (Solo se ve una vez; guárdala bien y nunca la subas a git.)

> Nota: el código usa esta API key de servidor, que **omite los permisos** de
> colección/documento. Por eso no necesitas configurar permisos para que funcione.

## 1. Colección `accounts`

Dentro de tu base → **Create collection**. En **Collection ID** escribe `accounts`.

**Atributos** (Settings → Attributes → Create attribute):

| Atributo            | Tipo    | Tamaño | Requerido | Default |
|---------------------|---------|--------|-----------|---------|
| `email`             | String  | 320    | Sí        | —       |
| `access_token`      | String  | 4096   | No        | —       |
| `refresh_token`     | String  | 1024   | No        | —       |
| `expiry_date`       | Integer | —      | No        | —       |
| `scope`             | String  | 2048   | No        | —       |
| `token_type`        | String  | 64     | No        | —       |

**Índices** (Settings → Indexes → Create index):

| Nombre         | Tipo   | Atributo | Orden |
|----------------|--------|----------|-------|
| `email_unique` | Unique | `email`  | ASC   |

## 2. Colección `calendars`

**Create collection** → **Collection ID**: `calendars`.

**Atributos:**

| Atributo              | Tipo    | Tamaño | Requerido | Default |
|-----------------------|---------|--------|-----------|---------|
| `google_id`           | String  | 320    | Sí        | —       |
| `account_id`          | String  | 64     | No        | —       |
| `summary`             | String  | 1024   | No        | —       |
| `check_for_conflicts` | Boolean | —      | No        | `true`  |

**Índices:**

| Nombre             | Tipo   | Atributo     | Orden |
|--------------------|--------|--------------|-------|
| `google_id_unique` | Unique | `google_id`  | ASC   |
| `account_idx`      | Key    | `account_id` | ASC   |

## 3. Colección `bookings`

**Create collection** → **Collection ID**: `bookings`.

**Atributos:**

| Atributo          | Tipo   | Tamaño | Requerido | Default |
|-------------------|--------|--------|-----------|---------|
| `meeting_type`    | String | 128    | Sí        | —       |
| `invitee_name`    | String | 256    | Sí        | —       |
| `invitee_email`   | String | 320    | Sí        | —       |
| `start_time`      | String | 64     | Sí        | —       |
| `end_time`        | String | 64     | Sí        | —       |
| `google_event_id` | String | 256    | No        | —       |
| `notes`           | String | 8000   | No        | —       |

**Índices:** ninguno obligatorio. (Opcional: un índice `Key` sobre `start_time`
si quieres ordenar tus reservas por fecha al revisarlas en la consola.)

---

## Checklist final

- [ ] `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`,
      `APPWRITE_DATABASE_ID` puestos en `.env.local` (y en Vercel).
- [ ] Colecciones `accounts`, `calendars`, `bookings` creadas con esos IDs exactos.
- [ ] Todos los atributos en estado **Available** (Appwrite tarda unos segundos en
      crearlos; espera a que dejen de decir "processing").
- [ ] Índices `email_unique`, `google_id_unique` y `account_idx` creados.

Cuando todo esté listo, levanta la app y entra a `/connect` para conectar tus cuentas.
