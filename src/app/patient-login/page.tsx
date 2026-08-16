"use client";

import { useState } from "react";
import Link from "next/link";
import { HeartPulse, ShieldCheck } from "lucide-react";

export default function PatientLoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setLoading(true);
    const response = await fetch("/api/patient-portal/login", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ email, password }) });
    const data = await response.json(); setLoading(false);
    if (!response.ok) return setError(data.error || "Could not sign in.");
    window.location.assign("/patient");
  };

  return <div className="min-h-[78vh] flex items-center justify-center py-8"><form onSubmit={submit} className="w-full max-w-sm rounded-2xl border border-border bg-card p-8 shadow-xl shadow-[#2C4E43]/5">
    <div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white"><HeartPulse size={20} /></span><div><h1 className="font-serif text-xl font-bold">Patient portal</h1><p className="text-xs text-inkSoft">Sign in to your patient jacket</p></div></div>
    <div className="mb-5 flex items-start gap-2 rounded-xl bg-accentSoft p-3 text-xs leading-5 text-accentDark"><ShieldCheck size={15} className="mt-0.5 shrink-0" />Your patient login is separate from staff accounts, so both can remain signed in.</div>
    <label className="block text-xs font-bold uppercase text-inkSoft mb-1">Email</label><input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} className="patient-login-input mb-4" />
    <label className="block text-xs font-bold uppercase text-inkSoft mb-1">Password</label><input required type="password" value={password} onChange={(event) => setPassword(event.target.value)} className="patient-login-input mb-4" />
    {error && <div className="mb-3 text-sm text-alert">{error}</div>}
    <button disabled={loading} className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white disabled:opacity-60">{loading ? "Signing in…" : "Sign in to patient portal"}</button>
    <p className="mt-5 text-center text-xs text-inkSoft">First time here? <Link href="/patient-portal/activate" className="font-bold text-accentDark">Activate your portal</Link></p>
    <p className="mt-2 text-center text-xs"><Link href="/login" className="font-semibold text-inkSoft">Staff sign in</Link></p>
    <style jsx>{`.patient-login-input{width:100%;border:1px solid #E2DCCE;border-radius:8px;background:#FCFAF5;padding:9px 11px;font-size:14px}`}</style>
  </form></div>;
}
