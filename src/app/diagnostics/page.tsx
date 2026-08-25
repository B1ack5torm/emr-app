"use client";

import { useSession } from "next-auth/react";
import { FormEvent, useCallback, useEffect, useState } from "react";
import { canReviewDiagnosticOrder } from "@/lib/domain/diagnostics";

type Document = {
  id: string;
  originalName: string;
  contentType: string;
  sizeBytes: number;
  createdAt: string;
};
type Observation = {
  id: string;
  display: string;
  valueNumber?: number;
  valueText?: string;
  valueBoolean?: boolean;
  unit?: string;
  referenceLow?: number;
  referenceHigh?: number;
  referenceText?: string;
  interpretation: string;
  isCritical: boolean;
};
type Order = {
  id: string;
  orderNumber: string;
  type: string;
  priority: string;
  status: string;
  procedureName: string;
  procedureCode?: string;
  clinicalIndication?: string;
  resultSummary?: string;
  scheduledAt?: string;
  patient: { id: string; name: string; mrn: string };
  orderingPractitioner: { id: string; name: string };
  documents: Document[];
  observations: Observation[];
};

const STATUSES = ["CREATED", "SCHEDULED", "IN_PROGRESS", "COMPLETED", "REVIEWED", "CANCELLED"];

async function responseJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

export default function DiagnosticsPage() {
  const { data: session } = useSession();
  const [orders, setOrders] = useState<Order[]>([]);
  const [type, setType] = useState("");
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [busyId, setBusyId] = useState("");

  const load = useCallback(async () => {
    setError("");
    try {
      const data = await fetch(`/api/diagnostic-orders?type=${type}&status=${status}`).then(responseJson);
      setOrders(data.orders);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load diagnostic orders.");
    }
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
    if (target === "REVIEWED" && !window.confirm("Confirm that you opened, reviewed, and clinically acknowledged this report?")) return;
    setBusyId(order.id);
    setError("");
    setNotice("");
    try {
      await fetch(`/api/diagnostic-orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }).then(responseJson);
      if (target === "REVIEWED") setNotice(`Report for ${order.patient.name} was reviewed and acknowledged.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the order.");
    } finally {
      setBusyId("");
    }
  };

  const uploadReport = async (order: Order, file: File) => {
    setBusyId(order.id);
    setError("");
    setNotice("");
    const data = new FormData();
    data.set("patientId", order.patient.id);
    data.set("diagnosticOrderId", order.id);
    data.set("finalizeDiagnosticOrder", "true");
    data.set("file", file);
    try {
      await fetch("/api/documents", { method: "POST", body: data }).then(responseJson);
      setNotice(`Report uploaded for ${order.patient.name}. It is ready for Dr. ${order.orderingPractitioner.name} to review.`);
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not upload the diagnostic report.");
    } finally {
      setBusyId("");
    }
  };

  const role = (session?.user as any)?.role as string | undefined;
  const userId = (session?.user as any)?.id as string | undefined;
  const canReviewOrder = (order: Order) => canReviewDiagnosticOrder(role, userId, order.orderingPractitioner.id);

  return <div className="max-w-6xl">
    <div>
      <h1 className="font-serif text-xl font-semibold">Diagnostic orders</h1>
      <p className="mt-1 text-sm text-inkSoft">Start collection or processing, attach the final report to the order, and send it to the ordering doctor for review.</p>
    </div>

    <div className="mt-4 flex flex-wrap gap-3">
      <select value={type} onChange={(event) => setType(event.target.value)} className="rounded-lg border border-border p-2 text-sm">
        <option value="">All types</option><option value="LABORATORY">Laboratory</option><option value="IMAGING">Imaging</option>
      </select>
      <select value={status} onChange={(event) => setStatus(event.target.value)} className="rounded-lg border border-border p-2 text-sm">
        <option value="">All statuses</option>{STATUSES.map((value) => <option key={value} value={value}>{value.replaceAll("_", " ")}</option>)}
      </select>
    </div>

    {notice && <p className="mt-3 rounded-lg bg-accentSoft px-3 py-2 text-sm text-accentDark">{notice}</p>}
    {error && <p className="mt-3 rounded-lg bg-alertSoft px-3 py-2 text-sm text-alert">{error}</p>}

    <div className="mt-5 space-y-3">
      {orders.map((order) => <article key={order.id} className="rounded-xl border border-border bg-card p-4">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <p className="font-semibold">{order.procedureName}{order.procedureCode ? ` (${order.procedureCode})` : ""}</p>
            <p className="text-xs text-inkSoft">{order.orderNumber} · {order.patient.name} ({order.patient.mrn}) · {order.type} · {order.priority} · Dr. {order.orderingPractitioner.name}</p>
            {order.clinicalIndication && <p className="mt-2 text-sm"><b>Indication:</b> {order.clinicalIndication}</p>}
            {order.scheduledAt && <p className="mt-1 text-xs"><b>Scheduled:</b> {new Date(order.scheduledAt).toLocaleString()}</p>}
            {order.resultSummary && <p className="mt-2 rounded-lg bg-[#FAF8F2] p-2 text-sm"><b>Result:</b> {order.resultSummary}</p>}
            {order.observations?.length > 0 && <ObservationTable observations={order.observations} />}
            {order.documents.length > 0 && <ReportList documents={order.documents} />}
          </div>
          <span className="rounded-full bg-accentSoft px-3 py-1 text-xs font-bold text-accentDark">{order.status.replaceAll("_", " ")}</span>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {order.status === "CREATED" && <button disabled={busyId === order.id} onClick={() => transition(order, "SCHEDULED")} className="action">Schedule</button>}
          {["CREATED", "SCHEDULED"].includes(order.status) && <button disabled={busyId === order.id} onClick={() => transition(order, "IN_PROGRESS")} className="action-primary">{order.type === "LABORATORY" ? "Collect sample & start" : "Start processing"}</button>}
          {order.status === "COMPLETED" && canReviewOrder(order) && <button disabled={busyId === order.id} onClick={() => transition(order, "REVIEWED")} className="action-primary">Review & acknowledge</button>}
          {order.status === "COMPLETED" && !canReviewOrder(order) && <span className="text-xs font-semibold text-inkSoft">Awaiting review by Dr. {order.orderingPractitioner.name}</span>}
          {["CREATED", "SCHEDULED", "IN_PROGRESS"].includes(order.status) && <button disabled={busyId === order.id} onClick={() => transition(order, "CANCELLED")} className="action text-alert">Cancel</button>}
        </div>

        {order.status === "IN_PROGRESS" && <ReportUpload order={order} busy={busyId === order.id} onUpload={(file) => uploadReport(order, file)} />}
      </article>)}
      {!orders.length && <p className="rounded-xl border border-dashed border-border p-8 text-center text-inkSoft">No diagnostic orders match these filters.</p>}
    </div>

    <style jsx>{`
      .action,.action-primary{border:1px solid #E2DCCE;border-radius:8px;padding:7px 11px;font-size:12px;font-weight:700}
      .action-primary{border-color:#3E7465;background:#3E7465;color:white}
      .action:disabled,.action-primary:disabled{opacity:.5}
    `}</style>
  </div>;
}

function ReportUpload({ order, busy, onUpload }: { order: Order; busy: boolean; onUpload: (file: File) => void }) {
  const [file, setFile] = useState<File | null>(null);
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (file) onUpload(file);
  };
  return <form onSubmit={submit} className="mt-4 rounded-xl border border-accent bg-[#FAF8F2] p-4">
    <p className="text-sm font-bold">Upload final diagnostic report</p>
    <p className="mt-1 text-xs text-inkSoft">Attach the completed PDF, JPEG, or PNG report. Uploading it will send this order to Dr. {order.orderingPractitioner.name} for review.</p>
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] || null)} className="min-w-0 flex-1 text-sm" />
      <button disabled={!file || busy} className="rounded-lg bg-accent px-4 py-2 text-xs font-bold text-white disabled:opacity-50">{busy ? "Scanning and uploading…" : "Upload report & send to doctor"}</button>
    </div>
  </form>;
}

function ReportList({ documents }: { documents: Document[] }) {
  return <div className="mt-3 rounded-lg border border-border bg-[#FAF8F2] p-3">
    <p className="text-xs font-bold uppercase tracking-wide text-inkSoft">Diagnostic reports</p>
    <div className="mt-2 flex flex-wrap gap-2">
      {documents.map((document) => <a key={document.id} href={`/api/documents/${document.id}?inline=1`} target="_blank" rel="noreferrer" className="rounded-lg border border-border bg-white px-3 py-2 text-xs font-semibold text-accentDark">
        Open {document.originalName} · {(document.sizeBytes / 1024).toFixed(1)} KB
      </a>)}
    </div>
  </div>;
}

function ObservationTable({ observations }: { observations: Observation[] }) {
  const value = (item: Observation) => item.valueNumber ?? item.valueText ?? (item.valueBoolean == null ? "—" : item.valueBoolean ? "Yes" : "No");
  return <div className="mt-3 overflow-hidden rounded-lg border border-border">
    <div className="grid grid-cols-[1.5fr_1fr_1fr_auto] bg-[#F4F0E6] px-3 py-1.5 text-[10px] font-bold uppercase text-inkSoft"><span>Component</span><span>Result</span><span>Reference</span><span>Flag</span></div>
    {observations.map((item) => <div key={item.id} className={`grid grid-cols-[1.5fr_1fr_1fr_auto] items-center px-3 py-2 text-xs ${item.isCritical ? "bg-alertSoft" : "bg-white"}`}>
      <span className="font-semibold">{item.display}</span><span>{String(value(item))} {item.unit || ""}</span><span className="text-inkSoft">{item.referenceText || [item.referenceLow, item.referenceHigh].filter((v) => v != null).join("–") || "—"}</span><span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${item.interpretation === "NORMAL" ? "bg-accentSoft text-accentDark" : "bg-alertSoft text-alert"}`}>{item.interpretation}</span>
    </div>)}
  </div>;
}
