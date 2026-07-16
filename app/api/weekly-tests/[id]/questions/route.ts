import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, ADMIN_SESSION_COOKIE } from "@/lib/auth";

type Params = { params: Promise<{ id: string }> };

// Students taking the test must never receive correctIndex in the response —
// it's trivially readable from the network tab and would let anyone answer
// every question correctly. Only an authenticated admin session (used by the
// weekly-scholarship-tests management screen) gets the answer key included.
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const questions = await prisma.question.findMany({
    where: { testId: id },
    orderBy: { order: "asc" },
  });

  const adminToken = (await cookies()).get(ADMIN_SESSION_COOKIE)?.value;
  const isAdmin = adminToken ? !!(await verifySession(adminToken, "ADMIN")) : false;

  if (isAdmin) return NextResponse.json({ questions });

  const safeQuestions = questions.map(({ correctIndex, ...q }: (typeof questions)[number]) => q);
  return NextResponse.json({ questions: safeQuestions });
}

export async function POST(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body?.text || !Array.isArray(body?.options) || body.options.length < 2) {
    return NextResponse.json(
      { error: "text and at least 2 options are required." },
      { status: 400 }
    );
  }
  if (typeof body.correctIndex !== "number" || body.correctIndex < 0 || body.correctIndex >= body.options.length) {
    return NextResponse.json({ error: "correctIndex must point to a valid option." }, { status: 400 });
  }

  const question = await prisma.question.create({
    data: {
      testId: id,
      text: body.text,
      options: body.options,
      correctIndex: body.correctIndex,
      order: body.order ?? 0,
    },
  });

  return NextResponse.json({ question }, { status: 201 });
}
