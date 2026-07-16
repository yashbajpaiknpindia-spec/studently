import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, STUDENT_SESSION_COOKIE } from "@/lib/auth";

async function getCurrentStudentId(): Promise<string | null> {
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, "STUDENT");
  if (!session) return null;
  const student = await prisma.student.findUnique({ where: { userId: session.sub } });
  return student?.id ?? null;
}

// Returns the logged-in student's own notifications only — never accepts a
// studentId from the client, so one student can't read another's notifications.
export async function GET() {
  const studentId = await getCurrentStudentId();
  if (!studentId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const notifications = await prisma.notification.findMany({
    where: { studentId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
  const unreadCount = await prisma.notification.count({ where: { studentId, read: false } });

  return NextResponse.json({ notifications, unreadCount });
}

// Marks one notification (or, with { all: true }, every notification for this
// student) as read.
export async function PATCH(req: NextRequest) {
  const studentId = await getCurrentStudentId();
  if (!studentId) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);

  if (body?.all) {
    await prisma.notification.updateMany({ where: { studentId, read: false }, data: { read: true } });
    return NextResponse.json({ ok: true });
  }

  if (!body?.id) return NextResponse.json({ error: "id or all is required." }, { status: 400 });

  const notification = await prisma.notification.findUnique({ where: { id: body.id } });
  if (!notification || notification.studentId !== studentId) {
    return NextResponse.json({ error: "Notification not found." }, { status: 404 });
  }

  await prisma.notification.update({ where: { id: body.id }, data: { read: true } });
  return NextResponse.json({ ok: true });
}

// Broadcasts a notification to every student, or a specific list of studentIds.
export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body?.title || !body?.body) {
    return NextResponse.json({ error: "title and body are required." }, { status: 400 });
  }

  const targetIds: string[] =
    Array.isArray(body.studentIds) && body.studentIds.length > 0
      ? body.studentIds
      : (await prisma.student.findMany({ select: { id: true } })).map((s: { id: string }) => s.id);

  const result = await prisma.notification.createMany({
    data: targetIds.map((studentId) => ({
      studentId,
      title: body.title,
      body: body.body,
      channel: body.channel ?? "IN_APP",
    })),
  });

  return NextResponse.json({ sent: result.count }, { status: 201 });
}
