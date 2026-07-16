import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { buildGoogleAuthorizeUrl, getGoogleRedirectUri, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { getRequestOrigin, buildAppUrl } from "@/lib/request-origin";

export async function GET(req: NextRequest) {
  const next = req.nextUrl.searchParams.get("next") ?? "/dashboard";

  // The state value is CSRF protection: we store a random token in an httpOnly
  // cookie now, and check the callback's ?state= matches it before trusting the
  // response. The intended post-login redirect rides along in the same cookie
  // (base64 JSON) rather than in the URL, so it can't be tampered with in transit.
  const csrf = crypto.randomBytes(24).toString("hex");
  const statePayload = Buffer.from(JSON.stringify({ csrf, next })).toString("base64url");

  let authorizeUrl: string;
  try {
    authorizeUrl = buildGoogleAuthorizeUrl({
      state: statePayload,
      redirectUri: getGoogleRedirectUri(getRequestOrigin(req)),
    });
  } catch (e: any) {
    // Most likely GOOGLE_CLIENT_ID isn't configured yet — fail back to the auth
    // page with a clear message instead of a raw 500.
    const url = buildAppUrl(req, "/auth", `?error=${encodeURIComponent("Google sign-in isn't configured yet.")}`);
    return NextResponse.redirect(url);
  }

  const res = NextResponse.redirect(authorizeUrl);
  res.cookies.set(GOOGLE_OAUTH_STATE_COOKIE, statePayload, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 10, // 10 minutes — this only needs to survive the round trip to Google and back
  });
  return res;
}
