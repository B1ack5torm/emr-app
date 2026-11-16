"use client";

import { SessionProvider } from "next-auth/react";
import { SessionScopeContext } from "@/components/SessionNavigation";
import { sessionPrefix } from "@/lib/session-scope";

export default function Providers({ children, scope = "" }: { children: React.ReactNode; scope?: string }) {
  return <SessionScopeContext.Provider value={scope}><SessionProvider basePath={`${sessionPrefix(scope)}/api/auth`}>{children}</SessionProvider></SessionScopeContext.Provider>;
}
