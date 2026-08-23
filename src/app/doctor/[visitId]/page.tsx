"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, X, Pill, FlaskConical, CheckCircle2, ArrowLeft, Printer } from "lucide-react";
import { F, AllergyBanner } from "@/components/shared";

type SafetyWarning = { index: number; code: "ALLERGY" | "DUPLICATE_THERAPY" | "INTERACTION"; severity: string; message: string };
type Rx = { medicine: string; dosage: string; frequency: string; duration: string; allergyWarningAcknowledged?: boolean; interactionOverrideReason?: string; safetyWarnings?: SafetyWarning[] };

export default function ConsultPage({ params }: { params: { visitId: string } }) {
  const router = useRouter();
  const { data: session } = useSession();
  const [visit, setVisit] = useState<any>(null);
  const [notes, setNotes] = useState("");
  const [diagnosis, setDiagnosis] = useState("");
  const [advice, setAdvice] = useState("");
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
      setAdvice(v.advice || "");
      setRx(v.prescriptions?.length ? v.prescriptions : []);
      setTests((v.testsOrdered || []).map((t: any) => t.name));
      fetch(`/api/patients/${v.patientId}`).then((r) => r.json()).then((p) => {
        setPastVisits((p.visits || []).filter((pv: any) => pv.id !== v.id && pv.status === "COMPLETED"));
      });
    });
  }, [params.visitId]);

  if (!visit) return <div className="text-inkSoft">Loading chart…</div>;

  const addRx = () => setRx([...rx, { medicine: "", dosage: "", frequency: "", duration: "" }]);
  const updateRx = (i: number, field: keyof Rx, val: any) => setRx(rx.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const removeRx = (i: number) => setRx(rx.filter((_, idx) => idx !== i));
  const addTest = () => { if (testDraft.trim()) { setTests([...tests, testDraft.trim()]); setTestDraft(""); } };

  const save = async (complete: boolean) => {
    if (complete && !signConfirmed) { setError("Please confirm the digital signature before completing the visit."); return; }
    const finalTests = testDraft.trim() ? [...tests, testDraft.trim()] : tests;
    const res = await fetch(`/api/visits/${params.visitId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, doctorNotes: notes, advice, prescriptions: rx, testsOrdered: finalTests, complete }),
    });
    if (res.ok) {
      const saved = await res.json();
      if (complete) {
        router.replace("/doctor");
        router.refresh();
        return;
      }
      setVisit((current: any) => ({ ...current, ...saved, patient: current.patient }));
      setRx(saved.prescriptions || rx);
      setTests((saved.testsOrdered || []).map((test: any) => test.name));
      setTestDraft("");
      setError("");
    } else {
      const data = await res.json().catch(() => ({}));
      if (data.code === "MEDICATION_SAFETY_WARNING" && Array.isArray(data.warnings)) setRx((current) => current.map((item, index) => ({ ...item, safetyWarnings: data.warnings.filter((warning: SafetyWarning) => warning.index === index) })));
      setError(data.error || "Could not save the visit. Please try again.");
    }
  };

  const completed = visit.status === "COMPLETED";
  const printReport = () => { setError(""); window.print(); };

  return (
    <div>
      <div className="consult-screen">
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-serif text-xl font-semibold">{visit.patient.name}</div>
          <div className="text-xs text-inkSoft">
            {visit.patient.age} yrs · {visit.patient.gender} · {visit.patient.bloodGroup || "blood group n/a"} · {visit.patient.phone || "—"}
            {visit.patient.dateOfBirth ? ` · DOB ${new Date(visit.patient.dateOfBirth).toLocaleDateString()}` : ""}
          </div>
        </div>
        <div className="flex gap-2">
          <button onClick={printReport} className="flex items-center gap-1 text-sm text-white bg-accent rounded-lg px-3 py-1.5"><Printer size={14} /> Print report</button>
          <button onClick={() => router.push("/doctor")} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><ArrowLeft size={14} /> Back to queue</button>
        </div>
      </div>

      {completed && <div className="bg-accentSoft text-accentDark border border-border rounded-lg px-4 py-3 text-sm font-semibold mb-4">Consultation completed and signed.</div>}

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
        <F label="Advice to patient"><textarea value={advice} onChange={(e) => setAdvice(e.target.value)} className="input min-h-[70px]" placeholder="e.g. Rest, stay hydrated, and return if symptoms worsen." /></F>

        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-inkSoft uppercase mb-2"><Pill size={14} /> Prescription</div>
          <div className="flex flex-col gap-2">
            {rx.map((r, i) => (
              <div key={i} className="rounded-lg border border-transparent has-[.safety-warning]:border-alert has-[.safety-warning]:bg-alertSoft p-1">
              <div className="grid grid-cols-[2fr_1fr_1fr_1fr_auto] gap-2 items-center">
                <input placeholder="Medicine name" value={r.medicine} onChange={(e) => updateRx(i, "medicine", e.target.value)} className="input" />
                <input placeholder="Dosage" value={r.dosage} onChange={(e) => updateRx(i, "dosage", e.target.value)} className="input" />
                <input placeholder="Frequency" value={r.frequency} onChange={(e) => updateRx(i, "frequency", e.target.value)} className="input" />
                <input placeholder="Duration" value={r.duration} onChange={(e) => updateRx(i, "duration", e.target.value)} className="input" />
                <X size={16} className="cursor-pointer text-inkSoft" onClick={() => removeRx(i)} />
              </div>
              {r.safetyWarnings?.map((warning, warningIndex) => <div key={warningIndex} className="safety-warning mt-2 rounded-lg bg-white p-2 text-xs text-alert"><div className="font-bold">{warning.severity} · {warning.code.replaceAll("_", " ")}</div><div>{warning.message}</div>{warning.code === "ALLERGY" ? <label className="mt-2 flex items-center gap-2 font-semibold"><input type="checkbox" checked={!!r.allergyWarningAcknowledged} onChange={(e) => updateRx(i, "allergyWarningAcknowledged", e.target.checked)} /> I reviewed and acknowledge this allergy warning</label> : <textarea value={r.interactionOverrideReason || ""} onChange={(e) => updateRx(i, "interactionOverrideReason", e.target.value)} placeholder="Clinical justification to override (minimum 10 characters)" className="mt-2 min-h-14 w-full rounded-md border border-alert px-2 py-1.5 text-xs text-ink" />}</div>)}
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
              onBlur={addTest}
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

        <DiagnosticOrderPanel visitId={visit.id} disabled={completed} />

        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-inkSoft uppercase mb-2">
            Imaging order (sends HL7 to modality worklist)
          </div>
          <ImagingOrderPanel visitId={visit.id} />
        </div>

        <div className="border-t border-border pt-4">
          <div className="text-xs font-bold text-inkSoft uppercase mb-2">Doctor&apos;s signature</div>
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
      </div>
      <PatientReport visit={visit} notes={notes} diagnosis={diagnosis} advice={advice} prescriptions={rx} tests={tests} doctorName={visit.doctor?.name || session?.user?.name || ""} signed={completed} />
      <style jsx global>{`.input { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; width: 100%; } .patient-report { display: none; } @media print { .consult-screen { display: none !important; } .patient-report { display: block !important; color: #17202A; font-family: Arial, sans-serif; } }`}</style>
    </div>
  );
}

type DiagnosticOrderSummary = { id: string; orderNumber: string; type: string; procedureName: string; priority: string; status: string; scheduledAt?: string };

function DiagnosticOrderPanel({ visitId, disabled }: { visitId: string; disabled: boolean }) {
  const [orders, setOrders] = useState<DiagnosticOrderSummary[]>([]);
  const [form, setForm] = useState({ type: "LABORATORY", priority: "ROUTINE", procedureCode: "", procedureName: "", clinicalIndication: "", scheduledAt: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/diagnostic-orders?visitId=${visitId}&pageSize=100`);
    const data = await response.json();
    if (response.ok) setOrders(data.orders); else setError(data.error || "Could not load diagnostic orders.");
  }, [visitId]);
  useEffect(() => { void load(); }, [load]);
  const submit = async (event: React.FormEvent) => {
    event.preventDefault(); setSaving(true); setError("");
    const response = await fetch("/api/diagnostic-orders", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...form, visitId, scheduledAt: form.scheduledAt ? new Date(form.scheduledAt).toISOString() : null }) });
    const data = await response.json(); setSaving(false);
    if (!response.ok) return setError(data.error || "Could not create the diagnostic order.");
    setForm((current) => ({ ...current, procedureCode: "", procedureName: "", clinicalIndication: "", scheduledAt: "" }));
    await load();
  };
  return <div className="rounded-lg border border-border bg-card p-4">
    <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase text-inkSoft"><FlaskConical size={14} /> Operational diagnostic orders</div>
    {!disabled && <form onSubmit={submit} className="grid gap-2 md:grid-cols-2">
      <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="input"><option value="LABORATORY">Laboratory</option><option value="IMAGING">Imaging</option></select>
      <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="input"><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="STAT">STAT</option></select>
      <input placeholder="Procedure name" required value={form.procedureName} onChange={(event) => setForm({ ...form, procedureName: event.target.value })} className="input" />
      <input placeholder="Procedure/code (optional)" value={form.procedureCode} onChange={(event) => setForm({ ...form, procedureCode: event.target.value })} className="input" />
      <textarea placeholder="Clinical indication" value={form.clinicalIndication} onChange={(event) => setForm({ ...form, clinicalIndication: event.target.value })} className="input min-h-[70px]" />
      <label className="text-xs text-inkSoft">Schedule (optional)<input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} className="input mt-1" /></label>
      <button disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">{saving ? "Creating…" : "Create diagnostic order"}</button>
    </form>}
    {disabled && <p className="text-xs text-inkSoft">This encounter is finalized. New orders require an encounter amendment.</p>}
    {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    <div className="mt-3 space-y-2">{orders.map((order) => <div key={order.id} className="rounded border border-border bg-[#FAF8F2] p-2 text-xs"><b>{order.procedureName}</b> · {order.type} · {order.priority}<p className="text-inkSoft">{order.orderNumber} · {order.status}{order.scheduledAt ? ` · ${new Date(order.scheduledAt).toLocaleString()}` : ""}</p></div>)}</div>
  </div>;
}

function PatientReport({ visit, notes, diagnosis, advice, prescriptions, tests, doctorName, signed }: { visit: any; notes: string; diagnosis: string; advice: string; prescriptions: Rx[]; tests: string[]; doctorName: string; signed: boolean }) {
  const prescribed = prescriptions.filter((item) => item.medicine?.trim());
  return <article className="patient-report">
    <header className="border-b-2 border-[#2E6B5A] pb-4 mb-5"><h1 className="text-2xl font-bold">CareChart</h1><p className="text-sm">Consultation Report</p></header>
    <section className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-5"><p><b>Patient:</b> {visit.patient.name}</p><p><b>Report date:</b> {new Date(visit.signedAt || visit.createdAt).toLocaleDateString()}</p><p><b>Age / Gender:</b> {visit.patient.age} years / {visit.patient.gender}</p><p><b>MRN:</b> {visit.patient.mrn}</p><p><b>Phone:</b> {visit.patient.phone || "—"}</p><p><b>Doctor:</b> Dr. {doctorName}</p></section>
    <ReportSection title="Chief complaint">{visit.chiefComplaint || "—"}</ReportSection>
    <ReportSection title="Vitals">BP: {visit.bp || "—"} · Temperature: {visit.temperature || "—"}°F · Pulse: {visit.pulse || "—"} · Weight: {visit.weight || "—"} kg</ReportSection>
    <ReportSection title="Examination findings"><span className="whitespace-pre-wrap">{notes || "—"}</span></ReportSection>
    <ReportSection title="Diagnosis">{diagnosis || "—"}</ReportSection>
    <ReportSection title="Advice"><span className="whitespace-pre-wrap">{advice || "—"}</span></ReportSection>
    <ReportSection title="Prescription">{prescribed.length ? <table className="w-full border-collapse"><thead><tr className="border-b"><th className="text-left py-1">Medicine</th><th className="text-left py-1">Dosage</th><th className="text-left py-1">Frequency</th><th className="text-left py-1">Duration</th></tr></thead><tbody>{prescribed.map((item, index) => <tr key={index} className="border-b"><td className="py-1">{item.medicine}</td><td>{item.dosage || "—"}</td><td>{item.frequency || "—"}</td><td>{item.duration || "—"}</td></tr>)}</tbody></table> : "—"}</ReportSection>
    {tests.length > 0 && <ReportSection title="Tests ordered"><ul className="list-disc pl-5">{tests.map((test, index) => <li key={index}>{test}</li>)}</ul></ReportSection>}
    <footer className="mt-12 pt-4 border-t text-sm"><p>{signed ? `Digitally signed by Dr. ${doctorName}` : `Prepared by Dr. ${doctorName}`}</p><p className="text-xs mt-1">This is a computer-generated consultation report.</p></footer>
  </article>;
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-4 text-sm"><h2 className="font-bold uppercase text-xs mb-1">{title}</h2><div>{children}</div></section>; }

function ImagingOrderPanel({ visitId }: { visitId: string }) {
  const [modality, setModality] = useState("XRAY");
  const [procedureDescription, setProcedureDescription] = useState("");
  const [bodyPart, setBodyPart] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersError, setOrdersError] = useState("");

  useEffect(() => {
    let cancelled = false;

    fetch(`/api/visits/${visitId}/imaging-orders`)
      .then(async (res) => {
        if (!res.ok) throw new Error("Could not load imaging orders.");
        return res.json();
      })
      .then((savedOrders) => {
        if (!cancelled) setOrders(savedOrders);
      })
      .catch(() => {
        if (!cancelled) setOrdersError("Could not load saved imaging orders.");
      });

    return () => { cancelled = true; };
  }, [visitId]);

  const send = async () => {
    setSending(true);
    setResult(null);
    const res = await fetch(`/api/visits/${visitId}/imaging-orders`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ modality, procedureDescription, bodyPart }),
    });
    const data = await res.json();
    setSending(false);
    setResult(data);
    if (data.order) setOrders((current) => [data.order, ...current.filter((order) => order.id !== data.order.id)]);
  };

  return (
    <div className="bg-card border border-border rounded-lg p-4">
      <div className="grid grid-cols-3 gap-3 mb-3">
        <select value={modality} onChange={(e) => setModality(e.target.value)} className="imgInput">
          <option value="XRAY">X-Ray</option>
          <option value="CT">CT</option>
          <option value="MRI">MRI</option>
          <option value="ULTRASOUND">Ultrasound</option>
        </select>
        <input placeholder="Procedure (e.g. Cervical Spine 2 Views)" value={procedureDescription} onChange={(e) => setProcedureDescription(e.target.value)} className="imgInput" />
        <input placeholder="Body part (optional)" value={bodyPart} onChange={(e) => setBodyPart(e.target.value)} className="imgInput" />
      </div>
      <button onClick={send} disabled={sending || !procedureDescription} className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg">
        {sending ? "Sending…" : "Send order to modality worklist"}
      </button>

      {result?.order && (
        <div className="mt-3 text-sm">
          <div>
            Accession <b>{result.order.accessionNumber}</b> — status:{" "}
            <span className={result.order.status === "ACK_OK" ? "text-accentDark font-semibold" : "text-alert font-semibold"}>
              {result.order.status}
            </span>
          </div>
          {result.warning && <div className="text-waiting text-xs mt-1">{result.warning}</div>}
          {result.error && <div className="text-alert text-xs mt-1">{result.error}</div>}
          <details className="mt-2">
            <summary className="cursor-pointer text-xs text-inkSoft">View raw HL7</summary>
            <pre className="text-xs bg-[#FAF8F2] p-2 rounded mt-1 whitespace-pre-wrap break-all overflow-x-auto">{result.order.hl7Sent}</pre>
            {result.order.hl7AckReceived && (
              <>
                <div className="text-xs text-inkSoft mt-2">ACK received:</div>
                <pre className="text-xs bg-[#FAF8F2] p-2 rounded mt-1 whitespace-pre-wrap break-all overflow-x-auto">{result.order.hl7AckReceived}</pre>
              </>
            )}
          </details>
        </div>
      )}
      {ordersError && <div className="text-alert text-xs mt-3">{ordersError}</div>}
      {orders.length > 0 && (
        <details className="mt-3" open={Boolean(result?.order)}>
          <summary className="cursor-pointer text-xs font-semibold text-accentDark">
            View saved imaging order{orders.length > 1 ? "s" : ""} ({orders.length})
          </summary>
          <div className="flex flex-col gap-2 mt-2">
            {orders.map((order) => (
              <div key={order.id} className="text-xs bg-[#FAF8F2] border border-border rounded p-2">
                <div>
                  <b>{order.modality}</b> — {order.procedureDescription}{order.bodyPart ? ` (${order.bodyPart})` : ""}
                </div>
                <div className="text-inkSoft mt-1">
                  Accession {order.accessionNumber} · Status {order.status}
                  {order.sentAt ? ` · Sent ${new Date(order.sentAt).toLocaleString()}` : ""}
                </div>
                {order.hl7Sent && (
                  <details className="mt-2">
                    <summary className="cursor-pointer text-inkSoft">View raw HL7</summary>
                    <pre className="bg-white p-2 rounded mt-1 whitespace-pre-wrap break-all overflow-x-auto">{order.hl7Sent}</pre>
                    {order.hl7AckReceived && (
                      <>
                        <div className="text-inkSoft mt-2">ACK received:</div>
                        <pre className="bg-white p-2 rounded mt-1 whitespace-pre-wrap break-all overflow-x-auto">{order.hl7AckReceived}</pre>
                      </>
                    )}
                    {order.errorMessage && <div className="text-alert mt-2">{order.errorMessage}</div>}
                  </details>
                )}
              </div>
            ))}
          </div>
        </details>
      )}
      <style jsx>{`.imgInput { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; width: 100%; }`}</style>
    </div>
  );
}
