import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { signSession, STUDENT_SESSION_COOKIE } from "@/lib/auth";
import { fetchGoogleProfile, getGoogleRedirectUri, GOOGLE_OAUTH_STATE_COOKIE } from "@/lib/google-oauth";
import { getRequestOrigin, buildAppUrl } from "@/lib/request-origin";

function redirectToAuthError(req: NextRequest, message: string) {
  const url = buildAppUrl(req, "/auth", `?error=${encodeURIComponent(message)}`);
  const res = NextResponse.redirect(url);
  res.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
  return res;
}

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  const state = req.nextUrl.searchParams.get("state");
  const oauthError = req.nextUrl.searchParams.get("error");

  if (oauthError) {
    // User denied consent, or Google returned an error — not a bug, just decline gracefully.
    return redirectToAuthError(req, "Google sign-in was cancelled.");
  }

  const stateCookie = req.cookies.get(GOOGLE_OAUTH_STATE_COOKIE)?.value;
  if (!code || !state || !stateCookie || state !== stateCookie) {
    return redirectToAuthError(req, "Your sign-in link expired or is invalid. Please try again.");
  }

  let next = "/dashboard";
  try {
    const decoded = JSON.parse(Buffer.from(stateCookie, "base64url").toString("utf8"));
    if (typeof decoded?.next === "string") next = decoded.next;
  } catch {
    // Malformed state payload — fall back to the default redirect rather than failing the whole login.
  }

  let profile;
  try {
    profile = await fetchGoogleProfile(code, getGoogleRedirectUri(getRequestOrigin(req)));
  } catch {
    return redirectToAuthError(req, "Couldn't verify your Google account. Please try again.");
  }

  // Only trust Google-verified emails for account creation/linking — an
  // unverified email could belong to someone else.
  if (!profile.email_verified) {
    return redirectToAuthError(req, "Your Google email isn't verified. Please verify it with Google first.");
  }

  try {
    let user = await prisma.user.findUnique({ where: { googleId: profile.sub }, include: { student: true } });
    let isNewUser = false;

    if (!user) {
      const existingByEmail = await prisma.user.findUnique({ where: { email: profile.email }, include: { student: true } });
      if (existingByEmail) {
        // Same verified email as an existing password-based account — link Google
        // to it rather than creating a duplicate.
        user = await prisma.user.update({
          where: { id: existingByEmail.id },
          data: { googleId: profile.sub, avatarUrl: profile.picture ?? existingByEmail.avatarUrl },
          include: { student: true },
        });
      } else {
        user = await prisma.user.create({
          data: {
            email: profile.email,
            googleId: profile.sub,
            avatarUrl: profile.picture,
            role: "STUDENT",
            student: {
              create: {
                fullName: profile.name || profile.email.split("@")[0],
                profileCompletion: 20,
              },
            },
          },
          include: { student: true },
        });
        isNewUser = true;
      }
    }

    if (user.role !== "STUDENT") {
      return redirectToAuthError(req, "This Google account can't be used to sign in here.");
    }

    const token = await signSession({ sub: user.id, role: "STUDENT" });

    const url = buildAppUrl(
      req,
      "/auth",
      isNewUser ? `?newUser=1&next=${encodeURIComponent(next)}` : `?googleLogin=1&next=${encodeURIComponent(next)}`
    );

    const res = NextResponse.redirect(url);
    res.cookies.delete(GOOGLE_OAUTH_STATE_COOKIE);
    res.cookies.set(STUDENT_SESSION_COOKIE, token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: 60 * 60 * 24 * 30,
    });
    return res;
  } catch (err) {
    // Log the real cause server-side (visible in Render's logs) — e.g. a
    // database schema mismatch or connection issue — while showing the user
    // a clean, non-technical redirect instead of a raw 500.
    console.error("[google-oauth-callback] failed after profile fetch:", err);
    return redirectToAuthError(req, "Something went wrong finishing your sign-in. Please try again.");
  }
}
