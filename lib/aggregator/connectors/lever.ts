import type { ConnectorResult, RawItem } from "../types";

// Lever publishes a read-only public Postings API for every company's careers
// page at https://api.lever.co/v0/postings/{account}?mode=json — Lever's own
// documented endpoint for embedding/consuming a company's open roles.
// `account` is configured per Source in `config.account`.
export async function fetchLever(config: Record<string, unknown>): Promise<ConnectorResult> {
  const account = config.account as string | undefined;
  if (!account) return { items: [], warnings: ["Missing config.account for Lever source"] };

  const url = `https://api.lever.co/v0/postings/${encodeURIComponent(account)}?mode=json`;
  const res = await fetch(url, { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`Lever API ${account} returned ${res.status}`);

  const data = await res.json();
  const warnings: string[] = [];
  const items: RawItem[] = [];

  for (const posting of data ?? []) {
    try {
      const location = posting.categories?.location ?? "Not specified";
      const description = [posting.descriptionPlain, posting.lists?.map((l: any) => `${l.text}: ${stripHtml(l.content ?? "")}`).join(" ")]
        .filter(Boolean)
        .join(" ");
      items.push({
        externalId: String(posting.id),
        title: posting.text,
        organization: (config.organizationName as string) ?? account,
        location,
        description,
        applyUrl: posting.applyUrl ?? posting.hostedUrl,
        extra: { team: posting.categories?.team, commitment: posting.categories?.commitment },
      });
    } catch {
      warnings.push(`Skipped one malformed Lever posting from ${account}`);
    }
  }

  return { items, warnings };
}

function stripHtml(html: string): string {
  return (html ?? "").replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}
