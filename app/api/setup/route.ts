import { NextResponse } from "next/server";
import { Client, Databases, IndexType } from "node-appwrite";
import { getDatabaseId } from "@/lib/appwrite";
import { SCHEMA } from "@/lib/schema";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

// Cliente con la API key (necesita scopes de Databases para crear todo).
function adminDb(): Databases {
  const endpoint = process.env.APPWRITE_ENDPOINT;
  const project = process.env.APPWRITE_PROJECT_ID;
  const apiKey = process.env.APPWRITE_API_KEY;
  if (!endpoint || !project || !apiKey) {
    throw new Error(
      "Faltan APPWRITE_ENDPOINT, APPWRITE_PROJECT_ID o APPWRITE_API_KEY."
    );
  }
  const client = new Client()
    .setEndpoint(endpoint)
    .setProject(project)
    .setKey(apiKey);
  return new Databases(client);
}

// Appwrite devuelve 409 cuando algo ya existe → lo tratamos como "ya estaba".
function isConflict(e: unknown): boolean {
  const code = (e as { code?: number })?.code;
  const type = (e as { type?: string })?.type;
  return code === 409 || (typeof type === "string" && type.includes("already_exists"));
}

function msg(e: unknown): string {
  return e instanceof Error ? e.message : String(e);
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

function createAttribute(db: Databases, dbId: string, colId: string, attr: (typeof SCHEMA)[number]["attributes"][number]) {
  if (attr.type === "string") {
    return db.createStringAttribute(dbId, colId, attr.name, attr.size, attr.required, attr.default);
  }
  if (attr.type === "integer") {
    return db.createIntegerAttribute(dbId, colId, attr.name, attr.required, undefined, undefined, attr.default);
  }
  return db.createBooleanAttribute(dbId, colId, attr.name, attr.required, attr.default);
}

export async function POST() {
  const created: string[] = [];
  const existing: string[] = [];
  const pending: string[] = [];
  const errors: string[] = [];

  let db: Databases;
  let dbId: string;
  try {
    db = adminDb();
    dbId = getDatabaseId();
  } catch (e) {
    return NextResponse.json({ ok: false, error: msg(e) }, { status: 400 });
  }

  // Ejecuta una operación de creación y la clasifica: creada / ya existía / error.
  // Se hace en paralelo para no exceder el límite de tiempo de la función serverless.
  async function attempt(label: string, fn: () => Promise<unknown>) {
    try {
      await fn();
      created.push(label);
    } catch (e) {
      if (isConflict(e)) existing.push(label);
      else errors.push(`${label}: ${msg(e)}`);
    }
  }

  // 1. Base de datos
  await attempt(`Base de datos "${dbId}"`, () => db.create(dbId, "Agenda"));

  // 2. Colecciones (en paralelo)
  await Promise.all(
    SCHEMA.map((col) =>
      attempt(`Colección "${col.id}"`, () => db.createCollection(dbId, col.id, col.name))
    )
  );

  // 3. Atributos de todas las colecciones (en paralelo)
  await Promise.all(
    SCHEMA.flatMap((col) =>
      col.attributes.map((attr) =>
        attempt(`  ${col.id}.${attr.name}`, () => createAttribute(db, dbId, col.id, attr))
      )
    )
  );

  // 4. Espera acotada (máx ~5s) a que los atributos estén "available" para indexarlos.
  //    Consultamos todas las colecciones en paralelo para no gastar el presupuesto.
  const withIndexes = SCHEMA.filter((c) => c.indexes.length > 0).map((c) => ({
    id: c.id,
    keys: new Set(c.indexes.flatMap((i) => i.attributes)),
  }));
  const deadline = Date.now() + 5000;
  while (withIndexes.length > 0 && Date.now() < deadline) {
    const ready = await Promise.all(
      withIndexes.map(async (c) => {
        try {
          const res = await db.listAttributes(dbId, c.id);
          const status = new Map(
            (res.attributes as unknown as Array<{ key: string; status: string }>).map(
              (a) => [a.key, a.status]
            )
          );
          return Array.from(c.keys).every((k) => status.get(k) === "available");
        } catch {
          return false;
        }
      })
    );
    if (ready.every(Boolean)) break;
    await sleep(1000);
  }

  // 5. Índices (en paralelo). Si un atributo aún no está listo, el índice falla y lo
  //    dejamos "pendiente": basta con volver a darle al botón para terminarlo.
  await Promise.all(
    SCHEMA.flatMap((col) =>
      col.indexes.map(async (idx) => {
        const label = `  índice ${col.id}.${idx.name}`;
        try {
          const type = idx.type === "unique" ? IndexType.Unique : IndexType.Key;
          const orders = idx.attributes.map(() => "ASC");
          await db.createIndex(dbId, col.id, idx.name, type, idx.attributes, orders);
          created.push(label);
        } catch (e) {
          if (isConflict(e)) existing.push(label);
          else pending.push(label);
        }
      })
    )
  );

  const ok = errors.length === 0 && pending.length === 0;
  return NextResponse.json({ ok, created, existing, pending, errors });
}
