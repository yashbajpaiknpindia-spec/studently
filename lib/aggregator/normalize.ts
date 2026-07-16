import type { NormalizedOpportunity, RawItem } from "./types";
import type { SourceTargetType } from "@prisma/client";
import { usageFromResponse, addUsage, ZERO_USAGE, type AiUsage } from "./aiCost";

const SYSTEM_PROMPT = `You are a data-normalization engine for Studently, an Indian student opportunities platform.
You will be given raw listings (jobs, internships, or scholarships) scraped from official APIs, RSS feeds, or
public notice boards. For EACH input item, produce one normalized JSON object with EXACTLY these fields:

- "kind": "JOB" | "INTERNSHIP" | "SCHOLARSHIP"
- "title": short, clean listing title (fix casing/typos, strip boilerplate like "(Urgent Hiring)")
- "organization": the hiring company / awarding body, best guess from the text if not explicit
- "location": a clean location string (city/state, "Remote", or "All India"); never invent a specific city if the source doesn't imply one
- "eligibility": one short phrase — degree/branch/year required for a job, or qualification criteria for a scholarship
- "salaryOrAmount": for JOB/INTERNSHIP a short pay string (e.g. "₹6-8 LPA", "Unpaid", "Stipend ₹15,000/mo") or "Not disclosed"; for SCHOLARSHIP the amount as a bare integer string in INR (e.g. "50000"), or "0" if unknown
- "deadline": ISO 8601 date (YYYY-MM-DD) if you can determine one from the raw text/date, else null — NEVER invent a date
- "applyUrl": pass through the given apply URL unchanged
- "category": one of "FRESHER" | "INTERNSHIP" | "REMOTE" | "CAMPUS" | "STARTUP" | "GOVERNMENT" — best fit; for SCHOLARSHIP items just pick "GOVERNMENT" if government-funded else "FRESHER"
- "tags": 3-6 short lowercase keywords useful for matching students (skills, stream names like "computer-science", exam names like "banking", "b.tech", "class-12", etc.)
- "summary": one plain-language sentence describing the opportunity

Rules:
- Never fabricate facts not present in the input (no made-up deadlines, amounts, or eligibility).
- If the input is too sparse/broken to normalize meaningfully, omit it from the output entirely rather than guessing wildly.
- Respond with ONLY a JSON array of normalized objects, same order as input where possible, no prose, no markdown fences.`;

export type NormalizeOutcome = { results: NormalizedOpportunity[]; usage: AiUsage };

export async function normalizeWithAI(items: RawItem[], targetType: SourceTargetType): Promise<NormalizeOutcome> {
  if (items.length === 0) return { results: [], usage: ZERO_USAGE };

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    // Fall back to a deterministic, non-AI normalization so the pipeline still
    // works (with lower quality output, and no AI cost) if the key isn't configured yet.
    return { results: items.map((it) => ruleBasedFallback(it, targetType)), usage: ZERO_USAGE };
  }

  // Claude handles this fine in batches of ~25 — keeps prompts small and
  // failures isolated to one batch instead of the whole run.
  const batches = chunk(items, 25);
  const results: NormalizedOpportunity[] = [];
  let usage: AiUsage = ZERO_USAGE;

  for (const batch of batches) {
    const userMessage = JSON.stringify(
      batch.map((it) => ({
        externalId: it.externalId,
        title: it.title,
        organization: it.organization,
        location: it.location,
        description: (it.description ?? "").slice(0, 1500),
        applyUrl: it.applyUrl,
        deadlineRaw: it.deadlineRaw,
        compensationRaw: it.compensationRaw,
        suggestedKind: targetType === "SCHOLARSHIP" ? "SCHOLARSHIP" : targetType,
      }))
    );

    try {
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-sonnet-5",
          max_tokens: 4096,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: userMessage }],
        }),
      });
      if (!res.ok) throw new Error(`Anthropic API error ${res.status}`);
      const data = await res.json();
      usage = addUsage(usage, usageFromResponse(data));
      const text = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text).join("\n");
      const parsed = JSON.parse(text.trim().replace(/^```json\n?/, "").replace(/```$/, ""));
      if (Array.isArray(parsed)) {
        for (const p of parsed) if (isValidNormalized(p)) results.push(p);
      }
    } catch {
      // If AI normalization fails for a batch, fall back rather than losing the whole batch.
      for (const it of batch) results.push(ruleBasedFallback(it, targetType));
    }
  }

  return { results, usage };
}

function isValidNormalized(p: any): p is NormalizedOpportunity {
  return p && typeof p.title === "string" && typeof p.applyUrl === "string" && typeof p.kind === "string";
}

function ruleBasedFallback(it: RawItem, targetType: SourceTargetType): NormalizedOpportunity {
  const kind = targetType === "SCHOLARSHIP" ? "SCHOLARSHIP" : targetType === "INTERNSHIP" ? "INTERNSHIP" : "JOB";
  return {
    kind,
    title: it.title.trim(),
    organization: it.organization?.trim() || "Unknown organization",
    location: it.location?.trim() || "All India",
    eligibility: kind === "SCHOLARSHIP" ? "See official notification" : "See job description",
    salaryOrAmount: it.compensationRaw?.trim() || (kind === "SCHOLARSHIP" ? "0" : "Not disclosed"),
    deadline: parseLooseDate(it.deadlineRaw),
    applyUrl: it.applyUrl,
    category: kind === "INTERNSHIP" ? "INTERNSHIP" : "FRESHER",
    tags: [],
    summary: (it.description ?? it.title).slice(0, 200),
  };
}

function parseLooseDate(raw?: string): string | null {
  if (!raw) return null;
  const d = new Date(raw);
  return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10);
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}
