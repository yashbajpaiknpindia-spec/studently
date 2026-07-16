import type { ConnectorResult, RawItem } from "../types";

// Greenhouse publishes a read-only public API for every company's job board at
// https://boards-api.greenhouse.io/v1/boards/{board_token}/jobs?content=true
// This is Greenhouse's own documented, intentionally public endpoint for exactly
// this use case (third parties embedding/aggregating a company's open roles) —
// not scraping. `board_token` is configured per Source in `config.boardToken`.
export async function fetchGreenhouse(config: Record<string, unknown>): Promise<ConnectorResult> {
  const boardToken = config.boardToken as string | undefined;
  if (!boardToken) return { items: [], warnings: ["Missing config.boardToken for Greenhouse source"] };

  const url = `https://boards-api.greenhouse.io/v1/boards/${encodeURIComponent(boardToken)}/jobs?content=true`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Greenhouse API ${boardToken} returned ${res.status}`);

  const data = await res.json();
  const warnings: string[] = [];
  const items: RawItem[] = [];

  for (const job of data.jobs ?? []) {
    try {
      items.push({
        externalId: String(job.id),
        title: job.title,
        organization: (config.organizationName as string) ?? boardToken,
        location: job.location?.name ?? "Not specified",
        description: stripHtml(job.content ?? ""),
        applyUrl: job.absolute_url,
        extra: { departments: job.departments?.map((d: any) => d.name) },
      });
    } catch {
      warnings.push(`Skipped one malformed Greenhouse job from ${boardToken}`);
    }
  }

  return { items, warnings };
}

function stripHtml(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
