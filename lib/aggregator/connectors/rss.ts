import Parser from "rss-parser";
import type { ConnectorResult, RawItem } from "../types";

const parser = new Parser({
  customFields: { item: [["deadline", "deadline"], ["location", "location"]] },
});

// Generic RSS/Atom connector. Works for any publicly published feed — many
// government ministries, universities, and PSUs publish RSS for exactly this
// kind of downstream consumption. No auth bypass, no scraping: this just reads
// the feed the publisher already made public.
export async function fetchRss(config: Record<string, unknown>, sourceUrl: string): Promise<ConnectorResult> {
  const feed = await parser.parseURL(sourceUrl);
  const warnings: string[] = [];
  const items: RawItem[] = [];

  for (const entry of feed.items ?? []) {
    try {
      const externalId = entry.guid || entry.link || `${entry.title}-${entry.pubDate}`;
      if (!externalId || !entry.link) {
        warnings.push(`Skipped an RSS entry with no link/guid from ${sourceUrl}`);
        continue;
      }
      items.push({
        externalId: String(externalId),
        title: entry.title ?? "Untitled",
        organization: (config.organizationName as string) ?? feed.title ?? "Unknown",
        location: (entry as any).location ?? (config.defaultLocation as string) ?? "All India",
        description: entry.contentSnippet ?? entry.content ?? "",
        applyUrl: entry.link,
        deadlineRaw: (entry as any).deadline,
        extra: { pubDate: entry.pubDate },
      });
    } catch {
      warnings.push(`Skipped one malformed RSS entry from ${sourceUrl}`);
    }
  }

  return { items, warnings };
}
