"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { Search, User, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Clock, Pencil, Save, X } from "lucide-react";
import { AllergyBanner } from "@/components/shared";

export default function RecordsPage() {
  const { data: session } = useSession();
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const canEdit = ["RECEPTION", "ADMIN", "SUPER_ADMIN"].includes((session?.user as any)?.role || "");

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(query)}`).then((r) => r.json()).then(setPatients);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); setEditing(null); return; }
    setExpanded(id);
    const res = await fetch(`/api/patients/${id}`);
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
                  {canEdit && <div className="mb-3 flex justify-end"><button onClick={() => setEditing(editing === p.id ? null : p.id)} className="inline-flex items-center gap-1.5 rounded-lg border border-border px-3 py-1.5 text-xs font-bold text-accentDark">{editing === p.id ? <><X size={13} /> Cancel editing</> : <><Pencil size={13} /> Edit patient</>}</button></div>}
                  {editing === p.id ? <PatientEditForm patient={detail} onCancel={() => setEditing(null)} onSaved={(updated) => { setDetail((current: any) => ({ ...current, ...updated })); setPatients((current) => current.map((item) => item.id === updated.id ? { ...item, ...updated } : item)); setEditing(null); }} /> : <>
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><b>Phone:</b> {detail.phone || "—"}</div>
                    <div><b>Date of birth:</b> {detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString() : "—"}</div>
                    <div><b>Blood group:</b> {detail.bloodGroup || "—"}</div>
                    <div><b>Address:</b> {detail.address || "—"}</div>
                    <div><b>Emergency contact:</b> {detail.emergencyContact || "—"}</div>
                  </div>
                  <AllergyBanner allergies={detail.allergies.map((a: any) => a.name)} />
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
