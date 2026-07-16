import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [
    studentCount,
    scholarshipCount,
    jobCount,
    activeTests,
    totalRevenue,
    pendingFraudFlags,
    scholarshipPool,
  ] = await Promise.all([
    prisma.student.count(),
    prisma.scholarship.count({ where: { status: "PUBLISHED" } }),
    prisma.job.count({ where: { status: "PUBLISHED" } }),
    prisma.weeklyTest.count({ where: { endsAt: { gt: new Date() } } }),
    prisma.payment.aggregate({ where: { status: "SUCCESS" }, _sum: { amount: true } }),
    prisma.fraudFlag.count({ where: { resolved: false } }),
    prisma.scholarship.aggregate({ _sum: { amount: true } }),
  ]);

  return NextResponse.json({
    studentCount,
    scholarshipCount,
    jobCount,
    activeTests,
    totalRevenue: totalRevenue._sum.amount ?? 0,
    pendingFraudFlags,
    scholarshipPoolTotal: scholarshipPool._sum.amount ?? 0,
  });
}
