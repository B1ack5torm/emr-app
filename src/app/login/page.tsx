"use client";

import { browserSessionPath, sessionFetch } from "@/lib/session-scope";
import { defaultPortalPath } from "@/lib/portal-access";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useSearchParams } from "@/components/SessionNavigation";
import Link from "@/components/SessionNavigation";
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
    try {
      const res = await signIn("credentials", { email, password, redirect: false, callbackUrl: browserSessionPath("/") });
      if (!res?.ok || res.error) {
        throw new Error(res?.error === "CredentialsSignin" ? "Invalid email or password." : res?.error || "Could not sign in. Please try again.");
      }
      // Confirm this namespace received its cookie before leaving the form.
      const response = await sessionFetch("/api/auth/session", { cache: "no-store" });
      const session = await response.json();
      if (!response.ok || !session?.user?.id || session.user.accountActive === false) {
        throw new Error("Your sign-in session could not be established. Please try again.");
      }
      window.location.assign(browserSessionPath(session.user.mustChangePassword ? "/change-password" : defaultPortalPath(session.user.role)));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not sign in. Please try again.");
    } finally {
      setLoading(false);
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

        <p className="mb-5 text-sm text-inkSoft">Sign in to this account separately. Accounts open in other tabs will stay signed in.</p>

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
