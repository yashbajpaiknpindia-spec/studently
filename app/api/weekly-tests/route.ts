import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const category = searchParams.get("category");

  const tests = await prisma.weeklyTest.findMany({
    where: category ? { category: category as any } : undefined,
    include: { _count: { select: { questions: true, attempts: true } } },
    orderBy: { startsAt: "desc" },
  });

  return NextResponse.json({ tests });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.category || !body?.weekNumber || !body?.startsAt || !body?.endsAt) {
    return NextResponse.json(
      { error: "title, category, weekNumber, startsAt and endsAt are required." },
      { status: 400 }
    );
  }

  const test = await prisma.weeklyTest.create({
    data: {
      title: body.title,
      category: body.category,
      weekNumber: Number(body.weekNumber),
      startsAt: new Date(body.startsAt),
      endsAt: new Date(body.endsAt),
      durationMins: Number(body.durationMins ?? 45),
      scholarshipPoolAmount: Number(body.scholarshipPoolAmount ?? 0),
    },
  });

  return NextResponse.json({ test }, { status: 201 });
}
