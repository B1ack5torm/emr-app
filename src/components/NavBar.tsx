"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Stethoscope, ClipboardList, FileText, LogOut, ShieldCheck, Receipt, CalendarDays, FlaskConical, FolderOpen, History, Settings } from "lucide-react";

export default function NavBar() {
  const { data: session } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;
  const orgName = (session?.user as any)?.organizationName;

  if (pathname?.startsWith("/patient") || pathname?.startsWith("/book-appointment")) return null;
  if (!session) return null;

  const tabs = [
    { href: "/frontdesk", label: "Front Desk", icon: <ClipboardList size={15} />, roles: ["RECEPTION", "FRONT_DESK", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/appointments", label: "Schedule", icon: <CalendarDays size={15} />, roles: ["RECEPTION", "FRONT_DESK", "NURSE", "DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/doctor", label: "Doctor's Desk", icon: <Stethoscope size={15} />, roles: ["DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/records", label: "Patient Records", icon: <FileText size={15} />, roles: ["RECEPTION", "FRONT_DESK", "NURSE", "DOCTOR", "BILLING", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/admin", label: "Admin", icon: <ShieldCheck size={15} />, roles: ["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/billing", label: "Billing", icon: <Receipt size={15} />, roles: ["RECEPTION", "BILLING", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/diagnostics", label: "Diagnostics", icon: <FlaskConical size={15} />, roles: ["DOCTOR", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/documents", label: "Documents", icon: <FolderOpen size={15} />, roles: ["DOCTOR", "NURSE", "RECEPTION", "FRONT_DESK", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/audit", label: "Audit", icon: <History size={15} />, roles: ["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
    { href: "/settings", label: "Settings", icon: <Settings size={15} />, roles: ["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"] },
  ];

  return (
    <div className="bg-card border-b border-border px-6 py-4 print:hidden">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Stethoscope size={18} color="#fff" />
          </div>
          <div>
            <div className="font-serif font-bold text-lg leading-tight">CareChart{orgName ? ` · ${orgName}` : ""}</div>
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
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
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
