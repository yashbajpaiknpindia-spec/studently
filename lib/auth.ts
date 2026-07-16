import { SignJWT, jwtVerify } from "jose";

const encoder = new TextEncoder();

function getSecret() {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET is not set. Add it to .env.local — see .env.example.");
  }
  return encoder.encode(secret);
}

export const ADMIN_SESSION_COOKIE = "studently_admin_session";
export const STUDENT_SESSION_COOKIE = "studently_session";

export type SessionPayload = {
  sub: string;  // admin phone, or student userId for students
  role: "ADMIN" | "STUDENT";
};

/** Signs a session JWT. Works in both Node and Edge runtimes. */
export async function signSession(payload: SessionPayload, expiresIn = "30d"): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(getSecret());
}

/** Verifies a session JWT and optionally checks its role. Returns null if invalid/expired/wrong role. */
export async function verifySession(
  token: string,
  expectedRole?: SessionPayload["role"]
): Promise<SessionPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (typeof payload.sub !== "string" || (payload.role !== "ADMIN" && payload.role !== "STUDENT")) {
      return null;
    }
    if (expectedRole && payload.role !== expectedRole) return null;
    return payload as unknown as SessionPayload;
  } catch {
    return null;
  }
}

// --- Backwards-compatible admin-specific helpers (used by existing admin routes) ---

export type AdminSessionPayload = { sub: string; role: "ADMIN" };

export async function signAdminSession(payload: AdminSessionPayload): Promise<string> {
  return signSession(payload, "12h");
}

export async function verifyAdminSession(token: string): Promise<AdminSessionPayload | null> {
  const session = await verifySession(token, "ADMIN");
  return session as AdminSessionPayload | null;
}
