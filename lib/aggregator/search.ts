import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

export type SearchResultItem = {
  id: string;
  kind: "JOB" | "SCHOLARSHIP";
  title: string;
  organization: string;
  location: string;
  applyUrl: string | null;
  deadline: Date | null;
  rank: number;
};

/**
 * Full-text search across Job + Scholarship, backed by the generated `tsv`
 * column and GIN index added in the aggregation-engine migration (see
 * prisma/migrations/*_opportunity_aggregation_engine/migration.sql). Falls
 * back gracefully to an empty query returning nothing rather than erroring.
 */
export async function searchOpportunities(opts: {
  query: string;
  kind?: "JOB" | "SCHOLARSHIP" | "ALL";
  location?: string;
  limit?: number;
}): Promise<SearchResultItem[]> {
  const { query, kind = "ALL", location, limit = 30 } = opts;
  if (!query || !query.trim()) return [];

  const results: SearchResultItem[] = [];

  if (kind === "ALL" || kind === "JOB") {
    const jobs = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, role AS title, company AS organization, location, "officialUrl" AS "applyUrl",
             "applicationDeadline" AS deadline, ts_rank(tsv, plainto_tsquery('english', ${query})) AS rank
      FROM "Job"
      WHERE status = 'PUBLISHED'
        AND tsv @@ plainto_tsquery('english', ${query})
        ${location ? Prisma.sql`AND location ILIKE ${"%" + location + "%"}` : Prisma.empty}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);
    results.push(...jobs.map((j: any) => ({ ...j, kind: "JOB" as const })));
  }

  if (kind === "ALL" || kind === "SCHOLARSHIP") {
    const scholarships = await prisma.$queryRaw<any[]>(Prisma.sql`
      SELECT id, title, "providerName" AS organization, location, "officialUrl" AS "applyUrl",
             deadline, ts_rank(tsv, plainto_tsquery('english', ${query})) AS rank
      FROM "Scholarship"
      WHERE status = 'PUBLISHED'
        AND tsv @@ plainto_tsquery('english', ${query})
        ${location ? Prisma.sql`AND location ILIKE ${"%" + location + "%"}` : Prisma.empty}
      ORDER BY rank DESC
      LIMIT ${limit}
    `);
    results.push(...scholarships.map((s: any) => ({ ...s, kind: "SCHOLARSHIP" as const })));
  }

  return results.sort((a, b) => b.rank - a.rank).slice(0, limit);
}
