import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";
import { defaultPortalPath, portalAreaForPath, roleCanAccessArea } from "@/lib/portal-access";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const mustChangePassword = req.nextauth.token?.mustChangePassword as boolean | undefined;
    const path = req.nextUrl.pathname;
    const deniedDestination = defaultPortalPath(role);

    if (path.startsWith("/patient")) {
      if (!req.cookies.get("emr_patient_portal")?.value) return NextResponse.redirect(new URL("/patient-login", req.url));
      return NextResponse.next();
    }

    if (mustChangePassword && path !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
    if (!mustChangePassword && path === "/change-password") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    const area = portalAreaForPath(path);
    if (area && !roleCanAccessArea(role, area)) {
      return NextResponse.redirect(new URL(deniedDestination, req.url));
    }
    return NextResponse.next();
  },
  {
    pages: { signIn: "/" },
    callbacks: {
      authorized: ({ token, req }) =>
        req.nextUrl.pathname === "/" ||
        req.nextUrl.pathname.startsWith("/patient") ||
        (!!token && token.accountActive !== false),
    },
  }
);

export const config = {
  matcher: ["/frontdesk/:path*", "/appointments/:path*", "/doctor/:path*", "/records/:path*", "/admin/:path*", "/billing/:path*", "/diagnostics/:path*", "/documents/:path*", "/audit/:path*", "/settings/:path*", "/patient/:path*", "/change-password", "/"],
};
