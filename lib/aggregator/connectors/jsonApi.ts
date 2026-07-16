import type { ConnectorResult, RawItem } from "../types";

/**
 * Generic connector for any JSON REST API that returns an array of records —
 * built for government open-data portals (e.g. data.gov.in API-key datasets)
 * and any partner/government API that doesn't warrant a bespoke connector.
 *
 * Source.config shape:
 * {
 *   "recordsPath": "records",           // dot-path to the array in the response, "" = response itself is the array
 *   "apiKeyEnvVar": "DATA_GOV_IN_KEY",  // env var name holding the API key (never stored in the DB directly)
 *   "apiKeyQueryParam": "api-key",      // query param the key gets attached as
 *   "fieldMap": {
 *     "externalId": "id",
 *     "title": "scheme_name",
 *     "organization": "ministry",
 *     "location": "state",
 *     "description": "details",
 *     "applyUrl": "official_link",
 *     "deadlineRaw": "last_date",
 *     "compensationRaw": "amount"
 *   },
 *   "extraQuery": { "format": "json", "limit": "200" }
 * }
 */
export async function fetchJsonApi(config: Record<string, unknown>, sourceUrl: string): Promise<ConnectorResult> {
  const fieldMap = (config.fieldMap as Record<string, string>) ?? {};
  const recordsPath = (config.recordsPath as string) ?? "";
  const extraQuery = (config.extraQuery as Record<string, string>) ?? {};

  const url = new URL(sourceUrl);
  for (const [k, v] of Object.entries(extraQuery)) url.searchParams.set(k, v);

  const apiKeyEnvVar = config.apiKeyEnvVar as string | undefined;
  const apiKeyQueryParam = config.apiKeyQueryParam as string | undefined;
  if (apiKeyEnvVar && apiKeyQueryParam) {
    const key = process.env[apiKeyEnvVar];
    if (!key) return { items: [], warnings: [`Env var ${apiKeyEnvVar} is not set — skipping ${sourceUrl}`] };
    url.searchParams.set(apiKeyQueryParam, key);
  }

  const res = await fetch(url.toString(), { headers: { Accept: "application/json" } });
  if (!res.ok) throw new Error(`JSON API ${sourceUrl} returned ${res.status}`);
  const body = await res.json();

  const records: any[] = recordsPath ? getPath(body, recordsPath) ?? [] : Array.isArray(body) ? body : [];
  const warnings: string[] = [];
  const items: RawItem[] = [];

  for (const record of records) {
    const externalId = getPath(record, fieldMap.externalId ?? "id");
    const title = getPath(record, fieldMap.title ?? "title");
    const applyUrl = getPath(record, fieldMap.applyUrl ?? "url");
    if (!externalId || !title || !applyUrl) {
      warnings.push(`Skipped a record from ${sourceUrl} missing id/title/applyUrl`);
      continue;
    }
    items.push({
      externalId: String(externalId),
      title: String(title),
      organization: fieldMap.organization ? String(getPath(record, fieldMap.organization) ?? "") : undefined,
      location: fieldMap.location ? String(getPath(record, fieldMap.location) ?? "") : undefined,
      description: fieldMap.description ? String(getPath(record, fieldMap.description) ?? "") : undefined,
      applyUrl: String(applyUrl),
      deadlineRaw: fieldMap.deadlineRaw ? String(getPath(record, fieldMap.deadlineRaw) ?? "") : undefined,
      compensationRaw: fieldMap.compensationRaw ? String(getPath(record, fieldMap.compensationRaw) ?? "") : undefined,
      extra: { raw: record },
    });
  }

  return { items, warnings };
}

function getPath(obj: any, path: string): any {
  if (!path) return undefined;
  return path.split(".").reduce((o, key) => (o == null ? undefined : o[key]), obj);
}
