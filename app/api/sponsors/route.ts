import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sponsors = await prisma.sponsor.findMany({
    include: { _count: { select: { scholarships: true } } },
    orderBy: { totalPledged: "desc" },
  });
  return NextResponse.json({ sponsors });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name) return NextResponse.json({ error: "name is required." }, { status: 400 });

  const sponsor = await prisma.sponsor.create({
    data: {
      name: body.name,
      logoUrl: body.logoUrl ?? null,
      totalPledged: Number(body.totalPledged ?? 0),
    },
  });

  return NextResponse.json({ sponsor }, { status: 201 });
}
