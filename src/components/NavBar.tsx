"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, ClipboardList, FileText, LogOut } from "lucide-react";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;

  const tabs = [
    { href: "/frontdesk", label: "Front Desk", icon: <ClipboardList size={15} />, roles: ["RECEPTION", "ADMIN"] },
    { href: "/doctor", label: "Doctor's Desk", icon: <Stethoscope size={15} />, roles: ["DOCTOR", "ADMIN"] },
    { href: "/records", label: "Patient Records", icon: <FileText size={15} />, roles: ["RECEPTION", "DOCTOR", "ADMIN"] },
  ];

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Stethoscope size={18} color="#fff" />
          </div>
          <div>
            <div className="font-serif font-bold text-lg leading-tight">Sunrise Community Hospital</div>
            <div className="text-xs text-inkSoft font-mono">Electronic Medical Record</div>
          </div>
        </div>
        {session && (
          <div className="flex items-center gap-3 text-sm">
            <span className="text-inkSoft">{session.user?.name} · {role}</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1 text-alert font-semibold">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
      {session && (
        <div className="flex gap-2 mt-4">
          {tabs.filter(t => t.roles.includes(role)).map(t => (
            <Link key={t.href} href={t.href} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold ${pathname?.startsWith(t.href) ? "bg-accentSoft text-accentDark" : "text-inkSoft"}`}>
              {t.icon}{t.label}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
