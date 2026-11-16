import assert from "node:assert/strict";
import test from "node:test";
import { encode } from "next-auth/jwt";
import { NextRequest } from "next/server";
import middleware from "../src/middleware";
import { scopedAuthOptions } from "../src/lib/auth";
import { scopePath, sessionCookieName, sessionPrefix, sessionScope, stripSessionScope, SESSION_SCOPE_HEADER } from "../src/lib/session-scope";

const adminScope = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const doctorScope = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

test("session routes preserve account context without altering public or external links", () => {
  assert.equal(sessionScope(`/session/${adminScope}/admin`), adminScope);
  assert.equal(sessionScope(`/session/${adminScope}extra/admin`), "");
  assert.equal(sessionPrefix("../admin"), "");
  assert.equal(stripSessionScope(`/session/${adminScope}/api/patients?q=a`), "/api/patients?q=a");
  assert.equal(scopePath("/records?q=a#details", adminScope), `/session/${adminScope}/records?q=a#details`);
  assert.equal(scopePath(`/session/${adminScope}/records`, adminScope), `/session/${adminScope}/records`);
  for (const path of ["https://example.org", "//example.org", "#details", "/patient-login", "/book-appointment?hospital=test"]) {
    assert.equal(scopePath(path, adminScope), path);
  }
});

test("auth tokens, CSRF, callback cookies and redirects are scoped independently", async () => {
  const admin = scopedAuthOptions(adminScope);
  const doctor = scopedAuthOptions(doctorScope);
  for (const key of ["sessionToken", "csrfToken", "callbackUrl"] as const) {
    assert.notEqual(admin.cookies![key]!.name, doctor.cookies![key]!.name);
    assert.equal(admin.cookies![key]!.options.path, `/session/${adminScope}`);
    assert.equal(admin.cookies![key]!.options.httpOnly, true);
    assert.equal(admin.cookies![key]!.options.sameSite, "lax");
  }
  const redirect = admin.callbacks!.redirect!;
  assert.equal(await redirect({ url: "/admin", baseUrl: "https://emr.example" }), `https://emr.example/session/${adminScope}/admin`);
  assert.equal(await redirect({ url: `https://emr.example/session/${doctorScope}/doctor`, baseUrl: "https://emr.example" }), `https://emr.example/session/${adminScope}/`);
  assert.equal(await redirect({ url: "https://external.example", baseUrl: "https://emr.example" }), `https://emr.example/session/${adminScope}/`);
});

test("route authorization cannot fall back to another tab or a legacy admin cookie", async () => {
  process.env.NEXTAUTH_SECRET = "test-only-session-isolation-secret";
  const secure = process.env.NEXTAUTH_URL?.startsWith("https://") || process.env.NODE_ENV === "production";
  const secret = process.env.NEXTAUTH_SECRET;
  const admin = await encode({ secret, token: { role: "SUPER_ADMIN", accountActive: true } });
  const doctor = await encode({ secret, token: { role: "DOCTOR", accountActive: true } });
  const legacyCookie = secure ? "__Secure-next-auth.session-token" : "next-auth.session-token";
  const cookie = `${sessionCookieName(adminScope, secure)}=${admin}; ${sessionCookieName(doctorScope, secure)}=${doctor}; ${legacyCookie}=${admin}`;
  const request = (scope: string, path: string, cookies = cookie) => new NextRequest(`https://emr.example/session/${scope}${path}`, {
    headers: { cookie: cookies, [SESSION_SCOPE_HEADER]: adminScope },
  });
  const adminResponse = await middleware(request(adminScope, "/admin"));
  assert.equal(adminResponse.headers.get("x-middleware-rewrite"), "https://emr.example/admin");
  const doctorResponse = await middleware(request(doctorScope, "/admin"));
  assert.equal(doctorResponse.headers.get("location"), `https://emr.example/session/${doctorScope}/doctor`);
  const ownDoctor = await middleware(request(doctorScope, "/doctor"));
  assert.equal(ownDoctor.headers.get(`x-middleware-request-${SESSION_SCOPE_HEADER}`), doctorScope);
  const missingDoctorCookie = `${sessionCookieName(adminScope, secure)}=${admin}; ${legacyCookie}=${admin}`;
  const signedOut = await middleware(request(doctorScope, "/doctor", missingDoctorCookie));
  assert.equal(signedOut.headers.get("location"), `https://emr.example/session/${doctorScope}/login`);
  const adminStillSignedIn = await middleware(request(adminScope, "/admin", missingDoctorCookie));
  assert.equal(adminStillSignedIn.headers.get("x-middleware-rewrite"), "https://emr.example/admin");
});

test("opening login creates a fresh namespace while spoofed headers are removed", async () => {
  const first = await middleware(new NextRequest("https://emr.example/login?registered=1"));
  const second = await middleware(new NextRequest("https://emr.example/login"));
  const firstUrl = new URL(first.headers.get("location")!);
  const secondUrl = new URL(second.headers.get("location")!);
  assert.ok(sessionScope(firstUrl.pathname));
  assert.notEqual(sessionScope(firstUrl.pathname), sessionScope(secondUrl.pathname));
  assert.equal(firstUrl.search, "?registered=1");
  const response = await middleware(new NextRequest("https://emr.example/api/patients", { headers: { [SESSION_SCOPE_HEADER]: adminScope } }));
  assert.equal(response.headers.get(`x-middleware-request-${SESSION_SCOPE_HEADER}`), null);
});
