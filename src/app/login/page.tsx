"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const searchParams = useSearchParams();
  const justRegistered = searchParams.get("registered") === "1";
  const passwordReset = searchParams.get("reset") === "1";
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await signIn("credentials", { email, password, redirect: false });
    setLoading(false);
    if (res?.error) {
      setError(res.error === "CredentialsSignin" ? "Invalid email or password." : res.error);
    } else {
      window.location.assign("/");
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Stethoscope size={18} color="#fff" />
          </div>
          <div className="font-serif font-bold text-lg">CareChart</div>
        </div>

        {justRegistered && (
          <div className="bg-accentSoft text-accentDark text-sm rounded-lg px-3 py-2 mb-4">
            Account created — sign in below.
          </div>
        )}
        {passwordReset && (
          <div className="bg-accentSoft text-accentDark text-sm rounded-lg px-3 py-2 mb-4">
            Password reset successfully. Sign in with your new password.
          </div>
        )}

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Email</label>
        <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]" />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Password</label>
        <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} className="w-full border border-border rounded-lg px-3 py-2 bg-[#FCFAF5]" />
        <div className="mt-2 mb-4 text-right">
          <Link href="/forgot-password" className="text-xs text-accentDark font-semibold">Forgot password?</Link>
        </div>

        {error && <div className="text-alert text-sm mb-3">{error}</div>}

        <button disabled={loading} className="w-full bg-accent text-white font-semibold rounded-lg py-2.5">
          {loading ? "Signing in…" : "Sign in"}
        </button>

        <p className="text-xs text-inkSoft mt-5 text-center">
          New here? <Link href="/register" className="text-accentDark font-semibold">Create an account</Link>
        </p>
        <p className="text-xs text-inkSoft mt-2 text-center">
          Patient? <Link href="/patient-login" className="text-accentDark font-semibold">Open patient portal</Link>
        </p>

      </form>
    </div>
  );
}
