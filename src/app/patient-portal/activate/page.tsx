"use client";

import { useState } from "react";
import Link from "next/link";
import { CheckCircle2, ShieldCheck, Stethoscope } from "lucide-react";

export default function ActivatePatientPortalPage() {
  const [form, setForm] = useState({ mrn: "", email: "", dateOfBirth: "", password: "", confirmPassword: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [complete, setComplete] = useState(false);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (form.password !== form.confirmPassword) return setError("Passwords do not match.");
    setLoading(true);
    const response = await fetch("/api/patient-portal/activate", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    const data = await response.json();
    setLoading(false);
    if (!response.ok) return setError(data.error || "Could not activate your portal.");
    setComplete(true);
  };

  return <div className="min-h-[78vh] flex items-center justify-center py-8">
    <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl shadow-[#2C4E43]/5">
      <div className="mb-6 flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent text-white"><Stethoscope size={20} /></span><div><h1 className="font-serif text-xl font-bold">Activate patient portal</h1><p className="text-xs text-inkSoft">Secure access to your patient jacket</p></div></div>
      {complete ? <div className="text-center py-5"><CheckCircle2 size={42} className="mx-auto text-accent" /><h2 className="mt-4 font-serif text-xl font-bold">Your portal is ready</h2><p className="mt-2 text-sm text-inkSoft">Sign in with your email and new password to view your health record.</p><Link href="/patient-login" className="mt-6 inline-block rounded-lg bg-accent px-5 py-2.5 text-sm font-bold text-white">Continue to patient sign in</Link></div> : <form onSubmit={submit}>
        <div className="mb-4 rounded-xl bg-accentSoft p-3 text-xs leading-5 text-accentDark"><ShieldCheck size={15} className="mb-1" />Your MRN, email, and date of birth must match the information held by your clinic.</div>
        <label className="block text-xs font-bold uppercase text-inkSoft mb-1">Medical record number (MRN)</label><input required value={form.mrn} onChange={(e) => set("mrn", e.target.value)} placeholder="MRN-000001" className="portal-input mb-4 uppercase" />
        <label className="block text-xs font-bold uppercase text-inkSoft mb-1">Email</label><input required type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="portal-input mb-4" />
        <label className="block text-xs font-bold uppercase text-inkSoft mb-1">Date of birth</label><input required type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(e) => set("dateOfBirth", e.target.value)} className="portal-input mb-4" />
        <label className="block text-xs font-bold uppercase text-inkSoft mb-1">Create password</label><input required minLength={8} type="password" value={form.password} onChange={(e) => set("password", e.target.value)} className="portal-input mb-4" />
        <label className="block text-xs font-bold uppercase text-inkSoft mb-1">Confirm password</label><input required minLength={8} type="password" value={form.confirmPassword} onChange={(e) => set("confirmPassword", e.target.value)} className="portal-input mb-4" />
        {error && <div className="mb-3 text-sm text-alert">{error}</div>}
        <button disabled={loading} className="w-full rounded-lg bg-accent py-2.5 text-sm font-bold text-white disabled:opacity-60">{loading ? "Activating…" : "Activate portal"}</button>
        <p className="mt-5 text-center text-xs text-inkSoft">Already activated? <Link href="/patient-login" className="font-bold text-accentDark">Sign in</Link></p>
      </form>}
      <style jsx>{`.portal-input{width:100%;border:1px solid #E2DCCE;border-radius:8px;background:#FCFAF5;padding:9px 11px;font-size:14px}`}</style>
    </div>
  </div>;
}
