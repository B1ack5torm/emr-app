// This identifier selects a cookie namespace; it is not an authentication token.
export const SESSION_SCOPE_HEADER = "x-emr-session-scope";
const scopePattern = /^\/session\/([a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12})(?=\/|$)/;

export function sessionScope(pathname: string) {
  return pathname.match(scopePattern)?.[1] || "";
}

export function sessionPrefix(scope: string) {
  return scope && sessionScope(`/session/${scope}`) === scope ? `/session/${scope}` : "";
}

export function stripSessionScope(pathname: string) {
  const scope = sessionScope(pathname);
  return scope ? pathname.slice(sessionPrefix(scope).length) || "/" : pathname;
}

export function scopePath(path: string, scope: string) {
  if (!path.startsWith("/") || path.startsWith("//") || path.startsWith("/session/")) return path;
  // Public patient and booking flows retain their independent authentication.
  if (/^\/(?:patient(?:[-/]|$)|book-appointment(?:[/?#]|$)|_next\/|favicon)/.test(path)) return path;
  return `${sessionPrefix(scope)}${path}`;
}

export function sessionCookieName(scope: string, secure: boolean) {
  return `${secure ? "__Secure-" : ""}next-auth.session-token${sessionPrefix(scope) ? `.${scope}` : ""}`;
}

export function browserSessionPath(path: string) {
  return scopePath(path, typeof window === "undefined" ? "" : sessionScope(window.location.pathname));
}

export function sessionFetch(input: RequestInfo | URL, init?: RequestInit) {
  // Application calls use origin-relative URLs. Do not alter external requests.
  return fetch(typeof input === "string" ? browserSessionPath(input) : input, init);
}
