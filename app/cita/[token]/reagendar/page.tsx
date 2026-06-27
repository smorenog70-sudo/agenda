import { notFound } from "next/navigation";
import { findBookingByToken } from "@/lib/bookings";
import { getSettings, findMeetingType } from "@/lib/settings";
import BookingClient from "@/app/book/[slug]/BookingClient";
import PromoBar from "@/app/_components/PromoBar";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { token: string };
}) {
  const doc = await findBookingByToken(params.token);
  if (!doc || doc.status === "cancelled") notFound();
  const settings = await getSettings();
  const mt = findMeetingType(settings, doc.meeting_type);
  if (!mt) notFound();

  const durationMin = Math.max(
    15,
    Math.round(
      (new Date(doc.end_time).getTime() - new Date(doc.start_time).getTime()) /
        60000
    )
  );

  return (
    <>
      <PromoBar url={settings.signupUrl} />
      <BookingClient
        mt={mt}
        ownerName={settings.ownerName}
        ownerTimezone={settings.timezone}
        ownerLinkedin={settings.ownerLinkedin}
        reschedule={{ token: params.token, durationMinutes: durationMin }}
      />
    </>
  );
}
