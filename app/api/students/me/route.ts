import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, STUDENT_SESSION_COOKIE } from "@/lib/auth";

async function getCurrentUserId(): Promise<string | null> {
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, "STUDENT");
  return session?.sub ?? null;
}

export async function GET() {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const user = await prisma.user.findUnique({
    where: { id: userId },
    include: {
      student: {
        include: {
          _count: { select: { applications: true, savedItems: true, testAttempts: true } },
        },
      },
    },
  });

  if (!user?.student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  return NextResponse.json({
    student: user.student,
    phone: user.phone,
    email: user.email,
  });
}

export async function PATCH(req: NextRequest) {
  const userId = await getCurrentUserId();
  if (!userId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body." }, { status: 400 });

  const user = await prisma.user.findUnique({ where: { id: userId }, include: { student: true } });
  if (!user?.student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  // Recompute a simple profile completion score from filled fields.
  const fields = {
    city: body.city ?? user.student.city,
    qualification: body.qualification ?? user.student.qualification,
    institution: body.institution ?? user.student.institution,
    branch: body.branch ?? user.student.branch,
  };
  const filledCount = Object.values(fields).filter(Boolean).length;
  const profileCompletion = Math.min(100, 20 + filledCount * 20);

  const student = await prisma.student.update({
    where: { id: user.student.id },
    data: {
      ...(body.city !== undefined ? { city: body.city } : {}),
      ...(body.qualification !== undefined ? { qualification: body.qualification } : {}),
      ...(body.institution !== undefined ? { institution: body.institution } : {}),
      ...(body.branch !== undefined ? { branch: body.branch } : {}),
      profileCompletion,
    },
  });

  return NextResponse.json({ student });
}
