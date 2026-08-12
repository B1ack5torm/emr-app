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
  const [pharmacySent, setPharmacySent] = useState(false);

  const save = async (complete: boolean, sendToPharmacy = false) => {
    if (complete && !signConfirmed) { setError("Please confirm the digital signature before completing the visit."); return; }
    setError("");
    const finalTests = testDraft.trim() ? [...tests, testDraft.trim()] : tests;
    const res = await fetch(`/api/visits/${params.visitId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ diagnosis, doctorNotes: notes, prescriptions: rx, testsOrdered: finalTests, complete, sendToPharmacy }),
    });

    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Could not save the visit. Please try again.");
      return;
    }

    if (complete) { router.push("/doctor"); return; }

    // Not completing — stay on the page, just sync state with what was saved
    const updated = await res.json();
    setNotes(updated.doctorNotes || "");
    setDiagnosis(updated.diagnosis || "");
    setRx(updated.prescriptions?.length ? updated.prescriptions : []);
    setTests((updated.testsOrdered || []).map((t: any) => t.name));
    if (sendToPharmacy) setPharmacySent(true);
  };

  return (
    <div>
      <div className="flex justify-between items-start mb-3">
        <div>
          <div className="font-serif text-xl font-semibold">{visit.patient.name}</div>
          <div className="text-xs text-inkSoft">
            {visit.patient.age} yrs · {visit.patient.gender} · {visit.patient.bloodGroup || "blood group n/a"} · {visit.patient.phone || "—"}
            {visit.patient.dateOfBirth ? ` · DOB ${new Date(visit.patient.dateOfBirth).toLocaleDateString()}` : ""}
          </div>
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
          <button
            type="button"
            onClick={() => save(false, true)}
            disabled={pharmacySent}
            className="flex items-center gap-1 text-sm text-white bg-accent rounded-lg px-3 py-1.5 mt-2 ml-2 disabled:opacity-50"
          >
            <Pill size={14} /> {pharmacySent ? "Sent to pharmacist queue" : "Send to pharmacist queue"}
          </button>
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

        <div>
          <div className="flex items-center gap-2 text-xs font-bold text-inkSoft uppercase mb-2">
            Imaging order (sends HL7 to modality worklist)
          </div>
          <ImagingOrderPanel visitId={visit.id} />
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
