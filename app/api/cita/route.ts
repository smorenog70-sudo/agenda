import { NextRequest, NextResponse } from "next/server";
import { findBookingByToken } from "@/lib/bookings";
import { getSettings, findMeetingType } from "@/lib/settings";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? "";
  const doc = await findBookingByToken(token);
  if (!doc) {
    return NextResponse.json({ error: "Cita no encontrada." }, { status: 404 });
  }
  const settings = await getSettings();
  const mt = findMeetingType(settings, doc.meeting_type);
  return NextResponse.json({
    booking: {
      slug: doc.meeting_type,
      typeName: mt?.name ?? doc.meeting_type,
      inviteeName: doc.invitee_name,
      start: doc.start_time,
      end: doc.end_time,
      status: doc.status ?? "active",
    },
  });
}
