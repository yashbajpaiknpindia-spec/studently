import * as cheerio from "cheerio";
import type { ConnectorResult, RawItem } from "../types";

/**
 * For government/university notice boards that don't publish RSS or an API —
 * still a *permitted* read: we check robots.txt before every fetch and only
 * ever read the page a human visitor would see, at the polite rate the
 * scheduler enforces (fetchIntervalMins on the Source, minimum a few hours).
 * This is explicitly NOT for third-party platforms like LinkedIn/WorkIndia —
 * those are excluded entirely; this connector is only meant to be pointed at
 * .gov.in / .ac.in / .edu style public notice pages.
 *
 * Source.config shape:
 * {
 *   "itemSelector": ".notice-list li",       // one element per listing
 *   "titleSelector": "a",                    // relative to itemSelector
 *   "linkSelector": "a",                     // relative to itemSelector, reads href
 *   "linkAttr": "href",
 *   "dateSelector": ".date",                 // relative to itemSelector, optional
 *   "organizationName": "XYZ University"
 * }
 */
export async function fetchNoticeBoard(config: Record<string, unknown>, sourceUrl: string): Promise<ConnectorResult> {
  const allowed = await isAllowedByRobotsTxt(sourceUrl);
  if (!allowed) {
    return { items: [], warnings: [`robots.txt disallows fetching ${sourceUrl} — source skipped`] };
  }

  const itemSelector = config.itemSelector as string;
  const titleSelector = (config.titleSelector as string) ?? "a";
  const linkSelector = (config.linkSelector as string) ?? "a";
  const linkAttr = (config.linkAttr as string) ?? "href";
  const dateSelector = config.dateSelector as string | undefined;
  if (!itemSelector) return { items: [], warnings: ["Missing config.itemSelector for notice-board source"] };

  const res = await fetch(sourceUrl, { headers: { "User-Agent": "StudentlyBot/1.0 (+https://studently.app/bot)" } });
  if (!res.ok) throw new Error(`Notice board ${sourceUrl} returned ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const warnings: string[] = [];
  const items: RawItem[] = [];
  const base = new URL(sourceUrl);

  $(itemSelector).each((_, el) => {
    try {
      const node = $(el);
      const title = node.find(titleSelector).first().text().trim();
      let href = node.find(linkSelector).first().attr(linkAttr);
      if (!title || !href) {
        warnings.push(`Skipped a notice-board row on ${sourceUrl} missing title/link`);
        return;
      }
      href = new URL(href, base).toString();
      const dateText = dateSelector ? node.find(dateSelector).first().text().trim() : undefined;

      items.push({
        externalId: href,
        title,
        organization: (config.organizationName as string) ?? base.hostname,
        location: (config.defaultLocation as string) ?? "All India",
        applyUrl: href,
        deadlineRaw: dateText,
      });
    } catch {
      warnings.push(`Skipped one malformed notice-board row on ${sourceUrl}`);
    }
  });

  return { items, warnings };
}

async function isAllowedByRobotsTxt(pageUrl: string): Promise<boolean> {
  try {
    const u = new URL(pageUrl);
    const robotsUrl = `${u.protocol}//${u.host}/robots.txt`;
    const res = await fetch(robotsUrl);
    if (!res.ok) return true; // no robots.txt = no restriction stated
    const text = await res.text();
    return isPathAllowed(text, u.pathname, "StudentlyBot");
  } catch {
    return true; // network hiccup fetching robots.txt shouldn't permanently block a legitimate source
  }
}

// Minimal robots.txt evaluator: finds the most specific applicable User-agent
// block (our bot, else "*") and checks Disallow rules against the path.
function isPathAllowed(robotsTxt: string, path: string, botName: string): boolean {
  const lines = robotsTxt.split("\n").map((l) => l.trim());
  const groups: { agents: string[]; rules: { type: "Allow" | "Disallow"; path: string }[] }[] = [];
  let current: { agents: string[]; rules: { type: "Allow" | "Disallow"; path: string }[] } | null = null;

  for (const line of lines) {
    if (!line || line.startsWith("#")) continue;
    const [rawKey, ...rest] = line.split(":");
    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();
    if (key === "user-agent") {
      if (!current || current.rules.length > 0) {
        current = { agents: [value], rules: [] };
        groups.push(current);
      } else {
        current.agents.push(value);
      }
    } else if ((key === "disallow" || key === "allow") && current) {
      current.rules.push({ type: key === "allow" ? "Allow" : "Disallow", path: value });
    }
  }

  const matching = groups.find((g) => g.agents.some((a) => a.toLowerCase() === botName.toLowerCase()))
    ?? groups.find((g) => g.agents.includes("*"));
  if (!matching) return true;

  let allowed = true;
  let bestMatchLen = -1;
  for (const rule of matching.rules) {
    if (!rule.path) continue;
    if (path.startsWith(rule.path) && rule.path.length > bestMatchLen) {
      bestMatchLen = rule.path.length;
      allowed = rule.type === "Allow";
    }
  }
  return allowed;
}
