"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, AlertTriangle, ArrowLeft, CheckCircle2 } from "lucide-react";
import { F, AllergyBanner } from "@/components/shared";

type Patient = {
  id: string; name: string; age: number; gender: string; phone?: string;
  allergies: { id: string; name: string }[];
};

export default function FrontDeskPage() {
  const [mode, setMode] = useState<"search" | "new" | "visit">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const t = setTimeout(async () => {
      if (!query.trim()) { setResults([]); return; }
      const res = await fetch(`/api/patients?q=${encodeURIComponent(query)}`);
      setResults(await res.json());
    }, 300);
    return () => clearTimeout(t);
  }, [query]);

  if (saved) {
    return (
      <div className="text-center py-20">
        <CheckCircle2 size={40} className="mx-auto text-accent" />
        <div className="font-serif text-lg mt-3">Visit logged — patient added to doctor's queue</div>
      </div>
    );
  }

  if (mode === "new") return <NewPatientForm onCreated={(p) => { setSelected(p); setMode("visit"); }} onBack={() => setMode("search")} />;
  if (mode === "visit" && selected) return <StartVisit patient={selected} onDone={() => { setSaved(true); setTimeout(() => { setSaved(false); setMode("search"); setSelected(null); setQuery(""); }, 1400); }} onBack={() => setMode("search")} />;

  return (
    <div className="grid grid-cols-[340px_1fr] gap-5">
      <div className="flex flex-col gap-3">
        <div className="relative">
          <Search size={15} className="absolute left-3 top-3 text-inkSoft" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search returning patient by name or phone"
            className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-[#FCFAF5]" />
        </div>
        <div className="flex flex-col gap-2 max-h-96 overflow-y-auto">
          {results.map((p) => (
            <div key={p.id} onClick={() => { setSelected(p); setMode("visit"); }}
              className="cursor-pointer p-3 rounded-lg bg-card border border-border"
              style={{ borderLeft: `4px solid ${p.allergies.length ? "#B5533C" : "#3D6A5C"}` }}>
              <div className="font-semibold text-sm">{p.name}</div>
              <div className="text-xs text-inkSoft">{p.age} yrs · {p.gender} · {p.phone || "no phone on file"}</div>
            </div>
          ))}
          {query && results.length === 0 && <div className="text-sm text-inkSoft">No matching patient found.</div>}
        </div>
        <button onClick={() => setMode("new")} className="flex items-center justify-center gap-2 bg-accent text-white rounded-lg py-2.5 font-semibold text-sm">
          <Plus size={15} /> Register new patient
        </button>
      </div>
      <div className="flex items-center justify-center text-inkSoft border border-dashed border-border rounded-xl min-h-[300px] text-center p-6">
        Search for a returning patient, or register a new one, to log today's visit.
      </div>
    </div>
  );
}

function NewPatientForm({ onCreated, onBack }: { onCreated: (p: Patient) => void; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "FEMALE", phone: "", address: "", bloodGroup: "", emergencyContact: "" });
  const [allergies, setAllergies] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/patients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, age: Number(form.age), allergies }),
    });
    if (res.ok) onCreated(await res.json());
  };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-xl p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <div className="font-serif text-lg font-semibold">New Patient Registration</div>
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><ArrowLeft size={14} /> Back</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <F label="Full name" required><input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" /></F>
        <F label="Age" required><input required type="number" min={0} value={form.age} onChange={(e) => set("age", e.target.value)} className="input" /></F>
        <F label="Gender"><select value={form.gender} onChange={(e) => set("gender", e.target.value)} className="input"><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></F>
        <F label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" /></F>
        <F label="Blood group"><input value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className="input" /></F>
        <F label="Emergency contact"><input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className="input" /></F>
        <div className="col-span-2"><F label="Address"><input value={form.address} onChange={(e) => set("address", e.target.value)} className="input" /></F></div>
        <div className="col-span-2">
          <F label="Known allergies">
            <div className="flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (draft.trim()) { setAllergies([...allergies, draft.trim()]); setDraft(""); } } }}
                placeholder="e.g. Penicillin — press Enter" className="input flex-1" />
            </div>
            <div className="flex flex-wrap gap-2 mt-2">
              {allergies.map((a, i) => (
                <span key={i} className="inline-flex items-center gap-1.5 bg-alertSoft text-alert px-2.5 py-1 rounded-full text-xs font-semibold">
                  <AlertTriangle size={11} /> {a} <X size={12} className="cursor-pointer" onClick={() => setAllergies(allergies.filter((_, idx) => idx !== i))} />
                </span>
              ))}
            </div>
          </F>
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <button className="bg-accent text-white rounded-lg px-4 py-2.5 font-semibold text-sm">Save patient &amp; continue to visit</button>
      </div>
      <style jsx>{`.input { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; }`}</style>
    </form>
  );
}

function StartVisit({ patient, onDone, onBack }: { patient: Patient; onDone: () => void; onBack: () => void }) {
  const [complaint, setComplaint] = useState("");
  const [bp, setBp] = useState(""); const [temperature, setTemperature] = useState(""); const [pulse, setPulse] = useState(""); const [weight, setWeight] = useState("");

  const submit = async () => {
    const res = await fetch("/api/visits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id, chiefComplaint: complaint, bp, temperature, pulse, weight }),
    });
    if (res.ok) onDone();
  };

  return (
    <div className="bg-card border border-border rounded-xl p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-3">
        <div>
          <div className="font-serif text-lg font-semibold">{patient.name}</div>
          <div className="text-xs text-inkSoft">{patient.age} yrs · {patient.gender} · {patient.phone || "—"}</div>
        </div>
        <button onClick={onBack} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><ArrowLeft size={14} /> Back</button>
      </div>
      <AllergyBanner allergies={patient.allergies.map((a) => a.name)} />
      <div className="mt-5 text-xs font-bold text-inkSoft uppercase tracking-wide">Today's visit</div>
      <div className="flex flex-col gap-4 mt-2">
        <F label="Reason for visit / chief complaint">
          <textarea value={complaint} onChange={(e) => setComplaint(e.target.value)} className="input min-h-[70px]" />
        </F>
        <div className="grid grid-cols-4 gap-3">
          <F label="BP"><input value={bp} onChange={(e) => setBp(e.target.value)} className="input" /></F>
          <F label="Temp (°F)"><input value={temperature} onChange={(e) => setTemperature(e.target.value)} className="input" /></F>
          <F label="Pulse"><input value={pulse} onChange={(e) => setPulse(e.target.value)} className="input" /></F>
          <F label="Weight (kg)"><input value={weight} onChange={(e) => setWeight(e.target.value)} className="input" /></F>
        </div>
      </div>
      <div className="flex justify-end mt-5">
        <button onClick={submit} className="flex items-center gap-2 bg-accent text-white rounded-lg px-4 py-2.5 font-semibold text-sm"><Plus size={15} /> Add to doctor's queue</button>
      </div>
      <style jsx>{`.input { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; width: 100%; }`}</style>
    </div>
  );
}

