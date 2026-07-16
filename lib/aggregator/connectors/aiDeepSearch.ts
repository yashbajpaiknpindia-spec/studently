import type { ConnectorResult, NormalizedOpportunity, RawItem } from "../types";
import { usageFromResponse, type AiUsage, ZERO_USAGE } from "../aiCost";

export type AiDeepSearchConfig = {
  /** Free-text description of what to look for, e.g. "fresher backend developer jobs" */
  query: string;
  /** City/state/"Remote" filters — folded into the search prompt, not a hard filter. */
  locations?: string[];
  /** Extra keywords/skills/exam names to bias the search toward. */
  keywords?: string[];
  /** JOB | INTERNSHIP | SCHOLARSHIP — same enum as Source.targetType. */
  targetType?: "JOB" | "INTERNSHIP" | "SCHOLARSHIP";
  /** Roughly how many distinct listings to try to return. Default 15, capped at 30 to bound cost. */
  maxResults?: number;
};

const SYSTEM_PROMPT = `You are a deep-research job-sourcing engine for Studently, an Indian student opportunities platform.
Use the web_search tool as many times as needed to find REAL, CURRENTLY OPEN job/internship/scholarship listings
that match the admin's request below. Search company career pages, job boards, government notification portals
(NCS, SSC, UPSC, state PSCs), and startup ATS pages (Greenhouse, Lever). Prioritize listings still accepting
applications in India.

For EACH distinct real listing you find, produce one JSON object with EXACTLY these fields:
- "kind": "JOB" | "INTERNSHIP" | "SCHOLARSHIP"
- "title": short, clean listing title
- "organization": the hiring company / awarding body
- "location": clean location string (city/state, "Remote", or "All India")
- "eligibility": one short phrase — degree/branch/year required, or qualification criteria
- "salaryOrAmount": for JOB/INTERNSHIP a short pay string (e.g. "₹6-8 LPA", "Unpaid", "Stipend ₹15,000/mo") or "Not disclosed"; for SCHOLARSHIP a bare integer string in INR, or "0" if unknown
- "deadline": ISO 8601 date (YYYY-MM-DD) if determinable, else null — NEVER invent a date
- "applyUrl": the EXACT, real URL you found this listing at (never invent or guess a URL)
- "category": one of "FRESHER" | "INTERNSHIP" | "REMOTE" | "CAMPUS" | "STARTUP" | "GOVERNMENT"
- "tags": 3-6 short lowercase keywords (skills, stream, exam names)
- "summary": one plain-language sentence describing the opportunity

Hard rules:
- Only include listings you actually found via web_search this turn — never fabricate a listing or URL.
- Never include a listing whose apply URL you did not see in a search result.
- Skip anything that looks expired, a scam, or an MLM/"unlimited earning" post.
- After your searches, respond with ONLY a JSON array of these objects — no prose, no markdown fences, no commentary before or after.`;

function buildUserMessage(config: AiDeepSearchConfig): string {
  const parts = [`Find: ${config.query}`];
  if (config.locations?.length) parts.push(`Preferred locations: ${config.locations.join(", ")}`);
  if (config.keywords?.length) parts.push(`Related keywords/skills: ${config.keywords.join(", ")}`);
  parts.push(`Target listing type: ${config.targetType ?? "JOB"}`);
  parts.push(`Return up to ${Math.min(config.maxResults ?? 15, 30)} distinct listings.`);
  return parts.join("\n");
}

function isValidNormalized(p: any): p is NormalizedOpportunity {
  return (
    p &&
    typeof p.title === "string" &&
    typeof p.applyUrl === "string" &&
    /^https?:\/\//.test(p.applyUrl) &&
    typeof p.organization === "string" &&
    typeof p.kind === "string"
  );
}

export type AiDeepSearchOutcome = ConnectorResult & { usage: AiUsage; alreadyNormalized: NormalizedOpportunity[] };

export async function fetchAiDeepSearch(config: Record<string, unknown>): Promise<AiDeepSearchOutcome> {
  const cfg = config as AiDeepSearchConfig;
  if (!cfg.query?.trim()) {
    return { items: [], warnings: ["Missing config.query for AI deep-search source"], usage: ZERO_USAGE, alreadyNormalized: [] };
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return { items: [], warnings: ["ANTHROPIC_API_KEY is not configured — AI deep search cannot run."], usage: ZERO_USAGE, alreadyNormalized: [] };
  }

  const maxSearches = Math.min(Math.ceil((cfg.maxResults ?? 15) / 3) + 3, 15);

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-api-key": apiKey, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: "claude-sonnet-5",
      max_tokens: 8192,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: buildUserMessage(cfg) }],
      tools: [{ type: "web_search_20250305", name: "web_search", max_uses: maxSearches }],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Anthropic API error ${res.status}: ${body.slice(0, 300)}`);
  }

  const data = await res.json();
  const usage = usageFromResponse(data);

  const textBlocks = (data.content ?? []).filter((b: any) => b.type === "text").map((b: any) => b.text);
  const text = textBlocks.join("\n").trim();

  const warnings: string[] = [];
  let parsed: any[] = [];
  try {
    const cleaned = text.replace(/^```json\n?/, "").replace(/^```\n?/, "").replace(/```$/, "").trim();
    parsed = JSON.parse(cleaned);
    if (!Array.isArray(parsed)) parsed = [];
  } catch {
    warnings.push("AI deep search returned non-JSON output; no listings could be parsed this run.");
    parsed = [];
  }

  const alreadyNormalized: NormalizedOpportunity[] = [];
  const items: RawItem[] = [];

  for (const p of parsed) {
    if (!isValidNormalized(p)) {
      warnings.push(`Skipped one listing missing required fields or a valid apply URL.`);
      continue;
    }
    alreadyNormalized.push(p);
    items.push({
      // The apply URL is the most stable identifier a web search gives us —
      // used as externalId so re-running the same search UPDATES (not
      // duplicates) a listing found again, and dedupe.ts still runs its
      // cross-source fuzzy check on top of this.
      externalId: p.applyUrl,
      title: p.title,
      organization: p.organization,
      location: p.location,
      description: p.summary,
      applyUrl: p.applyUrl,
      deadlineRaw: p.deadline ?? undefined,
      compensationRaw: p.salaryOrAmount,
    });
  }

  return { items, warnings, usage, alreadyNormalized };
}
