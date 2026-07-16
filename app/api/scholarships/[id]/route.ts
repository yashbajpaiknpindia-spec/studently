import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Params = { params: Promise<{ id: string }> };

export async function GET(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  const scholarship = await prisma.scholarship.findUnique({
    where: { id },
    include: { sponsor: true },
  });
  if (!scholarship) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json({ scholarship });
}

export async function PATCH(req: NextRequest, { params }: Params) {
  const { id } = await params;
  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid body" }, { status: 400 });

  const scholarship = await prisma.scholarship.update({
    where: { id },
    data: {
      ...(body.title !== undefined ? { title: body.title } : {}),
      ...(body.amount !== undefined ? { amount: Number(body.amount) } : {}),
      ...(body.qualification !== undefined ? { qualification: body.qualification } : {}),
      ...(body.location !== undefined ? { location: body.location } : {}),
      ...(body.description !== undefined ? { description: body.description } : {}),
      ...(body.deadline !== undefined ? { deadline: new Date(body.deadline) } : {}),
      ...(body.status !== undefined ? { status: body.status } : {}),
    },
  });

  return NextResponse.json({ scholarship });
}

export async function DELETE(_req: NextRequest, { params }: Params) {
  const { id } = await params;
  await prisma.scholarship.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
