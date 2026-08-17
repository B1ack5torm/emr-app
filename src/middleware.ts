import { withAuth } from "next-auth/middleware";
import { NextResponse } from "next/server";

export default withAuth(
  function middleware(req) {
    const role = req.nextauth.token?.role as string | undefined;
    const mustChangePassword = req.nextauth.token?.mustChangePassword as boolean | undefined;
    const path = req.nextUrl.pathname;
    const deniedDestination = "/records";

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

    if (path.startsWith("/frontdesk") && !["RECEPTION", "FRONT_DESK", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL(deniedDestination, req.url));
    }
    if (path.startsWith("/appointments") && !["RECEPTION", "FRONT_DESK", "NURSE", "DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL(deniedDestination, req.url));
    }
    if (path.startsWith("/doctor") && !["DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL(deniedDestination, req.url));
    }
    if (path.startsWith("/admin") && !["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL(deniedDestination, req.url));
    }
    if (path.startsWith("/billing") && !["RECEPTION", "BILLING", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL(deniedDestination, req.url));
    }
    if (path.startsWith("/diagnostics") && !["DOCTOR", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) return NextResponse.redirect(new URL(deniedDestination, req.url));
    if (path.startsWith("/documents") && !["DOCTOR", "NURSE", "RECEPTION", "FRONT_DESK", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) return NextResponse.redirect(new URL(deniedDestination, req.url));
    if ((path.startsWith("/audit") || path.startsWith("/settings")) && !["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) return NextResponse.redirect(new URL(deniedDestination, req.url));
    if (path.startsWith("/records") && !["RECEPTION", "FRONT_DESK", "NURSE", "DOCTOR", "BILLING", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) {
      return NextResponse.redirect(new URL(deniedDestination, req.url));
    }
    return NextResponse.next();
  },
  { callbacks: { authorized: ({ token, req }) => req.nextUrl.pathname === "/" || req.nextUrl.pathname.startsWith("/patient") || !!token } }
);

export const config = {
  matcher: ["/frontdesk/:path*", "/appointments/:path*", "/doctor/:path*", "/records/:path*", "/admin/:path*", "/billing/:path*", "/diagnostics/:path*", "/documents/:path*", "/audit/:path*", "/settings/:path*", "/patient/:path*", "/change-password", "/"],
};
