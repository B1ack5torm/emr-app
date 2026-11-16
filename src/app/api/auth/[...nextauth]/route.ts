import NextAuth from "next-auth";
import { scopedAuthOptions } from "@/lib/auth";
import { SESSION_SCOPE_HEADER } from "@/lib/session-scope";
import type { NextRequest } from "next/server";

function handler(request: NextRequest, context: { params: { nextauth: string[] } }) {
  return NextAuth(scopedAuthOptions(request.headers.get(SESSION_SCOPE_HEADER) || ""))(request, context);
}

export { handler as GET, handler as POST };
