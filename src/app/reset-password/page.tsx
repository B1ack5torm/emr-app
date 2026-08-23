"use client";

import { Suspense, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { KeyRound, Stethoscope } from "lucide-react";

export default function ResetPasswordPage() {
  return <Suspense fallback={null}><ResetPasswordForm /></Suspense>;
}

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError("");
    if (password !== confirmPassword) { setError("Passwords do not match."); return; }
    if (password.length < 12 || !/[A-Za-z]/.test(password) || !/\d/.test(password)) { setError("Password must be at least 12 characters and contain a letter and number."); return; }
    setLoading(true);
    try {
      const response = await fetch("/api/password-reset/confirm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, password }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not reset password.");
      router.replace("/login?reset=1");
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Could not reset password.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center"><Stethoscope size={18} color="#fff" /></div>
          <div><div className="font-serif font-bold text-lg">Set a new password</div><p className="text-xs text-inkSoft mt-0.5">Choose a secure password for your account.</p></div>
        </div>

        {!token ? (
          <div className="text-center">
            <KeyRound size={24} className="mx-auto text-alert mb-3" />
            <p className="text-sm text-alert">This password reset link is invalid.</p>
            <Link href="/forgot-password" className="inline-block mt-5 text-sm text-accentDark font-semibold">Request a new link</Link>
          </div>
        ) : (
          <form onSubmit={submit}>
            <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">New password</label>
            <input type="password" required minLength={12} autoComplete="new-password" value={password} onChange={(event) => setPassword(event.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-2 bg-[#FCFAF5]" />
            <p className="text-xs text-inkSoft mb-4">At least 12 characters with a letter and number.</p>
            <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Confirm new password</label>
            <input type="password" required minLength={12} autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />
            {error && <div className="text-alert text-sm mb-3">{error}</div>}
            <button disabled={loading} className="w-full bg-accent text-white font-semibold rounded-lg py-2.5 disabled:opacity-60">{loading ? "Resetting…" : "Reset password"}</button>
            <p className="text-xs text-inkSoft mt-5 text-center"><Link href="/login" className="text-accentDark font-semibold">Back to sign in</Link></p>
          </form>
        )}
      </div>
    </div>
  );
}
