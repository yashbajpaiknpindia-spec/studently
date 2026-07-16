import { NextResponse } from "next/server";
import { STUDENT_SESSION_COOKIE } from "@/lib/auth";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(STUDENT_SESSION_COOKIE, "", { path: "/", maxAge: 0 });
  return res;
}
