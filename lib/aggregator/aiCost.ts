// Claude API pricing used to price every AI-assisted aggregation run.
// Source: https://docs.claude.com/en/docs/about-claude/pricing (Claude Sonnet 5,
// introductory pricing in effect through Aug 31, 2026). Update these constants
// if pricing changes — everything downstream (IngestRun.aiCostUsd, the admin
// cost badges) recomputes from these, nothing is hardcoded elsewhere.
export const CLAUDE_INPUT_PER_MTOK_USD = 2.0;
export const CLAUDE_OUTPUT_PER_MTOK_USD = 10.0;
export const WEB_SEARCH_PER_1000_USD = 10.0;

export type AiUsage = {
  inputTokens: number;
  outputTokens: number;
  webSearches: number;
};

export const ZERO_USAGE: AiUsage = { inputTokens: 0, outputTokens: 0, webSearches: 0 };

export function addUsage(a: AiUsage, b: AiUsage): AiUsage {
  return {
    inputTokens: a.inputTokens + b.inputTokens,
    outputTokens: a.outputTokens + b.outputTokens,
    webSearches: a.webSearches + b.webSearches,
  };
}

/** Turns token + web-search counts into a USD cost using the constants above. */
export function computeCostUsd(usage: AiUsage): number {
  const tokenCost =
    (usage.inputTokens / 1_000_000) * CLAUDE_INPUT_PER_MTOK_USD +
    (usage.outputTokens / 1_000_000) * CLAUDE_OUTPUT_PER_MTOK_USD;
  const searchCost = (usage.webSearches / 1000) * WEB_SEARCH_PER_1000_USD;
  return Math.round((tokenCost + searchCost) * 1_000_000) / 1_000_000; // keep micro-cent precision
}

/** Reads token + web-search usage off a raw Anthropic /v1/messages response body. */
export function usageFromResponse(data: any): AiUsage {
  const u = data?.usage ?? {};
  return {
    inputTokens: Number(u.input_tokens ?? 0),
    outputTokens: Number(u.output_tokens ?? 0),
    webSearches: Number(u.server_tool_use?.web_search_requests ?? 0),
  };
}

// ---------------------------------------------------------------------------
// Display currency
//
// Costs are computed and stored in USD above because that's the currency
// Anthropic actually bills in (IngestRun.aiCostUsd stays USD in the DB — do
// not change that, it must match the real invoice). Everything shown to the
// admin, though, should read in INR since that's the currency Studently and
// its admins operate in. Convert only at the display layer via formatInr().
// ---------------------------------------------------------------------------
export const USD_TO_INR_RATE = 87; // approximate; update if it drifts significantly

export function usdToInr(usd: number): number {
  return usd * USD_TO_INR_RATE;
}

/** Formats a USD cost value (e.g. IngestRun.aiCostUsd) as an INR string for display. */
export function formatInr(usd: number): string {
  const inr = usdToInr(usd);
  if (inr < 1 && inr > 0) return `₹${inr.toFixed(2)}`;
  return `₹${inr.toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
}
