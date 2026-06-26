# Configurar Appwrite

Hay dos formas. La **automática** es la fácil y la recomendada: la app crea todo sola.
La **manual** está abajo por si la quieres hacer a mano.

---

## ✅ Forma automática (recomendada, sin SQL y sin picar atributos)

La app trae una página `/setup` que crea por ti la base de datos, las 3 colecciones,
todos los atributos y los índices. Solo necesitas darle tus datos de Appwrite y un clic.

1. Entra a <https://cloud.appwrite.io>, crea cuenta y un **proyecto**.
2. Copia el **Project ID** y el **API Endpoint** (Project Settings / Overview).
   El endpoint suele ser regional, ej. `https://nyc.cloud.appwrite.io/v1`. Usa el que te
   muestre tu proyecto → va en `APPWRITE_ENDPOINT`.
3. Crea una **API key**: Project Settings → **API keys → Create API key**.
   - Nombre: el que quieras (ej. `server`).
   - **Scopes**: marca **todos los del grupo *Databases*** (la app necesita crear
     colecciones, atributos e índices, no solo leer/escribir documentos).
   - Crea la key y copia el secreto → va en `APPWRITE_API_KEY`.
     (Solo se ve una vez; guárdala bien y nunca la subas a git.)
4. Elige un **Database ID** simple, por ejemplo `main` → va en `APPWRITE_DATABASE_ID`.
   **No necesitas crear la base a mano**: la página `/setup` la crea con ese ID.
5. Pon esas 4 variables (`APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`,
   `APPWRITE_DATABASE_ID`) en Vercel y despliega (ver README).
6. Entra a `https://TU-URL.vercel.app/setup` (te pedirá tu `ADMIN_PASSWORD`), y dale al
   botón **"Crear / verificar la base de datos"**. Listo: te muestra todo lo que creó.

> Si te dice "casi listo / pendiente", espera unos segundos y vuelve a darle al botón.
> Es seguro repetirlo: lo que ya existe se respeta (no duplica ni borra nada).

Cuando termine, sigue con `/connect` para conectar tus cuentas de Google.

---

## ✋ Forma manual (opcional)

Si prefieres crear todo a mano en la consola de Appwrite, crea estas 3 colecciones con
sus atributos e índices **exactamente** así. Los IDs en minúscula deben coincidir con lo
que espera el código.

Equivalencias (por si vienes de SQL): colección = tabla, atributo = columna,
documento = fila, índice = índice.

### 1. Colección `accounts`

Dentro de tu base → **Create collection** → **Collection ID**: `accounts`.

**Atributos** (pestaña Attributes → Create attribute):

| Atributo        | Tipo    | Tamaño | Requerido | Default |
|-----------------|---------|--------|-----------|---------|
| `email`         | String  | 320    | Sí        | —       |
| `access_token`  | String  | 4096   | No        | —       |
| `refresh_token` | String  | 1024   | No        | —       |
| `expiry_date`   | Integer | —      | No        | —       |
| `scope`         | String  | 2048   | No        | —       |
| `token_type`    | String  | 64     | No        | —       |

**Índices** (pestaña Indexes → Create index):

| Nombre         | Tipo   | Atributo | Orden |
|----------------|--------|----------|-------|
| `email_unique` | Unique | `email`  | ASC   |

### 2. Colección `calendars`

**Create collection** → **Collection ID**: `calendars`.

| Atributo              | Tipo    | Tamaño | Requerido | Default |
|-----------------------|---------|--------|-----------|---------|
| `google_id`           | String  | 320    | Sí        | —       |
| `account_id`          | String  | 64     | No        | —       |
| `summary`             | String  | 1024   | No        | —       |
| `check_for_conflicts` | Boolean | —      | No        | `true`  |

| Nombre             | Tipo   | Atributo     | Orden |
|--------------------|--------|--------------|-------|
| `google_id_unique` | Unique | `google_id`  | ASC   |
| `account_idx`      | Key    | `account_id` | ASC   |

### 3. Colección `bookings`

**Create collection** → **Collection ID**: `bookings`.

| Atributo          | Tipo   | Tamaño | Requerido | Default |
|-------------------|--------|--------|-----------|---------|
| `meeting_type`    | String | 128    | Sí        | —       |
| `invitee_name`    | String | 256    | Sí        | —       |
| `invitee_email`   | String | 320    | Sí        | —       |
| `start_time`      | String | 64     | Sí        | —       |
| `end_time`        | String | 64     | Sí        | —       |
| `google_event_id` | String | 256    | No        | —       |
| `notes`           | String | 8000   | No        | —       |

**Índices:** ninguno obligatorio.

> Nota: el código usa la API key de servidor, que **omite los permisos** de
> colección/documento. Por eso no necesitas configurar permisos para que funcione.
