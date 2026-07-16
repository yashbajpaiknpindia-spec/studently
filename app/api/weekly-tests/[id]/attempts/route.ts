import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, STUDENT_SESSION_COOKIE } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

async function getCurrentStudent() {
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, "STUDENT");
  if (!session) return null;
  return prisma.student.findUnique({ where: { userId: session.sub } });
}

// Returns the live leaderboard for a test: top 100 scorers, plus the current
// student's own rank (even if outside the top 100) so the UI can always show
// "you're #N" the way the product promises.
export async function GET(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const student = await getCurrentStudent();

  const attempts = await prisma.testAttempt.findMany({
    where: { testId: id, submittedAt: { not: null } },
    orderBy: [{ score: "desc" }, { submittedAt: "asc" }],
    include: { student: { select: { fullName: true, city: true } } },
  });

  const ranked = attempts.map((a: (typeof attempts)[number], i: number) => ({
    rank: i + 1,
    studentId: a.studentId,
    name: a.student.fullName,
    city: a.student.city,
    score: a.score,
    me: student ? a.studentId === student.id : false,
  }));

  const top = ranked.slice(0, 100);
  const me = student ? ranked.find((r: (typeof ranked)[number]) => r.studentId === student.id) ?? null : null;
  const leaderboard = me && !top.some((r: (typeof ranked)[number]) => r.studentId === me.studentId) ? [...top, me] : top;

  return NextResponse.json({ leaderboard, totalAttempts: attempts.length });
}

// Submits (or re-submits, before the deadline hasn't been enforced client-side —
// the unique constraint on [studentId, testId] means a student can only have one
// attempt per test) a student's answers, scores them server-side against the
// stored correctIndex so the score can never be spoofed from the client.
export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const student = await getCurrentStudent();
  if (!student) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const test = await prisma.weeklyTest.findUnique({ where: { id } });
  if (!test) return NextResponse.json({ error: "Test not found." }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body?.answers || typeof body.answers !== "object") {
    return NextResponse.json({ error: "answers ({ questionId: selectedIndex }) is required." }, { status: 400 });
  }

  const existing = await prisma.testAttempt.findUnique({
    where: { studentId_testId: { studentId: student.id, testId: id } },
  });
  if (existing?.submittedAt) {
    return NextResponse.json({ error: "You've already submitted this test." }, { status: 409 });
  }

  const questions = await prisma.question.findMany({ where: { testId: id } });
  let correct = 0;
  for (const q of questions) {
    const selected = body.answers[q.id];
    if (typeof selected === "number" && selected === q.correctIndex) correct += 1;
  }
  const score = questions.length > 0 ? Math.round((correct / questions.length) * 100) : 0;

  const attempt = await prisma.testAttempt.upsert({
    where: { studentId_testId: { studentId: student.id, testId: id } },
    create: {
      studentId: student.id,
      testId: id,
      answers: body.answers,
      score,
      submittedAt: new Date(),
    },
    update: {
      answers: body.answers,
      score,
      submittedAt: new Date(),
    },
  });

  const rank =
    (await prisma.testAttempt.count({
      where: { testId: id, submittedAt: { not: null }, score: { gt: score } },
    })) + 1;

  await prisma.student.update({
    where: { id: student.id },
    data: { xp: { increment: correct * 10 } },
  });

  return NextResponse.json({ attempt, score, correctCount: correct, totalQuestions: questions.length, rank });
}
