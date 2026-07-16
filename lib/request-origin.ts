/**
 * Figures out the public origin (scheme + host) the app is actually being
 * reached at. `req.nextUrl.origin` / `req.url` reflect the raw `Host` header
 * Next.js's server process sees — behind a reverse proxy like Render's, that
 * can be the container's internal address (e.g. `http://localhost:10000`)
 * rather than the real public hostname. Proxies that terminate TLS forward
 * the original request's real host/protocol via `X-Forwarded-Host` /
 * `X-Forwarded-Proto`, so those are trusted first when present, and
 * `nextUrl.origin` is only a fallback for direct/local requests that never
 * went through a proxy (e.g. `next dev`).
 *
 * Pure Web APIs only (Headers, URL) so this works in both the Node runtime
 * (API routes) and the Edge runtime (middleware).
 */
export function getRequestOrigin(req: { headers: Headers; nextUrl: URL }): string {
  const forwardedHost = req.headers.get("x-forwarded-host");
  const forwardedProto = req.headers.get("x-forwarded-proto");
  if (forwardedHost) {
    const proto = forwardedProto?.split(",")[0]?.trim() || "https";
    return `${proto}://${forwardedHost.split(",")[0].trim()}`;
  }
  return req.nextUrl.origin;
}

/**
 * Builds an absolute URL on OUR OWN site (e.g. to redirect the browser to
 * `/auth?...`) using the trusted origin above — never `req.nextUrl.clone()`
 * or `new URL(path, req.url)`, both of which inherit whatever internal host
 * the server process saw the request on and would send the browser's
 * redirect to an address it can't actually reach.
 */
export function buildAppUrl(req: { headers: Headers; nextUrl: URL }, pathname: string, search = ""): URL {
  return new URL(pathname + search, getRequestOrigin(req));
}
