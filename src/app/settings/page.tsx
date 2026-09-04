"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";

type Department = { id: string; name: string };
type AppointmentType = { id: string; name: string; durationMinutes: number };
type Clinic = { id: string; name: string; code: string; address?: string; timezone: string; departments: Department[]; appointmentTypes: AppointmentType[] };
type Doctor = { id: string; name: string };
type Schedule = { id: string; dayOfWeek: number; startMinute: number; endMinute: number; appointmentMinutes: number; breaks: { id: string; startMinute: number; endMinute: number; label?: string }[] };
type Practitioner = { id: string; user: Doctor & { email: string }; clinic: Clinic; department?: Department; specialty: string; qualification?: string; acceptsOnlineAppointments: boolean; schedules: Schedule[] };
type Service = { id: string; code: string; name: string; category: string; taxable: boolean; prices: { id: string; unitPrice: number; clinic: { id: string; name: string } }[] };
type Tax = { id: string; name: string; ratePercent: number; clinic: { id: string; name: string }; effectiveFrom?: string };
type DiagnosticSettings = { operationalDiagnosticOrdersEnabled: boolean; operationalImagingOrdersEnabled: boolean };
type OnlineBookingSettings = { onlineBookingEnabled: boolean; slug: string };

const DAYS = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const CATEGORIES = ["CONSULTATION", "MEDICINE", "TEST", "IMAGING", "OTHER"];

async function requestJson(url: string, init?: RequestInit) {
  const response = await fetch(url, init);
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

function toMinute(value: string) {
  const [hour, minute] = value.split(":").map(Number);
  return hour * 60 + minute;
}

function minuteLabel(value: number) {
  const hour = Math.floor(value / 60).toString().padStart(2, "0");
  const minute = (value % 60).toString().padStart(2, "0");
  return `${hour}:${minute}`;
}

export default function SettingsPage() {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [practitioners, setPractitioners] = useState<Practitioner[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [taxes, setTaxes] = useState<Tax[]>([]);
  const [diagnosticSettings, setDiagnosticSettings] = useState<DiagnosticSettings>({ operationalDiagnosticOrdersEnabled: false, operationalImagingOrdersEnabled: false });
  const [onlineBookingSettings, setOnlineBookingSettings] = useState<OnlineBookingSettings>({ onlineBookingEnabled: false, slug: "" });
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busy, setBusy] = useState(false);
  const [clinicForm, setClinicForm] = useState({ name: "", code: "", address: "", timezone: "Asia/Kolkata" });
  const [childForm, setChildForm] = useState({ clinicId: "", kind: "department", name: "", durationMinutes: "30" });
  const [practitionerForm, setPractitionerForm] = useState({ userId: "", clinicId: "", departmentId: "", specialty: "", qualification: "", registrationNumber: "", defaultAppointmentMinutes: "30", acceptsOnlineAppointments: false });
  const [scheduleForm, setScheduleForm] = useState({ practitionerId: "", dayOfWeek: "1", start: "09:00", end: "17:00", appointmentMinutes: "30", breakStart: "13:00", breakEnd: "14:00" });
  const [scheduleBreakEnabled, setScheduleBreakEnabled] = useState(true);
  const [blockedForm, setBlockedForm] = useState({ practitionerId: "", startsAt: "", endsAt: "", reason: "" });
  const [holidayForm, setHolidayForm] = useState({ clinicId: "", date: "", name: "" });
  const [serviceForm, setServiceForm] = useState({ clinicId: "", code: "", name: "", category: "CONSULTATION", unitPrice: "", taxable: false });
  const [taxForm, setTaxForm] = useState({ clinicId: "", name: "GST", ratePercent: "", effectiveFrom: "" });

  const load = useCallback(async () => {
    setError("");
    try {
      const [clinicData, doctorData, practitionerData, serviceData, taxData, diagnosticsData, onlineBookingData] = await Promise.all([
        requestJson("/api/settings/clinics"), requestJson("/api/doctors"), requestJson("/api/settings/practitioners"),
        requestJson("/api/settings/billing"), requestJson("/api/settings/taxes"), requestJson("/api/settings/diagnostics"), requestJson("/api/settings/online-booking"),
      ]);
      setClinics(clinicData); setDoctors(doctorData); setPractitioners(practitionerData); setServices(serviceData); setTaxes(taxData); setDiagnosticSettings(diagnosticsData); setOnlineBookingSettings(onlineBookingData);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load settings."); }
  }, []);

  useEffect(() => { void load(); }, [load]);
  const selectedClinic = useMemo(() => clinics.find((clinic) => clinic.id === practitionerForm.clinicId), [clinics, practitionerForm.clinicId]);
  const post = async (url: string, body: object, success: string, reset: () => void) => {
    setBusy(true); setError(""); setNotice("");
    try {
      await requestJson(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
      reset(); setNotice(success); await load();
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not save settings."); }
    finally { setBusy(false); }
  };

  const createClinic = (event: FormEvent) => { event.preventDefault(); void post("/api/settings/clinics", clinicForm, "Clinic location added.", () => setClinicForm({ name: "", code: "", address: "", timezone: "Asia/Kolkata" })); };
  const createChild = (event: FormEvent) => { event.preventDefault(); void post("/api/settings/clinics", { ...childForm, durationMinutes: Number(childForm.durationMinutes) }, `${childForm.kind === "department" ? "Department" : "Appointment type"} added.`, () => setChildForm((current) => ({ ...current, name: "" }))); };
  const configurePractitioner = (event: FormEvent) => { event.preventDefault(); void post("/api/settings/practitioners", { ...practitionerForm, departmentId: practitionerForm.departmentId || null, defaultAppointmentMinutes: Number(practitionerForm.defaultAppointmentMinutes) }, "Practitioner profile configured.", () => setPractitionerForm((current) => ({ ...current, specialty: "", qualification: "", registrationNumber: "" }))); };
  const configureSchedule = (event: FormEvent) => {
    event.preventDefault();
    const breaks = scheduleBreakEnabled && scheduleForm.breakStart && scheduleForm.breakEnd ? [{ startMinute: toMinute(scheduleForm.breakStart), endMinute: toMinute(scheduleForm.breakEnd), label: "Break" }] : [];
    void post("/api/settings/schedules", { practitionerId: scheduleForm.practitionerId, dayOfWeek: Number(scheduleForm.dayOfWeek), startMinute: toMinute(scheduleForm.start), endMinute: toMinute(scheduleForm.end), appointmentMinutes: Number(scheduleForm.appointmentMinutes), breaks }, "Weekly schedule saved.", () => undefined);
  };
  const addBlockedPeriod = (event: FormEvent) => { event.preventDefault(); void post("/api/settings/schedules", { kind: "blocked", practitionerId: blockedForm.practitionerId, startsAt: new Date(blockedForm.startsAt).toISOString(), endsAt: new Date(blockedForm.endsAt).toISOString(), reason: blockedForm.reason }, "Blocked period added.", () => setBlockedForm((current) => ({ ...current, startsAt: "", endsAt: "", reason: "" }))); };
  const addHoliday = (event: FormEvent) => { event.preventDefault(); void post("/api/settings/schedules", { kind: "holiday", ...holidayForm }, "Clinic holiday added.", () => setHolidayForm((current) => ({ ...current, date: "", name: "" }))); };
  const configureService = (event: FormEvent) => { event.preventDefault(); void post("/api/settings/billing", { ...serviceForm, unitPrice: Math.round(Number(serviceForm.unitPrice) * 100) }, "Service and clinic price saved.", () => setServiceForm((current) => ({ ...current, code: "", name: "", unitPrice: "" }))); };
  const configureTax = (event: FormEvent) => { event.preventDefault(); void post("/api/settings/taxes", { ...taxForm, ratePercent: Number(taxForm.ratePercent), effectiveFrom: taxForm.effectiveFrom || null }, "Tax configuration added.", () => setTaxForm((current) => ({ ...current, ratePercent: "", effectiveFrom: "" }))); };
  const updateDiagnosticOrders = async (enabled: boolean) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await requestJson("/api/settings/diagnostics", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationalDiagnosticOrdersEnabled: enabled }) });
      setDiagnosticSettings(saved);
      setNotice(`Operational diagnostic orders ${enabled ? "enabled" : "disabled"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update diagnostic settings."); }
    finally { setBusy(false); }
  };
  const updateOnlineBooking = async (enabled: boolean) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await requestJson("/api/settings/online-booking", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ onlineBookingEnabled: enabled }) });
      setOnlineBookingSettings(saved);
      setNotice(`Online appointment booking ${enabled ? "enabled" : "disabled"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update online booking."); }
    finally { setBusy(false); }
  };
  const updateImagingOrders = async (enabled: boolean) => {
    setBusy(true); setError(""); setNotice("");
    try {
      const saved = await requestJson("/api/settings/diagnostics", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ operationalImagingOrdersEnabled: enabled }) });
      setDiagnosticSettings(saved);
      setNotice(`Operational imaging orders ${enabled ? "enabled" : "disabled"}.`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not update imaging settings."); }
    finally { setBusy(false); }
  };

  return <div className="w-full">
    <h1 className="font-serif text-xl font-semibold">Clinic configuration</h1>
    <p className="mt-1 text-sm text-inkSoft">Configure care locations, clinician availability, billable services, and tax rules.</p>
    {error && <p className="mt-4 rounded-lg bg-alertSoft px-3 py-2 text-sm text-alert">{error}</p>}
    {notice && <p className="mt-4 rounded-lg bg-accentSoft px-3 py-2 text-sm text-accentDark">{notice}</p>}

    <Section title="Online appointment booking">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div><p className="font-semibold">Accept bookings from the hospital website</p><p className="mt-1 text-sm text-inkSoft">Keep this off until practitioner profiles and weekly schedules are verified. Only opted-in doctors with an active schedule are shown.</p>{onlineBookingSettings.slug && <p className="mt-2 font-mono text-xs text-inkSoft">/book-appointment?hospital={onlineBookingSettings.slug}</p>}</div>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={onlineBookingSettings.onlineBookingEnabled} disabled={busy} onChange={(event) => void updateOnlineBooking(event.target.checked)} /> Enabled</label>
      </div>
    </Section>

    <Section title="Locations and departments">
      <form onSubmit={createClinic} className="settings-grid">
        <Field label="Clinic name"><input required value={clinicForm.name} onChange={(event) => setClinicForm({ ...clinicForm, name: event.target.value })} className="input" /></Field>
        <Field label="Clinic code"><input required placeholder="BLR01" value={clinicForm.code} onChange={(event) => setClinicForm({ ...clinicForm, code: event.target.value.toUpperCase() })} className="input" /></Field>
        <Field label="Address"><input value={clinicForm.address} onChange={(event) => setClinicForm({ ...clinicForm, address: event.target.value })} className="input" /></Field>
        <Field label="IANA timezone"><input required value={clinicForm.timezone} onChange={(event) => setClinicForm({ ...clinicForm, timezone: event.target.value })} className="input" /></Field>
        <Submit busy={busy}>Add clinic</Submit>
      </form>
      <form onSubmit={createChild} className="settings-grid mt-4 border-t border-border pt-4">
        <Field label="Clinic"><ClinicSelect clinics={clinics} value={childForm.clinicId} onChange={(clinicId) => setChildForm({ ...childForm, clinicId })} /></Field>
        <Field label="Configuration type"><select value={childForm.kind} onChange={(event) => setChildForm({ ...childForm, kind: event.target.value })} className="input"><option value="department">Department</option><option value="appointmentType">Appointment type</option></select></Field>
        <Field label="Name"><input required value={childForm.name} onChange={(event) => setChildForm({ ...childForm, name: event.target.value })} className="input" /></Field>
        {childForm.kind === "appointmentType" && <Field label="Duration (minutes)"><input required type="number" min="5" max="240" value={childForm.durationMinutes} onChange={(event) => setChildForm({ ...childForm, durationMinutes: event.target.value })} className="input" /></Field>}
        <Submit busy={busy}>Add configuration</Submit>
      </form>
      <div className="mt-5 grid gap-3 md:grid-cols-2">{clinics.map((clinic) => <div key={clinic.id} className="rounded-lg border border-border p-3"><p className="font-semibold">{clinic.name} <span className="font-mono text-xs text-inkSoft">{clinic.code}</span></p><p className="text-xs text-inkSoft">{clinic.address || "No address"} · {clinic.timezone}</p><p className="mt-2 text-xs"><b>Departments:</b> {clinic.departments.map((item) => item.name).join(", ") || "None"}</p><p className="text-xs"><b>Appointment types:</b> {clinic.appointmentTypes.map((item) => `${item.name} (${item.durationMinutes}m)`).join(", ") || "None"}</p></div>)}</div>
    </Section>

    <Section title="Practitioners and schedules">
      <form onSubmit={configurePractitioner} className="settings-grid">
        <Field label="Doctor"><select required value={practitionerForm.userId} onChange={(event) => setPractitionerForm({ ...practitionerForm, userId: event.target.value })} className="input"><option value="">Select doctor</option>{doctors.map((doctor) => <option key={doctor.id} value={doctor.id}>{doctor.name}</option>)}</select></Field>
        <Field label="Clinic"><ClinicSelect clinics={clinics} value={practitionerForm.clinicId} onChange={(clinicId) => setPractitionerForm({ ...practitionerForm, clinicId, departmentId: "" })} /></Field>
        <Field label="Department"><select value={practitionerForm.departmentId} onChange={(event) => setPractitionerForm({ ...practitionerForm, departmentId: event.target.value })} className="input"><option value="">No department</option>{selectedClinic?.departments.map((department) => <option key={department.id} value={department.id}>{department.name}</option>)}</select></Field>
        <Field label="Specialty"><input required value={practitionerForm.specialty} onChange={(event) => setPractitionerForm({ ...practitionerForm, specialty: event.target.value })} className="input" /></Field>
        <Field label="Qualification"><input value={practitionerForm.qualification} onChange={(event) => setPractitionerForm({ ...practitionerForm, qualification: event.target.value })} className="input" /></Field>
        <Field label="Registration number"><input value={practitionerForm.registrationNumber} onChange={(event) => setPractitionerForm({ ...practitionerForm, registrationNumber: event.target.value })} className="input" /></Field>
        <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={practitionerForm.acceptsOnlineAppointments} onChange={(event) => setPractitionerForm({ ...practitionerForm, acceptsOnlineAppointments: event.target.checked })} /> Accept online appointments</label>
        <Submit busy={busy}>Save practitioner</Submit>
      </form>
      <form onSubmit={configureSchedule} className="settings-grid mt-4 border-t border-border pt-4">
        <Field label="Practitioner"><PractitionerSelect practitioners={practitioners} value={scheduleForm.practitionerId} onChange={(practitionerId) => setScheduleForm({ ...scheduleForm, practitionerId })} /></Field>
        <Field label="Day"><select value={scheduleForm.dayOfWeek} onChange={(event) => setScheduleForm({ ...scheduleForm, dayOfWeek: event.target.value })} className="input">{DAYS.map((day, index) => <option key={day} value={index}>{day}</option>)}</select></Field>
        <Field label="Starts"><input required type="time" value={scheduleForm.start} onChange={(event) => setScheduleForm({ ...scheduleForm, start: event.target.value })} className="input" /></Field>
        <Field label="Ends"><input required type="time" value={scheduleForm.end} onChange={(event) => setScheduleForm({ ...scheduleForm, end: event.target.value })} className="input" /></Field>
        <Field label="Slot minutes"><input required type="number" min="5" max="240" value={scheduleForm.appointmentMinutes} onChange={(event) => setScheduleForm({ ...scheduleForm, appointmentMinutes: event.target.value })} className="input" /></Field>
        <div className="block text-sm"><span className="mb-1 block text-xs font-bold uppercase text-inkSoft">Break (optional)</span>
          {scheduleBreakEnabled ? <div className="space-y-2">
            <div className="flex gap-2"><input aria-label="Break starts" required type="time" value={scheduleForm.breakStart} onChange={(event) => setScheduleForm({ ...scheduleForm, breakStart: event.target.value })} className="input" /><input aria-label="Break ends" required type="time" value={scheduleForm.breakEnd} onChange={(event) => setScheduleForm({ ...scheduleForm, breakEnd: event.target.value })} className="input" /></div>
            <button type="button" onClick={() => { setScheduleBreakEnabled(false); setScheduleForm((current) => ({ ...current, breakStart: "", breakEnd: "" })); }} className="text-xs font-semibold text-alert hover:underline">Remove break</button>
          </div> : <button type="button" onClick={() => { setScheduleBreakEnabled(true); setScheduleForm((current) => ({ ...current, breakStart: "13:00", breakEnd: "14:00" })); }} className="w-full rounded-lg border border-dashed border-border bg-[#FCFAF5] px-3 py-2 text-sm font-semibold text-accentDark hover:border-accent/40 hover:bg-accentSoft">+ Add break</button>}
        </div>
        <Submit busy={busy}>Save weekly schedule</Submit>
      </form>
      <div className="mt-5 space-y-2">{practitioners.map((practitioner) => <div key={practitioner.id} className="rounded-lg border border-border p-3 text-sm"><p className="font-semibold">Dr. {practitioner.user.name} · {practitioner.specialty}</p><p className="text-xs text-inkSoft">{practitioner.clinic.name}{practitioner.department ? ` / ${practitioner.department.name}` : ""} · Online booking {practitioner.acceptsOnlineAppointments ? "enabled" : "disabled"}</p><p className="mt-1 text-xs">{practitioner.schedules.map((schedule) => `${DAYS[schedule.dayOfWeek]} ${minuteLabel(schedule.startMinute)}–${minuteLabel(schedule.endMinute)} (${schedule.appointmentMinutes}m)`).join(" · ") || "No weekly hours configured"}</p></div>)}</div>
      <div className="mt-4 grid gap-4 border-t border-border pt-4 lg:grid-cols-2">
        <form onSubmit={addBlockedPeriod} className="settings-grid"><h3 className="font-semibold sm:col-span-2">Block practitioner time</h3><Field label="Practitioner"><PractitionerSelect practitioners={practitioners} value={blockedForm.practitionerId} onChange={(practitionerId) => setBlockedForm({ ...blockedForm, practitionerId })} /></Field><Field label="Reason"><input required value={blockedForm.reason} onChange={(event) => setBlockedForm({ ...blockedForm, reason: event.target.value })} className="input" /></Field><Field label="Starts"><input required type="datetime-local" value={blockedForm.startsAt} onChange={(event) => setBlockedForm({ ...blockedForm, startsAt: event.target.value })} className="input" /></Field><Field label="Ends"><input required type="datetime-local" value={blockedForm.endsAt} onChange={(event) => setBlockedForm({ ...blockedForm, endsAt: event.target.value })} className="input" /></Field><Submit busy={busy}>Add blocked time</Submit></form>
        <form onSubmit={addHoliday} className="settings-grid"><h3 className="font-semibold sm:col-span-2">Add clinic holiday</h3><Field label="Clinic"><ClinicSelect clinics={clinics} value={holidayForm.clinicId} onChange={(clinicId) => setHolidayForm({ ...holidayForm, clinicId })} /></Field><Field label="Holiday name"><input required value={holidayForm.name} onChange={(event) => setHolidayForm({ ...holidayForm, name: event.target.value })} className="input" /></Field><Field label="Date"><input required type="date" value={holidayForm.date} onChange={(event) => setHolidayForm({ ...holidayForm, date: event.target.value })} className="input" /></Field><Submit busy={busy}>Add holiday</Submit></form>
      </div>
    </Section>

    <Section title="Diagnostic order capabilities">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Operational diagnostic orders</p>
          <p className="mt-1 max-w-3xl text-sm text-inkSoft">Enable this only when the hospital has a laboratory or diagnostic department that can receive and process operational orders. Doctors can still record tests under Tests ordered when this is disabled.</p>
          <p className={`mt-2 text-xs font-bold ${diagnosticSettings.operationalDiagnosticOrdersEnabled ? "text-accentDark" : "text-inkSoft"}`}>{diagnosticSettings.operationalDiagnosticOrdersEnabled ? "Enabled for this hospital" : "Disabled by default"}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3 self-start sm:self-center">
          <span className="text-sm font-semibold">{diagnosticSettings.operationalDiagnosticOrdersEnabled ? "On" : "Off"}</span>
          <input type="checkbox" role="switch" aria-label="Enable operational diagnostic orders" checked={diagnosticSettings.operationalDiagnosticOrdersEnabled} disabled={busy} onChange={(event) => void updateDiagnosticOrders(event.target.checked)} className="peer sr-only" />
          <span className="relative h-7 w-12 rounded-full bg-[#C8C3B8] transition peer-checked:bg-accent peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>
      <div className="mt-4 flex flex-col gap-4 border-t border-border pt-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-semibold">Operational imaging orders (HL7 / modality worklist)</p>
          <p className="mt-1 max-w-3xl text-sm text-inkSoft">Enable this only when the hospital has radiology equipment or a connected modality worklist that can receive HL7 orders. Doctors can still record requested scans under Imaging ordered when this is disabled.</p>
          <p className={`mt-2 text-xs font-bold ${diagnosticSettings.operationalImagingOrdersEnabled ? "text-accentDark" : "text-inkSoft"}`}>{diagnosticSettings.operationalImagingOrdersEnabled ? "Enabled for this hospital" : "Disabled by default"}</p>
        </div>
        <label className="inline-flex cursor-pointer items-center gap-3 self-start sm:self-center">
          <span className="text-sm font-semibold">{diagnosticSettings.operationalImagingOrdersEnabled ? "On" : "Off"}</span>
          <input type="checkbox" role="switch" aria-label="Enable operational imaging orders" checked={diagnosticSettings.operationalImagingOrdersEnabled} disabled={busy} onChange={(event) => void updateImagingOrders(event.target.checked)} className="peer sr-only" />
          <span className="relative h-7 w-12 rounded-full bg-[#C8C3B8] transition peer-checked:bg-accent peer-disabled:opacity-50 after:absolute after:left-1 after:top-1 after:h-5 after:w-5 after:rounded-full after:bg-white after:shadow after:transition-transform peer-checked:after:translate-x-5" />
        </label>
      </div>
    </Section>

    <Section title="Service catalog, prices, and tax">
      <form onSubmit={configureService} className="settings-grid">
        <Field label="Clinic"><ClinicSelect clinics={clinics} value={serviceForm.clinicId} onChange={(clinicId) => setServiceForm({ ...serviceForm, clinicId })} /></Field>
        <Field label="Service code"><input required value={serviceForm.code} onChange={(event) => setServiceForm({ ...serviceForm, code: event.target.value.toUpperCase() })} className="input" /></Field>
        <Field label="Service name"><input required value={serviceForm.name} onChange={(event) => setServiceForm({ ...serviceForm, name: event.target.value })} className="input" /></Field>
        <Field label="Category"><select value={serviceForm.category} onChange={(event) => setServiceForm({ ...serviceForm, category: event.target.value })} className="input">{CATEGORIES.map((category) => <option key={category}>{category}</option>)}</select></Field>
        <Field label="Clinic price (₹)"><input required type="number" min="0" step="0.01" value={serviceForm.unitPrice} onChange={(event) => setServiceForm({ ...serviceForm, unitPrice: event.target.value })} className="input" /></Field>
        <label className="flex items-center gap-2 self-end py-2 text-sm"><input type="checkbox" checked={serviceForm.taxable} onChange={(event) => setServiceForm({ ...serviceForm, taxable: event.target.checked })} /> Taxable service</label>
        <Submit busy={busy}>Save service and price</Submit>
      </form>
      <form onSubmit={configureTax} className="settings-grid mt-4 border-t border-border pt-4">
        <Field label="Clinic"><ClinicSelect clinics={clinics} value={taxForm.clinicId} onChange={(clinicId) => setTaxForm({ ...taxForm, clinicId })} /></Field>
        <Field label="Tax name"><input required value={taxForm.name} onChange={(event) => setTaxForm({ ...taxForm, name: event.target.value })} className="input" /></Field>
        <Field label="Rate percent"><input required type="number" min="0" max="100" step="0.01" value={taxForm.ratePercent} onChange={(event) => setTaxForm({ ...taxForm, ratePercent: event.target.value })} className="input" /></Field>
        <Field label="Effective from"><input type="date" value={taxForm.effectiveFrom} onChange={(event) => setTaxForm({ ...taxForm, effectiveFrom: event.target.value })} className="input" /></Field>
        <Submit busy={busy}>Add tax rule</Submit>
      </form>
      <div className="mt-5 grid gap-4 lg:grid-cols-2"><div><h3 className="mb-2 font-semibold">Catalog</h3>{services.map((service) => <div key={service.id} className="mb-2 rounded-lg border border-border p-3 text-sm"><b>{service.code}</b> · {service.name} <span className="text-xs text-inkSoft">({service.category}{service.taxable ? ", taxable" : ""})</span><p className="text-xs">{service.prices.map((price) => `${price.clinic.name}: ₹${(price.unitPrice / 100).toFixed(2)}`).join(" · ") || "No clinic prices"}</p></div>)}</div><div><h3 className="mb-2 font-semibold">Tax rules</h3>{taxes.map((tax) => <div key={tax.id} className="mb-2 rounded-lg border border-border p-3 text-sm"><b>{tax.name}</b> · {tax.ratePercent}%<p className="text-xs text-inkSoft">{tax.clinic.name}{tax.effectiveFrom ? ` · from ${new Date(tax.effectiveFrom).toLocaleDateString()}` : ""}</p></div>)}</div></div>
    </Section>
    <style jsx global>{`.settings-grid{display:grid;gap:12px}@media(min-width:640px){.settings-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}.input{width:100%;border:1px solid #E2DCCE;border-radius:8px;background:#FCFAF5;padding:9px 11px;font-size:14px}`}</style>
  </div>;
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <section className="mt-6 rounded-xl border border-border bg-card p-4"><h2 className="mb-4 font-serif text-lg font-semibold">{title}</h2>{children}</section>;
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block text-sm"><span className="mb-1 block text-xs font-bold uppercase text-inkSoft">{label}</span>{children}</label>;
}
function Submit({ busy, children }: { busy: boolean; children: React.ReactNode }) {
  return <button disabled={busy} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50 sm:col-span-2">{children}</button>;
}
function ClinicSelect({ clinics, value, onChange }: { clinics: Clinic[]; value: string; onChange: (value: string) => void }) {
  return <select required value={value} onChange={(event) => onChange(event.target.value)} className="input"><option value="">Select clinic</option>{clinics.map((clinic) => <option key={clinic.id} value={clinic.id}>{clinic.name}</option>)}</select>;
}
function PractitionerSelect({ practitioners, value, onChange }: { practitioners: Practitioner[]; value: string; onChange: (value: string) => void }) {
  return <select required value={value} onChange={(event) => onChange(event.target.value)} className="input"><option value="">Select practitioner</option>{practitioners.map((practitioner) => <option key={practitioner.id} value={practitioner.id}>Dr. {practitioner.user.name} · {practitioner.clinic.name}</option>)}</select>;
}
