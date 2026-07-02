import { NextResponse } from "next/server";
import { Query } from "node-appwrite";
import { getDb, getDatabaseId, COL } from "@/lib/appwrite";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const db = getDb();
    const dbId = getDatabaseId();
    const accountsRes = await db.listDocuments(dbId, COL.accounts, [
      Query.orderAsc("$createdAt"),
      Query.limit(100),
    ]);

    const result = await Promise.all(
      accountsRes.documents.map(async (a) => {
        const calsRes = await db.listDocuments(dbId, COL.calendars, [
          Query.equal("account_id", [a.$id]),
          Query.limit(200),
        ]);
        const conflictCalendars = calsRes.documents.filter(
          (c) => c.check_for_conflicts
        ).length;
        return { email: a.email as string, conflictCalendars };
      })
    );

    return NextResponse.json({ accounts: result });
  } catch (e) {
    console.error("accounts error:", e);
    return NextResponse.json({ error: "Error al leer cuentas." }, { status: 500 });
  }
}
