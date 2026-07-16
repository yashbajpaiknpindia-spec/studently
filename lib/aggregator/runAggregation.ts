import { prisma } from "@/lib/prisma";
import type { Source } from "@prisma/client";
import type { ConnectorResult, NormalizedOpportunity, RawItem } from "./types";
import { fetchGreenhouse } from "./connectors/greenhouse";
import { fetchLever } from "./connectors/lever";
import { fetchRss } from "./connectors/rss";
import { fetchJsonApi } from "./connectors/jsonApi";
import { fetchPartnerFeed } from "./connectors/partnerFeed";
import { fetchNoticeBoard } from "./connectors/noticeBoard";
import { fetchAiDeepSearch } from "./connectors/aiDeepSearch";
import { normalizeWithAI } from "./normalize";
import { reconcileCategory } from "./categorize";
import { persistJob, persistScholarship } from "./persist";
import { runExpirySweep } from "./expire";
import { addUsage, computeCostUsd, ZERO_USAGE, type AiUsage } from "./aiCost";

async function runConnector(source: Source): Promise<ConnectorResult> {
  const config = (source.config as Record<string, unknown>) ?? {};
  switch (source.kind) {
    case "GREENHOUSE_API":
      return fetchGreenhouse(config);
    case "LEVER_API":
      return fetchLever(config);
    case "RSS_FEED":
      return fetchRss(config, source.url);
    case "JSON_API":
      return fetchJsonApi(config, source.url);
    case "PARTNER_FEED":
      return fetchPartnerFeed(config, source.url);
    case "NOTICE_BOARD":
      return fetchNoticeBoard(config, source.url);
    case "AI_DEEP_SEARCH":
      return fetchAiDeepSearch(config);
    default:
      throw new Error(`Unknown source kind: ${source.kind}`);
  }
}

/** Runs a single Source end-to-end: fetch → normalize → categorize → persist. Always writes an IngestRun row. */
export async function runSource(source: Source): Promise<void> {
  const run = await prisma.ingestRun.create({ data: { sourceId: source.id, status: "RUNNING" } });
  const counts = { created: 0, updated: 0, skipped: 0 };

  let usage: AiUsage = ZERO_USAGE;

  try {
    const connectorResult = await runConnector(source);
    const { items, warnings } = connectorResult;
    if (connectorResult.usage) usage = addUsage(usage, connectorResult.usage);

    // AI_DEEP_SEARCH already normalizes in the same call that found the
    // listings — re-running normalizeWithAI on it would spend tokens a
    // second time for no benefit, so we use its output directly.
    let normalized: NormalizedOpportunity[];
    if (connectorResult.alreadyNormalized) {
      normalized = connectorResult.alreadyNormalized;
    } else {
      const outcome = await normalizeWithAI(items, source.targetType);
      normalized = outcome.results;
      usage = addUsage(usage, outcome.usage);
    }

    const rawById = new Map<string, RawItem>(items.map((it) => [it.externalId, it]));

    for (const rawNormalized of normalized) {
      const o = reconcileCategory(rawNormalized);
      const raw = findMatchingRaw(rawById, o.applyUrl);
      if (!raw) {
        counts.skipped++;
        continue;
      }
      const result =
        o.kind === "SCHOLARSHIP" ? await persistScholarship(source.id, raw, o) : await persistJob(source.id, raw, o);
      counts[result === "created" ? "created" : result === "updated" ? "updated" : "skipped"]++;
    }

    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: "SUCCESS",
        finishedAt: new Date(),
        itemsFetched: items.length,
        itemsCreated: counts.created,
        itemsUpdated: counts.updated,
        itemsSkipped: counts.skipped + warnings.length,
        error: warnings.length ? warnings.slice(0, 10).join(" | ") : null,
        aiInputTokens: usage.inputTokens,
        aiOutputTokens: usage.outputTokens,
        aiWebSearches: usage.webSearches,
        aiCostUsd: computeCostUsd(usage),
      },
    });
    await prisma.source.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastSuccessAt: new Date(), lastError: null } });
  } catch (err: any) {
    const message = err?.message ?? "Unknown error";
    await prisma.ingestRun.update({
      where: { id: run.id },
      data: {
        status: "FAILED",
        finishedAt: new Date(),
        error: message,
        itemsCreated: counts.created,
        itemsUpdated: counts.updated,
        itemsSkipped: counts.skipped,
        aiInputTokens: usage.inputTokens,
        aiOutputTokens: usage.outputTokens,
        aiWebSearches: usage.webSearches,
        aiCostUsd: computeCostUsd(usage),
      },
    });
    await prisma.source.update({ where: { id: source.id }, data: { lastRunAt: new Date(), lastError: message } });
  }
}

function findMatchingRaw(rawById: Map<string, RawItem>, applyUrl: string): RawItem | undefined {
  for (const raw of rawById.values()) if (raw.applyUrl === applyUrl) return raw;
  return undefined;
}

/** Finds every enabled Source that's due (lastRunAt + fetchIntervalMins has elapsed, or never run) and runs it. */
export async function runDueSources(): Promise<{ sourcesRun: number }> {
  const sources = await prisma.source.findMany({ where: { enabled: true } });
  const now = Date.now();
  const due = sources.filter((s: (typeof sources)[number]) => !s.lastRunAt || now - s.lastRunAt.getTime() >= s.fetchIntervalMins * 60000);

  for (const source of due) {
    await runSource(source);
  }
  return { sourcesRun: due.length };
}

/** Full cycle: run every due source, then sweep for expired listings. This is what the cron route and worker both call. */
export async function runAggregationCycle() {
  const { sourcesRun } = await runDueSources();
  const expiry = await runExpirySweep();
  return { sourcesRun, ...expiry };
}
