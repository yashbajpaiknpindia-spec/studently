import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, STUDENT_SESSION_COOKIE } from "@/lib/auth";

async function getCurrentStudentId(): Promise<string | null> {
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, "STUDENT");
  if (!session) return null;
  const student = await prisma.student.findUnique({ where: { userId: session.sub } });
  return student?.id ?? null;
}

export async function GET() {
  const studentId = await getCurrentStudentId();
  if (!studentId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const savedItems = await prisma.savedItem.findMany({ where: { studentId }, orderBy: { createdAt: "desc" } });
  return NextResponse.json({ savedItems });
}

// Toggles a saved item: creates it if it doesn't exist, deletes it if it does.
export async function POST(req: NextRequest) {
  const studentId = await getCurrentStudentId();
  if (!studentId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.scholarshipId && !body?.jobId) {
    return NextResponse.json({ error: "scholarshipId or jobId is required." }, { status: 400 });
  }

  const existing = await prisma.savedItem.findFirst({
    where: { studentId, scholarshipId: body.scholarshipId ?? undefined, jobId: body.jobId ?? undefined },
  });

  if (existing) {
    await prisma.savedItem.delete({ where: { id: existing.id } });
    return NextResponse.json({ saved: false });
  }

  await prisma.savedItem.create({
    data: { studentId, scholarshipId: body.scholarshipId ?? null, jobId: body.jobId ?? null },
  });
  return NextResponse.json({ saved: true }, { status: 201 });
}
