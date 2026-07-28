"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, X, Pill, FlaskConical, CheckCircle2, ArrowLeft } from "lucide-react";
import { F, AllergyBanner } from "@/components/shared";

type Rx = { medicine: string; dosage: string; frequency: string; duration: string };

export default function ConsultPage({ params }: { params: { visitId: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [visit, setVisit] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [rx, setRx] = useState<Rx[]>([]);
  const [tests, setTests] = useState<string[]>([]);
  const [testDraft, setTestDraft] = useState("");
  const [signConfirmed, setSignConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [pastVisits, setPastVisits] = useState<any[]>([]);

  useEffect(() => {
    fetch(`/api/visits/${params.visitId}`).then((r) => r.json()).then((v) => {
      setVisit(v);
      setNotes(v.doctorNotes || "");
      setDiagnosis(v.diagnosis || "");
      setRx(v.prescriptions?.length ? v.prescriptions : []);
      setTests((v.testsOrdered || []).map((t: any) => t.name));
      fetch(`/api/patients/${v.patientId}`).then((r) => r.json()).then((p) => {
        setPastVisits((p.visits || []).filter((pv: any) => pv.id !== v.id && pv.status === "COMPLETED"));
      });
    });
  }, [params.visitId]);

  if (!visit) return <div className="text-inkSoft">Loading chart…</div>;

  const addRx = () => setRx([...rx, { medicine: "", dosage: "", frequency: "", duration: "" }]);
  const updateRx = (i: number, field: keyof Rx, val: string) => setRx(rx.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const removeRx = (i: number) => setRx(rx.filter((_, idx) => idx !== i));
  const addTest = () => { if (testDraft.trim()) { setTests([...tests, testDraft.trim()]); setTestDraft(""); } };

  const save = async (complete: boolean) => {
    if (complete && !signConfirmed) { setError("Please confirm the digital signature before completing the visit."); return; }
    const res = await fetch(`/api/visits/${params.visitId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, doctorNotes: notes, prescriptions: rx, testsOrdered: tests, complete }),
    });
    if (res.ok) router.push("/doctor");
    else setError("Could not save the visit. Please try again.");
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-serif text-xl font-semibold">{visit.patient.name}</div>
          <div className="text-xs text-inkSoft">{visit.patient.age} yrs · {visit.patient.gender} · {visit.patient.bloodGroup || "blood group n/a"} · {visit.patient.phone || "—"}</div>
        </div>
        <button onClick={() => router.push("/doctor")} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><ArrowLeft size={14} /> Back to queue</button>
      </div>

      <AllergyBanner allergies={visit.patient.allergies.map((a: any) => a.name)} />

      <div className="grid grid-cols-2 gap-3 mt-4 bg-card border border-border rounded-lg p-3.5 text-sm">
        <div><b>Chief complaint:</b> {visit.chiefComplaint || "—"}</div>
        <div><b>Vitals:</b> BP {visit.bp || "—"}, Temp {visit.temperature || "—"}°F, Pulse {visit.pulse || "—"}, Wt {visit.weight || "—"}kg</div>
      </div>

      {pastVisits.length > 0 && (
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-semibold text-accentDark">View {pastVisits.length} previous visit{pastVisits.length > 1 ? "s" : ""}</summary>
          <div className="flex flex-col gap-2 mt-2">
            {pastVisits.map((v: any) => (
              <div key={v.id} className="text-xs bg-[#FAF8F2] border border-border rounded-lg p-2.5">
                <div className="text-inkSoft mb-1">{new Date(v.createdAt).toLocaleString()} · Dr. {v.doctor?.name}</div>
                <div><b>Diagnosis:</b> {v.diagnosis || "—"}</div>
              </div>
            ))}
          </div>
        </details>
      )}

      <div className="flex flex-col gap-4 mt-5">
        <F label="Examination notes / doctor's feedback">
          <textarea value={notes} onChange={(e) => setNotes(e.target.value)} className="input min-h-[70px]" placeholder="Findings on examination…" />
        </F>
        <F label="Diagnosis"><input value={diagnosis} onChange={(e) => setDiagnosis(e.target.value)} className="input" /></F>

        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-inkSoft uppercase mb-2"><Pill size={14} /> Prescription</div>
          <div className="flex flex-col gap-2">
            {rx.map((r, i) => (
              <div key={i} className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <input placeholder="Medicine name" value={r.medicine} onChange={(e) => updateRx(i, "medicine", e.target.value)} className="input" />
                <input placeholder="Dosage" value={r.dosage} onChange={(e) => updateRx(i, "dosage", e.target.value)} className="input" />
                <input placeholder="Frequency" value={r.frequency} onChange={(e) => updateRx(i, "frequency", e.target.value)} className="input" />
                <input placeholder="Duration" value={r.duration} onChange={(e) => updateRx(i, "duration", e.target.value)} className="input" />
                <X size={16} className="cursor-pointer text-inkSoft" onClick={() => removeRx(i)} />
              </div>
            ))}
          </div>
          <button type="button" onClick={addRx} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5 mt-2"><Plus size={14} /> Add medicine</button>
        </div>

        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-inkSoft uppercase mb-2"><FlaskConical size={14} /> Tests ordered</div>
          <div className="flex gap-2">
            <input value={testDraft} onChange={(e) => setTestDraft(e.target.value)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTest(); } }}
              placeholder="e.g. Complete Blood Count" className="input flex-1" />
            <button type="button" onClick={addTest} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><Plus size={14} /> Add</button>
          </div>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tests.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-accentSoft text-accentDark px-2.5 py-1 rounded-full text-xs font-semibold">
                {t} <X size={12} className="cursor-pointer" onClick={() => setTests(tests.filter((_, idx) => idx !== i))} />
              </span>
            ))}
          </div>
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-xs font-bold text-inkSoft uppercase mb-2">Doctor's signature</div>
          <div className="text-sm mb-2">Signing as <b>{session?.user?.name}</b></div>
          <label className="flex items-center gap-2 text-sm cursor-pointer">
            <input type="checkbox" checked={signConfirmed} onChange={(e) => setSignConfirmed(e.target.checked)} />
            I confirm this consultation record is accurate and digitally sign it.
          </label>
          {error && <div className="text-alert text-sm mt-2">{error}</div>}
          <div className="flex gap-2.5 mt-4 justify-end">
            <button onClick={() => save(false)} className="text-sm text-accentDark border border-border rounded-lg px-4 py-2.5 font-semibold">Save draft</button>
            <button onClick={() => save(true)} className="flex items-center gap-2 bg-accent text-white rounded-lg px-4 py-2.5 font-semibold text-sm"><CheckCircle2 size={15} /> Complete &amp; sign visit</button>
          </div>
        </div>
      </div>
      <style jsx>{`.input { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; width: 100%; }`}</style>
    </div>
  );
}
