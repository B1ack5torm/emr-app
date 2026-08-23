"use client";

import { useState } from "react";
import Link from "next/link";
import { Mail, Stethoscope } from "lucide-react";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [submitted, setSubmitted] = useState(false);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    setLoading(true);
    try {
      const response = await fetch("/api/password-reset/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      if (!response.ok) throw new Error("Could not request a password reset. Please try again.");
      setSubmitted(true);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not request a password reset. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center"><Stethoscope size={18} color="#fff" /></div>
          <div><div className="font-serif font-bold text-lg">Forgot password?</div><p className="text-xs text-inkSoft mt-0.5">We&apos;ll email you a secure reset link.</p></div>
        </div>

        {submitted ? (
          <div className="text-center">
            <div className="w-10 h-10 rounded-full bg-accentSoft text-accentDark flex items-center justify-center mx-auto mb-4"><Mail size={19} /></div>
            <p className="text-sm font-semibold text-ink">Check your email</p>
            <p className="text-sm text-inkSoft mt-2 leading-6">If an account is registered with that address, a password reset link has been sent. The link expires in 30 minutes.</p>
            <Link href="/login" className="inline-block mt-5 text-sm text-accentDark font-semibold">Back to sign in</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Registered email</label>
            <input type="email" required autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" placeholder="name@example.com" />
            {error && <div className="text-alert text-sm mb-3">{error}</div>}
            <button disabled={loading} className="w-full bg-accent text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{loading ? "Sending…" : "Send reset link"}</button>
            <p className="text-xs text-inkSoft mt-5 text-center">Remembered it? <Link href="/login" className="text-accentDark font-semibold">Back to sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
