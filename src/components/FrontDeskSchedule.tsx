"use client";

import { FormEvent, useCallback, useEffect, useState } from "react";
import { CalendarDays, CheckCircle2, ChevronLeft, ChevronRight, Plus, Search, X } from "lucide-react";
import { F } from "@/components/shared";

type Patient = { id: string; name: string; mrn: string; phone?: string; email?: string };
type AppointmentType = { id: string; name: string; durationMinutes: number };
type Doctor = { id: string; name: string; practitionerProfile?: { specialty: string; clinic: { id: string; name: string; appointmentTypes: AppointmentType[] } } };
type Appointment = { id: string; scheduledAt: string; durationMinutes: number; reason?: string; status: "SCHEDULED" | "CHECKED_IN" | "CANCELLED" | "CONFIRMED" | "IN_CONSULTATION" | "COMPLETED" | "NO_SHOW" | "RESCHEDULED"; source: "INTERNAL" | "ONLINE"; patient: Patient; doctor?: Doctor };

const today = () => new Date().toLocaleDateString("en-CA");

export default function FrontDeskSchedule() {
  const [date, setDate] = useState(today());
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [onlineCheckIn, setOnlineCheckIn] = useState<Appointment | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  const load = useCallback(async () => {
    const response = await fetch(`/api/appointments?date=${date}`);
    if (!response.ok) return setError("Could not load the appointment schedule.");
    const data = await response.json();
    setAppointments(data.appointments);
    setDoctors(data.doctors);
  }, [date]);

  useEffect(() => { void load(); }, [load]);

  const changeDay = (days: number) => {
    const nextDate = new Date(`${date}T12:00:00`);
    nextDate.setDate(nextDate.getDate() + days);
    setDate(nextDate.toLocaleDateString("en-CA"));
  };

  const update = async (id: string, action: "check-in" | "cancel") => {
    setError(""); setNotice("");
    const reason = action === "cancel" ? window.prompt("Enter the cancellation reason:")?.trim() : undefined;
    if (action === "cancel" && !reason) return;
    const response = await fetch(`/api/appointments/${id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, reason }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not update appointment.");
    if (action === "check-in") setNotice("Patient checked in and added to the doctor’s queue.");
    await load();
  };

  const checkInOnline = async (age: string, gender: string) => {
    if (!onlineCheckIn) return;
    setError("");
    const response = await fetch(`/api/appointments/online/${onlineCheckIn.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ age, gender }) });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || "Could not check in this patient.");
    setOnlineCheckIn(null);
    setNotice(`${data.patient.name} checked in and moved to Dr. ${onlineCheckIn.doctor?.name || "the assigned doctor"}'s queue.`);
    await load();
  };

  const isToday = date === today();

  return (
    <section className="min-w-0">
      <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="flex items-center gap-2"><CalendarDays size={18} className="text-accentDark" /><h2 className="font-serif text-xl font-semibold">{isToday ? "Today’s appointment schedule" : "Appointment schedule"}</h2></div>
          <p className="mt-1 text-sm text-inkSoft">Check patients in and move them directly to the doctor&apos;s queue.</p>
        </div>
        <button onClick={() => { setError(""); setNotice(""); setShowForm(true); }} className="flex items-center gap-2 rounded-lg bg-accent px-4 py-2.5 text-sm font-semibold text-white"><Plus size={16} /> New appointment</button>
      </div>

      {error && <div className="mb-3 rounded-lg bg-alertSoft px-3 py-2 text-sm text-alert">{error}</div>}
      {notice && <div className="mb-3 rounded-lg bg-accentSoft px-3 py-2 text-sm text-accentDark">{notice}</div>}

      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between border-b border-border p-3">
          <button aria-label="Previous day" onClick={() => changeDay(-1)} className="rounded-md p-2 hover:bg-accentSoft"><ChevronLeft size={17} /></button>
          <div className="flex items-center gap-2">
            <input aria-label="Schedule date" type="date" value={date} onChange={(event) => setDate(event.target.value)} className="bg-transparent font-semibold" />
            {!isToday && <button onClick={() => setDate(today())} className="rounded-full bg-accentSoft px-2.5 py-1 text-xs font-bold text-accentDark">Today</button>}
          </div>
          <button aria-label="Next day" onClick={() => changeDay(1)} className="rounded-md p-2 hover:bg-accentSoft"><ChevronRight size={17} /></button>
        </div>
        {appointments.length === 0 ? <div className="px-6 py-12 text-center text-sm text-inkSoft">No appointments scheduled for this day.</div> : <div className="divide-y divide-border">
          {appointments.map((appointment) => <div key={appointment.id} className={`flex flex-wrap items-center gap-4 p-4 ${appointment.status === "CANCELLED" ? "opacity-50" : ""}`}>
            <div className="w-20 text-sm font-mono font-semibold">{new Date(appointment.scheduledAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</div>
            <div className="min-w-[180px] flex-1"><div className="flex flex-wrap items-center gap-2 text-sm font-semibold"><span>{appointment.patient.name}</span><span className="font-mono text-xs font-normal text-inkSoft">{appointment.patient.mrn}</span>{appointment.source === "ONLINE" && <span className="rounded-full bg-waitingSoft px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-waiting">Online</span>}</div><div className="mt-0.5 text-xs text-inkSoft">{appointment.reason || "No reason noted"}</div></div>
            <div className="min-w-[130px] text-sm text-inkSoft">{appointment.doctor?.name || "Unassigned"} · {appointment.durationMinutes} min</div>
            <div className="flex items-center gap-2">{appointment.status === "SCHEDULED" ? <><button onClick={() => void update(appointment.id, "check-in")} className="inline-flex items-center gap-1 rounded-md border border-border px-2.5 py-1.5 text-sm font-semibold text-accentDark"><CheckCircle2 size={14} /> Check in</button><button aria-label="Cancel appointment" onClick={() => void update(appointment.id, "cancel")} className="p-1.5 text-alert"><X size={16} /></button></> : appointment.status === "CONFIRMED" && appointment.source === "ONLINE" ? <button onClick={() => setOnlineCheckIn(appointment)} className="inline-flex items-center gap-1 rounded-md bg-accent px-3 py-1.5 text-sm font-semibold text-white hover:bg-accentDark"><CheckCircle2 size={14} /> Check in</button> : <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${appointment.status === "CHECKED_IN" || appointment.status === "CONFIRMED" ? "bg-accentSoft text-accentDark" : "bg-[#eee9df] text-inkSoft"}`}>{appointment.status === "CHECKED_IN" ? "In queue" : appointment.status === "CONFIRMED" ? "Confirmed" : appointment.status.replaceAll("_", " ")}</span>}</div>
          </div>)}
        </div>}
      </div>

      {showForm && <AppointmentForm date={date} doctors={doctors} onClose={() => setShowForm(false)} onSaved={(notifications) => { setShowForm(false); setNotice(`Appointment booked. Email: ${notifications.email}.`); void load(); }} />}
      {onlineCheckIn && <OnlineCheckInForm appointment={onlineCheckIn} onClose={() => setOnlineCheckIn(null)} onSubmit={checkInOnline} onError={setError} />}
    </section>
  );
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
  const [form, setForm] = useState({ time: "09:00", doctorId: "", appointmentTypeId: "", durationMinutes: "30", reason: "" });
  const selectedDoctor = doctors.find((doctor) => doctor.id === form.doctorId);
  const appointmentTypes = selectedDoctor?.practitionerProfile?.clinic.appointmentTypes || [];
  useEffect(() => { const timer = setTimeout(async () => { if (query.trim().length < 2) return setPatients([]); const response = await fetch(`/api/patients?q=${encodeURIComponent(query)}`); if (response.ok) setPatients(await response.json()); }, 250); return () => clearTimeout(timer); }, [query]);
  const submit = async (event: FormEvent) => { event.preventDefault(); setError(""); if (!patient) return setError("Select a patient first."); const response = await fetch("/api/appointments", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ patientId: patient.id, ...form, contactEmail, scheduledAt: `${date}T${form.time}:00` }) }); const data = await response.json(); if (!response.ok) return setError(data.error || "Could not create appointment."); onSaved(data.notifications); };
  return <div className="fixed inset-0 z-20 flex items-start justify-center bg-black/30 px-4 pt-16"><form onSubmit={submit} className="w-full max-w-lg rounded-xl border border-border bg-card p-6 shadow-xl"><div className="mb-5 flex items-center justify-between"><div className="font-serif text-lg font-semibold">New appointment</div><button type="button" onClick={onClose} aria-label="Close" className="p-1"><X size={18} /></button></div>{error && <div className="mb-3 rounded-lg bg-alertSoft p-2 text-sm text-alert">{error}</div>}<div className="space-y-4"><F label="Patient" required><div className="relative"><Search size={15} className="pointer-events-none absolute left-3 top-3 text-inkSoft" /><input value={patient ? patient.name : query} onChange={(event) => { setPatient(null); setQuery(event.target.value); }} placeholder="Search name, MRN, or phone" className="input input-with-icon" />{patients.length > 0 && !patient && <div className="absolute z-10 mt-1 max-h-40 w-full overflow-auto rounded-lg border border-border bg-card shadow-md">{patients.map((value) => <button type="button" key={value.id} onClick={() => { setPatient(value); setPatients([]); setContactEmail(value.email || ""); }} className="block w-full px-3 py-2 text-left text-sm hover:bg-accentSoft"><b>{value.name}</b> <span className="font-mono text-xs text-inkSoft">{value.mrn}</span></button>)}</div>}</div></F>{patient && <F label="Patient email"><input type="email" value={contactEmail} onChange={(event) => setContactEmail(event.target.value)} placeholder="patient@example.com" className="input" /></F>}<F label="Doctor"><select value={form.doctorId} onChange={(event) => { const doctor = doctors.find((item) => item.id === event.target.value); const appointmentType = doctor?.practitionerProfile?.clinic.appointmentTypes[0]; setForm({ ...form, doctorId: event.target.value, appointmentTypeId: appointmentType?.id || "", durationMinutes: String(appointmentType?.durationMinutes || 30) }); }} className="input"><option value="">Unassigned</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}{doctor.practitionerProfile ? ` · ${doctor.practitionerProfile.clinic.name} / ${doctor.practitionerProfile.specialty}` : ""}</option>)}</select></F>{appointmentTypes.length > 0 && <F label="Appointment type"><select required value={form.appointmentTypeId} onChange={(event) => { const appointmentType = appointmentTypes.find((item) => item.id === event.target.value); setForm({ ...form, appointmentTypeId: event.target.value, durationMinutes: String(appointmentType?.durationMinutes || 30) }); }} className="input">{appointmentTypes.map((item) => <option key={item.id} value={item.id}>{item.name} · {item.durationMinutes} minutes</option>)}</select></F>}<div className="grid grid-cols-2 gap-3"><F label="Time" required><input required type="time" value={form.time} onChange={(event) => setForm({ ...form, time: event.target.value })} className="input" /></F><F label="Duration"><select disabled={appointmentTypes.length > 0} value={form.durationMinutes} onChange={(event) => setForm({ ...form, durationMinutes: event.target.value })} className="input"><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="45">45 minutes</option><option value="60">60 minutes</option></select></F></div><F label="Reason for appointment"><textarea value={form.reason} onChange={(event) => setForm({ ...form, reason: event.target.value })} className="input min-h-[70px]" /></F></div><div className="mt-5 flex justify-end gap-2"><button type="button" onClick={onClose} className="rounded-lg border border-border px-4 py-2 text-sm">Cancel</button><button className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white">Book appointment</button></div><style jsx>{`.input { width: 100%; font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; } .input-with-icon { padding-left: 2.5rem; }`}</style></form></div>;
}
