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

  const applications = await prisma.application.findMany({
    where: { studentId },
    include: { scholarship: true, job: true },
    orderBy: { appliedAt: "desc" },
  });

  return NextResponse.json({ applications });
}

export async function POST(req: NextRequest) {
  const studentId = await getCurrentStudentId();
  if (!studentId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body?.scholarshipId && !body?.jobId) {
    return NextResponse.json({ error: "scholarshipId or jobId is required." }, { status: 400 });
  }

  const existing = await prisma.application.findFirst({
    where: {
      studentId,
      scholarshipId: body.scholarshipId ?? undefined,
      jobId: body.jobId ?? undefined,
    },
  });
  if (existing) {
    return NextResponse.json({ error: "You've already applied to this." }, { status: 409 });
  }

  const application = await prisma.application.create({
    data: {
      studentId,
      scholarshipId: body.scholarshipId ?? null,
      jobId: body.jobId ?? null,
    },
  });

  return NextResponse.json({ application }, { status: 201 });
}
