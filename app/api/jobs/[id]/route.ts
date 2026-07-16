import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ job });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const job = await prisma.job.update({
    where: { id },
    data: {
      ...(body.role !== undefined ? { role: body.role } : {}),
      ...(body.company !== undefined ? { company: body.company } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.salary !== undefined ? { salary: body.salary } : {}),
      ...(body.type !== undefined ? { type: body.type } : {}),
      ...(body.employmentTerm !== undefined ? { employmentTerm: body.employmentTerm } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
      ...(body.source !== undefined ? { source: body.source } : {}),
      ...(body.providerName !== undefined ? { providerName: body.providerName } : {}),
      ...(body.officialUrl !== undefined ? { officialUrl: body.officialUrl } : {}),
      ...(body.applicationDeadline !== undefined ? { applicationDeadline: body.applicationDeadline ? new Date(body.applicationDeadline) : null } : {}),
    },
  });

  return NextResponse.json({ job });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.job.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
