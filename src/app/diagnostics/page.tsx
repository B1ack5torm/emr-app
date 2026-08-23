"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string; orderNumber: string; type: string; priority: string; status: string; procedureName: string;
  procedureCode?: string; clinicalIndication?: string; resultSummary?: string; scheduledAt?: string;
  patient: { id: string; name: string; mrn: string }; orderingPractitioner: { name: string };
  documents: { id: string; originalName: string }[];
  observations: Observation[];
};
type Observation = { id: string; display: string; valueNumber?: number; valueText?: string; valueBoolean?: boolean; unit?: string; referenceLow?: number; referenceHigh?: number; referenceText?: string; interpretation: string; isCritical: boolean };
type ResultRow = { display: string; value: string; valueType: "NUMBER" | "TEXT"; unit: string; referenceLow: string; referenceHigh: string; criticalLow: string; criticalHigh: string };

const STATUSES = ["CREATED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "CANCELLED"];

export default function DiagnosticsPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
  const [recordingId, setRecordingId] = useState("");
  const load = useCallback(async () => {
    setError("");
    try {
      const response = await fetch(`/api/diagnostic-orders?type=${type}&status=${status}`);
      const data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setOrders(data.orders);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load diagnostic orders."); }
  }, [type, status]);
  useEffect(() => { void load(); }, [load]);

  const transition = async (order: Order, target: string, extraBody: Record<string, unknown> = {}) => {
    const body: Record<string, unknown> = { status: target, ...extraBody };
    if (target === "SCHEDULED") {
      const value = window.prompt("Schedule date and time (YYYY-MM-DDTHH:mm):");
      if (!value) return;
      const scheduledAt = new Date(value);
      if (Number.isNaN(scheduledAt.getTime())) return setError("Enter a valid schedule date and time.");
      body.scheduledAt = scheduledAt.toISOString();
    }
    if (target === "CANCELLED") {
      const reason = window.prompt("Enter the cancellation reason:")?.trim();
      if (!reason) return;
      body.reason = reason;
    }
    if (target === "REVIEWED" && !window.confirm("Confirm that you reviewed and acknowledged this result?")) return;
    setBusyId(order.id); setError("");
    const response = await fetch(`/api/diagnostic-orders/${order.id}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    const data = await response.json(); setBusyId("");
    if (!response.ok) return setError(data.error || "Could not update the order.");
    setRecordingId("");
    await load();
  };

  const role = (session?.user as any)?.role as string | undefined;
  const canReview = ["DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "");
  return <div className="max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-serif text-xl font-semibold">Diagnostic orders</h1><p className="mt-1 text-sm text-inkSoft">Schedule, process, result, and clinically acknowledge laboratory and imaging requests.</p></div><Link href="/documents" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-accentDark">Upload diagnostic report</Link></div>
    <div className="mt-4 flex flex-wrap gap-3"><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-border p-2 text-sm"><option value="">All types</option><option value="LABORATORY">Laboratory</option><option value="IMAGING">Imaging</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border p-2 text-sm"><option value="">All statuses</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></div>
    {error && <p className="mt-3 rounded-lg bg-alertSoft px-3 py-2 text-sm text-alert">{error}</p>}
    <div className="mt-5 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{order.procedureName}{order.procedureCode ? ` (${order.procedureCode})` : ""}</p><p className="text-xs text-inkSoft">{order.orderNumber} · {order.patient.name} ({order.patient.mrn}) · {order.type} · {order.priority} · Dr. {order.orderingPractitioner.name}</p>{order.clinicalIndication && <p className="mt-2 text-sm"><b>Indication:</b> {order.clinicalIndication}</p>}{order.scheduledAt && <p className="mt-1 text-xs"><b>Scheduled:</b> {new Date(order.scheduledAt).toLocaleString()}</p>}{order.resultSummary && <p className="mt-2 rounded-lg bg-[#FAF8F2] p-2 text-sm"><b>Result:</b> {order.resultSummary}</p>}{order.observations?.length > 0 && <ObservationTable observations={order.observations} />}{order.documents.length > 0 && <p className="mt-2 text-xs"><b>Reports:</b> {order.documents.map((document) => document.originalName).join(", ")}</p>}</div><span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-bold text-accentDark">{order.status}</span></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "CREATED" && <button disabled={busyId === order.id} onClick={() => transition(order, "SCHEDULED")} className="action">Schedule</button>}
        {["CREATED", "SCHEDULED"].includes(order.status) && <button disabled={busyId === order.id} onClick={() => transition(order, "IN_PROGRESS")} className="action">Start processing</button>}
        {order.status === "IN_PROGRESS" && <button disabled={busyId === order.id} onClick={() => setRecordingId(recordingId === order.id ? "" : order.id)} className="action">Record structured result</button>}
        {order.status === "COMPLETED" && canReview && <button disabled={busyId === order.id} onClick={() => transition(order, "REVIEWED")} className="action">Review & acknowledge</button>}
        {["CREATED", "SCHEDULED", "IN_PROGRESS"].includes(order.status) && <button disabled={busyId === order.id} onClick={() => transition(order, "CANCELLED")} className="action text-alert">Cancel</button>}
      </div>
      {recordingId === order.id && <ResultEntry order={order} busy={busyId === order.id} onCancel={() => setRecordingId("")} onSubmit={(payload) => transition(order, "COMPLETED", payload)} />}
    </article>)}{!orders.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-inkSoft">No diagnostic orders match these filters.</p>}</div>
    <style jsx>{`.action{border:1px solid #E2DCCE;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700}.action:disabled{opacity:.5}`}</style>
  </div>;
}

function ObservationTable({ observations }: { observations: Observation[] }) {
  const value = (item: Observation) => item.valueNumber ?? item.valueText ?? (item.valueBoolean == null ? "—" : item.valueBoolean ? "Yes" : "No");
  return <div className="mt-3 overflow-hidden rounded-lg border border-border"><div className="grid grid-cols-[1.5fr_1fr_1fr_auto] bg-[#F4F0E6] px-3 py-1.5 text-[10px] font-bold uppercase text-inkSoft"><span>Component</span><span>Result</span><span>Reference</span><span>Flag</span></div>{observations.map((item) => <div key={item.id} className={`grid grid-cols-[1.5fr_1fr_1fr_auto] items-center px-3 py-2 text-xs ${item.isCritical ? "bg-alertSoft" : "bg-white"}`}><span className="font-semibold">{item.display}</span><span>{String(value(item))} {item.unit || ""}</span><span className="text-inkSoft">{item.referenceText || [item.referenceLow, item.referenceHigh].filter((v) => v != null).join("–") || "—"}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.interpretation === "NORMAL" ? "bg-accentSoft text-accentDark" : "bg-alertSoft text-alert"}`}>{item.interpretation}</span></div>)}</div>;
}

function ResultEntry({ order, busy, onCancel, onSubmit }: { order: Order; busy: boolean; onCancel: () => void; onSubmit: (payload: Record<string, unknown>) => void }) {
  const empty = (): ResultRow => ({ display: "", value: "", valueType: "NUMBER", unit: "", referenceLow: "", referenceHigh: "", criticalLow: "", criticalHigh: "" });
  const [rows, setRows] = useState<ResultRow[]>([empty()]); const [summary, setSummary] = useState("");
  const set = (index: number, field: keyof ResultRow, value: string) => setRows((current) => current.map((row, i) => i === index ? { ...row, [field]: value } : row));
  const submit = () => onSubmit({ resultSummary: summary, observations: rows.filter((row) => row.display.trim() && row.value !== "").map((row) => ({ ...row, referenceLow: row.referenceLow || null, referenceHigh: row.referenceHigh || null, criticalLow: row.criticalLow || null, criticalHigh: row.criticalHigh || null })) });
  return <div className="mt-4 rounded-xl border border-accent bg-[#FAF8F2] p-3"><div className="flex justify-between"><div><div className="text-sm font-bold">Structured results — {order.procedureName}</div><div className="text-xs text-inkSoft">Reference and critical ranges are evaluated automatically.</div></div><button onClick={onCancel} className="text-xs font-bold">Close</button></div><div className="mt-3 space-y-2">{rows.map((row, index) => <div key={index} className="grid grid-cols-2 gap-2 rounded-lg border border-border bg-white p-2 md:grid-cols-[1.4fr_.8fr_.7fr_.65fr_.65fr_.65fr_.65fr_auto]"><input value={row.display} onChange={(e) => set(index, "display", e.target.value)} placeholder="Test/component" className="result-input" /><input value={row.value} onChange={(e) => set(index, "value", e.target.value)} placeholder="Value" type={row.valueType === "NUMBER" ? "number" : "text"} className="result-input" /><select value={row.valueType} onChange={(e) => set(index, "valueType", e.target.value)} className="result-input"><option value="NUMBER">Number</option><option value="TEXT">Text</option></select><input value={row.unit} onChange={(e) => set(index, "unit", e.target.value)} placeholder="Unit" className="result-input" /><input value={row.referenceLow} onChange={(e) => set(index, "referenceLow", e.target.value)} placeholder="Ref low" type="number" className="result-input" /><input value={row.referenceHigh} onChange={(e) => set(index, "referenceHigh", e.target.value)} placeholder="Ref high" type="number" className="result-input" /><input value={row.criticalHigh} onChange={(e) => set(index, "criticalHigh", e.target.value)} placeholder="Critical high" type="number" className="result-input" /><button disabled={rows.length === 1} onClick={() => setRows((current) => current.filter((_, i) => i !== index))} className="px-2 text-alert disabled:opacity-30">×</button></div>)}</div><button onClick={() => setRows((current) => [...current, empty()])} className="mt-2 text-xs font-bold text-accentDark">+ Add component</button><textarea value={summary} onChange={(e) => setSummary(e.target.value)} placeholder="Clinical result summary / impression (optional when structured results are entered)" className="mt-3 min-h-16 w-full rounded-lg border border-border bg-white px-3 py-2 text-sm" /><div className="mt-3 flex justify-end"><button disabled={busy || (!summary.trim() && !rows.some((row) => row.display.trim() && row.value !== ""))} onClick={submit} className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Finalize results"}</button></div><style jsx>{`.result-input{min-width:0;border:1px solid #E2DCCE;border-radius:6px;padding:6px 7px;font-size:12px}`}</style></div>;
}
