import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, STUDENT_SESSION_COOKIE } from "@/lib/auth";
import { getRecommendationsForStudent } from "@/lib/aggregator/recommend";

export async function GET() {
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });
  const session = await verifySession(token, "STUDENT");
  if (!session) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const student = await prisma.student.findUnique({ where: { userId: session.sub } });
  if (!student) return NextResponse.json({ error: "Student profile not found." }, { status: 404 });

  const recommendations = await getRecommendationsForStudent(student.id);
  return NextResponse.json({ recommendations });
}
