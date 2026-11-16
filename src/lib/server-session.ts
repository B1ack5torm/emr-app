import { getServerSession as nextServerSession, type NextAuthOptions } from "next-auth";
import { headers } from "next/headers";
import { redirect as nextRedirect } from "next/navigation";
import { scopedAuthOptions } from "@/lib/auth";
import { scopePath, SESSION_SCOPE_HEADER } from "@/lib/session-scope";

export function getServerSession(options: NextAuthOptions) {
  return nextServerSession(scopedAuthOptions(headers().get(SESSION_SCOPE_HEADER) || "", options));
}

export function redirect(path: string): never {
  return nextRedirect(scopePath(path, headers().get(SESSION_SCOPE_HEADER) || ""));
}
