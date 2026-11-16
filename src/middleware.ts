import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";
import { defaultPortalPath, portalAreaForPath, roleCanAccessArea } from "@/lib/portal-access";
import { SESSION_SCOPE_HEADER, scopePath, sessionScope, stripSessionScope, sessionCookieName } from "@/lib/session-scope";

export default async function middleware(req: NextRequest) {
  const scope = sessionScope(req.nextUrl.pathname);
  const path = stripSessionScope(req.nextUrl.pathname);
  if (req.nextUrl.pathname.startsWith("/session/") && !scope) return new NextResponse("Invalid session context", { status: 400 });
  if (!scope && path === "/login") {
    const url = req.nextUrl.clone();
    url.pathname = scopePath("/login", crypto.randomUUID());
    return NextResponse.redirect(url);
  }
  const requestHeaders = new Headers(req.headers);
  // Derive scope only from the route. Ignore client-supplied identity selectors.
  requestHeaders.delete(SESSION_SCOPE_HEADER);
  if (scope) requestHeaders.set(SESSION_SCOPE_HEADER, scope);
  const next = () => {
    const destination = req.nextUrl.clone();
    destination.pathname = path;
    const response = scope
      ? NextResponse.rewrite(destination, { request: { headers: requestHeaders } })
      : NextResponse.next({ request: { headers: requestHeaders } });
    if (scope) response.headers.set("Cache-Control", "private, no-store");
    return response;
  };
  const redirect = (destination: string) => NextResponse.redirect(new URL(scopePath(destination, scope), req.url));
  if (path === "/patient" || path.startsWith("/patient/")) {
    return req.cookies.get("emr_patient_portal")?.value ? next() : redirect("/patient-login");
  }
  const protectedPage = !!portalAreaForPath(path) || path === "/change-password";
  if (!protectedPage && path !== "/") return next();
  const secure = process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.NODE_ENV === "production";
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET, ...(scope ? { cookieName: sessionCookieName(scope, secure) } : {}) });
  if (!token || token.accountActive === false) return protectedPage ? redirect("/login") : next();
  const role = token.role as string | undefined;
  if (token.mustChangePassword && path !== "/change-password") return redirect("/change-password");
  if (!token.mustChangePassword && path === "/change-password") return redirect("/");
  const area = portalAreaForPath(path);
  if (area && !roleCanAccessArea(role, area)) return redirect(defaultPortalPath(role));
  return next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|favicon.svg).*)"],
};
