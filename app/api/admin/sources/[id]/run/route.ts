import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSource } from "@/lib/aggregator/runAggregation";

type Params = { params: Promise<{ id: string }> };

export async function POST(_req: Request, { params }: Params) {
  const { id } = await params;
  const source = await prisma.source.findUnique({ where: { id } });
  if (!source) return NextResponse.json({ error: "Source not found." }, { status: 404 });

  await runSource(source);

  const latestRun = await prisma.ingestRun.findFirst({ where: { sourceId: id }, orderBy: { startedAt: "desc" } });
  return NextResponse.json({ run: latestRun });
}
