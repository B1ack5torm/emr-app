"use client";

import { SessionProvider } from "next-auth/react";
import { SessionScopeContext } from "@/components/SessionNavigation";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { sessionPrefix, sessionScope } from "@/lib/session-scope";

export default function Providers({ children, scope = "" }: { children: React.ReactNode; scope?: string }) {
  // Root layouts persist during client navigation. Their original server scope
  // must not keep a newly opened login pointed at the previous auth endpoint.
  const pathname = usePathname();
  const [visibleScope, setVisibleScope] = useState(scope);
  useEffect(() => {
    // Next commits browser history after rendering the new route. Read the
    // visible URL after that commit, including when usePathname is rewritten.
    setVisibleScope(sessionScope(window.location.pathname));
  }, [pathname]);
  const activeScope = sessionScope(pathname || "") || visibleScope;
  return <SessionScopeContext.Provider value={activeScope}><SessionProvider key={activeScope} basePath={`${sessionPrefix(activeScope)}/api/auth`}>{children}</SessionProvider></SessionScopeContext.Provider>;
}
