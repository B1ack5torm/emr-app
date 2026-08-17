"use client";

import Link from "next/link";
import { useSession } from "next-auth/react";
import { useCallback, useEffect, useState } from "react";

type Order = {
  id: string; orderNumber: string; type: string; priority: string; status: string; procedureName: string;
  procedureCode?: string; clinicalIndication?: string; resultSummary?: string; scheduledAt?: string;
  patient: { id: string; name: string; mrn: string }; orderingPractitioner: { name: string };
  documents: { id: string; originalName: string }[];
};

const STATUSES = ["CREATED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "CANCELLED"];

export default function DiagnosticsPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [busyId, setBusyId] = useState("");
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

  const transition = async (order: Order, target: string) => {
    const body: Record<string, unknown> = { status: target };
    if (target === "SCHEDULED") {
      const value = window.prompt("Schedule date and time (YYYY-MM-DDTHH:mm):");
      if (!value) return;
      const scheduledAt = new Date(value);
      if (Number.isNaN(scheduledAt.getTime())) return setError("Enter a valid schedule date and time.");
      body.scheduledAt = scheduledAt.toISOString();
    }
    if (target === "COMPLETED") {
      const resultSummary = window.prompt("Enter the diagnostic result summary:")?.trim();
      if (!resultSummary) return;
      body.resultSummary = resultSummary;
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
    await load();
  };

  const role = (session?.user as any)?.role as string | undefined;
  const canReview = ["DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "");
  return <div className="max-w-6xl">
    <div className="flex flex-wrap items-end justify-between gap-3"><div><h1 className="font-serif text-xl font-semibold">Diagnostic orders</h1><p className="mt-1 text-sm text-inkSoft">Schedule, process, result, and clinically acknowledge laboratory and imaging requests.</p></div><Link href="/documents" className="rounded-lg border border-border px-3 py-2 text-sm font-semibold text-accentDark">Upload diagnostic report</Link></div>
    <div className="mt-4 flex flex-wrap gap-3"><select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-border p-2 text-sm"><option value="">All types</option><option value="LABORATORY">Laboratory</option><option value="IMAGING">Imaging</option></select><select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border p-2 text-sm"><option value="">All statuses</option>{STATUSES.map((value) => <option key={value}>{value}</option>)}</select></div>
    {error && <p className="mt-3 rounded-lg bg-alertSoft px-3 py-2 text-sm text-alert">{error}</p>}
    <div className="mt-5 space-y-3">{orders.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4">
      <div className="flex flex-wrap items-start justify-between gap-3"><div><p className="font-semibold">{order.procedureName}{order.procedureCode ? ` (${order.procedureCode})` : ""}</p><p className="text-xs text-inkSoft">{order.orderNumber} · {order.patient.name} ({order.patient.mrn}) · {order.type} · {order.priority} · Dr. {order.orderingPractitioner.name}</p>{order.clinicalIndication && <p className="mt-2 text-sm"><b>Indication:</b> {order.clinicalIndication}</p>}{order.scheduledAt && <p className="mt-1 text-xs"><b>Scheduled:</b> {new Date(order.scheduledAt).toLocaleString()}</p>}{order.resultSummary && <p className="mt-2 rounded-lg bg-[#FAF8F2] p-2 text-sm"><b>Result:</b> {order.resultSummary}</p>}{order.documents.length > 0 && <p className="mt-2 text-xs"><b>Reports:</b> {order.documents.map((document) => document.originalName).join(", ")}</p>}</div><span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-bold text-accentDark">{order.status}</span></div>
      <div className="mt-3 flex flex-wrap gap-2">
        {order.status === "CREATED" && <button disabled={busyId === order.id} onClick={() => transition(order, "SCHEDULED")} className="action">Schedule</button>}
        {["CREATED", "SCHEDULED"].includes(order.status) && <button disabled={busyId === order.id} onClick={() => transition(order, "IN_PROGRESS")} className="action">Start processing</button>}
        {order.status === "IN_PROGRESS" && <button disabled={busyId === order.id} onClick={() => transition(order, "COMPLETED")} className="action">Record result</button>}
        {order.status === "COMPLETED" && canReview && <button disabled={busyId === order.id} onClick={() => transition(order, "REVIEWED")} className="action">Review & acknowledge</button>}
        {["CREATED", "SCHEDULED", "IN_PROGRESS"].includes(order.status) && <button disabled={busyId === order.id} onClick={() => transition(order, "CANCELLED")} className="action text-alert">Cancel</button>}
      </div>
    </article>)}{!orders.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-inkSoft">No diagnostic orders match these filters.</p>}</div>
    <style jsx>{`.action{border:1px solid #E2DCCE;border-radius:8px;padding:6px 10px;font-size:12px;font-weight:700}.action:disabled{opacity:.5}`}</style>
  </div>;
}
