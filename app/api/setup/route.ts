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

  // 1. Base de datos
  try {
    await db.create(dbId, "Agenda");
    created.push(`Base de datos "${dbId}"`);
  } catch (e) {
    if (isConflict(e)) existing.push(`Base de datos "${dbId}"`);
    else errors.push(`Base de datos: ${msg(e)}`);
  }

  // 2. Colecciones + atributos
  for (const col of SCHEMA) {
    try {
      await db.createCollection(dbId, col.id, col.name);
      created.push(`Colección "${col.id}"`);
    } catch (e) {
      if (isConflict(e)) existing.push(`Colección "${col.id}"`);
      else errors.push(`Colección "${col.id}": ${msg(e)}`);
    }

    for (const attr of col.attributes) {
      try {
        if (attr.type === "string") {
          await db.createStringAttribute(
            dbId,
            col.id,
            attr.name,
            attr.size,
            attr.required,
            attr.default
          );
        } else if (attr.type === "integer") {
          await db.createIntegerAttribute(
            dbId,
            col.id,
            attr.name,
            attr.required,
            undefined,
            undefined,
            attr.default
          );
        } else {
          await db.createBooleanAttribute(
            dbId,
            col.id,
            attr.name,
            attr.required,
            attr.default
          );
        }
        created.push(`  ${col.id}.${attr.name}`);
      } catch (e) {
        if (isConflict(e)) existing.push(`  ${col.id}.${attr.name}`);
        else errors.push(`  ${col.id}.${attr.name}: ${msg(e)}`);
      }
    }
  }

  // 3. Esperar (brevemente) a que los atributos estén "available" para indexarlos.
  for (const col of SCHEMA) {
    if (col.indexes.length === 0) continue;
    const needed = new Set(col.indexes.flatMap((i) => i.attributes));
    const deadline = Date.now() + 6000;
    while (Date.now() < deadline) {
      try {
        const res = await db.listAttributes(dbId, col.id);
        const list = res.attributes as unknown as Array<{
          key: string;
          status: string;
        }>;
        const status = new Map(list.map((a) => [a.key, a.status]));
        if (Array.from(needed).every((k) => status.get(k) === "available")) break;
      } catch {
        // si falla la lectura, reintentamos en el siguiente ciclo
      }
      await sleep(1200);
    }
  }

  // 4. Índices
  for (const col of SCHEMA) {
    for (const idx of col.indexes) {
      try {
        const type = idx.type === "unique" ? IndexType.Unique : IndexType.Key;
        const orders = idx.attributes.map(() => "ASC");
        await db.createIndex(dbId, col.id, idx.name, type, idx.attributes, orders);
        created.push(`  índice ${col.id}.${idx.name}`);
      } catch (e) {
        if (isConflict(e)) existing.push(`  índice ${col.id}.${idx.name}`);
        // Si el atributo aún no estaba listo, lo dejamos pendiente para reintentar.
        else pending.push(`  índice ${col.id}.${idx.name}`);
      }
    }
  }

  const ok = errors.length === 0 && pending.length === 0;
  return NextResponse.json({ ok, created, existing, pending, errors });
}
