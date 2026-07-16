import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const qualification = searchParams.get("qualification");
  const source = searchParams.get("source"); // STUDENTLY_WEEKLY | GOVERNMENT | PRIVATE
  const status = searchParams.get("status") ?? "PUBLISHED";

  const scholarships = await prisma.scholarship.findMany({
    where: {
      status: status as any,
      ...(qualification ? { qualification } : {}),
      ...(source ? { source: source as any } : {}),
    },
    include: { sponsor: true },
    orderBy: { deadline: "asc" },
  });

  return NextResponse.json({ scholarships });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.amount || !body?.qualification || !body?.deadline) {
    return NextResponse.json(
      { error: "title, amount, qualification and deadline are required." },
      { status: 400 }
    );
  }

  const source = body.source ?? "STUDENTLY_WEEKLY";
  if ((source === "GOVERNMENT" || source === "PRIVATE") && !body.officialUrl) {
    return NextResponse.json(
      { error: "officialUrl is required for GOVERNMENT and PRIVATE scholarships — never list a real external scholarship without a verifiable source link." },
      { status: 400 }
    );
  }

  const scholarship = await prisma.scholarship.create({
    data: {
      title: body.title,
      amount: Number(body.amount),
      qualification: body.qualification,
      location: body.location ?? "All India",
      description: body.description ?? "",
      deadline: new Date(body.deadline),
      sponsorId: body.sponsorId ?? null,
      status: body.status ?? "PUBLISHED",
      source,
      providerName: body.providerName ?? null,
      officialUrl: body.officialUrl ?? null,
    },
  });

  return NextResponse.json({ scholarship }, { status: 201 });
}
