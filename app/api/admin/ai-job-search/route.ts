import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { runSource } from "@/lib/aggregator/runAggregation";

/** Deterministic key for a search query, so re-running "the same" search reuses
 *  its Source (and therefore its externalId space) instead of creating a new
 *  one every time — this is what makes reruns UPDATE existing listings rather
 *  than duplicate them. */
function queryKey(query: string, targetType: string): string {
  const norm = query.toLowerCase().replace(/\s+/g, " ").trim();
  let hash = 5381;
  const key = `${norm}|${targetType}`;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

export async function GET() {
  const sources = await prisma.source.findMany({
    where: { kind: "AI_DEEP_SEARCH" },
    orderBy: { createdAt: "desc" },
    include: {
      _count: { select: { jobs: true, scholarships: true } },
      runs: { orderBy: { startedAt: "desc" }, take: 5 },
    },
  });

  const totals = await prisma.ingestRun.aggregate({
    where: { source: { kind: "AI_DEEP_SEARCH" } },
    _sum: { aiCostUsd: true, aiInputTokens: true, aiOutputTokens: true, aiWebSearches: true, itemsCreated: true, itemsUpdated: true },
  });

  return NextResponse.json({
    searches: sources,
    totals: {
      costUsd: totals._sum.aiCostUsd ?? 0,
      inputTokens: totals._sum.aiInputTokens ?? 0,
      outputTokens: totals._sum.aiOutputTokens ?? 0,
      webSearches: totals._sum.aiWebSearches ?? 0,
      jobsCreated: totals._sum.itemsCreated ?? 0,
      jobsUpdated: totals._sum.itemsUpdated ?? 0,
    },
  });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const query = typeof body?.query === "string" ? body.query.trim() : "";
  if (!query) return NextResponse.json({ error: "query is required." }, { status: 400 });

  const targetType = body?.targetType === "INTERNSHIP" || body?.targetType === "SCHOLARSHIP" ? body.targetType : "JOB";
  const locations: string[] = Array.isArray(body?.locations) ? body.locations.filter((s: unknown) => typeof s === "string" && s.trim()) : [];
  const keywords: string[] = Array.isArray(body?.keywords) ? body.keywords.filter((s: unknown) => typeof s === "string" && s.trim()) : [];
  const maxResults = Math.min(Math.max(Number(body?.maxResults) || 15, 3), 30);

  const key = queryKey(query, targetType);
  const config = { query, locations, keywords, targetType, maxResults, key };

  // Find-or-create the persistent Source for this exact search so re-triggering
  // it updates existing listings (via ingestSourceId+externalId upsert in
  // persist.ts) instead of creating duplicates.
  let source = await prisma.source.findFirst({
    where: { kind: "AI_DEEP_SEARCH", config: { path: ["key"], equals: key } },
  });

  if (source) {
    source = await prisma.source.update({
      where: { id: source.id },
      data: { config, enabled: true, name: `AI deep search — ${query}`.slice(0, 120) },
    });
  } else {
    source = await prisma.source.create({
      data: {
        name: `AI deep search — ${query}`.slice(0, 120),
        kind: "AI_DEEP_SEARCH",
        targetType,
        url: "ai://deep-search", // no fixed feed URL for this connector — query lives in config
        config,
        enabled: true,
        fetchIntervalMins: 1440, // admin-triggered primarily; scheduler will also re-run it once/day if left enabled
      },
    });
  }

  await runSource(source);

  const run = await prisma.ingestRun.findFirst({ where: { sourceId: source.id }, orderBy: { startedAt: "desc" } });

  // Pull back the listings this run touched (created or refreshed) so the
  // admin sees exactly what got added/updated on the platform, not just counts.
  const listings =
    targetType === "SCHOLARSHIP"
      ? await prisma.scholarship.findMany({ where: { ingestSourceId: source.id }, orderBy: { updatedAt: "desc" }, take: 30 })
      : await prisma.job.findMany({ where: { ingestSourceId: source.id }, orderBy: { updatedAt: "desc" }, take: 30 });

  return NextResponse.json({ source, run, listings });
}
