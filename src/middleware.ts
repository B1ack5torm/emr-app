import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const mustChangePassword = req.nextauth.token?.mustChangePassword as boolean | undefined;
    const path = req.nextUrl.pathname;

    if (mustChangePassword && path !== "/change-password") {
      return NextResponse.redirect(new URL("/change-password", req.url));
    }
    if (!mustChangePassword && path === "/change-password") {
      return NextResponse.redirect(new URL("/", req.url));
    }

    if (path.startsWith("/frontdesk") && !["RECEPTION", "ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL("/records", req.url));
    }
    if (path.startsWith("/appointments") && !["RECEPTION", "ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL("/records", req.url));
    }
    if (path.startsWith("/doctor") && !["DOCTOR", "ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL("/records", req.url));
    }
    if (path.startsWith("/admin") && role !== "ADMIN") {
      return NextResponse.redirect(new URL("/records", req.url));
    }
    if (path.startsWith("/billing") && !["RECEPTION", "ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL("/records", req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token }) => !!token } }
);

export const config = {
  matcher: ["/frontdesk/:path*", "/appointments/:path*", "/doctor/:path*", "/records/:path*", "/admin/:path*", "/billing/:path*", "/change-password", "/"],
};
