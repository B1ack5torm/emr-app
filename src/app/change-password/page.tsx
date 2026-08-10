"use client";

import { useState } from "react";
import { signOut } from "next-auth/react";
import { KeyRound } from "lucide-react";

export default function ChangePasswordPage() {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (newPassword !== confirmPassword) { setError("New passwords do not match."); return; }
    if (newPassword === currentPassword) { setError("New password must be different from your current password."); return; }

    setSubmitting(true);
    const res = await fetch("/api/account/change-password", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ currentPassword, newPassword }),
    });
    const data = await res.json();
    setSubmitting(false);

    if (!res.ok) { setError(data.error || "Could not change password."); return; }
    setDone(true);
    setTimeout(() => signOut({ callbackUrl: "/login?registered=1" }), 1200);
  };

  if (done) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="bg-card border border-border rounded-xl p-8 w-full max-w-sm text-center">
          <p className="text-sm text-ink">Password updated — signing you out. Please sign back in with your new password.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <KeyRound size={18} color="#fff" />
          </div>
          <div className="font-serif font-bold text-lg">Set a new password</div>
        </div>
        <p className="text-xs text-inkSoft mb-5">
          Your account was created by an administrator. For security, please set your own password before continuing.
        </p>

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Current (temporary) password</label>
        <input type="password" required value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">New password</label>
        <input type="password" required minLength={8} value={newPassword} onChange={(e) => setNewPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Confirm new password</label>
        <input type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        {error && <div className="text-alert text-sm mb-3">{error}</div>}

        <button disabled={submitting} className="w-full bg-accent text-white font-semibold rounded-lg py-2.5">
          {submitting ? "Updating…" : "Update password"}
        </button>
      </form>
    </div>
  );
}