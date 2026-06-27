import { notFound } from "next/navigation";
import { getSettings, findMeetingType } from "@/lib/settings";
import BookingClient from "./BookingClient";

export const dynamic = "force-dynamic";

export default async function Page({ params }: { params: { slug: string } }) {
  const settings = await getSettings();
  const mt = findMeetingType(settings, params.slug);
  if (!mt || mt.enabled === false) notFound();
  return (
    <BookingClient
      mt={mt}
      ownerName={settings.ownerName}
      ownerTimezone={settings.timezone}
      ownerLinkedin={settings.ownerLinkedin}
    />
  );
}
