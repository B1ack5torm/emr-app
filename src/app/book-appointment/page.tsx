"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowLeft, CalendarCheck2, CheckCircle2, Clock3, Stethoscope, UserRound } from "lucide-react";

type AppointmentType = { id: string; name: string; durationMinutes: number };
type Doctor = { id: string; name: string; organization: { name: string; slug: string }; practitionerProfile?: { specialty: string; clinic: { id: string; name: string; appointmentTypes: AppointmentType[] } } };
type Visitor = { name: string; email: string; phone: string; reason: string };
type Confirmation = { doctor: Doctor; date: string; time: string; bookingReference: string };

const isoDate = (date: Date) => date.toLocaleDateString("en-CA");

export default function PublicAppointmentPage() {
  const [hospitalSlug, setHospitalSlug] = useState("");
  const [linkChecked, setLinkChecked] = useState(false);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [doctorId, setDoctorId] = useState("");
  const [clinicId, setClinicId] = useState("");
  const [specialty, setSpecialty] = useState("");
  const [appointmentTypeId, setAppointmentTypeId] = useState("");
  const [date, setDate] = useState("");
  const [slots, setSlots] = useState<string[]>([]);
  const [time, setTime] = useState("");
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [complete, setComplete] = useState<Confirmation | null>(null);
  const [privacyAccepted, setPrivacyAccepted] = useState(false);
  const idempotencyKey = useRef("");
  const [visitor, setVisitor] = useState<Visitor>({ name: "", email: "", phone: "", reason: "" });
  const doctor = useMemo(() => doctors.find((item) => item.id === doctorId), [doctors, doctorId]);
  const clinics = useMemo(() => Array.from(new Map(doctors.filter(item => item.practitionerProfile).map(item => [item.practitionerProfile!.clinic.id, item.practitionerProfile!.clinic])).values()), [doctors]);
  const specialties = useMemo(() => Array.from(new Set(doctors.filter(item => !clinicId || item.practitionerProfile?.clinic.id === clinicId).map(item => item.practitionerProfile?.specialty).filter(Boolean) as string[])).sort(), [doctors, clinicId]);
  const filteredDoctors = doctors.filter(item => (!clinicId || item.practitionerProfile?.clinic.id === clinicId) && (!specialty || item.practitionerProfile?.specialty === specialty));
  const appointmentTypes = doctor?.practitionerProfile?.clinic.appointmentTypes || [];
  const maxDate = new Date(); maxDate.setDate(maxDate.getDate() + 30);

  useEffect(() => {
    const hospital = new URLSearchParams(window.location.search).get("hospital")?.trim().toLowerCase() || "";
    setHospitalSlug(hospital);
    setLinkChecked(true);
  }, []);

  useEffect(() => {
    if (!hospitalSlug) return;
    fetch(`/api/public/appointments?hospital=${encodeURIComponent(hospitalSlug)}`).then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setDoctors(data);
    }).catch((reason) => setError(reason.message || "Could not load available doctors."));
  }, [hospitalSlug]);

  useEffect(() => {
    setTime(""); setSlots([]);
    if (!doctorId || !date) return;
    setLoadingSlots(true); setError("");
    fetch(`/api/public/appointments/availability?hospital=${encodeURIComponent(hospitalSlug)}&doctorId=${encodeURIComponent(doctorId)}&date=${date}&appointmentTypeId=${encodeURIComponent(appointmentTypeId)}`)
      .then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setSlots(data.slots); })
      .catch((reason) => setError(reason.message || "Could not load available times."))
      .finally(() => setLoadingSlots(false));
  }, [hospitalSlug, doctorId, date, appointmentTypeId]);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!doctor || !time) return setError("Choose an available doctor, date, and time.");
    if (!privacyAccepted) return setError("Accept the privacy notice and booking terms to continue.");
    if (!idempotencyKey.current) idempotencyKey.current = crypto.randomUUID();
    setError(""); setSubmitting(true);
    try {
      const response = await fetch("/api/public/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json", "Idempotency-Key": idempotencyKey.current },
        body: JSON.stringify({ ...visitor, hospitalSlug, doctorId, appointmentTypeId: appointmentTypeId || undefined, date, time, privacyAccepted }),
      });
      const data = await response.json();
      if (!response.ok) { if (response.status === 409) setTime(""); throw new Error(data.error || "Could not confirm the appointment."); }
      setComplete({ doctor, date, time, bookingReference: data.bookingReference });
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not send the appointment request.");
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="-mx-6 -my-6 min-h-screen bg-[#F4F7F4] px-5 py-8 text-[#193E34] sm:px-8">
    <div className="mx-auto max-w-5xl">
      <header className="flex items-center justify-between"><Link href="/" className="flex items-center gap-3"><span className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#24705D] text-white"><Stethoscope size={20} /></span><span className="font-serif text-xl font-bold">EMR App</span></Link><Link href="/" className="inline-flex items-center gap-1 text-sm font-bold text-[#41675C]"><ArrowLeft size={15} /> Back home</Link></header>
      {!linkChecked ? <p className="mt-16 text-center text-[#60776E]">Loading booking page...</p> : !hospitalSlug ? <div className="mx-auto mt-16 max-w-xl rounded-2xl border border-[#D7E3DD] bg-white p-8 text-center shadow-xl shadow-[#214F43]/8"><CalendarCheck2 size={42} className="mx-auto text-[#24705D]" /><h1 className="mt-4 font-serif text-3xl font-bold">Hospital booking link required</h1><p className="mt-3 text-[#60776E]">Open the appointment link from your hospital website. Each link identifies one hospital and prevents appointments from crossing between organizations.</p><Link href="/" className="mt-6 inline-block rounded-lg bg-[#24705D] px-5 py-2.5 text-sm font-bold text-white">Return home</Link></div> : complete ? <Success complete={complete} /> : <div className="mt-12 grid gap-8 lg:grid-cols-[.75fr_1.25fr]">
        <aside><p className="text-xs font-bold uppercase tracking-[.16em] text-[#28725E]">Online appointment</p><h1 className="mt-3 font-serif text-4xl font-bold leading-tight">Choose a doctor and request a convenient time.</h1><p className="mt-4 leading-7 text-[#60776E]">Share your contact details and reason for visiting. The doctor will review your request before the appointment is confirmed.</p><div className="mt-8 space-y-3">{[[UserRound, "Choose an available doctor"], [CalendarCheck2, "Pick an open date and time"], [CheckCircle2, "Send your request for approval"]].map(([Icon, text]: any, index) => <div key={text} className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"><span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#E5F2EC] text-sm font-bold text-[#24705D]">{index + 1}</span><Icon size={17} className="text-[#24705D]" /><span className="text-sm font-bold">{text}</span></div>)}</div></aside>
        <form onSubmit={submit} className="rounded-2xl border border-[#D7E3DD] bg-white p-5 shadow-xl shadow-[#214F43]/8 sm:p-7">
          <div className="grid gap-5 sm:grid-cols-2">
            {clinics.length > 0 && <Field label="Clinic"><select required value={clinicId} onChange={(event) => { setClinicId(event.target.value); setSpecialty(""); setDoctorId(""); setAppointmentTypeId(""); }} className="booking-input"><option value="">Select clinic</option>{clinics.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></Field>}
            {clinics.length > 0 && <Field label="Specialty"><select required value={specialty} onChange={(event) => { setSpecialty(event.target.value); setDoctorId(""); setAppointmentTypeId(""); }} className="booking-input"><option value="">Select specialty</option>{specialties.map(value => <option key={value}>{value}</option>)}</select></Field>}
            <Field label="Doctor" full><select required value={doctorId} onChange={(event) => { const selected = doctors.find(item => item.id === event.target.value); setDoctorId(event.target.value); setAppointmentTypeId(selected?.practitionerProfile?.clinic.appointmentTypes[0]?.id || ""); setDate(""); }} className="booking-input"><option value="">Select an available doctor</option>{filteredDoctors.map((item) => <option key={item.id} value={item.id}>Dr. {item.name} — {item.organization.name}</option>)}</select></Field>
            {appointmentTypes.length > 0 && <Field label="Appointment type" full><select required value={appointmentTypeId} onChange={event => setAppointmentTypeId(event.target.value)} className="booking-input">{appointmentTypes.map(item => <option key={item.id} value={item.id}>{item.name} · {item.durationMinutes} minutes</option>)}</select></Field>}
            <Field label="Date"><input required type="date" min={isoDate(new Date())} max={isoDate(maxDate)} value={date} onChange={(event) => setDate(event.target.value)} className="booking-input" /></Field>
            <Field label="Available time"><div className="min-h-11">{loadingSlots ? <p className="py-2 text-sm text-[#60776E]">Checking times...</p> : !date || !doctorId ? <p className="py-2 text-sm text-[#819189]">Select a doctor and date</p> : slots.length === 0 ? <p className="py-2 text-sm text-[#A35E36]">No times available on this date</p> : <div className="flex flex-wrap gap-2">{slots.map((slot) => <button key={slot} type="button" onClick={() => setTime(slot)} className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-2 text-xs font-bold ${time === slot ? "border-[#24705D] bg-[#24705D] text-white" : "border-[#D7E3DD] text-[#41675C] hover:border-[#72A793]"}`}><Clock3 size={12} /> {new Date(`2000-01-01T${slot}:00`).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}</button>)}</div>}</div></Field>
            <div className="sm:col-span-2 border-t border-[#E1E9E4] pt-5"><p className="mb-4 text-xs font-bold uppercase tracking-[.14em] text-[#28725E]">Your details</p><div className="grid gap-5 sm:grid-cols-2">
              <Field label="Full name"><input required autoComplete="name" value={visitor.name} onChange={(event) => setVisitor({ ...visitor, name: event.target.value })} placeholder="Enter your full name" className="booking-input" /></Field>
              <Field label="Email"><input required type="email" autoComplete="email" value={visitor.email} onChange={(event) => setVisitor({ ...visitor, email: event.target.value })} placeholder="you@example.com" className="booking-input" /></Field>
              <Field label="Phone"><input required type="tel" autoComplete="tel" value={visitor.phone} onChange={(event) => setVisitor({ ...visitor, phone: event.target.value })} placeholder="Enter your phone number" className="booking-input" /></Field>
              <Field label="Reason for visit"><input value={visitor.reason} maxLength={500} onChange={(event) => setVisitor({ ...visitor, reason: event.target.value })} placeholder="Briefly describe the reason" className="booking-input" /></Field>
            </div></div>
          </div>
          <label className="mt-5 flex items-start gap-3 rounded-xl border border-[#D7E3DD] bg-[#FBFCFB] p-3 text-sm text-[#60776E]"><input required type="checkbox" checked={privacyAccepted} onChange={(event) => setPrivacyAccepted(event.target.checked)} className="mt-1" /><span>I accept the clinic privacy notice and appointment-booking terms.</span></label>
          {error && <div className="mt-4 rounded-lg bg-[#F8E8E1] p-3 text-sm text-[#A34F38]">{error}</div>}
          <button disabled={submitting || !time} className="mt-6 w-full rounded-xl bg-[#24705D] py-3 text-sm font-bold text-white shadow-lg shadow-[#24705D]/15 disabled:cursor-not-allowed disabled:opacity-50">{submitting ? "Sending request..." : "Confirm appointment"}</button>
          <p className="mt-3 text-center text-xs text-[#819189]">The selected doctor will review your request before it is confirmed.</p>
          <style jsx>{`.booking-input{width:100%;border:1px solid #D7E3DD;border-radius:10px;background:#FBFCFB;padding:10px 12px;font-size:14px;outline:none}.booking-input:focus{border-color:#4B8B76;box-shadow:0 0 0 3px rgba(75,139,118,.12)}`}</style>
        </form>
      </div>}
    </div>
  </div>;
}

function Success({ complete }: { complete: Confirmation }) {
  return <div className="mx-auto mt-16 max-w-lg rounded-2xl border border-[#CFE0D8] bg-white p-8 text-center shadow-xl shadow-[#214F43]/10"><CheckCircle2 size={48} className="mx-auto text-[#24705D]" /><h1 className="mt-5 font-serif text-3xl font-bold">Appointment confirmed</h1><p className="mt-3 text-[#60776E]">Your appointment with <b>Dr. {complete.doctor.name}</b> at <b>{complete.doctor.organization.name}</b> is confirmed.</p><div className="mx-auto mt-6 max-w-sm rounded-xl bg-[#EAF4EE] p-4"><p className="font-bold">{new Date(`${complete.date}T${complete.time}:00`).toLocaleString(undefined, { dateStyle: "full", timeStyle: "short" })}</p><p className="mt-2 font-mono text-sm font-bold">Reference: {complete.bookingReference}</p><p className="mt-1 text-xs text-[#60776E]">Please arrive a little early so reception can verify your details and check you in.</p></div><p className="mt-5 text-sm text-[#60776E]">Your appointment is now visible to the reception team.</p><Link href="/" className="mt-7 inline-block rounded-lg bg-[#24705D] px-5 py-2.5 text-sm font-bold text-white">Return home</Link></div>;
}

function Field({ label, full, children }: { label: string; full?: boolean; children: React.ReactNode }) {
  return <label className={full ? "sm:col-span-2" : ""}><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-[#60776E]">{label}</span>{children}</label>;
}
