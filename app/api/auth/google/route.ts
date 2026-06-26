import { NextRequest, NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { consentUrl } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(_req: NextRequest) {
  const state = randomBytes(16).toString("hex");
  const url = consentUrl(state);
  const res = NextResponse.redirect(url);
  res.cookies.set("oauth_state", state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });
  return res;
}
