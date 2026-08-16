"use client";

import { FormEvent, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { F } from "@/components/shared";

type Patient = { id: string; name: string; mrn: string; phone?: string; email?: string };
type Doctor = { id: string; name: string };
type Appointment = { id: string; scheduledAt: string; durationMinutes: number; reason?: string; status: "SCHEDULED" | "CHECKED_IN" | "CANCELLED" | "CONFIRMED"; source: "INTERNAL" | "ONLINE"; patient: Patient; doctor?: Doctor };
const today = () => new Date().toLocaleDateString("en-CA");

export default function AppointmentsPage() {
  const [date, setDate] = useState(today());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [onlineCheckIn, setOnlineCheckIn] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = async () => {
    const res = await fetch(`/api/appointments?date=${date}`);
    if (res.ok) { const data = await res.json(); setAppointments(data.appointments); setDoctors(data.doctors); }
  };
  useEffect(() => { load(); }, [date]);
  const changeDay = (days: number) => { const d = new Date(`${date}T12:00:00`); d.setDate(d.getDate() + days); setDate(d.toLocaleDateString("en-CA")); };
  const update = async (id: string, action: "check-in" | "cancel") => {
    setError("");
    const res = await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }) });
    if (!res.ok) setError((await res.json()).error || "Could not update appointment.");
    await load();
  };
  const checkInOnline = async (age: string, gender: string) => {
    if (!onlineCheckIn) return;
    setError("");
    const res = await fetch(`/api/appointments/online/${onlineCheckIn.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ age, gender }) });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Could not check in this patient.");
    setOnlineCheckIn(null);
    setNotice(`${data.patient.name} checked in and moved to Dr. ${onlineCheckIn.doctor?.name || "the assigned doctor"}'s waiting room.`);
    await load();
  };

  return <div className="max-w-5xl">
    <div className="flex justify-between items-center gap-4 mb-5">
      <div><div className="font-serif text-xl font-semibold">Appointment Schedule</div><p className="text-sm text-inkSoft mt-1">Book patients and check them into the doctor&apos;s queue.</p></div>
      <button onClick={() => { setError(""); setNotice(""); setShowForm(true); }} className="flex items-center gap-2 bg-accent text-white rounded-lg px-4 py-2.5 text-sm font-semibold"><Plus size={16} /> New appointment</button>
    </div>
    {error && <div className="mb-4 rounded-lg bg-alertSoft text-alert px-3 py-2 text-sm">{error}</div>}
    {notice && <div className="mb-4 rounded-lg bg-accentSoft text-accentDark px-3 py-2 text-sm">{notice}</div>}
    <div className="bg-card border border-border rounded-xl">
      <div className="flex items-center justify-between p-4 border-b border-border">
        <button aria-label="Previous day" onClick={() => changeDay(-1)} className="p-2 rounded-md hover:bg-accentSoft"><ChevronLeft size={17} /></button>
        <div className="flex items-center gap-2"><CalendarDays size={17} className="text-accentDark" /><input aria-label="Schedule date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="font-semibold bg-transparent" /></div>
        <button aria-label="Next day" onClick={() => changeDay(1)} className="p-2 rounded-md hover:bg-accentSoft"><ChevronRight size={17} /></button>
      </div>
      {appointments.length === 0 ? <div className="p-12 text-center text-inkSoft">No appointments scheduled for this day.</div> : <div className="divide-y divide-border">
        {appointments.map((a) => <div key={a.id} className={`p-4 flex flex-wrap items-center gap-4 ${a.status === "CANCELLED" ? "opacity-50" : ""}`}>
          <div className="w-24 text-sm font-mono font-semibold">{new Date(a.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
          <div className="min-w-[180px] flex-1"><div className="flex flex-wrap items-center gap-2 font-semibold text-sm"><span>{a.patient.name}</span><span className="font-mono text-xs font-normal text-inkSoft">{a.patient.mrn}</span>{a.source === "ONLINE" && <span className="rounded-full bg-waitingSoft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-waiting">Online</span>}</div><div className="text-xs text-inkSoft mt-0.5">{a.reason || "No reason noted"}</div></div>
          <div className="text-sm text-inkSoft min-w-[130px]">{a.doctor?.name || "Unassigned"} · {a.durationMinutes} min</div>
          <div className="flex items-center gap-2">{a.status === "SCHEDULED" ? <><button onClick={() => update(a.id, "check-in")} className="inline-flex items-center gap-1 text-sm font-semibold text-accentDark border border-border rounded-md px-2.5 py-1.5"><CheckCircle2 size={14} /> Check in</button><button aria-label="Cancel appointment" onClick={() => update(a.id, "cancel")} className="p-1.5 text-alert"><X size={16} /></button></> : a.status === "CONFIRMED" && a.source === "ONLINE" ? <button onClick={() => setOnlineCheckIn(a)} className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accentDark"><CheckCircle2 size={14} /> Check in</button> : <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${a.status === "CHECKED_IN" || a.status === "CONFIRMED" ? "bg-accentSoft text-accentDark" : "bg-[#eee9df] text-inkSoft"}`}>{a.status === "CHECKED_IN" ? "Checked in" : a.status === "CONFIRMED" ? "Confirmed" : "Cancelled"}</span>}</div>
        </div>)}
      </div>}
    </div>
    {showForm && <AppointmentForm date={date} doctors={doctors} onClose={() => setShowForm(false)} onSaved={(notifications) => { setShowForm(false); setNotice(`Appointment booked. Email: ${notifications.email}.`); load(); }} />}
    {onlineCheckIn && <OnlineCheckInForm appointment={onlineCheckIn} onClose={() => setOnlineCheckIn(null)} onSubmit={checkInOnline} onError={setError} />}
  </div>;
}

function OnlineCheckInForm({ appointment, onClose, onSubmit, onError }: { appointment: Appointment; onClose: () => void; onSubmit: (age: string, gender: string) => Promise<void>; onError: (message: string) => void }) {
  const [age, setAge] = useState("");
  const [gender, setGender] = useState("");
  const [saving, setSaving] = useState(false);
  const submit = async (event: FormEvent) => {
    event.preventDefault(); setSaving(true); onError("");
    try { await onSubmit(age, gender); } catch (reason) { onError(reason instanceof Error ? reason.message : "Could not check in this patient."); setSaving(false); }
  };
  return <div className="fixed inset-0 z-20 flex items-start justify-center bg-black/30 px-4 pt-16"><form onSubmit={submit} className="w-full max-w-md rounded-xl border border-border bg-card p-6 shadow-xl"><div className="mb-2 flex items-center justify-between"><div className="font-serif text-lg font-semibold">Check in online patient</div><button type="button" onClick={onClose} aria-label="Close" className="p-1"><X size={18} /></button></div><p className="mb-5 text-sm text-inkSoft">Complete the patient record for <b className="text-ink">{appointment.patient.name}</b> before moving them to the waiting room.</p><div className="grid grid-cols-2 gap-3"><F label="Age" required><input required type="number" min="1" max="130" value={age} onChange={(event) => setAge(event.target.value)} className="w-full rounded-lg border border-border bg-[#FCFAF5] px-3 py-2.5 text-sm" /></F><F label="Gender" required><select required value={gender} onChange={(event) => setGender(event.target.value)} className="w-full rounded-lg border border-border bg-[#FCFAF5] px-3 py-2.5 text-sm"><option value="">Select</option><option value="FEMALE">Female</option><option value="MALE">Male</option><option value="OTHER">Other</option></select></F></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button><button disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{saving ? "Checking in..." : "Check in"}</button></div></form></div>;
}

function AppointmentForm({ date, doctors, onClose, onSaved }: { date: string; doctors: Doctor[]; onClose: () => void; onSaved: (notifications: { email: string }) => void }) {
  const [query, setQuery] = useState(""); const [patients, setPatients] = useState<Patient[]>([]); const [patient, setPatient] = useState<Patient | null>(null); const [error, setError] = useState("");
  const [contactEmail, setContactEmail] = useState("");
  const [form, setForm] = useState({ time: "09:00", doctorId: "", durationMinutes: "30", reason: "" });
  useEffect(() => { const t = setTimeout(async () => { if (query.trim().length < 2) return setPatients([]); const r = await fetch(`/api/patients?q=${encodeURIComponent(query)}`); if (r.ok) setPatients(await r.json()); }, 250); return () => clearTimeout(t); }, [query]);
  const submit = async (e: FormEvent) => { e.preventDefault(); setError(""); if (!patient) return setError("Select a patient first."); const res = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, ...form, contactEmail, scheduledAt: `${date}T${form.time}:00` }) }); const data = await res.json(); if (!res.ok) return setError(data.error || "Could not create appointment."); onSaved(data.notifications); };
  return <div className="fixed inset-0 z-20 bg-black/30 flex justify-center items-start pt-16 px-4"><form onSubmit={submit} className="w-full max-w-lg bg-card border border-border rounded-xl shadow-xl p-6"><div className="flex justify-between items-center mb-5"><div className="font-serif text-lg font-semibold">New appointment</div><button type="button" onClick={onClose} aria-label="Close" className="p-1"><X size={18} /></button></div>{error && <div className="mb-3 rounded-lg bg-alertSoft text-alert p-2 text-sm">{error}</div>}<div className="space-y-4"><F label="Patient" required><div className="relative"><Search size={15} className="absolute left-3 top-3 text-inkSoft pointer-events-none" /><input value={patient ? patient.name : query} onChange={(e) => { setPatient(null); setQuery(e.target.value); }} placeholder="Search name, MRN, or phone" className="input input-with-icon" />{patients.length > 0 && !patient && <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-md max-h-40 overflow-auto">{patients.map((p) => <button type="button" key={p.id} onClick={() => { setPatient(p); setPatients([]); setContactEmail(p.email || ""); }} className="block text-left w-full px-3 py-2 hover:bg-accentSoft text-sm"><b>{p.name}</b> <span className="font-mono text-xs text-inkSoft">{p.mrn}</span></button>)}</div>}</div></F>{patient && <F label="Patient email"><input type="email" value={contactEmail} onChange={(e) => setContactEmail(e.target.value)} placeholder="patient@example.com" className="input" /></F>}<div className="grid grid-cols-2 gap-3"><F label="Time" required><input required type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="input" /></F><F label="Duration"><select value={form.durationMinutes} onChange={(e) => setForm({ ...form, durationMinutes: e.target.value })} className="input"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></F></div><F label="Doctor"><select value={form.doctorId} onChange={(e) => setForm({ ...form, doctorId: e.target.value })} className="input"><option value="">Unassigned</option>{doctors.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}</select></F><F label="Reason for appointment"><textarea value={form.reason} onChange={(e) => setForm({ ...form, reason: e.target.value })} className="input min-h-[70px]" /></F></div><div className="flex justify-end gap-2 mt-5"><button type="button" onClick={onClose} className="border border-border rounded-lg px-4 py-2 text-sm">Cancel</button><button className="bg-accent text-white rounded-lg px-4 py-2 text-sm font-semibold">Book appointment</button></div><style jsx>{`.input { width: 100%; font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; } .input-with-icon { padding-left: 2.5rem; }`}</style></form></div>;
}
