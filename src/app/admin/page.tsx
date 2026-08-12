"use client";

import { useEffect, useState } from "react";
import { CheckCircle2, XCircle, ShieldCheck, Clock, Mail, Send, UserPlus } from "lucide-react";

type StaffUser = { id: string; name: string; email: string; role: string | null; status: string; createdAt: string };
type PendingInvite = { id: string; email: string; role: string; expiresAt: string; createdAt: string };

export default function AdminPage() {
  const [users, setUsers] = useState<StaffUser[]>([]);
  const [invites, setInvites] = useState<PendingInvite[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingRoleChoice, setPendingRoleChoice] = useState<Record<string, string>>({});

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("RECEPTION");
  const [inviteError, setInviteError] = useState("");
  const [inviteSuccess, setInviteSuccess] = useState("");
  const [sending, setSending] = useState(false);

  const [showManualAdd, setShowManualAdd] = useState(false);
  const [manualName, setManualName] = useState("");
  const [manualEmail, setManualEmail] = useState("");
  const [manualPassword, setManualPassword] = useState("");
  const [manualRole, setManualRole] = useState("RECEPTION");
  const [manualError, setManualError] = useState("");
  const [manualSuccess, setManualSuccess] = useState("");
  const [creating, setCreating] = useState(false);

  const load = () =>
    Promise.all([
      fetch("/api/admin/users").then((r) => r.json()),
      fetch("/api/admin/invites").then((r) => r.json()),
    ]).then(([u, i]) => { setUsers(u); setInvites(i); setLoading(false); });

  useEffect(() => { load(); }, []);

  const pending = users.filter((u) => u.status === "PENDING");
  const active = users.filter((u) => u.status === "ACTIVE");

  const sendInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    setInviteError(""); setInviteSuccess("");
    setSending(true);
    const res = await fetch("/api/admin/invites", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
    });
    const data = await res.json();
    setSending(false);
    if (!res.ok) { setInviteError(data.error || "Could not send invite."); return; }
    setInviteSuccess(`Invitation sent to ${inviteEmail}.`);
    setInviteEmail("");
    load();
  };

  const createUserManually = async (e: React.FormEvent) => {
    e.preventDefault();
    setManualError(""); setManualSuccess("");
    setCreating(true);
    const res = await fetch("/api/admin/users", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: manualName, email: manualEmail, password: manualPassword, role: manualRole }),
    });
    const data = await res.json();
    setCreating(false);
    if (!res.ok) { setManualError(data.error || "Could not create user."); return; }
    setManualSuccess(`Account created for ${manualEmail} — they'll be asked to set their own password on first login.`);
    setManualName(""); setManualEmail(""); setManualPassword(""); setManualRole("RECEPTION");
    load();
  };

  const revokeInvite = async (id: string) => {
    await fetch(`/api/admin/invites/${id}`, { method: "DELETE" });
    load();
  };

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
  const deleteUser = async (id: string, name: string) => {
    if (!confirm(`Remove ${name} from this hospital? They'll lose access immediately.`)) return;
    await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
    load();
  };

  const roleLabel = (r: string) => (r === "DOCTOR" ? "Doctor" : r === "PHARMACIST" ? "Pharmacist" : r === "ADMIN" ? "Admin" : "Front Desk");

  if (loading) return <div className="text-inkSoft">Loading…</div>;

  return (
    <div>
      <div className="font-serif text-lg font-semibold mb-1 flex items-center gap-2"><ShieldCheck size={18} /> Admin</div>
      <p className="text-sm text-inkSoft mb-6">Invite staff, approve join requests, and manage roles for your organization.</p>

      <div className="mb-8">
        <div className="text-xs font-bold text-inkSoft uppercase mb-2 flex items-center gap-1.5"><Mail size={13} /> Invite staff by email</div>
        <form onSubmit={sendInvite} className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-end gap-3">
          <div className="flex-1 min-w-[200px]">
            <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Email</label>
            <input type="email" required value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="name@example.com" className="w-full border border-border rounded-lg px-3 py-2 bg-[#FCFAF5] text-sm" />
          </div>
          <div>
            <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Role</label>
            <select value={inviteRole} onChange={(e) => setInviteRole(e.target.value)} className="border border-border rounded-lg px-3 py-2 bg-[#FCFAF5] text-sm">
              <option value="RECEPTION">Front Desk</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PHARMACIST">Pharmacist</option>
              <option value="ADMIN">Admin</option>
            </select>
          </div>
          <button disabled={sending} className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg">
            <Send size={14} /> {sending ? "Sending…" : "Send invite"}
          </button>
        </form>
        {inviteError && <div className="text-alert text-sm mt-2">{inviteError}</div>}
        {inviteSuccess && <div className="text-accentDark text-sm mt-2">{inviteSuccess}</div>}

        {invites.length > 0 && (
          <div className="flex flex-col gap-2 mt-3">
            {invites.map((inv) => (
              <div key={inv.id} className="flex items-center justify-between bg-[#FAF8F2] border border-border rounded-lg px-4 py-2.5 text-sm">
                <div>
                  <span className="font-semibold">{inv.email}</span>
                  <span className="text-inkSoft"> · invited as {roleLabel(inv.role)} · expires {new Date(inv.expiresAt).toLocaleDateString()}</span>
                </div>
                <button onClick={() => revokeInvite(inv.id)} className="text-alert text-xs font-semibold">Revoke</button>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="mb-8">
        <div className="flex items-center justify-between mb-2">
          <div className="text-xs font-bold text-inkSoft uppercase flex items-center gap-1.5"><UserPlus size={13} /> Add user manually</div>
          <button onClick={() => setShowManualAdd(!showManualAdd)} className="text-xs font-semibold text-accentDark border border-border rounded-lg px-3 py-1.5">
            {showManualAdd ? "Cancel" : "+ Add user"}
          </button>
        </div>

        {showManualAdd && (
          <form onSubmit={createUserManually} className="bg-card border border-border rounded-lg p-4 flex flex-wrap items-end gap-3">
            <div className="min-w-[160px]">
              <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Full name</label>
              <input required value={manualName} onChange={(e) => setManualName(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 bg-[#FCFAF5] text-sm" />
            </div>
            <div className="flex-1 min-w-[180px]">
              <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Email</label>
              <input type="email" required value={manualEmail} onChange={(e) => setManualEmail(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 bg-[#FCFAF5] text-sm" />
            </div>
            <div className="min-w-[140px]">
              <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Password</label>
              <input type="password" required minLength={8} value={manualPassword} onChange={(e) => setManualPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 bg-[#FCFAF5] text-sm" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Role</label>
              <select value={manualRole} onChange={(e) => setManualRole(e.target.value)} className="border border-border rounded-lg px-3 py-2 bg-[#FCFAF5] text-sm">
                <option value="RECEPTION">Front Desk</option>
              <option value="DOCTOR">Doctor</option>
              <option value="PHARMACIST">Pharmacist</option>
                <option value="ADMIN">Admin</option>
              </select>
            </div>
            <button disabled={creating} className="flex items-center gap-2 bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg">
              <UserPlus size={14} /> {creating ? "Creating…" : "Create account"}
            </button>
          </form>
        )}
        {manualError && <div className="text-alert text-sm mt-2">{manualError}</div>}
        {manualSuccess && <div className="text-accentDark text-sm mt-2">{manualSuccess}</div>}
      </div>

      <div className="mb-8">
        <div className="text-xs font-bold text-inkSoft uppercase mb-2 flex items-center gap-1.5"><Clock size={13} /> Pending join requests ({pending.length})</div>
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
                  <select value={pendingRoleChoice[u.id] || "RECEPTION"} onChange={(e) => setPendingRoleChoice({ ...pendingRoleChoice, [u.id]: e.target.value })} className="border border-border rounded-lg px-2 py-1.5 text-sm bg-[#FCFAF5]">
                    <option value="RECEPTION">Front Desk</option>
                    <option value="DOCTOR">Doctor</option>
                    <option value="PHARMACIST">Pharmacist</option>
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
              <div className="flex items-center gap-2">
                <select value={u.role || ""} onChange={(e) => changeRole(u.id, e.target.value)} className="border border-border rounded-lg px-2 py-1.5 text-sm bg-[#FCFAF5]">
                  <option value="RECEPTION">Front Desk</option>
                  <option value="DOCTOR">Doctor</option>
                  <option value="ADMIN">Admin</option>
                </select>
                <button onClick={() => deleteUser(u.id, u.name)} className="text-alert text-xs font-semibold border border-alertSoft rounded-lg px-3 py-1.5">
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
