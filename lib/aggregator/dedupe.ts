import type { NormalizedOpportunity } from "./types";

/** Normalizes a string for hashing/comparison: lowercase, strip punctuation, collapse whitespace. */
function normalize(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9\s]/g, " ").replace(/\s+/g, " ").trim();
}

/** A deterministic hash used as a first-pass, exact-match dedup key across sources. */
export function computeDedupHash(o: Pick<NormalizedOpportunity, "title" | "organization" | "location">): string {
  const key = `${normalize(o.title)}|${normalize(o.organization)}|${normalize(o.location)}`;
  // Small, dependency-free string hash (djb2) — good enough for a dedup key, not cryptographic.
  let hash = 5381;
  for (let i = 0; i < key.length; i++) hash = ((hash << 5) + hash + key.charCodeAt(i)) >>> 0;
  return hash.toString(36);
}

/** Token-overlap (Jaccard) similarity — cheap, deterministic, no AI call needed per item. */
function jaccardSimilarity(a: string, b: string): number {
  const setA = new Set(normalize(a).split(" ").filter(Boolean));
  const setB = new Set(normalize(b).split(" ").filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;
  let intersection = 0;
  for (const t of setA) if (setB.has(t)) intersection++;
  const union = setA.size + setB.size - intersection;
  return intersection / union;
}

/**
 * Returns true if `candidate` looks like a near-duplicate of any item in
 * `existingTitles` from the same organization — catches the common case of
 * two sources reposting the same role/scholarship with slightly different
 * wording ("Software Engineer Intern" vs "SDE Intern - Summer 2026").
 */
export function isLikelyDuplicate(
  candidate: { title: string; organization: string },
  existing: { title: string; organization: string }[],
  threshold = 0.6
): boolean {
  return existing.some(
    (e) =>
      normalize(e.organization) === normalize(candidate.organization) &&
      jaccardSimilarity(e.title, candidate.title) >= threshold
  );
}
