import { NextRequest, NextResponse } from "next/server";
import { handleCallback } from "@/lib/google";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const cookieState = req.cookies.get("oauth_state")?.value;

  if (!code || !state || !cookieState || state !== cookieState) {
    return NextResponse.redirect(new URL("/connect?error=state", req.url));
  }

  try {
    await handleCallback(code);
  } catch (e) {
    console.error("oauth callback error:", e);
    return NextResponse.redirect(new URL("/connect?error=oauth", req.url));
  }

  const res = NextResponse.redirect(new URL("/connect?connected=1", req.url));
  res.cookies.delete("oauth_state");
  return res;
}
