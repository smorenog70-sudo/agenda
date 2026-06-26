# Agenda multi-calendario

Una app tipo Calendly, pero tuya. La gente entra, elige **qué tipo de reunión** quiere
contigo (Personal, Basalto Capital, Crezes, Heru) y agenda. Cada tipo de cita:

- Sale **desde un correo distinto** y cae en **el calendario de esa cuenta**.
- Pero la **disponibilidad se calcula cruzando TODOS tus calendarios** de todas tus
  cuentas conectadas, así nunca te agendan encima de algo que ya tienes.

Quien agenda **no necesita iniciar sesión**: solo elige horario, pone su nombre y correo,
y le llega la invitación de Google Calendar (con link de Meet) automáticamente.

---

## Cómo funciona (en corto)

1. Tú conectas tus 4 cuentas de Google una sola vez (en `/connect`, protegido con contraseña).
2. La app guarda los tokens en Appwrite y descubre los calendarios de cada cuenta.
3. Cuando alguien abre `/book/heru` (por ejemplo), la app consulta el **free/busy** de
   todas tus cuentas, calcula los huecos libres dentro de tu horario laboral y muestra
   solo lo realmente disponible.
4. Al confirmar, el evento se crea en el **calendario primario de la cuenta de Heru** →
   la invitación sale de tu correo de Heru y el invitado la recibe por mail.

---

## Stack

- **Next.js 14** (App Router) + **TypeScript**
- **Appwrite** (Appwrite Cloud) para guardar tokens, calendarios y el historial de citas
- **googleapis** para OAuth, free/busy y crear eventos
- **luxon** para la matemática de zonas horarias en el servidor
- **Tailwind** para el estilo

---

## Puesta en marcha — TODO por el navegador, SIN terminal

Vas a usar 4 consolas web: **Google Cloud, Appwrite, GitHub y Vercel**. El `npm install`
y la compilación corren **en los servidores de Vercel**, no en tu compu. Tú no abres
terminal en ningún momento.

### 1. Google Cloud (OAuth)

1. Entra a <https://console.cloud.google.com/> y crea (o elige) un proyecto.
2. **APIs & Services → Library** → busca y habilita **Google Calendar API**.
3. **APIs & Services → OAuth consent screen**:
   - Tipo **External**.
   - Llena nombre de la app, correo de soporte, etc.
   - En **Scopes** no hace falta agregar nada a mano (la app los pide en tiempo de uso).
   - En **Test users**, agrega **tus 4 correos de Google** (los que vas a conectar).
     Mientras la app esté en modo *Testing*, esto permite que esas cuentas autoricen los
     permisos de calendario **sin** pasar por la verificación de Google. Ver nota abajo.
4. **APIs & Services → Credentials → Create Credentials → OAuth client ID**:
   - Tipo **Web application**.
   - Por ahora deja vacíos los redirect URIs (los agregas en el paso 5, cuando ya tengas
     tu dominio de Vercel).
   - Guarda y copia el **Client ID** y el **Client Secret**.

### 2. Appwrite

Todo por la consola web. El paso a paso con cada colección, atributo e índice está en
[`appwrite/SETUP.md`](appwrite/SETUP.md). En corto:

1. Crea cuenta y un **proyecto** en <https://cloud.appwrite.io>.
2. Crea una **Database** y las 3 colecciones (`accounts`, `calendars`, `bookings`) tal
   como indica `appwrite/SETUP.md`.
3. Crea una **API key** de servidor (scopes de *Databases*: al menos `documents.read`
   y `documents.write`).
4. Copia: `APPWRITE_ENDPOINT`, `APPWRITE_PROJECT_ID`, `APPWRITE_API_KEY`,
   `APPWRITE_DATABASE_ID` (los pondrás en Vercel en el paso 4).

### 3. Sube el código a GitHub (sin terminal)

Vercel necesita el código en un repo de GitHub. Dos maneras, ninguna usa terminal:

**Opción A — GitHub Desktop (la más fácil):**
1. Descomprime el `agenda.zip` (doble clic en Finder/Explorador).
2. Instala **GitHub Desktop** (app con interfaz gráfica): <https://desktop.github.com>
3. En GitHub Desktop: *File → Add local repository* → elige la carpeta `agenda`.
   Te dirá que aún no es un repo → *create a repository here* → *Create repository*.
4. Clic en *Publish repository* (puedes dejarlo **Private**). Ya quedó en GitHub.

**Opción B — Subirlo por la web:**
1. Crea un repo vacío en <https://github.com/new>.
2. En el repo → *Add file → Upload files* → arrastra **el contenido** de la carpeta
   `agenda` (lo de adentro, no la carpeta) → *Commit changes*.

### 4. Despliega en Vercel

1. Entra a <https://vercel.com> con tu cuenta de GitHub.
2. *Add New → Project → Import* el repo que creaste.
3. Vercel detecta Next.js solo. **Antes de dar Deploy**, abre **Environment Variables** y
   agrega todas las de [`.env.example`](.env.example): las de Google, las de Appwrite y
   `ADMIN_PASSWORD`. Para `GOOGLE_REDIRECT_URI` pon de momento cualquier valor temporal
   (lo arreglas en el paso 5).
4. **Deploy**. Vercel instala y compila en la nube. Al terminar te da tu URL pública
   (algo como `https://agenda-xxxx.vercel.app`).

### 5. Conecta el dominio con Google

1. Copia tu URL real de Vercel.
2. En **Google Cloud → Credentials → tu OAuth client → Authorized redirect URIs**, agrega:
   `https://TU-URL.vercel.app/api/auth/callback`
3. En **Vercel → Settings → Environment Variables**, corrige `GOOGLE_REDIRECT_URI` a esa
   misma URL. Luego **Deployments → (último) → ⋯ → Redeploy**.

### 6. Pon tus correos y conecta tus cuentas

1. Edita `config.ts` con tus 4 correos reales — sin terminal: en GitHub abre `config.ts`,
   clic en el lápiz (**Edit**), cambia los `accountEmail`, **Commit**. Vercel redespliega
   solo en segundos.
2. Entra a `https://TU-URL.vercel.app/connect`, mete tu `ADMIN_PASSWORD` y conecta tus 4
   cuentas de Google (acepta los permisos de calendario en cada una).
3. Abre `https://TU-URL.vercel.app/` para ver tu agenda como la verá la gente.

---

## Notas importantes

- **Verificación de Google.** Como la app pide scopes "sensibles" (calendario), Google
  normalmente exige verificar la app. Mientras esté en modo **Testing** con tus correos
  como **Test users**, funciona sin verificación. Solo verás una pantalla de "Google no ha
  verificado esta app" → *Avanzado → Continuar*. Como las únicas cuentas que autorizan son
  las tuyas, esto está bien. La gente que **agenda no autoriza nada**, así que a ellos no
  les afecta. Si algún día publicas la app (modo *Production* para terceros), ahí sí
  tendrías que pasar verificación.
- **Seguridad de la API key.** La `APPWRITE_API_KEY` y los tokens de Google dan acceso
  total. Solo se usan en el servidor (nunca en el cliente) y nunca deben subirse a git.
  El `.gitignore` ya excluye `.env.local`.
- **Qué calendarios cuentan como "ocupado".** Al conectar una cuenta, la app marca como
  *check_for_conflicts = true* los calendarios donde eres dueño/editor (incluido el
  primario). Si quieres que algún calendario **no** bloquee tu disponibilidad (o al revés),
  cambia ese valor en la colección `calendars` de Appwrite.
- **Limitaciones de esta v1.** No hay cancelación/reagenda desde la app (el invitado puede
  cancelar desde la propia invitación de Google), ni recordatorios extra más allá de los de
  Google Calendar, ni varios horarios partidos por día. Todo eso es fácil de agregar después
  si lo necesitas.

---

## (Opcional) Correr en tu compu

**Solo si quieres probar en local. Esto sí usa terminal y NO es necesario** para tener la
app en línea (Vercel ya la corre por ti).

```bash
cp .env.example .env.local   # y rellena los valores
npm install
npm run dev
```

Abre <http://localhost:3000/connect>. Para que el login con Google funcione en local,
agrega también `http://localhost:3000/api/auth/callback` como redirect URI en Google.

---

## Estructura

```
config.ts                    ← lo ÚNICO que editas para personalizar
appwrite/SETUP.md            ← cómo crear las colecciones en Appwrite (sin terminal)
lib/google.ts                ← OAuth, free/busy combinado, crear eventos
lib/availability.ts          ← cálculo de huecos libres
lib/appwrite.ts              ← cliente de Appwrite (server, API key)
app/page.tsx                 ← landing con los tipos de cita
app/book/[slug]/             ← página de reserva (una por tipo de cita)
app/connect/                 ← panel para conectar tus cuentas (protegido)
app/login/                   ← login de admin
app/api/availability/        ← devuelve horarios disponibles
app/api/book/                ← crea la cita
app/api/auth/                ← flujo de OAuth con Google + login
middleware.ts                ← protege /connect y las rutas de admin
```
