import { NextResponse } from "next/server";
import { getSql, COL, Row } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getSql();
    const rows = (await sql(
      `SELECT *, id AS "$id", created_at AS "$createdAt"
       FROM "${COL.waitlist}" ORDER BY created_at DESC LIMIT 200`
    )) as Row[];
    const items = rows.map((d) => ({
      id: d.$id,
      email: (d as { email?: string }).email,
      source: (d as { source?: string }).source ?? "",
      createdAt: d.$createdAt,
    }));
    return NextResponse.json({ total: items.length, items });
  } catch (e) {
    console.error("admin waitlist GET error:", e);
    return NextResponse.json(
      { error: "No se pudo leer la lista de espera." },
      { status: 500 }
    );
  }
}
