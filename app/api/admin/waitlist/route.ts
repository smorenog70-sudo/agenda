import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getDb, getDatabaseId, COL } from "@/lib/appwrite";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const res = await db.listDocuments(getDatabaseId(), COL.waitlist, [
      Query.orderDesc("$createdAt"),
      Query.limit(200),
    ]);
    const items = res.documents.map((d) => ({
      id: d.$id,
      email: (d as unknown as { email: string }).email,
      source: (d as unknown as { source?: string }).source ?? "",
      createdAt: d.$createdAt,
    }));
    return NextResponse.json({ total: res.total, items });
  } catch (e) {
    console.error("admin waitlist GET error:", e);
    return NextResponse.json(
      { error: "No se pudo leer la lista de espera." },
      { status: 500 }
    );
  }
}
