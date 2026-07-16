import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

// Admin-only: everything about one student — profile, contact info, and every
// piece of activity across the platform, plus a small rolled-up analysis.
// Protected by middleware.ts (ADMIN session required for all /api/admin/*).
export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;

  const student = await prisma.student.findUnique({
    where: { id },
    include: {
      user: { select: { phone: true, email: true, avatarUrl: true, createdAt: true, role: true } },
      applications: {
        orderBy: { appliedAt: "desc" },
        include: {
          scholarship: { select: { title: true, amount: true } },
          job: { select: { role: true, company: true } },
        },
      },
      testAttempts: {
        orderBy: { createdAt: "desc" },
        include: { test: { select: { title: true, category: true, weekNumber: true, durationMins: true } } },
      },
      savedItems: { orderBy: { createdAt: "desc" } },
      notifications: { orderBy: { createdAt: "desc" }, take: 30 },
      badges: { orderBy: { earnedAt: "desc" }, include: { badge: true } },
    },
  });

  if (!student) return NextResponse.json({ error: "Student not found." }, { status: 404 });

  // SavedItem only stores raw scholarshipId/jobId (no Prisma relation), so
  // resolve titles with two small batched lookups instead of N+1 queries.
  const savedScholarshipIds = student.savedItems.map((s: (typeof student.savedItems)[number]) => s.scholarshipId).filter((v: string | null): v is string => !!v);
  const savedJobIds = student.savedItems.map((s: (typeof student.savedItems)[number]) => s.jobId).filter((v: string | null): v is string => !!v);
  const [savedScholarships, savedJobs] = await Promise.all([
    savedScholarshipIds.length ? prisma.scholarship.findMany({ where: { id: { in: savedScholarshipIds } }, select: { id: true, title: true } }) : Promise.resolve([]),
    savedJobIds.length ? prisma.job.findMany({ where: { id: { in: savedJobIds } }, select: { id: true, role: true, company: true } }) : Promise.resolve([]),
  ]);
  const scholarshipTitleById = new Map(savedScholarships.map((s: { id: string; title: string }) => [s.id, s.title]));
  const jobById = new Map(savedJobs.map((j: { id: string; role: string; company: string }) => [j.id, j]));

  const savedItems = student.savedItems.map((s: (typeof student.savedItems)[number]) => ({
    id: s.id,
    createdAt: s.createdAt,
    scholarshipTitle: s.scholarshipId ? scholarshipTitleById.get(s.scholarshipId) ?? null : null,
    job: s.jobId ? jobById.get(s.jobId) ?? null : null,
  }));

  // Fraud flags raised directly against the student, or against any of their test attempts.
  const attemptIds = student.testAttempts.map((a: (typeof student.testAttempts)[number]) => a.id);
  const fraudFlags = await prisma.fraudFlag.findMany({
    where: {
      OR: [
        { entityType: "Student", entityId: student.id },
        ...(attemptIds.length ? [{ entityType: "TestAttempt", entityId: { in: attemptIds } }] : []),
      ],
    },
    orderBy: { createdAt: "desc" },
  });

  // --- Simple analysis rollup ---
  const submittedAttempts = student.testAttempts.filter((a: (typeof student.testAttempts)[number]) => a.submittedAt);
  const averageScore = submittedAttempts.length
    ? Math.round(submittedAttempts.reduce((sum: number, a: (typeof submittedAttempts)[number]) => sum + a.score, 0) / submittedAttempts.length)
    : 0;
  const applicationsByStatus = student.applications.reduce((acc: Record<string, number>, a: (typeof student.applications)[number]) => {
    acc[a.status] = (acc[a.status] ?? 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const analysis = {
    totalApplications: student.applications.length,
    applicationsByStatus,
    totalTestsAttempted: submittedAttempts.length,
    averageScore,
    totalSaved: student.savedItems.length,
    totalBadges: student.badges.length,
    unresolvedFraudFlags: fraudFlags.filter((f: (typeof fraudFlags)[number]) => !f.resolved).length,
    accountAgeDays: Math.floor((Date.now() - new Date(student.createdAt).getTime()) / 86_400_000),
  };

  const { savedItems: _rawSaved, ...studentRest } = student;

  return NextResponse.json({
    student: { ...studentRest, savedItems },
    fraudFlags,
    analysis,
  });
}
