"use client";

import NextLink from "next/link";
import { createContext, useContext } from "react";
import { usePathname as nextPathname, useRouter as nextRouter } from "next/navigation";
import { scopePath, stripSessionScope } from "@/lib/session-scope";

export const SessionScopeContext = createContext("");

export default function Link(props: React.ComponentProps<typeof NextLink>) {
  const scope = useContext(SessionScopeContext);
  const href = typeof props.href === "string" ? scopePath(props.href, scope) : {
    ...props.href, pathname: props.href.pathname ? scopePath(props.href.pathname, scope) : props.href.pathname,
  };
  return <NextLink {...props} href={href} />;
}

export function usePathname() {
  return stripSessionScope(nextPathname() || "/");
}

export function useRouter() {
  const router = nextRouter();
  const scope = useContext(SessionScopeContext);
  return {
    ...router,
    push: (href: string, options?: Parameters<typeof router.push>[1]) => router.push(scopePath(href, scope), options),
    replace: (href: string, options?: Parameters<typeof router.replace>[1]) => router.replace(scopePath(href, scope), options),
    prefetch: (href: string, options?: Parameters<typeof router.prefetch>[1]) => router.prefetch(scopePath(href, scope), options),
  };
}

export { useSearchParams } from "next/navigation";
