// Shared types for the Opportunity Aggregation Engine.
// A "RawItem" is whatever a connector could pull out of a feed/API/page before
// AI normalization — deliberately loose, since every source shapes data differently.

export type RawItem = {
  /** Stable id/URL from the origin — required so we can upsert instead of duplicate. */
  externalId: string;
  /** Best-effort raw title, exactly as the source wrote it. */
  title: string;
  /** Organization / company / provider name, if the source gives one directly. */
  organization?: string;
  /** Free-text location, if given directly. */
  location?: string;
  /** Any description/body text — this is what the AI normalizer leans on most. */
  description?: string;
  /** Link back to the *original* listing/application page — always preserved verbatim. */
  applyUrl: string;
  /** Raw deadline/close-date string if the source provides one (many don't). */
  deadlineRaw?: string;
  /** Raw salary/stipend/amount string if given. */
  compensationRaw?: string;
  /** Anything else worth keeping for audit purposes. */
  extra?: Record<string, unknown>;
};

export type ConnectorResult = {
  items: RawItem[];
  /** Non-fatal per-item issues (e.g. one malformed RSS entry) — doesn't fail the whole run. */
  warnings: string[];
  /** Set only by AI-assisted connectors (currently AI_DEEP_SEARCH) — token/web-search cost of producing `items`. */
  usage?: import("./aiCost").AiUsage;
  /**
   * Set only by AI_DEEP_SEARCH: its items are already fully search-extracted and
   * normalized in one Claude call, so runSource skips the separate normalizeWithAI
   * pass (which would otherwise re-spend tokens re-normalizing already-clean data).
   */
  alreadyNormalized?: NormalizedOpportunity[];
};

export type NormalizedOpportunity = {
  kind: "JOB" | "INTERNSHIP" | "SCHOLARSHIP";
  title: string;
  organization: string;
  location: string;
  eligibility: string; // qualification text for scholarships, or a short eligibility blurb for jobs
  salaryOrAmount: string; // free-text salary for jobs, or a parsed integer amount (as string) for scholarships
  deadline: string | null; // ISO date string, or null if the source never gives one
  applyUrl: string;
  category: "FRESHER" | "INTERNSHIP" | "REMOTE" | "CAMPUS" | "STARTUP" | "GOVERNMENT"; // only meaningful for JOB/INTERNSHIP
  tags: string[]; // short keywords for the recommender (skills, streams, exam names, etc.)
  summary: string; // 1-2 sentence plain-language description
};
