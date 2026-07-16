import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");

  const payments = await prisma.payment.findMany({
    where: status ? { status: status as any } : undefined,
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  const totals = await prisma.payment.aggregate({
    where: { status: "SUCCESS" },
    _sum: { amount: true },
    _count: true,
  });

  return NextResponse.json({
    payments,
    totalRevenue: totals._sum.amount ?? 0,
    successfulCount: totals._count,
  });
}
