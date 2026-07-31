"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Clock } from "lucide-react";

type StaffUser = { id: string; name: string; email: string; role: string | null; status: string; createdAt: string };

export default function AdminPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRoleChoice, setPendingRoleChoice] = useState<Record<string, string>>({});

  const load = () => fetch("/api/admin/users").then((r) => r.json()).then((d) => { setUsers(d); setLoading(false); });

  useEffect(() => { load(); }, []);

  const pending = users.filter((u) => u.status === "PENDING");
  const active = users.filter((u) => u.status === "ACTIVE");

  const approve = async (id: string) => {
    const role = pendingRoleChoice[id] || "RECEPTION";
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "approve", role }) });
    load();
  };
  const reject = async (id: string) => {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "reject" }) });
    load();
  };
  const changeRole = async (id: string, role: string) => {
    await fetch(`/api/admin/users/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "changeRole", role }) });
    load();
  };

  if (loading) return <div className="text-inkSoft">Loading…</div>;

  return (
    <div>
      <div className="font-serif text-lg font-semibold mb-1 flex items-center gap-2"><ShieldCheck size={18} /> Admin</div>
      <p className="text-sm text-inkSoft mb-6">Approve staff requests and manage roles for your organization.</p>

      <div className="mb-8">
        <div className="text-xs font-bold text-inkSoft uppercase mb-2 flex items-center gap-1.5"><Clock size={13} /> Pending requests ({pending.length})</div>
        {pending.length === 0 ? (
          <div className="text-sm text-inkSoft border border-dashed border-border rounded-lg p-4">No pending requests.</div>
        ) : (
          <div className="flex flex-col gap-2">
            {pending.map((u) => (
              <div key={u.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-3">
                <div>
                  <div className="font-semibold text-sm">{u.name}</div>
                  <div className="text-xs text-inkSoft">{u.email}</div>
                </div>
                <div className="flex items-center gap-2">
                  <select value={pendingRoleChoice[u.id] || "RECEPTION"} onChange={(e) => setPendingRoleChoice({ ...pendingRoleChoice, [u.id]: e.target.value })}
                    className="border border-border rounded-lg px-2 py-1.5 text-sm bg-[#FCFAF5]">
                    <option value="RECEPTION">Front Desk</option>
                    <option value="DOCTOR">Doctor</option>
                  </select>
                  <button onClick={() => approve(u.id)} className="flex items-center gap-1 bg-accent text-white text-sm font-semibold px-3 py-1.5 rounded-lg"><CheckCircle2 size={14} /> Approve</button>
                  <button onClick={() => reject(u.id)} className="flex items-center gap-1 text-alert text-sm font-semibold px-3 py-1.5 rounded-lg border border-alertSoft"><XCircle size={14} /> Reject</button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <div className="text-xs font-bold text-inkSoft uppercase mb-2">Active staff ({active.length})</div>
        <div className="flex flex-col gap-2">
          {active.map((u) => (
            <div key={u.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between flex-wrap gap-3">
              <div>
                <div className="font-semibold text-sm">{u.name}</div>
                <div className="text-xs text-inkSoft">{u.email}</div>
              </div>
              <select value={u.role || ""} onChange={(e) => changeRole(u.id, e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-sm bg-[#FCFAF5]">
                <option value="RECEPTION">Front Desk</option>
                <option value="DOCTOR">Doctor</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}