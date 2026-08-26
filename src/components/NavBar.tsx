"use client";

import { signOut, useSession } from "next-auth/react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Stethoscope, ClipboardList, FileText, LogOut, ShieldCheck, Receipt, CalendarDays, FlaskConical, FolderOpen, History, Settings, Building2, Check, ChevronDown, LoaderCircle } from "lucide-react";
import { PortalArea, roleCanAccessArea } from "@/lib/portal-access";

export default function NavBar() {
  const { data: session, update } = useSession();
  const pathname = usePathname();
  const role = (session?.user as any)?.role;
  const orgName = (session?.user as any)?.organizationName;
  const organizationId = (session?.user as any)?.organizationId;
  const [organizations, setOrganizations] = useState<{ id: string; name: string }[]>([]);
  const [switchingOrganization, setSwitchingOrganization] = useState(false);
  const [organizationMenuOpen, setOrganizationMenuOpen] = useState(false);
  const organizationSwitcherRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (role !== "SUPER_ADMIN") { setOrganizations([]); return; }
    void fetch("/api/organizations")
      .then((response) => response.ok ? response.json() : Promise.reject())
      .then(setOrganizations)
      .catch(() => setOrganizations([]));
  }, [role]);

  useEffect(() => {
    if (!organizationMenuOpen) return;
    const closeOnOutsideClick = (event: MouseEvent) => {
      if (!organizationSwitcherRef.current?.contains(event.target as Node)) setOrganizationMenuOpen(false);
    };
    const closeOnEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOrganizationMenuOpen(false);
    };
    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, [organizationMenuOpen]);

  const switchOrganization = async (nextOrganizationId: string) => {
    if (!nextOrganizationId || nextOrganizationId === organizationId) return;
    setOrganizationMenuOpen(false);
    setSwitchingOrganization(true);
    try {
      await update({ activeOrganizationId: nextOrganizationId });
      window.location.assign("/admin");
    } finally {
      setSwitchingOrganization(false);
    }
  };

  if (pathname?.startsWith("/patient") || pathname?.startsWith("/book-appointment")) return null;
  if (!session) return null;

  const tabs: { area: PortalArea; href: string; label: string; icon: React.ReactNode }[] = [
    { area: "frontdesk", href: "/frontdesk", label: "Front Desk", icon: <ClipboardList size={15} /> },
    { area: "appointments", href: "/appointments", label: "Schedule", icon: <CalendarDays size={15} /> },
    { area: "doctor", href: "/doctor", label: "Doctor's Desk", icon: <Stethoscope size={15} /> },
    { area: "records", href: "/records", label: "Patient Records", icon: <FileText size={15} /> },
    { area: "admin", href: "/admin", label: "Admin", icon: <ShieldCheck size={15} /> },
    { area: "billing", href: "/billing", label: "Billing", icon: <Receipt size={15} /> },
    { area: "diagnostics", href: "/diagnostics", label: "Diagnostics", icon: <FlaskConical size={15} /> },
    { area: "documents", href: "/documents", label: "Documents", icon: <FolderOpen size={15} /> },
    { area: "audit", href: "/audit", label: "Audit", icon: <History size={15} /> },
    { area: "settings", href: "/settings", label: "Settings", icon: <Settings size={15} /> },
  ];

  return (
    <div className="border-b border-border bg-card py-4 print:hidden">
      <div className="mx-auto w-full max-w-[90rem] px-6">
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
            {role === "SUPER_ADMIN" && organizations.length > 0 && (
              <div ref={organizationSwitcherRef} className="relative">
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={organizationMenuOpen}
                  disabled={switchingOrganization}
                  onClick={() => setOrganizationMenuOpen((open) => !open)}
                  className={`group flex min-w-[190px] max-w-[260px] items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-left shadow-sm transition-all hover:border-accent/40 hover:shadow-md disabled:cursor-wait disabled:opacity-70 ${organizationMenuOpen ? "border-accent/50 ring-2 ring-accentSoft" : "border-border"}`}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accentSoft text-accentDark">
                    {switchingOrganization ? <LoaderCircle size={16} className="animate-spin" /> : <Building2 size={16} />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-bold uppercase tracking-[.12em] text-inkSoft">Active hospital</span>
                    <span className="block truncate text-sm font-semibold text-ink">{orgName}</span>
                  </span>
                  <ChevronDown size={15} className={`shrink-0 text-inkSoft transition-transform ${organizationMenuOpen ? "rotate-180" : "group-hover:translate-y-0.5"}`} />
                </button>

                {organizationMenuOpen && (
                  <div role="menu" aria-label="Choose active hospital" className="absolute right-0 top-[calc(100%+0.5rem)] z-[60] w-72 overflow-hidden rounded-xl border border-border bg-white shadow-xl shadow-[#214F43]/15">
                    <div className="border-b border-border bg-[#FAF8F2] px-4 py-3">
                      <div className="text-xs font-bold uppercase tracking-[.1em] text-ink">Switch hospital</div>
                      <div className="mt-0.5 text-[11px] text-inkSoft">{organizations.length} hospital{organizations.length === 1 ? "" : "s"} available</div>
                    </div>
                    <div className="max-h-72 overflow-y-auto p-1.5">
                      {organizations.map((organization) => {
                        const selected = organization.id === organizationId;
                        return (
                          <button
                            key={organization.id}
                            type="button"
                            role="menuitemradio"
                            aria-checked={selected}
                            onClick={() => void switchOrganization(organization.id)}
                            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left transition-colors ${selected ? "bg-accentSoft text-accentDark" : "text-ink hover:bg-[#F6F3EC]"}`}
                          >
                            <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ${selected ? "bg-white text-accentDark shadow-sm" : "bg-[#EEEAE1] text-inkSoft"}`}><Building2 size={15} /></span>
                            <span className="min-w-0 flex-1 truncate text-sm font-semibold">{organization.name}</span>
                            {selected && <Check size={16} className="shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
            <span className="text-inkSoft">{session.user?.name} · {role}</span>
            <button onClick={() => signOut({ callbackUrl: "/login" })} className="flex items-center gap-1 text-alert font-semibold">
              <LogOut size={14} /> Sign out
            </button>
          </div>
        )}
      </div>
      {session && (
        <div className="flex gap-2 mt-4 overflow-x-auto pb-1">
          {tabs.filter(t => roleCanAccessArea(role, t.area)).map(t => (
            <Link key={t.href} href={t.href} className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold ${pathname?.startsWith(t.href) ? "bg-accentSoft text-accentDark" : "text-inkSoft"}`}>
              {t.icon}{t.label}
            </Link>
          ))}
        </div>
      )}
      </div>
    </div>
  );
}
