"use client";

import { useState, useEffect } from "react";
import { Search, Plus, X, AlertTriangle, ArrowLeft, CheckCircle2, UserRoundPlus } from "lucide-react";
import { F, AllergyBanner } from "@/components/shared";
import FrontDeskSchedule from "@/components/FrontDeskSchedule";

type Patient = {
  id: string; mrn: string; name: string; age: number; gender: string; phone?: string;
  allergies: { id: string; name: string }[];
};
type Doctor = { id: string; name: string };
type DuplicateMatch = { id: string; mrn: string; name: string; dateOfBirth?: string; phone?: string; email?: string; score: number; reasons: string[] };

export default function FrontDeskPage() {
  const [mode, setMode] = useState<"search" | "new" | "visit">("search");
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Patient[]>([]);
  const [selected, setSelected] = useState<Patient | null>(null);
  const [selectedDoctorId, setSelectedDoctorId] = useState("");
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
        <div className="font-serif text-lg mt-3">Visit logged — patient added to doctor&apos;s queue</div>
      </div>
    );
  }

  if (mode === "new") return <NewPatientForm onCreated={(p, doctorId) => { setSelected(p); setSelectedDoctorId(doctorId); setMode("visit"); }} onBack={() => setMode("search")} />;
  if (mode === "visit" && selected) return <StartVisit patient={selected} doctorId={selectedDoctorId} onDone={() => { setSaved(true); setTimeout(() => { setSaved(false); setMode("search"); setSelected(null); setSelectedDoctorId(""); setQuery(""); }, 1400); }} onBack={() => setMode("search")} />;

  return (
    <div className="w-full">
      <div className="mb-6">
        <h1 className="font-serif text-2xl font-semibold">Front desk workspace</h1>
        <p className="mt-1 text-sm text-inkSoft">Manage today&apos;s appointments, check patients in, and register walk-ins from one place.</p>
      </div>

      <div className="grid items-start gap-6 xl:grid-cols-[minmax(0,1.65fr)_minmax(320px,.65fr)]">
        <FrontDeskSchedule />

        <aside className="rounded-xl border border-border bg-card p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-accentSoft text-accentDark"><UserRoundPlus size={19} /></span>
            <div><h2 className="font-serif text-lg font-semibold">Patient arrival</h2><p className="mt-0.5 text-xs leading-5 text-inkSoft">Find a returning patient or register a walk-in, then send them to the doctor&apos;s queue.</p></div>
          </div>

          <div className="relative mt-5">
            <Search size={15} className="pointer-events-none absolute left-3 top-3 text-inkSoft" />
            <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search MRN, name, or phone" className="w-full rounded-lg border border-border bg-[#FCFAF5] py-2.5 pl-9 pr-3" />
          </div>

          <div className="mt-3 flex max-h-80 flex-col gap-2 overflow-y-auto">
            {results.map((patient) => (
              <button key={patient.id} type="button" onClick={() => { setSelected(patient); setMode("visit"); }} className="rounded-lg border border-border bg-white p-3 text-left transition hover:border-accent/50 hover:shadow-sm" style={{ borderLeft: `4px solid ${patient.allergies.length ? "#B5533C" : "#3D6A5C"}` }}>
                <div className="text-sm font-semibold">{patient.name}</div>
                <div className="font-mono text-xs text-inkSoft">{patient.mrn}</div>
                <div className="text-xs text-inkSoft">{patient.age} yrs · {patient.gender} · {patient.phone || "no phone on file"}</div>
              </button>
            ))}
            {query && results.length === 0 && <div className="rounded-lg border border-dashed border-border px-3 py-4 text-center text-sm text-inkSoft">No matching patient found.</div>}
          </div>

          <button onClick={() => setMode("new")} className="mt-4 flex w-full items-center justify-center gap-2 rounded-lg bg-accent py-2.5 text-sm font-semibold text-white"><Plus size={15} /> Register walk-in patient</button>

          <div className="mt-5 border-t border-border pt-4">
            <p className="text-[10px] font-bold uppercase tracking-[.12em] text-inkSoft">Walk-in flow</p>
            <ol className="mt-3 space-y-2 text-xs text-inkSoft">
              <li><b className="text-ink">1.</b> Find or register the patient</li>
              <li><b className="text-ink">2.</b> Select a doctor and capture visit details</li>
              <li><b className="text-ink">3.</b> Add the patient to the live doctor queue</li>
            </ol>
          </div>
        </aside>
      </div>
    </div>
  );
}

function calcAge(dobStr: string) {
  if (!dobStr) return "";
  const dob = new Date(dobStr);
  if (isNaN(dob.getTime())) return "";
  const today = new Date();
  let age = today.getFullYear() - dob.getFullYear();
  const m = today.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
  return age >= 0 ? String(age) : "";
}

function NewPatientForm({ onCreated, onBack }: { onCreated: (p: Patient, doctorId: string) => void; onBack: () => void }) {
  const [form, setForm] = useState({ name: "", age: "", gender: "", doctorId: "", phone: "", email: "", dateOfBirth: "", address: "", bloodGroup: "", emergencyContact: "" });
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [error, setError] = useState("");
  const [duplicates, setDuplicates] = useState<DuplicateMatch[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const [allergies, setAllergies] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const set = (k: string, v: string) => setForm((f) => ({ ...f, [k]: v }));
  const setDob = (v: string) => setForm((f) => ({ ...f, dateOfBirth: v, age: v ? calcAge(v) : f.age }));

  useEffect(() => {
    fetch("/api/doctors").then(async (res) => {
      if (res.ok) setDoctors(await res.json());
      else setError("Could not load the doctor list.");
    }).catch(() => setError("Could not load the doctor list."));
  }, []);

  const submit = async (e?: React.FormEvent, overrideDuplicate = false) => {
    e?.preventDefault();
    setError(""); setSubmitting(true);
    const finalAllergies = draft.trim() ? [...allergies, draft.trim()] : allergies;
    const res = await fetch("/api/patients", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, age: Number(form.age), allergies: finalAllergies, overrideDuplicate }),
    });
    const data = await res.json(); setSubmitting(false);
    if (res.ok) { setDuplicates([]); onCreated(data, form.doctorId); }
    else if (res.status === 409 && data.code === "POSSIBLE_DUPLICATE") { setDuplicates(data.matches || []); setError(data.error); }
    else setError(data.error || "Could not register the patient.");
  };

  const selectExisting = async (id: string) => {
    setSubmitting(true); setError("");
    const response = await fetch(`/api/patients/${id}`); const data = await response.json(); setSubmitting(false);
    if (!response.ok) return setError(data.error || "Could not open the existing record.");
    onCreated(data, form.doctorId);
  };

  return (
    <form onSubmit={submit} className="bg-card border border-border rounded-xl p-6 max-w-2xl">
      <div className="flex justify-between items-center mb-4">
        <div className="font-serif text-lg font-semibold">New Patient Registration</div>
        <button type="button" onClick={onBack} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><ArrowLeft size={14} /> Back</button>
      </div>
      <div className="grid grid-cols-2 gap-4">
        {error && <div className="col-span-2 text-alert text-sm">{error}</div>}
        {duplicates.length > 0 && <div className="col-span-2 rounded-xl border border-waiting bg-waitingSoft p-4">
          <div className="flex items-center gap-2 font-bold text-waiting"><AlertTriangle size={16} /> Review possible duplicate records</div>
          <div className="mt-2 space-y-2">{duplicates.map((match) => <div key={match.id} className="flex items-center justify-between gap-3 rounded-lg border border-border bg-white p-3 text-sm">
            <div><div className="font-bold">{match.name} <span className="font-mono text-xs text-inkSoft">{match.mrn}</span></div><div className="text-xs text-inkSoft">{match.phone || "No phone"} · {match.dateOfBirth ? new Date(match.dateOfBirth).toLocaleDateString() : "No DOB"} · Match: {match.reasons.join(", ")}</div></div>
            <button type="button" disabled={submitting} onClick={() => selectExisting(match.id)} className="shrink-0 rounded-lg bg-accent px-3 py-2 text-xs font-bold text-white">Use this record</button>
          </div>)}</div>
          <div className="mt-3 flex justify-end"><button type="button" disabled={submitting} onClick={() => submit(undefined, true)} className="rounded-lg border border-alert px-3 py-2 text-xs font-bold text-alert">Confirmed different person — create anyway</button></div>
        </div>}
        <F label="Full name" required><input required value={form.name} onChange={(e) => set("name", e.target.value)} className="input" /></F>
        <F label="Date of birth"><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(e) => setDob(e.target.value)} className="input" /></F>
        <F label="Age" required><input required type="number" min={0} value={form.age} onChange={(e) => set("age", e.target.value)} className="input" /></F>
        <F label="Gender" required><select required value={form.gender} onChange={(e) => set("gender", e.target.value)} className="input"><option value="" disabled>Select gender</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></F>
        <F label="Doctor" required><select required value={form.doctorId} onChange={(e) => set("doctorId", e.target.value)} className="input"><option value="" disabled>Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>Dr. {doctor.name}</option>)}</select></F>
        <F label="Phone"><input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="input" /></F>
        <F label="Email"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="input" /></F>
        <F label="Blood group"><input value={form.bloodGroup} onChange={(e) => set("bloodGroup", e.target.value)} className="input" /></F>
        <F label="Emergency contact"><input value={form.emergencyContact} onChange={(e) => set("emergencyContact", e.target.value)} className="input" /></F>
        <div className="col-span-2"><F label="Address"><input value={form.address} onChange={(e) => set("address", e.target.value)} className="input" /></F></div>
        <div className="col-span-2">
          <F label="Known allergies">
            <div className="flex gap-2">
              <input value={draft} onChange={(e) => setDraft(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); if (draft.trim()) { setAllergies([...allergies, draft.trim()]); setDraft(""); } } }}
                onBlur={() => { if (draft.trim()) { setAllergies((a) => [...a, draft.trim()]); setDraft(""); } }}
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
        <button disabled={submitting} className="bg-accent disabled:opacity-60 text-white rounded-lg px-4 py-2.5 font-semibold text-sm">{submitting ? "Checking…" : "Save patient & continue to visit"}</button>
      </div>
      <style jsx>{`.input { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; }`}</style>
    </form>
  );
}

function StartVisit({ patient, doctorId: initialDoctorId, onDone, onBack }: { patient: Patient; doctorId: string; onDone: () => void; onBack: () => void }) {
  const [complaint, setComplaint] = useState("");
  const [bp, setBp] = useState(""); const [temperature, setTemperature] = useState(""); const [pulse, setPulse] = useState(""); const [weight, setWeight] = useState("");
  const [doctorId, setDoctorId] = useState(initialDoctorId);
  const [doctors, setDoctors] = useState<Doctor[]>([]);

  useEffect(() => {
    fetch("/api/doctors").then((res) => res.ok ? res.json() : []).then(setDoctors);
  }, []);

  const submit = async () => {
    const res = await fetch("/api/visits", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ patientId: patient.id, doctorId, chiefComplaint: complaint, bp, temperature, pulse, weight }),
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
      <div className="mt-5 text-xs font-bold text-inkSoft uppercase tracking-wide">Today&apos;s visit</div>
      <div className="flex flex-col gap-4 mt-2">
        <F label="Doctor" required><select required value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="input"><option value="" disabled>Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>Dr. {doctor.name}</option>)}</select></F>
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
        <button onClick={submit} disabled={!doctorId} className="flex items-center gap-2 bg-accent disabled:opacity-50 disabled:cursor-not-allowed text-white rounded-lg px-4 py-2.5 font-semibold text-sm"><Plus size={15} /> Add to doctor&apos;s queue</button>
      </div>
      <style jsx>{`.input { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; width: 100%; }`}</style>
    </div>
  );
}
