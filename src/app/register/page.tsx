"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Stethoscope } from "lucide-react";

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [role, setRole] = useState("RECEPTION");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    const res = await fetch("/api/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password, role }),
    });
    const data = await res.json();
    setLoading(false);

    if (!res.ok) {
      setError(data.error || "Something went wrong. Please try again.");
      return;
    }

    router.push("/login?registered=1");
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <form onSubmit={submit} className="bg-card border border-border rounded-xl p-8 w-full max-w-sm">
        <div className="flex items-center gap-3 mb-6">
          <div className="w-9 h-9 rounded-lg bg-accent flex items-center justify-center">
            <Stethoscope size={18} color="#fff" />
          </div>
          <div className="font-serif font-bold text-lg">Create staff account</div>
        </div>

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Full name</label>
        <input
          required value={name} onChange={(e) => setName(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]"
        />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]"
        />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Role</label>
        <select
          value={role} onChange={(e) => setRole(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]"
        >
          <option value="RECEPTION">Front Desk</option>
          <option value="DOCTOR">Doctor</option>
        </select>

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Password</label>
        <input
          type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]"
        />

        <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Confirm password</label>
        <input
          type="password" required value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)}
          className="w-full border border-border rounded-lg px-3 py-2 mb-4 bg-[#FCFAF5]"
        />

        {error && <div className="text-alert text-sm mb-3">{error}</div>}

        <button disabled={loading} className="w-full bg-accent text-white font-semibold rounded-lg py-2.5">
          {loading ? "Creating account…" : "Create account"}
        </button>

        <p className="text-xs text-inkSoft mt-5 text-center">
          Already have an account?{" "}
          <Link href="/login" className="text-accentDark font-semibold">Sign in</Link>
        </p>
      </form>
    </div>
  );
}