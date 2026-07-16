import { prisma } from "@/lib/prisma";
import type { Student } from "@prisma/client";

export type Recommendation = {
  kind: "JOB" | "SCHOLARSHIP";
  id: string;
  title: string;
  organization: string;
  location: string;
  score: number;
  reasons: string[];
};

function tokenize(s: string | null | undefined): Set<string> {
  return new Set((s ?? "").toLowerCase().split(/[^a-z0-9]+/).filter((t) => t.length > 2));
}

/**
 * Scores a candidate listing against a student's profile. Deliberately
 * rule-based and synchronous (no AI call) so it stays fast enough to rank
 * hundreds of candidates per request — the aggregation engine already did the
 * expensive AI work once, up front, when it tagged each listing at ingest time.
 */
function scoreCandidate(
  student: Student,
  candidate: { title: string; organization: string; location: string; eligibilityText: string; tags: string[] }
): { score: number; reasons: string[] } {
  let score = 0;
  const reasons: string[] = [];

  const studentTokens = new Set([
    ...tokenize(student.qualification),
    ...tokenize(student.branch),
    ...tokenize(student.institution),
  ]);
  const candidateTokens = new Set([...tokenize(candidate.eligibilityText), ...candidate.tags.map((t) => t.toLowerCase())]);

  let overlap = 0;
  for (const t of studentTokens) if (candidateTokens.has(t)) overlap++;
  if (overlap > 0) {
    score += overlap * 15;
    reasons.push("Matches your qualification/branch");
  }

  if (student.city && candidate.location.toLowerCase().includes(student.city.toLowerCase())) {
    score += 20;
    reasons.push(`Located in ${student.city}`);
  } else if (/remote|all india|work from home/i.test(candidate.location)) {
    score += 10;
    reasons.push("Open to students anywhere in India");
  }

  score += Math.min(student.eligibilityScore, 100) * 0.15;

  return { score, reasons: reasons.length ? reasons : ["New opportunity you haven't seen yet"] };
}

export async function getRecommendationsForStudent(studentId: string, limit = 12): Promise<Recommendation[]> {
  const student = await prisma.student.findUnique({ where: { id: studentId } });
  if (!student) return [];

  const [jobs, scholarships] = await Promise.all([
    prisma.job.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: { id: true, role: true, company: true, location: true, description: true, aiTags: true },
    }),
    prisma.scholarship.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      take: 150,
      select: { id: true, title: true, providerName: true, location: true, qualification: true, aiTags: true },
    }),
  ]);

  const scoredJobs: Recommendation[] = jobs.map((j: (typeof jobs)[number]) => {
    const { score, reasons } = scoreCandidate(student, {
      title: j.role,
      organization: j.company,
      location: j.location,
      eligibilityText: j.description,
      tags: j.aiTags,
    });
    return { kind: "JOB", id: j.id, title: j.role, organization: j.company, location: j.location, score, reasons };
  });

  const scoredScholarships: Recommendation[] = scholarships.map((s: (typeof scholarships)[number]) => {
    const { score, reasons } = scoreCandidate(student, {
      title: s.title,
      organization: s.providerName ?? "Studently",
      location: s.location,
      eligibilityText: s.qualification,
      tags: s.aiTags,
    });
    return {
      kind: "SCHOLARSHIP",
      id: s.id,
      title: s.title,
      organization: s.providerName ?? "Studently",
      location: s.location,
      score,
      reasons,
    };
  });

  return [...scoredJobs, ...scoredScholarships].sort((a, b) => b.score - a.score).slice(0, limit);
}
