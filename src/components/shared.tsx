"use client";

import { AlertTriangle } from "lucide-react";

export function F({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <label className="flex flex-col gap-1.5">
      <span className="text-xs font-semibold text-inkSoft uppercase tracking-wide">
        {label}{required && <span className="text-alert"> *</span>}
      </span>
      {children}
    </label>
  );
}

export function AllergyBanner({ allergies }: { allergies: string[] }) {
  if (!allergies || allergies.length === 0) {
    return (
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-accentSoft text-accentDark text-sm font-semibold">
        No known allergies
      </div>
    );
  }
  return (
    <div className="p-3 rounded-lg bg-alertSoft border border-[#E7C4B6]">
      <div className="flex items-center gap-2 text-alert font-bold text-sm mb-1.5">
        <AlertTriangle size={16} /> ALLERGY ALERT
      </div>
      <div className="flex flex-wrap gap-1.5">
        {allergies.map((a, i) => (
          <span key={i} className="bg-white text-alert px-2.5 py-1 rounded-full text-xs font-semibold border border-[#E7C4B6]">{a}</span>
        ))}
      </div>
    </div>
  );
}
