"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";

type Org = { id: string; name: string };

export default function RegisterPage() {
  const router = useRouter();
  const [mode, setMode] = useState<"create" | "join">("create");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [orgName, setOrgName] = useState("");
  const [organizationId, setOrganizationId] = useState("");
  const [orgs, setOrgs] = useState<Org[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState("");

  useEffect(() => { fetch("/api/organizations").then((r) => r.json()).then(setOrgs); }, []);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (mode === "join" && !organizationId) { setError("Please select an organization to join."); return; }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(mode === "create" ? { mode, name, email, password, orgName } : { mode, name, email, password, organizationId }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) { setError(data.error || "Something went wrong. Please try again."); return; }

    if (data.autoApproved) router.push("/login?registered=1");
    else setSuccessMsg("Request sent — an administrator at that organization needs to approve your account before you can sign in.");
  };

  if (successMsg) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm text-center">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center mx-auto mb-4">
            <Stethoscope size={18} color="#fff" />
          </div>
          <p className="text-sm text-ink">{successMsg}</p>
          <Link href="/login" className="inline-block mt-5 text-accentDark font-semibold text-sm">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Stethoscope size={18} color="#fff" />
          </div>
          <div className="font-serif font-bold text-lg">Create account</div>
        </div>

        <div className="flex gap-2 mb-5">
          <button type="button" onClick={() => setMode("create")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg border ${mode === "create" ? "bg-accentSoft text-accentDark border-accentSoft" : "border-border text-inkSoft"}`}>
            New hospital / clinic
          </button>
          <button type="button" onClick={() => setMode("join")}
            className={`flex-1 text-xs font-semibold py-2 rounded-lg border ${mode === "join" ? "bg-accentSoft text-accentDark border-accentSoft" : "border-border text-inkSoft"}`}>
            Join existing one
          </button>
        </div>

        {mode === "create" ? (
          <>
            <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Hospital / clinic name</label>
            <input required value={orgName} onChange={(e) => setOrgName(e.target.value)} placeholder="e.g. Riverside Medical Center"
              className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />
            <p className="text-xs text-inkSoft -mt-3 mb-4">You&apos;ll be the Admin for this organization and can approve staff who join it.</p>
          </>
        ) : (
          <>
            <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Organization</label>
            <select required value={organizationId} onChange={(e) => setOrganizationId(e.target.value)}
              className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]">
              <option value="">Select an organization…</option>
              {orgs.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
            </select>
            <p className="text-xs text-inkSoft -mt-3 mb-4">An admin there will review and approve your account before you can sign in.</p>
          </>
        )}

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Full name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Password</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Confirm password</label>
        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        {error && <div className="text-alert text-sm mb-3">{error}</div>}

        <button disabled={loading} className="w-full bg-accent text-white font-semibold rounded-lg py-2.5">
          {loading ? "Submitting…" : mode === "create" ? "Create organization" : "Request to join"}
        </button>

        <p className="text-xs text-inkSoft mt-5 text-center">
          Already have an account? <Link href="/login" className="text-accentDark font-semibold">Sign in</Link>
        </p>
      </form>
    </div>
  );
}
