import { notFound } from "next/navigation";
import { findBookingByToken } from "@/lib/bookings";
import { getSettings, findMeetingType } from "@/lib/settings";
import ManageClient from "./ManageClient";

export const dynamic = "force-dynamic";

export default async function Page({
  params,
}: {
  params: { token: string };
}) {
  const doc = await findBookingByToken(params.token);
  if (!doc) notFound();
  const settings = await getSettings();
  const mt = findMeetingType(settings, doc.meeting_type);

  return (
    <ManageClient
      token={params.token}
      typeName={mt?.name ?? doc.meeting_type}
      ownerName={settings.ownerName}
      color={mt?.color ?? "#0EA5E9"}
      start={doc.start_time}
      end={doc.end_time}
      status={doc.status ?? "active"}
    />
  );
}
