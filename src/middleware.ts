import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const path = req.nextUrl.pathname;

    if (path.startsWith("/frontdesk") && !["RECEPTION", "ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL("/records", req.url));
    }
    if (path.startsWith("/doctor") && !["DOCTOR", "ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL("/records", req.url));
    }
    return NextResponse.next();
  },
  {
    callbacks: {
      authorized: ({ token }) => !!token,
    },
  }
);

export const config = {
  matcher: ["/frontdesk/:path*", "/doctor/:path*", "/records/:path*"],
};
