import { NextResponse } from "next/server";
import { getSql, COL, SELECT_ALL, Row } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const sql = getSql();
    const accounts = (await sql(
      `SELECT ${SELECT_ALL} FROM "${COL.accounts}" ORDER BY created_at ASC LIMIT 100`
    )) as Row[];

    const result = await Promise.all(
      accounts.map(async (a) => {
        const cals = (await sql(
          `SELECT ${SELECT_ALL} FROM "${COL.calendars}" WHERE account_id = $1 LIMIT 200`,
          [a.$id]
        )) as Row[];
        const conflictCalendars = cals.filter(
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
