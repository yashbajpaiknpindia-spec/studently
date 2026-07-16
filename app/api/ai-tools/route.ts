import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/prisma";
import { verifySession, STUDENT_SESSION_COOKIE } from "@/lib/auth";

type ToolKey = "resume" | "sop" | "cover-letter" | "interview-prep" | "career-roadmap" | "scholarship-match";

const SYSTEM_PROMPTS: Record<ToolKey, string> = {
  resume:
    "You are an expert resume writer for Indian students and early-career job seekers. " +
    "Write a clean, recruiter-ready resume in Markdown from the student's profile and any extra details they give you. " +
    "Use strong action verbs, quantify impact where plausible, and never invent employers, degrees, or dates the student didn't mention.",
  sop:
    "You are an expert statement-of-purpose writer for Indian students applying to courses/universities. " +
    "Write a focused, authentic 400-600 word SOP in the student's voice based on their profile and target course. " +
    "Do not fabricate achievements, awards, or experiences beyond what's provided.",
  "cover-letter":
    "You are an expert cover letter writer for Indian students and early-career job seekers. " +
    "Write a concise, specific cover letter (under 350 words) for the target role using the student's real profile. " +
    "Never invent work history that wasn't given to you.",
  "interview-prep":
    "You are an interview coach for Indian students. Given the student's profile and target role, generate 8 realistic " +
    "interview questions (mix of behavioral and role-specific/technical) with a 2-3 sentence model-answer outline for each, in Markdown.",
  "career-roadmap":
    "You are a career counselor for Indian students. Given the student's profile, produce a concrete 6-step roadmap " +
    "(skills to build, exams/certifications to target, and opportunity types to pursue next) as a numbered Markdown list. Be specific and realistic for the Indian job/education market.",
  "scholarship-match":
    "You are a scholarship-matching assistant. Given the student's profile and a list of currently published scholarships " +
    "(title, qualification requirement, amount), score how well each scholarship matches the student's eligibility from 0-100 " +
    "and give a one-line reason. Only use the scholarships provided — never invent new ones. Respond ONLY with a JSON array of " +
    '{ "id": string, "title": string, "score": number, "reason": string }, sorted by score descending, nothing else.',
};

async function getCurrentStudent() {
  const token = (await cookies()).get(STUDENT_SESSION_COOKIE)?.value;
  if (!token) return null;
  const session = await verifySession(token, "STUDENT");
  if (!session) return null;
  return prisma.student.findUnique({ where: { userId: session.sub } });
}

async function callClaude(system: string, userMessage: string) {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw Object.assign(new Error("ANTHROPIC_API_KEY is not set on the server."), { code: "NO_API_KEY" });
  }

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
    },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 1500,
      system,
      messages: [{ role: "user", content: userMessage }],
    }),
  });

  if (!res.ok) {
    const errText = await res.text().catch(() => "");
    throw new Error(`Anthropic API error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  const text = (data.content ?? [])
    .filter((b: { type: string }) => b.type === "text")
    .map((b: { text: string }) => b.text)
    .join("\n");
  return text;
}

export async function POST(req: NextRequest) {
  const student = await getCurrentStudent();
  if (!student) return NextResponse.json({ error: "Not authenticated." }, { status: 401 });

  const body = await req.json().catch(() => null);
  const tool = body?.tool as ToolKey | undefined;
  if (!tool || !SYSTEM_PROMPTS[tool]) {
    return NextResponse.json({ error: "Unknown or missing 'tool'." }, { status: 400 });
  }

  const extra = typeof body?.details === "string" ? body.details.slice(0, 4000) : "";

  const profileLines = [
    `Name: ${student.fullName}`,
    student.city ? `City: ${student.city}` : null,
    student.qualification ? `Qualification: ${student.qualification}` : null,
    student.institution ? `Institution: ${student.institution}` : null,
    student.branch ? `Branch/stream: ${student.branch}` : null,
    `Eligibility score: ${student.eligibilityScore}/100`,
    `Resume score: ${student.resumeScore}/100`,
  ]
    .filter(Boolean)
    .join("\n");

  try {
    if (tool === "scholarship-match") {
      const scholarships = await prisma.scholarship.findMany({
        where: { status: "PUBLISHED" },
        select: { id: true, title: true, amount: true, qualification: true },
        take: 25,
      });
      if (scholarships.length === 0) {
        return NextResponse.json({ tool, result: [], note: "No published scholarships to match against yet." });
      }
      const userMessage = `Student profile:\n${profileLines}\n\nScholarships:\n${JSON.stringify(scholarships)}`;
      const raw = await callClaude(SYSTEM_PROMPTS[tool], userMessage);
      let parsed: unknown;
      try {
        parsed = JSON.parse(raw.trim().replace(/^```json\n?/, "").replace(/```$/, ""));
      } catch {
        return NextResponse.json({ error: "AI returned an unparseable response. Try again." }, { status: 502 });
      }
      return NextResponse.json({ tool, result: parsed });
    }

    const userMessage = `Student profile:\n${profileLines}${extra ? `\n\nAdditional details from the student:\n${extra}` : ""}`;
    const result = await callClaude(SYSTEM_PROMPTS[tool], userMessage);
    return NextResponse.json({ tool, result });
  } catch (err: any) {
    if (err?.code === "NO_API_KEY") {
      return NextResponse.json(
        { error: "AI generation isn't configured yet. Add ANTHROPIC_API_KEY to your environment (see .env.example)." },
        { status: 503 }
      );
    }
    return NextResponse.json({ error: "AI generation failed. Please try again." }, { status: 502 });
  }
}
