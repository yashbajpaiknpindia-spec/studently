import type { ConnectorResult, RawItem } from "../types";

/**
 * For direct partnerships: a partner (an ed-tech company, a college placement
 * cell, a corporate CSR programme) exposes a simple JSON array of their own
 * openings/scholarships at a URL they control, under an explicit agreement
 * with Studently. This connector expects the partner's array to already look
 * roughly like RawItem — partners are given this shape in onboarding docs — so
 * no per-partner field-mapping config is needed, unlike the generic JSON API
 * connector used for third-party/government data we don't control the shape of.
 */
export async function fetchPartnerFeed(config: Record<string, unknown>, sourceUrl: string): Promise<ConnectorResult> {
  const headers: Record<string, string> = { Accept: "application/json" };
  const apiKeyEnvVar = config.apiKeyEnvVar as string | undefined;
  if (apiKeyEnvVar) {
    const key = process.env[apiKeyEnvVar];
    if (key) headers.Authorization = `Bearer ${key}`;
  }

  const res = await fetch(sourceUrl, { headers });
  if (!res.ok) throw new Error(`Partner feed ${sourceUrl} returned ${res.status}`);
  const body = await res.json();
  const records: any[] = Array.isArray(body) ? body : body.items ?? [];

  const warnings: string[] = [];
  const items: RawItem[] = [];

  for (const r of records) {
    if (!r.externalId || !r.title || !r.applyUrl) {
      warnings.push(`Skipped a partner record from ${sourceUrl} missing externalId/title/applyUrl`);
      continue;
    }
    items.push({
      externalId: String(r.externalId),
      title: String(r.title),
      organization: r.organization,
      location: r.location,
      description: r.description,
      applyUrl: String(r.applyUrl),
      deadlineRaw: r.deadline,
      compensationRaw: r.compensation,
      extra: r.extra,
    });
  }

  return { items, warnings };
}
