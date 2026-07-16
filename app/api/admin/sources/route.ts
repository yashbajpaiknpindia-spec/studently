import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const sources = await prisma.source.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { jobs: true, scholarships: true, runs: true } } },
  });

  // Cumulative AI spend per source (0 for connectors that never call Claude).
  const costRows = await prisma.ingestRun.groupBy({
    by: ["sourceId"],
    _sum: { aiCostUsd: true },
  });
  const costBySource = new Map(costRows.map((r: (typeof costRows)[number]) => [r.sourceId, r._sum.aiCostUsd ?? 0]));

  return NextResponse.json({
    sources: sources.map((s: (typeof sources)[number]) => ({ ...s, aiCostUsd: costBySource.get(s.id) ?? 0 })),
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.name || !body?.kind || !body?.targetType || !body?.url) {
    return NextResponse.json({ error: "name, kind, targetType, and url are required." }, { status: 400 });
  }
  const source = await prisma.source.create({
    data: {
      name: body.name,
      kind: body.kind,
      targetType: body.targetType,
      url: body.url,
      config: body.config ?? {},
      enabled: body.enabled ?? true,
      fetchIntervalMins: body.fetchIntervalMins ?? 360,
    },
  });
  return NextResponse.json({ source });
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  const { id, ...updates } = body;
  const source = await prisma.source.update({ where: { id }, data: updates });
  return NextResponse.json({ source });
}

export async function DELETE(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "id is required." }, { status: 400 });
  await prisma.source.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
