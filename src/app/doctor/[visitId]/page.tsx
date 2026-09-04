"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useSession } from "next-auth/react";
import { Plus, X, Pill, FlaskConical, CheckCircle2, ArrowLeft, Printer, ScanLine } from "lucide-react";
import { F, AllergyBanner } from "@/components/shared";

type SafetyWarning = { index: number; code: "ALLERGY" | "DUPLICATE_THERAPY" | "INTERACTION"; severity: string; message: string };
type Rx = { medicine: string; dosage: string; frequency: string; duration: string; allergyWarningAcknowledged?: boolean; interactionOverrideReason?: string; safetyWarnings?: SafetyWarning[] };
type LabTestOption = { code: string; name: string; category: string; aliases: string[] };
type ImagingRecommendation = { code: string; name: string; modality: string; bodyPart?: string; description: string };
type ImagingCatalogOption = ImagingRecommendation & { aliases: string[] };

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
  const [labTests, setLabTests] = useState<LabTestOption[]>([]);
  const [labTestTotal, setLabTestTotal] = useState(0);
  const [showTestSuggestions, setShowTestSuggestions] = useState(false);
  const [imagingRecommendations, setImagingRecommendations] = useState<ImagingRecommendation[]>([]);
  const [imagingDraft, setImagingDraft] = useState("");
  const [imagingCatalog, setImagingCatalog] = useState<ImagingCatalogOption[]>([]);
  const [imagingCatalogTotal, setImagingCatalogTotal] = useState(0);
  const [showImagingSuggestions, setShowImagingSuggestions] = useState(false);
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
      setImagingRecommendations(v.imagingRecommendations || []);
      fetch(`/api/patients/${v.patientId}`).then((r) => r.json()).then((p) => {
        setPastVisits((p.visits || []).filter((pv: any) => pv.id !== v.id && pv.status === "COMPLETED"));
      });
    });
  }, [params.visitId]);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/lab-tests").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load laboratory tests.");
      return data;
    }).then((data) => {
      if (!cancelled) { setLabTests(data.tests || []); setLabTestTotal(data.total || 0); }
    }).catch(() => { /* Free-text entry remains available if the catalog cannot load. */ });
    return () => { cancelled = true; };
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/imaging-catalog").then(async (response) => {
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not load imaging procedures.");
      return data;
    }).then((data) => {
      if (!cancelled) { setImagingCatalog(data.procedures || []); setImagingCatalogTotal(data.total || 0); }
    }).catch(() => { /* Free-text entry remains available if the catalog cannot load. */ });
    return () => { cancelled = true; };
  }, []);

  if (!visit) return <div className="text-inkSoft">Loading chart…</div>;

  const addRx = () => setRx([...rx, { medicine: "", dosage: "", frequency: "", duration: "" }]);
  const updateRx = (i: number, field: keyof Rx, val: any) => setRx(rx.map((r, idx) => (idx === i ? { ...r, [field]: val } : r)));
  const removeRx = (i: number) => setRx(rx.filter((_, idx) => idx !== i));
  const addTest = (name = testDraft) => {
    const cleanName = name.trim();
    if (!cleanName) return;
    if (!tests.some((test) => test.toLocaleLowerCase() === cleanName.toLocaleLowerCase())) setTests([...tests, cleanName]);
    setTestDraft("");
    setShowTestSuggestions(false);
  };

  const testSuggestions = (() => {
    const terms = testDraft.toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return labTests.filter((test) => {
      if (tests.some((selected) => selected.toLocaleLowerCase() === test.name.toLocaleLowerCase())) return false;
      if (!terms.length) return true;
      const haystack = `${test.name} ${test.category} ${test.aliases.join(" ")}`.toLocaleLowerCase();
      return terms.every((term) => haystack.includes(term));
    }).slice(0, 12);
  })();

  const addImaging = (procedure?: ImagingCatalogOption) => {
    const enteredName = imagingDraft.trim();
    const item: ImagingRecommendation | null = procedure ? {
      code: procedure.code, name: procedure.name, modality: procedure.modality,
      bodyPart: procedure.bodyPart, description: procedure.description,
    } : enteredName ? { code: "", name: enteredName, modality: "Other", description: `${enteredName} — clinician-entered imaging request.` } : null;
    if (!item) return;
    if (!imagingRecommendations.some((existing) => existing.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())) setImagingRecommendations([...imagingRecommendations, item]);
    setImagingDraft(""); setShowImagingSuggestions(false);
  };

  const normalizeImagingSearch = (value: string) => value.toLocaleLowerCase().replace(/x[\s-]?ray/g, "xray").replace(/[^a-z0-9]+/g, " ").trim();
  const imagingSuggestions = (() => {
    const ignored = new Set(["a", "an", "the", "of", "for", "to"]);
    const terms = normalizeImagingSearch(imagingDraft).split(/\s+/).filter((term) => term && !ignored.has(term));
    return imagingCatalog.filter((item) => {
      if (imagingRecommendations.some((selected) => selected.name.toLocaleLowerCase() === item.name.toLocaleLowerCase())) return false;
      if (!terms.length) return true;
      const haystack = normalizeImagingSearch(`${item.name} ${item.modality} ${item.bodyPart || ""} ${item.description} ${item.aliases.join(" ")}`);
      return terms.every((term) => haystack.includes(term));
    }).slice(0, 12);
  })();

  const save = async (complete: boolean) => {
    if (complete && !signConfirmed) { setError("Please confirm the digital signature before completing the visit."); return; }
    const finalTests = testDraft.trim() ? [...tests, testDraft.trim()] : tests;
    const finalImaging = imagingDraft.trim() ? [...imagingRecommendations, { code: "", name: imagingDraft.trim(), modality: "Other", description: `${imagingDraft.trim()} — clinician-entered imaging request.` }] : imagingRecommendations;
    const res = await fetch(`/api/visits/${params.visitId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, doctorNotes: notes, advice, prescriptions: rx, testsOrdered: finalTests, imagingRecommendations: finalImaging, complete }),
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
      setImagingRecommendations(saved.imagingRecommendations || imagingRecommendations);
      setTestDraft("");
      setImagingDraft("");
      setError("");
    } else {
      const data = await res.json().catch(() => ({}));
      if (data.code === "MEDICATION_SAFETY_WARNING" && Array.isArray(data.warnings)) setRx((current) => current.map((item, index) => ({ ...item, safetyWarnings: data.warnings.filter((warning: SafetyWarning) => warning.index === index) })));
      setError(data.error || "Could not save the visit. Please try again.");
    }
  };

  const completed = visit.status === "COMPLETED";
  const imagingDisabled = !["DRAFT", "WAITING", "IN_PROGRESS"].includes(visit.status);
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
        <div><b>Vitals:</b> BP {visit.bp || "—"}, Temp {visit.temperature || "—"}°C, Pulse {visit.pulse || "—"}, Wt {visit.weight || "—"}kg</div>
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
          <div className="flex items-start gap-2">
            <div className="relative flex-1">
            <input value={testDraft} onChange={(e) => { setTestDraft(e.target.value); setShowTestSuggestions(true); }}
              onFocus={() => setShowTestSuggestions(true)}
              onBlur={() => window.setTimeout(() => setShowTestSuggestions(false), 150)}
              onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addTest(); } }}
              placeholder="Search CBC, thyroid, culture, vitamin, genetic test…" className="input" role="combobox" aria-expanded={showTestSuggestions} aria-controls="lab-test-suggestions" autoComplete="off" />
            {showTestSuggestions && labTests.length > 0 && <div id="lab-test-suggestions" className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-xl" role="listbox">
              {testSuggestions.length > 0 ? testSuggestions.map((test) => <button key={test.code} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => addTest(test.name)} className="block w-full border-b border-border px-3 py-2 text-left last:border-0 hover:bg-accentSoft">
                <span className="block text-sm font-semibold text-ink">{test.name}</span>
                <span className="block text-[11px] text-inkSoft">{test.category}{test.aliases.length ? ` · ${test.aliases.slice(0, 3).join(", ")}` : ""}</span>
              </button>) : <div className="px-3 py-3 text-sm text-inkSoft">No catalog match. Press Enter or Add to use the typed test name.</div>}
            </div>}
            </div>
            <button type="button" onClick={() => addTest()} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><Plus size={14} /> Add</button>
          </div>
          <p className="mt-1.5 text-xs text-inkSoft">{labTestTotal ? `${labTestTotal} laboratory tests available. ` : ""}Search by test name, profile, category, or abbreviation. Free-text tests are also accepted.</p>
          <div className="flex flex-wrap gap-1.5 mt-2">
            {tests.map((t, i) => (
              <span key={i} className="inline-flex items-center gap-1.5 bg-accentSoft text-accentDark px-2.5 py-1 rounded-full text-xs font-semibold">
                {t} <X size={12} className="cursor-pointer" onClick={() => setTests(tests.filter((_, idx) => idx !== i))} />
              </span>
            ))}
          </div>
        </div>

        <div>
          <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-inkSoft"><ScanLine size={14} /> Imaging ordered</div>
          <div className="flex items-start gap-2">
            <div className="relative flex-1">
              <input value={imagingDraft} onChange={(event) => { setImagingDraft(event.target.value); setShowImagingSuggestions(true); }}
                onFocus={() => setShowImagingSuggestions(true)} onBlur={() => window.setTimeout(() => setShowImagingSuggestions(false), 150)}
                onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); addImaging(); } }}
                placeholder="Search chest X-ray 2V, MRI brain, CT KUB, ultrasound…" className="input" role="combobox"
                aria-expanded={showImagingSuggestions} aria-controls="imaging-procedure-suggestions" autoComplete="off" />
              {showImagingSuggestions && imagingCatalog.length > 0 && <div id="imaging-procedure-suggestions" className="absolute z-30 mt-1 max-h-96 w-full overflow-y-auto rounded-lg border border-border bg-white shadow-xl" role="listbox">
                {imagingSuggestions.length > 0 ? imagingSuggestions.map((procedure) => <button key={procedure.code} type="button" role="option" aria-selected="false" onMouseDown={(event) => event.preventDefault()} onClick={() => addImaging(procedure)} className="block w-full border-b border-border px-3 py-2 text-left last:border-0 hover:bg-accentSoft">
                  <span className="block text-sm font-semibold text-ink">{procedure.name}</span>
                  <span className="block text-[11px] font-semibold text-accentDark">{procedure.modality} · {procedure.bodyPart}</span>
                  <span className="mt-0.5 block text-[11px] text-inkSoft">{procedure.description}</span>
                </button>) : <div className="px-3 py-3 text-sm text-inkSoft">No catalog match. Press Enter or Add to use the typed imaging request.</div>}
              </div>}
            </div>
            <button type="button" onClick={() => addImaging()} className="flex items-center gap-1 rounded-lg border border-border px-3 py-1.5 text-sm text-accentDark"><Plus size={14} /> Add</button>
          </div>
          <p className="mt-1.5 text-xs text-inkSoft">{imagingCatalogTotal ? `${imagingCatalogTotal} imaging procedures across 12 modalities available. ` : ""}This records the doctor&apos;s recommendation and does not send an HL7 order.</p>
          <div className="mt-2 grid gap-2 sm:grid-cols-2">
            {imagingRecommendations.map((item, index) => <div key={`${item.code}-${index}`} className="flex items-start justify-between gap-3 rounded-lg border border-[#CFDBE7] bg-[#F3F7FA] px-3 py-2 text-xs">
              <div><p className="font-semibold text-[#36546F]">{item.name}</p><p className="mt-0.5 font-semibold text-accentDark">{item.modality}{item.bodyPart ? ` · ${item.bodyPart}` : ""}</p><p className="mt-1 text-inkSoft">{item.description}</p></div>
              <button type="button" aria-label={`Remove ${item.name}`} onClick={() => setImagingRecommendations(imagingRecommendations.filter((_, itemIndex) => itemIndex !== index))} className="shrink-0 p-1 text-inkSoft hover:text-alert"><X size={14} /></button>
            </div>)}
          </div>
        </div>

        <DiagnosticOrderPanel visitId={visit.id} disabled={completed} />

        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-inkSoft uppercase mb-2">
            Imaging order (sends HL7 to modality worklist)
          </div>
          <ImagingOrderPanel visit={visit} disabled={imagingDisabled} />
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
      <PatientReport visit={visit} notes={notes} diagnosis={diagnosis} advice={advice} prescriptions={rx} tests={tests} imagingRecommendations={imagingRecommendations} doctorName={visit.doctor?.name || session?.user?.name || ""} signed={completed} />
      <style jsx global>{`.input { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; width: 100%; } .patient-report { display: none; } @media print { .consult-screen { display: none !important; } .patient-report { display: block !important; color: #17202A; font-family: Arial, sans-serif; } }`}</style>
    </div>
  );
}

type DiagnosticOrderSummary = { id: string; orderNumber: string; type: string; procedureName: string; priority: string; status: string; scheduledAt?: string };

function DiagnosticOrderPanel({ visitId, disabled }: { visitId: string; disabled: boolean }) {
  const [orders, setOrders] = useState<DiagnosticOrderSummary[]>([]);
  const [enabled, setEnabled] = useState<boolean | null>(null);
  const [form, setForm] = useState({ type: "LABORATORY", priority: "ROUTINE", procedureCode: "", procedureName: "", clinicalIndication: "", scheduledAt: "" });
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const load = useCallback(async () => {
    const response = await fetch(`/api/diagnostic-orders?visitId=${visitId}&pageSize=100`);
    const data = await response.json();
    if (response.ok) { setOrders(data.orders); setEnabled(data.operationalDiagnosticOrdersEnabled === true); } else setError(data.error || "Could not load diagnostic orders.");
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
    {enabled === null && !error && <p className="text-xs text-inkSoft">Checking hospital diagnostic capabilities…</p>}
    {enabled === false && <div className="rounded-lg bg-[#FAF8F2] px-3 py-2 text-sm text-inkSoft"><b>Not enabled for this hospital.</b> Record the requested investigation under Tests ordered above. A hospital administrator can enable operational orders in Settings.</div>}
    {enabled && !disabled && <form onSubmit={submit} className="grid gap-2 md:grid-cols-2">
      <select value={form.type} onChange={(event) => setForm({ ...form, type: event.target.value })} className="input"><option value="LABORATORY">Laboratory</option><option value="IMAGING">Imaging</option></select>
      <select value={form.priority} onChange={(event) => setForm({ ...form, priority: event.target.value })} className="input"><option value="ROUTINE">Routine</option><option value="URGENT">Urgent</option><option value="STAT">STAT</option></select>
      <input placeholder="Procedure name" required value={form.procedureName} onChange={(event) => setForm({ ...form, procedureName: event.target.value })} className="input" />
      <input placeholder="Procedure/code (optional)" value={form.procedureCode} onChange={(event) => setForm({ ...form, procedureCode: event.target.value })} className="input" />
      <textarea placeholder="Clinical indication" value={form.clinicalIndication} onChange={(event) => setForm({ ...form, clinicalIndication: event.target.value })} className="input min-h-[70px]" />
      <label className="text-xs text-inkSoft">Schedule (optional)<input type="datetime-local" value={form.scheduledAt} onChange={(event) => setForm({ ...form, scheduledAt: event.target.value })} className="input mt-1" /></label>
      <button disabled={saving} className="rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50 md:col-span-2">{saving ? "Creating…" : "Create diagnostic order"}</button>
    </form>}
    {enabled && disabled && <p className="text-xs text-inkSoft">This encounter is finalized. New orders require an encounter amendment.</p>}
    {error && <p className="mt-2 text-sm text-alert">{error}</p>}
    <div className="mt-3 space-y-2">{orders.map((order) => <div key={order.id} className="rounded border border-border bg-[#FAF8F2] p-2 text-xs"><b>{order.procedureName}</b> · {order.type} · {order.priority}<p className="text-inkSoft">{order.orderNumber} · {order.status}{order.scheduledAt ? ` · ${new Date(order.scheduledAt).toLocaleString()}` : ""}</p></div>)}</div>
  </div>;
}

function PatientReport({ visit, notes, diagnosis, advice, prescriptions, tests, imagingRecommendations, doctorName, signed }: { visit: any; notes: string; diagnosis: string; advice: string; prescriptions: Rx[]; tests: string[]; imagingRecommendations: ImagingRecommendation[]; doctorName: string; signed: boolean }) {
  const prescribed = prescriptions.filter((item) => item.medicine?.trim());
  return <article className="patient-report">
    <header className="border-b-2 border-[#2E6B5A] pb-4 mb-5"><h1 className="text-2xl font-bold">CareChart</h1><p className="text-sm">Consultation Report</p></header>
    <section className="grid grid-cols-2 gap-x-8 gap-y-1 text-sm mb-5"><p><b>Patient:</b> {visit.patient.name}</p><p><b>Report date:</b> {new Date(visit.signedAt || visit.createdAt).toLocaleDateString()}</p><p><b>Age / Gender:</b> {visit.patient.age} years / {visit.patient.gender}</p><p><b>MRN:</b> {visit.patient.mrn}</p><p><b>Phone:</b> {visit.patient.phone || "—"}</p><p><b>Doctor:</b> Dr. {doctorName}</p></section>
    <ReportSection title="Chief complaint">{visit.chiefComplaint || "—"}</ReportSection>
    <ReportSection title="Vitals">BP: {visit.bp || "—"} · Temperature: {visit.temperature || "—"}°C · Pulse: {visit.pulse || "—"} · Weight: {visit.weight || "—"} kg</ReportSection>
    <ReportSection title="Examination findings"><span className="whitespace-pre-wrap">{notes || "—"}</span></ReportSection>
    <ReportSection title="Diagnosis">{diagnosis || "—"}</ReportSection>
    <ReportSection title="Advice"><span className="whitespace-pre-wrap">{advice || "—"}</span></ReportSection>
    <ReportSection title="Prescription">{prescribed.length ? <table className="w-full border-collapse"><thead><tr className="border-b"><th className="text-left py-1">Medicine</th><th className="text-left py-1">Dosage</th><th className="text-left py-1">Frequency</th><th className="text-left py-1">Duration</th></tr></thead><tbody>{prescribed.map((item, index) => <tr key={index} className="border-b"><td className="py-1">{item.medicine}</td><td>{item.dosage || "—"}</td><td>{item.frequency || "—"}</td><td>{item.duration || "—"}</td></tr>)}</tbody></table> : "—"}</ReportSection>
    {tests.length > 0 && <ReportSection title="Tests ordered"><ul className="list-disc pl-5">{tests.map((test, index) => <li key={index}>{test}</li>)}</ul></ReportSection>}
    {imagingRecommendations.length > 0 && <ReportSection title="Imaging ordered"><ul className="list-disc pl-5">{imagingRecommendations.map((item, index) => <li key={index}><b>{item.name}</b> ({item.modality}{item.bodyPart ? ` · ${item.bodyPart}` : ""})</li>)}</ul></ReportSection>}
    <footer className="mt-12 pt-4 border-t text-sm"><p>{signed ? `Digitally signed by Dr. ${doctorName}` : `Prepared by Dr. ${doctorName}`}</p><p className="text-xs mt-1">This is a computer-generated consultation report.</p></footer>
  </article>;
}

function ReportSection({ title, children }: { title: string; children: React.ReactNode }) { return <section className="mb-4 text-sm"><h2 className="font-bold uppercase text-xs mb-1">{title}</h2><div>{children}</div></section>; }

type ImagingProcedure = { id: string; code: string; name: string };

function modalityForProcedure(code: string) {
  if (code.startsWith("CT")) return "CT";
  if (code.startsWith("MR")) return "MRI";
  if (code.startsWith("US")) return "ULTRASOUND";
  if (code.startsWith("NM")) return "NUCLEAR";
  return "XRAY";
}

function ImagingOrderPanel({ visit, disabled }: { visit: any; disabled: boolean }) {
  const [form, setForm] = useState({ modality: "XRAY", procedureCode: "", procedureDescription: "", bodyPart: "", clinicalIndication: "" });
  const [procedures, setProcedures] = useState<ImagingProcedure[]>([]);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersError, setOrdersError] = useState("");
  const [enabled, setEnabled] = useState<boolean | null>(null);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      fetch(`/api/visits/${visit.id}/imaging-orders`).then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }),
      fetch("/api/imaging-procedures").then(async (response) => { const data = await response.json(); if (!response.ok) throw new Error(data.error); return data; }),
    ]).then(([savedOrders, savedProcedures]) => {
      if (cancelled) return;
      setOrders(savedOrders.orders || []);
      setEnabled(savedOrders.operationalImagingOrdersEnabled === true);
      setProcedures(savedProcedures);
      const chestXray = savedProcedures.find((procedure: ImagingProcedure) => procedure.code === "XR-CHEST-2V") || savedProcedures[0];
      if (chestXray) setForm((current) => ({ ...current, modality: modalityForProcedure(chestXray.code), procedureCode: chestXray.code, procedureDescription: chestXray.name, bodyPart: chestXray.code === "XR-CHEST-2V" ? "Chest" : current.bodyPart }));
    }).catch((reason) => { if (!cancelled) setOrdersError(reason?.message || "Could not load imaging order details."); });
    return () => { cancelled = true; };
  }, [visit.id]);

  const chooseProcedure = (code: string) => {
    const procedure = procedures.find((item) => item.code === code);
    if (!procedure) return setForm({ ...form, procedureCode: "", procedureDescription: "" });
    setForm({ ...form, procedureCode: procedure.code, procedureDescription: procedure.name, modality: modalityForProcedure(procedure.code), bodyPart: procedure.code === "XR-CHEST-2V" ? "Chest" : form.bodyPart });
  };

  const send = async (event: React.FormEvent) => {
    event.preventDefault();
    setSending(true); setResult(null); setOrdersError("");
    try {
      const response = await fetch(`/api/visits/${visit.id}/imaging-orders`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
      const data = await response.json();
      setResult(data);
      if (data.order) setOrders((current) => [data.order, ...current.filter((order) => order.id !== data.order.id)]);
      if (!response.ok && !data.order) setOrdersError(data.error || "Could not submit the imaging order.");
    } catch {
      setOrdersError("Could not submit the imaging order.");
    } finally {
      setSending(false);
    }
  };

  return <div className="rounded-lg border border-border bg-card p-4">
    {enabled === null && !ordersError && <p className="text-sm text-inkSoft">Checking hospital imaging capabilities…</p>}
    {enabled === false && <div className="rounded-lg border border-border bg-[#FAF8F2] p-3 text-sm"><p className="font-semibold">Operational imaging orders are disabled for this hospital.</p><p className="mt-1 text-xs text-inkSoft">Record the requested scan under Imaging ordered above. An administrator can enable HL7 / modality-worklist orders in Settings.</p></div>}
    {enabled === true && <><div className="rounded-lg bg-[#FAF8F2] p-3">
      <p className="text-xs font-bold uppercase text-inkSoft">1. Review patient details</p>
      <div className="mt-2 grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-4">
        <div><span className="text-inkSoft">Patient</span><br /><b>{visit.patient.name}</b></div>
        <div><span className="text-inkSoft">MRN</span><br /><b>{visit.patient.mrn}</b></div>
        <div><span className="text-inkSoft">DOB / Sex</span><br /><b>{visit.patient.dateOfBirth ? new Date(visit.patient.dateOfBirth).toLocaleDateString() : "DOB missing"} · {visit.patient.gender}</b></div>
        <div><span className="text-inkSoft">Encounter / Provider</span><br /><b>{visit.id.slice(-8)} · Dr. {visit.doctor?.name || "Current doctor"}</b></div>
      </div>
    </div>

    {!disabled ? <form onSubmit={send} className="mt-4">
      <p className="mb-2 text-xs font-bold uppercase text-inkSoft">2. Enter and submit the order</p>
      <div className="grid gap-3 md:grid-cols-2">
        <label className="text-xs text-inkSoft">Procedure<select value={form.procedureCode} onChange={(event) => chooseProcedure(event.target.value)} className="imgInput mt-1" required><option value="">Select a seeded procedure</option>{procedures.map((procedure) => <option key={procedure.id} value={procedure.code}>{procedure.code} · {procedure.name}</option>)}</select></label>
        <label className="text-xs text-inkSoft">Modality<select value={form.modality} onChange={(event) => setForm({ ...form, modality: event.target.value })} className="imgInput mt-1"><option value="XRAY">X-Ray</option><option value="CT">CT</option><option value="MRI">MRI</option><option value="ULTRASOUND">Ultrasound</option><option value="NUCLEAR">Nuclear medicine</option><option value="OTHER">Other</option></select></label>
        <label className="text-xs text-inkSoft">Procedure description<input required value={form.procedureDescription} onChange={(event) => setForm({ ...form, procedureDescription: event.target.value })} className="imgInput mt-1" /></label>
        <label className="text-xs text-inkSoft">Body part (optional)<input value={form.bodyPart} onChange={(event) => setForm({ ...form, bodyPart: event.target.value })} className="imgInput mt-1" /></label>
        <label className="text-xs text-inkSoft md:col-span-2">Clinical indication<textarea required value={form.clinicalIndication} onChange={(event) => setForm({ ...form, clinicalIndication: event.target.value })} placeholder="Reason for imaging and relevant clinical findings" className="imgInput mt-1 min-h-[70px]" /></label>
      </div>
      <button disabled={sending || !form.procedureCode || !form.clinicalIndication.trim() || !visit.patient.dateOfBirth} className="mt-3 rounded-lg bg-accent px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">{sending ? "Awaiting imaging ACK…" : "Submit imaging order"}</button>
      {!visit.patient.dateOfBirth && <p className="mt-2 text-xs text-alert">Add the patient&apos;s date of birth before submitting this order.</p>}
    </form> : <p className="mt-3 text-xs text-inkSoft">This encounter is finalized. New imaging orders require an active encounter.</p>}</>}

    {result?.order && <div className={`mt-3 rounded-lg p-3 text-sm ${result.order.status === "SENT" ? "bg-accentSoft text-accentDark" : "bg-alertSoft text-alert"}`}><b>{result.order.procedureDescription}</b> · {result.order.status}<p className="mt-1 text-xs">Accession {result.order.accessionNumber}{result.order.ackCode ? ` · ACK ${result.order.ackCode}` : ""}</p>{(result.order.ackErrorText || result.order.errorMessage || result.error || result.warning) && <p className="mt-1 text-xs">{result.order.ackErrorText || result.order.errorMessage || result.error || result.warning}</p>}</div>}
    {ordersError && <p className="mt-3 text-xs text-alert">{ordersError}</p>}
    {orders.length > 0 && <details className="mt-3" open={Boolean(result?.order)}><summary className="cursor-pointer text-xs font-semibold text-accentDark">Imaging order history ({orders.length})</summary><div className="mt-2 space-y-2">{orders.map((order) => <div key={order.id} className="rounded border border-border bg-[#FAF8F2] p-2 text-xs"><b>{order.procedureCode} · {order.procedureDescription}</b><p className="mt-1 text-inkSoft">Accession {order.accessionNumber} · {order.status}{order.ackCode ? ` · ACK ${order.ackCode}` : ""}{order.sentAt ? ` · ${new Date(order.sentAt).toLocaleString()}` : ""}</p>{(order.ackErrorText || order.errorMessage) && <p className="mt-1 text-alert">{order.ackErrorText || order.errorMessage}</p>}</div>)}</div></details>}
    <style jsx>{`.imgInput { font-size: 14px; padding: 9px 11px; border-radius: 8px; border: 1px solid #E2DCCE; background: #FCFAF5; width: 100%; color: #17202A; }`}</style>
  </div>;
}
