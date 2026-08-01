"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Stethoscope } from "lucide-react";

export default function AcceptInvitePage() {
  return (
    <Suspense fallback={null}>
      <AcceptInviteForm />
    </Suspense>
  );
}

function AcceptInviteForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [loading, setLoading] = useState(true);
  const [invite, setInvite] = useState<{ email: string; role: string; organizationName: string } | null>(null);
  const [loadError, setLoadError] = useState("");

  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [submitError, setSubmitError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!token) { setLoadError("Missing invitation token."); setLoading(false); return; }
    fetch(`/api/invites/${token}`).then(async (r) => {
      const data = await r.json();
      if (!r.ok) setLoadError(data.error || "Invalid invitation.");
      else setInvite(data);
      setLoading(false);
    });
  }, [token]);

  const roleLabel = (r: string) => (r === "DOCTOR" ? "Doctor" : r === "ADMIN" ? "Admin" : "Front Desk");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError("");
    if (password !== confirmPassword) { setSubmitError("Passwords do not match."); return; }

    setSubmitting(true);
    const res = await fetch(`/api/invites/${token}/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, password }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setSubmitError(data.error || "Something went wrong."); return; }
    router.push("/login?registered=1");
  };

  if (loading) return <div className="min-h-[70vh] flex items-center justify-center text-inkSoft">Loading invitation…</div>;

  if (loadError) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm text-center">
          <p className="text-sm text-alert">{loadError}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Stethoscope size={18} color="#fff" />
          </div>
          <div className="font-serif font-bold text-lg">Join {invite?.organizationName}</div>
        </div>
        <p className="text-xs text-inkSoft mb-5">
          You're accepting an invitation for <b>{invite?.email}</b> as <b>{roleLabel(invite?.role || "")}</b>.
        </p>

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Full name</label>
        <input required value={name} onChange={(e) => setName(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Password</label>
        <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Confirm password</label>
        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        {submitError && <div className="text-alert text-sm mb-3">{submitError}</div>}

        <button disabled={submitting} className="w-full bg-accent text-white font-semibold rounded-lg py-2.5">
          {submitting ? "Creating account…" : "Accept & create account"}
        </button>
      </form>
    </div>
  );
}