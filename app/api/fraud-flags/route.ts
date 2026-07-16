import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const resolved = searchParams.get("resolved");

  const flags = await prisma.fraudFlag.findMany({
    where: resolved !== null ? { resolved: resolved === "true" } : undefined,
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ flags });
}

// Basic, explainable fraud heuristics for weekly test attempts:
// - same device/IP submitting multiple attempts across different students
// - a submission completed implausibly fast relative to the test duration
// Run this periodically (e.g. via a cron job) or on-demand from the admin panel.
export async function POST() {
  const attempts = await prisma.testAttempt.findMany({
    where: { submittedAt: { not: null } },
    include: { test: true },
  });

  const byDevice = new Map<string, typeof attempts>();
  for (const a of attempts) {
    if (!a.deviceHash) continue;
    const list = byDevice.get(a.deviceHash) ?? [];
    list.push(a);
    byDevice.set(a.deviceHash, list);
  }

  const newFlags: { entityType: string; entityId: string; reason: string; severity: string }[] = [];

  for (const [deviceHash, list] of byDevice) {
    const distinctStudents = new Set(list.map((a: (typeof attempts)[number]) => a.studentId));
    if (distinctStudents.size > 1) {
      for (const a of list) {
        newFlags.push({
          entityType: "TestAttempt",
          entityId: a.id,
          reason: `Device fingerprint ${deviceHash} used by ${distinctStudents.size} different student accounts`,
          severity: "HIGH",
        });
      }
    }
  }

  for (const a of attempts) {
    if (!a.submittedAt) continue;
    const elapsedMins = (a.submittedAt.getTime() - a.createdAt.getTime()) / 60000;
    if (elapsedMins < a.test.durationMins * 0.1) {
      newFlags.push({
        entityType: "TestAttempt",
        entityId: a.id,
        reason: `Submitted in ${elapsedMins.toFixed(1)}m against a ${a.test.durationMins}m test`,
        severity: "MEDIUM",
      });
    }
  }

  if (newFlags.length > 0) {
    await prisma.fraudFlag.createMany({ data: newFlags });
  }

  return NextResponse.json({ flagsCreated: newFlags.length });
}
