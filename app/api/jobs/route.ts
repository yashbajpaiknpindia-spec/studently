import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type"); // FRESHER | INTERNSHIP | REMOTE | CAMPUS | STARTUP | GOVERNMENT
  const source = searchParams.get("source"); // STUDENTLY_CURATED | GOVERNMENT_EXAM | GOVERNMENT_SCHEME | EXTERNAL_PORTAL
  const status = searchParams.get("status") ?? "PUBLISHED";

  const jobs = await prisma.job.findMany({
    where: {
      status: status as any,
      ...(type ? { type: type as any } : {}),
      ...(source ? { source: source as any } : {}),
    },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ jobs });
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.role || !body?.company || !body?.type) {
    return NextResponse.json({ error: "role, company and type are required." }, { status: 400 });
  }

  const source = body.source ?? "STUDENTLY_CURATED";
  if (source !== "STUDENTLY_CURATED" && !body.officialUrl) {
    return NextResponse.json(
      { error: "officialUrl is required for GOVERNMENT_EXAM, GOVERNMENT_SCHEME and EXTERNAL_PORTAL listings — never publish a real external listing without a verifiable source link." },
      { status: 400 }
    );
  }

  const job = await prisma.job.create({
    data: {
      role: body.role,
      company: body.company,
      location: body.location ?? "Remote",
      salary: body.salary ?? "Not disclosed",
      type: body.type,
      employmentTerm: body.employmentTerm ?? "Full-time",
      description: body.description ?? "",
      status: body.status ?? "PUBLISHED",
      source,
      providerName: body.providerName ?? null,
      officialUrl: body.officialUrl ?? null,
      applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null,
    },
  });

  return NextResponse.json({ job }, { status: 201 });
}
