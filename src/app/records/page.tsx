"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, User, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Clock, Pencil, Save, X, Plus, ShieldAlert, Syringe, Pill, Stethoscope } from "lucide-react";
import { AllergyBanner } from "@/components/shared";

export default function RecordsPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const role = (session?.user as any)?.role || "";
  const canEdit = ["RECEPTION", "FRONT_DESK", "NURSE", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role);
  const canEditClinical = ["DOCTOR", "NURSE", "RECEPTION", "FRONT_DESK", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role);
  const canMerge = ["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(query)}`).then((r) => r.json()).then(setPatients);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); setEditing(null); return; }
    setExpanded(id);
    const res = await fetch(`/api/patients/${id}/clinical-summary`);
    setDetail(await res.json());
  };

  return (
    <div>
      <div className="relative max-w-md mb-4">
        <Search size={15} className="absolute left-3 top-3 text-inkSoft" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by MRN, patient name, or phone"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-[#FCFAF5]" />
      </div>

      {patients.length === 0 && <div className="text-inkSoft p-5">No patients found.</div>}

      <div className="flex flex-col gap-2.5">
        {patients.map((p) => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden"
              style={{ borderLeft: `4px solid ${p.allergies.length ? "#B5533C" : "#3D6A5C"}` }}>
              <div onClick={() => toggle(p.id)} className="cursor-pointer px-4 py-3.5 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <User size={15} className="text-inkSoft" /> {p.name}
                    {p.allergies.length > 0 && <span className="inline-flex items-center gap-1 bg-alertSoft text-alert px-2 py-0.5 rounded-full text-xs font-semibold"><AlertTriangle size={10} /> Allergies</span>}
                  </div>
                  <div className="text-xs font-mono text-inkSoft mt-0.5">{p.mrn}</div>
                  <div className="text-xs text-inkSoft mt-0.5">{p.age} yrs · {p.gender} · {p.visits.length} visit{p.visits.length !== 1 ? "s" : ""} on file</div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-inkSoft" /> : <ChevronDown size={18} className="text-inkSoft" />}
              </div>
              {isOpen && detail?.id === p.id && (
                <div className="px-4 pb-4">
                  <div className="mb-3 flex justify-end gap-2"><a href={`/api/fhir/patients/${p.id}`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-accentDark">Export FHIR</a>{canEdit && <button onClick={() => setEditing(editing === p.id ? null : p.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-accentDark">{editing === p.id ? <><X size={13} /> Cancel editing</> : <><Pencil size={13} /> Edit patient</>}</button>}</div>
                  {editing === p.id ? <PatientEditForm patient={detail} onCancel={() => setEditing(null)} onSaved={(updated) => { setDetail((current: any) => ({ ...current, ...updated })); setPatients((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); setEditing(null); }} /> : <>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><b>Phone:</b> {detail.phone || "—"}</div>
                    <div><b>Date of birth:</b> {detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString() : "—"}</div>
                    <div><b>Blood group:</b> {detail.bloodGroup || "—"}</div>
                    <div><b>Address:</b> {detail.address || "—"}</div>
                    <div><b>Emergency contact:</b> {detail.emergencyContact || "—"}</div>
                  </div>
                  <AllergyBanner allergies={detail.allergies.map((a: any) => a.name)} />
                  <ClinicalSummary patient={detail} canEdit={canEditClinical} onChanged={async () => { const response = await fetch(`/api/patients/${p.id}/clinical-summary`); if (response.ok) setDetail(await response.json()); }} />
                  {canMerge && <DuplicateMergePanel target={detail} onMerged={async () => { const response = await fetch(`/api/patients/${p.id}/clinical-summary`); if (response.ok) setDetail(await response.json()); }} />}
                  <div className="text-xs font-bold text-inkSoft uppercase mt-3.5">Visit history</div>
                  <div className="flex flex-col gap-2 mt-2">
                    {detail.visits.length === 0 && <div className="text-sm text-inkSoft">No visits recorded yet.</div>}
                    {detail.visits.map((v: any) => <VisitRow key={v.id} visit={v} />)}
                  </div>
                  </>}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

const summaryConfig: Record<string, { title: string; collection: string; field: string; placeholder: string; date?: string; icon: any }> = {
  ALLERGY: { title: "Allergies", collection: "allergies", field: "name", placeholder: "e.g. Penicillin", icon: ShieldAlert },
  PROBLEM: { title: "Problem list", collection: "problems", field: "description", placeholder: "e.g. Type 2 diabetes", date: "onsetDate", icon: Stethoscope },
  MEDICATION: { title: "Current medications", collection: "medicationStatements", field: "medication", placeholder: "e.g. Metformin 500 mg", date: "effectiveFrom", icon: Pill },
  IMMUNIZATION: { title: "Immunizations", collection: "immunizations", field: "vaccine", placeholder: "e.g. Influenza vaccine", date: "occurrenceDate", icon: Syringe },
  PROCEDURE: { title: "Procedures", collection: "procedures", field: "description", placeholder: "e.g. Appendectomy", date: "performedAt", icon: Stethoscope },
  FLAG: { title: "Safety flags", collection: "clinicalFlags", field: "title", placeholder: "e.g. Fall risk", icon: AlertTriangle },
};

function ClinicalSummary({ patient, canEdit, onChanged }: { patient: any; canEdit: boolean; onChanged: () => Promise<void> }) {
  const [adding, setAdding] = useState<string | null>(null); const [value, setValue] = useState(""); const [date, setDate] = useState(""); const [details, setDetails] = useState(""); const [severity, setSeverity] = useState("UNKNOWN"); const [busy, setBusy] = useState(false); const [error, setError] = useState("");
  const submit = async (kind: string) => {
    const config = summaryConfig[kind]; setBusy(true); setError("");
    const body: any = { kind, [config.field]: value, notes: details, description: kind === "FLAG" ? details : undefined, severity };
    if (config.date) body[config.date] = date;
    const response = await fetch(`/api/patients/${patient.id}/clinical-summary`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }); const data = await response.json(); setBusy(false);
    if (!response.ok) return setError(data.error || "Could not save the clinical item.");
    setAdding(null); setValue(""); setDate(""); setDetails(""); setSeverity("UNKNOWN"); await onChanged();
  };
  const changeStatus = async (kind: string, item: any) => {
    const body = kind === "FLAG" ? { active: false } : kind === "MEDICATION" ? { status: "STOPPED" } : { clinicalStatus: "RESOLVED" };
    const response = await fetch(`/api/patients/${patient.id}/clinical-summary/${kind.toLowerCase()}/${item.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (response.ok) await onChanged();
  };
  const label = (kind: string, item: any) => item[summaryConfig[kind].field];
  const isActive = (kind: string, item: any) => kind === "FLAG" ? item.active : kind === "MEDICATION" ? item.status === "ACTIVE" : ["ALLERGY", "PROBLEM"].includes(kind) ? item.clinicalStatus === "ACTIVE" : true;
  const subtitle = (kind: string, item: any) => {
    if (kind === "ALLERGY") return [item.reaction, item.severity !== "UNKNOWN" ? item.severity : null].filter(Boolean).join(" · ");
    if (kind === "MEDICATION") return [item.dose, item.dosageUnit, item.frequency, item.route].filter(Boolean).join(" · ");
    const dateField = summaryConfig[kind].date; return dateField && item[dateField] ? new Date(item[dateField]).toLocaleDateString() : item.description || item.notes || "";
  };
  return <div className="mt-4">
    <div className="mb-2 text-xs font-bold uppercase text-inkSoft">Longitudinal clinical summary</div>
    {error && <div className="mb-2 text-sm text-alert">{error}</div>}
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{Object.entries(summaryConfig).map(([kind, config]) => { const items = (patient[config.collection] || []) as any[]; const Icon = config.icon; return <section key={kind} className="rounded-xl border border-border bg-[#FAF8F2] p-3">
      <div className="flex items-center justify-between"><div className="flex items-center gap-2 text-sm font-bold"><Icon size={15} className="text-accentDark" />{config.title}</div>{canEdit && <button onClick={() => { setAdding(adding === kind ? null : kind); setError(""); }} className="rounded-md border border-border p-1 text-accentDark" aria-label={`Add ${config.title}`}><Plus size={13} /></button>}</div>
      <div className="mt-2 space-y-1.5">{items.length === 0 && <div className="text-xs text-inkSoft">None recorded</div>}{items.slice(0, 6).map((item) => <div key={item.id} className={`rounded-lg border px-2.5 py-2 text-xs ${isActive(kind, item) ? "border-border bg-white" : "border-border bg-white opacity-55"}`}><div className="flex justify-between gap-2"><span className="font-semibold">{label(kind, item)}</span>{canEdit && isActive(kind, item) && ["ALLERGY", "PROBLEM", "MEDICATION", "FLAG"].includes(kind) && <button onClick={() => changeStatus(kind, item)} className="text-[10px] font-bold text-accentDark">{kind === "MEDICATION" ? "Stop" : kind === "FLAG" ? "Clear" : "Resolve"}</button>}</div>{subtitle(kind, item) && <div className="mt-0.5 text-inkSoft">{subtitle(kind, item)}</div>}</div>)}</div>
      {adding === kind && <div className="mt-2 space-y-2 border-t border-dashed border-border pt-2"><input autoFocus value={value} onChange={(e) => setValue(e.target.value)} placeholder={config.placeholder} className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs" />{config.date && <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs" />}{["ALLERGY", "FLAG"].includes(kind) && <select value={severity} onChange={(e) => setSeverity(e.target.value)} className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs"><option value="UNKNOWN">Severity unknown</option><option value="MILD">Mild</option><option value="MODERATE">Moderate</option><option value="SEVERE">Severe</option><option value="LIFE_THREATENING">Life threatening</option></select>}<input value={details} onChange={(e) => setDetails(e.target.value)} placeholder={kind === "ALLERGY" ? "Reaction / notes" : "Optional details"} className="w-full rounded-md border border-border bg-white px-2 py-1.5 text-xs" /><button disabled={busy || !value.trim() || (kind === "IMMUNIZATION" && !date)} onClick={() => submit(kind)} className="w-full rounded-md bg-accent py-1.5 text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save"}</button></div>}
    </section>; })}</div>
  </div>;
}

function DuplicateMergePanel({ target, onMerged }: { target: any; onMerged: () => Promise<void> }) {
  const [open, setOpen] = useState(false); const [query, setQuery] = useState(""); const [matches, setMatches] = useState<any[]>([]); const [source, setSource] = useState<any>(null); const [reason, setReason] = useState(""); const [error, setError] = useState(""); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open || query.trim().length < 2) { setMatches([]); return; } const timer = setTimeout(() => fetch(`/api/patients?q=${encodeURIComponent(query)}`).then((r) => r.json()).then((rows) => setMatches(Array.isArray(rows) ? rows.filter((row) => row.id !== target.id) : [])), 250); return () => clearTimeout(timer); }, [open, query, target.id]);
  const merge = async () => { if (!source) return; if (!window.confirm(`Merge ${source.name} (${source.mrn}) into ${target.name} (${target.mrn})? This cannot be automatically undone.`)) return; setBusy(true); setError(""); const response = await fetch("/api/patients/merge", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ sourcePatientId: source.id, targetPatientId: target.id, confirmTargetMrn: target.mrn, reason }) }); const data = await response.json(); setBusy(false); if (!response.ok) return setError(data.error || "Could not merge records."); setOpen(false); setSource(null); setQuery(""); setReason(""); await onMerged(); };
  return <div className="mt-4 rounded-xl border border-border bg-card p-3"><button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between text-left text-xs font-bold uppercase text-inkSoft"><span>Identity and duplicate management</span><span>{open ? "Close" : "Review"}</span></button>{open && <div className="mt-3 space-y-2"><div className="text-xs text-inkSoft">The current record <b>{target.name} ({target.mrn})</b> will be kept as the master record.</div><input value={query} onChange={(e) => { setQuery(e.target.value); setSource(null); }} placeholder="Search duplicate by MRN, name, phone or identifier" className="w-full rounded-lg border border-border bg-[#FCFAF5] px-3 py-2 text-sm" />{!source && matches.slice(0, 5).map((item) => <button key={item.id} onClick={() => { setSource(item); setQuery(`${item.name} (${item.mrn})`); setMatches([]); }} className="block w-full rounded-lg border border-border bg-white p-2 text-left text-xs"><b>{item.name}</b> · {item.mrn} · {item.phone || "no phone"}</button>)}{source && <><div className="rounded-lg border border-alert bg-alertSoft p-2 text-xs text-alert">Source record to retire: <b>{source.name} ({source.mrn})</b></div><textarea value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Clinical/administrative reason for merge (minimum 10 characters)" className="min-h-16 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /><button disabled={busy || reason.trim().length < 10} onClick={merge} className="rounded-lg bg-alert px-3 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Merging…" : "Merge duplicate into this record"}</button></>}{error && <div className="text-xs text-alert">{error}</div>}</div>}</div>;
}

function PatientEditForm({ patient, onCancel, onSaved }: { patient: any; onCancel: () => void; onSaved: (patient: any) => void }) {
  const [form, setForm] = useState({
    name: patient.name || "", dateOfBirth: patient.dateOfBirth ? new Date(patient.dateOfBirth).toISOString().slice(0, 10) : "",
    age: String(patient.age ?? ""), gender: patient.gender || "", phone: patient.phone || "", email: patient.email || "",
    bloodGroup: patient.bloodGroup || "", address: patient.address || "", emergencyContact: patient.emergencyContact || "",
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  const setDateOfBirth = (value: string) => {
    let age = form.age;
    if (value) {
      const dob = new Date(`${value}T00:00:00`); const today = new Date();
      let calculated = today.getFullYear() - dob.getFullYear();
      if (today.getMonth() < dob.getMonth() || (today.getMonth() === dob.getMonth() && today.getDate() < dob.getDate())) calculated--;
      if (calculated >= 0) age = String(calculated);
    }
    setForm((current) => ({ ...current, dateOfBirth: value, age }));
  };
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setError(""); setSaving(true);
    const response = await fetch(`/api/patients/${patient.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, age: Number(form.age), version: patient.version }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setError(data.error || "Could not update the patient.");
    onSaved(data);
  };
  return <form onSubmit={submit} className="mb-4 rounded-xl border border-border bg-[#FAF8F2] p-4">
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      <EditField label="Full name" required><input required value={form.name} onChange={(event) => set("name", event.target.value)} className="record-edit-input" /></EditField>
      <EditField label="Date of birth"><input type="date" max={new Date().toISOString().slice(0, 10)} value={form.dateOfBirth} onChange={(event) => setDateOfBirth(event.target.value)} className="record-edit-input" /></EditField>
      <EditField label="Age" required><input required type="number" min={0} max={130} value={form.age} onChange={(event) => set("age", event.target.value)} className="record-edit-input" /></EditField>
      <EditField label="Gender" required><select required value={form.gender} onChange={(event) => set("gender", event.target.value)} className="record-edit-input"><option value="MALE">Male</option><option value="FEMALE">Female</option><option value="OTHER">Other</option></select></EditField>
      <EditField label="Phone"><input value={form.phone} onChange={(event) => set("phone", event.target.value)} className="record-edit-input" /></EditField>
      <EditField label="Email"><input type="email" value={form.email} onChange={(event) => set("email", event.target.value)} className="record-edit-input" /></EditField>
      <EditField label="Blood group"><input value={form.bloodGroup} onChange={(event) => set("bloodGroup", event.target.value)} className="record-edit-input" /></EditField>
      <EditField label="Emergency contact"><input value={form.emergencyContact} onChange={(event) => set("emergencyContact", event.target.value)} className="record-edit-input" /></EditField>
      <EditField label="Address"><input value={form.address} onChange={(event) => set("address", event.target.value)} className="record-edit-input" /></EditField>
    </div>
    {error && <div className="mt-3 text-sm text-alert">{error}</div>}
    <div className="mt-4 flex justify-end gap-2"><button type="button" onClick={onCancel} className="rounded-lg border border-border px-4 py-2 text-sm font-semibold">Cancel</button><button disabled={saving} className="inline-flex items-center gap-2 rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-60"><Save size={14} /> {saving ? "Saving…" : "Save changes"}</button></div>
    <style jsx>{`.record-edit-input{width:100%;border:1px solid #E2DCCE;border-radius:8px;background:#fff;padding:8px 10px;font-size:14px}`}</style>
  </form>;
}

function EditField({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) { return <label className="block"><span className="mb-1 block text-xs font-bold uppercase text-inkSoft">{label}{required ? " *" : ""}</span>{children}</label>; }

function VisitRow({ visit }: { visit: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg bg-[#FAF8F2]">
      <div onClick={() => setOpen(!open)} className="cursor-pointer px-3 py-2.5 flex justify-between items-center">
        <div className="text-sm">
          <span className="font-mono text-inkSoft">{new Date(visit.createdAt).toLocaleString()}</span>{"  "}
          <span className="font-semibold">{visit.chiefComplaint || "General visit"}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${visit.status === "COMPLETED" ? "bg-accentSoft text-accentDark" : "bg-waitingSoft text-waiting"}`}>
          {visit.status === "COMPLETED" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
          {visit.status === "COMPLETED" ? "Completed" : "Waiting"}
        </span>
      </div>
      {open && (
        <div className="px-3 pb-3 text-sm flex flex-col gap-2">
          <div><b>Vitals:</b> BP {visit.bp || "—"}, Temp {visit.temperature || "—"}°F, Pulse {visit.pulse || "—"}, Wt {visit.weight || "—"}kg</div>
          {visit.diagnosis && <div><b>Diagnosis:</b> {visit.diagnosis}</div>}
          {visit.doctorNotes && <div><b>Doctor&apos;s notes:</b> {visit.doctorNotes}</div>}
          {visit.prescriptions?.length > 0 && (
            <div><b>Prescription:</b>
              <ul className="list-disc ml-5 mt-1">
                {visit.prescriptions.map((r: any, i: number) => <li key={i}>{r.medicine} — {r.dosage}, {r.frequency}, {r.duration}</li>)}
              </ul>
            </div>
          )}
          {visit.testsOrdered?.length > 0 && <div><b>Tests ordered:</b> {visit.testsOrdered.map((t: any) => t.name).join(", ")}</div>}
          {visit.doctor?.name && (
            <div className="pt-2 border-t border-dashed border-border font-serif italic text-accentDark">
              Signed — Dr. {visit.doctor.name}{visit.signedAt ? `, ${new Date(visit.signedAt).toLocaleString()}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
