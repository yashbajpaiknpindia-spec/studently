import type { NormalizedOpportunity } from "./types";

const INTERNSHIP_HINTS = ["intern", "internship", "trainee"];
const REMOTE_HINTS = ["remote", "work from home", "wfh"];
const CAMPUS_HINTS = ["campus", "on-campus", "placement drive"];
const STARTUP_HINTS = ["startup", "early-stage", "seed-funded"];
const GOVERNMENT_HINTS = ["government", "govt", "psu", "public sector", "ministry", "sarkari"];

/**
 * Deterministic pass applied after AI normalization: cheap keyword checks that
 * catch obvious category mistakes (e.g. AI labels an internship as FRESHER)
 * without needing another AI call. Runs in a few microseconds per item.
 */
export function reconcileCategory(o: NormalizedOpportunity): NormalizedOpportunity {
  const haystack = `${o.title} ${o.summary}`.toLowerCase();

  let category = o.category;
  if (INTERNSHIP_HINTS.some((h) => haystack.includes(h))) category = "INTERNSHIP";
  else if (REMOTE_HINTS.some((h) => haystack.includes(h))) category = "REMOTE";
  else if (CAMPUS_HINTS.some((h) => haystack.includes(h))) category = "CAMPUS";
  else if (GOVERNMENT_HINTS.some((h) => haystack.includes(h))) category = "GOVERNMENT";
  else if (STARTUP_HINTS.some((h) => haystack.includes(h))) category = "STARTUP";

  let kind = o.kind;
  if (kind !== "SCHOLARSHIP" && INTERNSHIP_HINTS.some((h) => haystack.includes(h))) kind = "INTERNSHIP";

  return { ...o, category, kind };
}
