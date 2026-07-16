import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

// Admin-only: full student roster with search. Protected by middleware.ts,
// which requires a verified ADMIN session for every /api/admin/* route.
export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const search = searchParams.get("search")?.trim();
  const take = Number(searchParams.get("take") ?? 100);

  const students = await prisma.student.findMany({
    where: search
      ? {
          OR: [
            { fullName: { contains: search, mode: "insensitive" } },
            { city: { contains: search, mode: "insensitive" } },
            { institution: { contains: search, mode: "insensitive" } },
          ],
        }
      : undefined,
    include: {
      user: { select: { phone: true, email: true, createdAt: true } },
      _count: { select: { applications: true, testAttempts: true, savedItems: true } },
    },
    orderBy: { createdAt: "desc" },
    take,
  });

  return NextResponse.json({ students });
}
