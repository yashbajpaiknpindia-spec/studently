import { prisma } from "@/lib/prisma";
import type { NormalizedOpportunity, RawItem } from "./types";
import { computeDedupHash, isLikelyDuplicate } from "./dedupe";

export type PersistCounts = { created: number; updated: number; skipped: number };

function buildSearchText(o: NormalizedOpportunity): string {
  return [o.title, o.organization, o.location, o.eligibility, o.summary, ...o.tags].filter(Boolean).join(" ");
}

function parseAmount(raw: string): number {
  const n = parseInt(raw.replace(/[^\d]/g, ""), 10);
  return isNaN(n) ? 0 : n;
}

export async function persistScholarship(
  sourceId: string,
  raw: RawItem,
  o: NormalizedOpportunity
): Promise<"created" | "updated" | "skipped"> {
  const dedupHash = computeDedupHash(o);

  // Cross-source fuzzy dedup: only look at a small recent window from *other*
  // sources sharing the same org, so this stays cheap even as the table grows.
  const candidates = await prisma.scholarship.findMany({
    where: { providerName: o.organization, ingestSourceId: { not: sourceId }, status: { in: ["PUBLISHED", "DRAFT"] } },
    select: { title: true, providerName: true },
    take: 25,
  });
  if (isLikelyDuplicate({ title: o.title, organization: o.organization }, candidates.map((c: (typeof candidates)[number]) => ({ title: c.title, organization: c.providerName ?? "" })))) {
    return "skipped";
  }

  const existing = await prisma.scholarship.findUnique({
    where: { ingestSourceId_externalId: { ingestSourceId: sourceId, externalId: raw.externalId } },
  });

  const data = {
    title: o.title.slice(0, 200),
    amount: parseAmount(o.salaryOrAmount),
    qualification: o.eligibility.slice(0, 300),
    location: o.location.slice(0, 120),
    description: o.summary.slice(0, 1000),
    deadline: o.deadline ? new Date(o.deadline) : new Date(Date.now() + 90 * 86400000), // schema requires a deadline; default 90d out if unknown, corrected on next confirmed fetch
    source: "AGGREGATED" as const,
    providerName: o.organization,
    officialUrl: o.applyUrl,
    status: "PUBLISHED" as const,
    verified: false, // aggregated listings start unverified until an admin/expiry sweep confirms them
    ingestSourceId: sourceId,
    externalId: raw.externalId,
    dedupHash,
    rawPayload: raw as any,
    aiTags: o.tags,
    lastSeenAt: new Date(),
    searchText: buildSearchText(o),
  };

  if (existing) {
    await prisma.scholarship.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.scholarship.create({ data });
  return "created";
}

export async function persistJob(
  sourceId: string,
  raw: RawItem,
  o: NormalizedOpportunity
): Promise<"created" | "updated" | "skipped"> {
  const dedupHash = computeDedupHash(o);

  const candidates = await prisma.job.findMany({
    where: { company: o.organization, ingestSourceId: { not: sourceId }, status: { in: ["PUBLISHED", "DRAFT"] } },
    select: { role: true, company: true },
    take: 25,
  });
  if (isLikelyDuplicate({ title: o.title, organization: o.organization }, candidates.map((c: (typeof candidates)[number]) => ({ title: c.role, organization: c.company })))) {
    return "skipped";
  }

  const existing = await prisma.job.findUnique({
    where: { ingestSourceId_externalId: { ingestSourceId: sourceId, externalId: raw.externalId } },
  });

  const data = {
    role: o.title.slice(0, 200),
    company: o.organization.slice(0, 150),
    location: o.location.slice(0, 120),
    salary: o.salaryOrAmount.slice(0, 80),
    type: o.category,
    employmentTerm: o.kind === "INTERNSHIP" ? "Internship" : "Full-time",
    description: o.summary.slice(0, 1000),
    status: "PUBLISHED" as const,
    source: "AGGREGATED" as const,
    providerName: o.organization,
    officialUrl: o.applyUrl,
    applicationDeadline: o.deadline ? new Date(o.deadline) : null,
    ingestSourceId: sourceId,
    externalId: raw.externalId,
    dedupHash,
    rawPayload: raw as any,
    aiTags: o.tags,
    lastSeenAt: new Date(),
    searchText: buildSearchText(o),
  };

  if (existing) {
    await prisma.job.update({ where: { id: existing.id }, data });
    return "updated";
  }
  await prisma.job.create({ data });
  return "created";
}
