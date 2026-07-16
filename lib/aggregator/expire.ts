import { prisma } from "@/lib/prisma";

const STALE_AFTER_DAYS = 14; // if an aggregated source stops re-confirming a listing for this long, treat it as pulled/filled

export type ExpirySweepResult = { jobsExpired: number; scholarshipsExpired: number };

/**
 * Runs after every ingestion cycle (and can be run standalone on a schedule).
 * Two independent triggers, either one expires a listing:
 *   1. Its deadline has passed.
 *   2. It's an aggregated listing that hasn't been re-confirmed by its source
 *      in STALE_AFTER_DAYS — the source likely removed/filled it upstream.
 * Manually-curated (non-aggregated) listings are only ever expired by deadline,
 * never by staleness, since nothing re-confirms them automatically.
 */
export async function runExpirySweep(): Promise<ExpirySweepResult> {
  const now = new Date();
  const staleThreshold = new Date(now.getTime() - STALE_AFTER_DAYS * 86400000);

  const jobsExpired = await prisma.job.updateMany({
    where: {
      status: { in: ["PUBLISHED", "DRAFT"] },
      OR: [
        { applicationDeadline: { lt: now } },
        { ingestSourceId: { not: null }, lastSeenAt: { lt: staleThreshold } },
      ],
    },
    data: { status: "EXPIRED" },
  });

  const scholarshipsExpired = await prisma.scholarship.updateMany({
    where: {
      status: { in: ["PUBLISHED", "DRAFT"] },
      OR: [
        { deadline: { lt: now } },
        { ingestSourceId: { not: null }, lastSeenAt: { lt: staleThreshold } },
      ],
    },
    data: { status: "EXPIRED" },
  });

  return { jobsExpired: jobsExpired.count, scholarshipsExpired: scholarshipsExpired.count };
}
