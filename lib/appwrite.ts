import { Client, Databases, ID, Query, Models } from "node-appwrite";

// Cliente de Appwrite (solo servidor — usa una API key, NUNCA exponer en el cliente).
// Se inicializa de forma perezosa para que el `build` no falle si faltan variables.
let cached: Databases | null = null;

export function getDb(): Databases {
  if (cached) return cached;
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !apiKey) {
    throw new Error(
      "Faltan APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID o APPWRITE_API_KEY en el entorno."
    );
  }
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);
  cached = new Databases(client);
  return cached;
}

export function getDatabaseId(): string {
  const id = process.env.APPWRITE_DATABASE_ID;
  if (!id) throw new Error("Falta APPWRITE_DATABASE_ID en el entorno.");
  return id;
}

// IDs de las colecciones — deben coincidir EXACTO con los que creas en Appwrite.
export const COL = {
  accounts: "accounts",
  calendars: "calendars",
  bookings: "bookings",
} as const;

// Quita claves undefined/null para no chocar con los atributos de Appwrite.
function clean(data: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(data)) {
    if (v !== undefined && v !== null) out[k] = v;
  }
  return out;
}

// "Upsert" manual: Appwrite no tiene upsert por atributo. Buscamos por un campo
// único; si existe, actualizamos; si no, creamos. (El campo debe tener índice.)
export async function upsertByField(
  collectionId: string,
  field: string,
  value: string,
  data: Record<string, unknown>
): Promise<Models.Document> {
  const db = getDb();
  const dbId = getDatabaseId();
  const found = await db.listDocuments(dbId, collectionId, [
    Query.equal(field, [value]),
    Query.limit(1),
  ]);
  if (found.documents.length > 0) {
    return db.updateDocument(dbId, collectionId, found.documents[0].$id, clean(data));
  }
  return db.createDocument(dbId, collectionId, ID.unique(), clean(data));
}

// Busca un documento por un campo (con índice) y devuelve el primero o null.
export async function findOneByField(
  collectionId: string,
  field: string,
  value: string
): Promise<Models.Document | null> {
  const db = getDb();
  const dbId = getDatabaseId();
  const found = await db.listDocuments(dbId, collectionId, [
    Query.equal(field, [value]),
    Query.limit(1),
  ]);
  return found.documents[0] ?? null;
}

// Crea un documento con un ID único (limpiando nulls/undefined).
export async function createDoc(
  collectionId: string,
  data: Record<string, unknown>
): Promise<Models.Document> {
  const db = getDb();
  return db.createDocument(getDatabaseId(), collectionId, ID.unique(), clean(data));
}
