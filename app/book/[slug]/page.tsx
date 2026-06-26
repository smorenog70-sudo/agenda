import { notFound } from "next/navigation";
import { getMeetingType, OWNER_NAME, TIMEZONE } from "@/config";
import BookingClient from "./BookingClient";

export const dynamic = "force-dynamic";

export default function Page({ params }: { params: { slug: string } }) {
  const mt = getMeetingType(params.slug);
  if (!mt) notFound();
  return (
    <BookingClient mt={mt} ownerName={OWNER_NAME} ownerTimezone={TIMEZONE} />
  );
}
