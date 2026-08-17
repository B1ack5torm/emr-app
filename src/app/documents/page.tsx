"use client";

import { FormEvent, useEffect, useState } from "react";

type Patient = { id: string; name: string; mrn: string };
type Order = { id: string; orderNumber: string; procedureName: string; status: string };
type Document = { id: string; originalName: string; contentType: string; sizeBytes: number; diagnosticOrderId?: string; createdAt: string };

async function responseJson(response: Response) {
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Request failed (${response.status}).`);
  return data;
}

export default function DocumentsPage() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<Patient[]>([]);
  const [patient, setPatient] = useState<Patient | null>(null);
  const [documents, setDocuments] = useState<Document[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [diagnosticOrderId, setDiagnosticOrderId] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [uploading, setUploading] = useState(false);

  useEffect(() => {
    const timeout = setTimeout(async () => {
      if (query.length < 2 || patient) return;
      try { setPatients(await fetch(`/api/patients?q=${encodeURIComponent(query)}`).then(responseJson)); }
      catch (reason) { setError(reason instanceof Error ? reason.message : "Could not search patients."); }
    }, 250);
    return () => clearTimeout(timeout);
  }, [query, patient]);

  const load = async (patientId: string) => {
    setError("");
    try {
      const [documentData, orderData] = await Promise.all([
        fetch(`/api/documents?patientId=${patientId}`).then(responseJson),
        fetch(`/api/diagnostic-orders?patientId=${patientId}&pageSize=100`).then(responseJson),
      ]);
      setDocuments(documentData); setOrders(orderData.orders);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not load patient documents."); }
  };
  const selectPatient = (value: Patient) => { setPatient(value); setQuery(value.name); setPatients([]); setDiagnosticOrderId(""); void load(value.id); };
  const upload = async (event: FormEvent) => {
    event.preventDefault();
    if (!patient || !file) return;
    setUploading(true); setError(""); setNotice("");
    const data = new FormData(); data.set("patientId", patient.id); data.set("file", file);
    if (diagnosticOrderId) data.set("diagnosticOrderId", diagnosticOrderId);
    try {
      await fetch("/api/documents", { method: "POST", body: data }).then(responseJson);
      setFile(null); setDiagnosticOrderId(""); setNotice("Document uploaded to private storage."); await load(patient.id);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "Could not upload the document."); }
    finally { setUploading(false); }
  };
  const orderLabel = (id?: string) => orders.find((order) => order.id === id)?.orderNumber;

  return <div className="max-w-5xl">
    <h1 className="font-serif text-xl font-semibold">Patient documents</h1>
    <p className="mt-1 text-sm text-inkSoft">Authorized PDF and image uploads. Private storage keys and server paths are never exposed.</p>
    <div className="relative mt-5 max-w-lg"><input value={query} onChange={(event) => { setQuery(event.target.value); setPatient(null); }} placeholder="Search patient by name, MRN, or phone" className="w-full rounded-lg border border-border bg-card px-3 py-2.5" />{patients.length > 0 && <div className="absolute z-10 mt-1 w-full rounded-lg border border-border bg-card shadow-lg">{patients.map((value) => <button key={value.id} onClick={() => selectPatient(value)} className="block w-full px-3 py-2 text-left text-sm hover:bg-accentSoft"><b>{value.name}</b> · {value.mrn}</button>)}</div>}</div>
    {patient && <>
      <form onSubmit={upload} className="mt-5 grid gap-3 rounded-xl border border-border bg-card p-4 md:grid-cols-2">
        <label className="text-sm"><span className="mb-1 block font-semibold">Upload for {patient.name}</span><input required type="file" accept="application/pdf,image/jpeg,image/png" onChange={(event) => setFile(event.target.files?.[0] || null)} /></label>
        <label className="text-sm"><span className="mb-1 block font-semibold">Link to diagnostic order (optional)</span><select value={diagnosticOrderId} onChange={(event) => setDiagnosticOrderId(event.target.value)} className="w-full rounded-lg border border-border bg-[#FCFAF5] px-3 py-2"><option value="">General patient document</option>{orders.filter((order) => order.status !== "CANCELLED").map((order) => <option key={order.id} value={order.id}>{order.orderNumber} · {order.procedureName}</option>)}</select></label>
        <button disabled={!file || uploading} className="rounded-lg bg-accent px-4 py-2 text-sm font-bold text-white disabled:opacity-50 md:col-span-2">{uploading ? "Scanning and uploading…" : "Upload securely"}</button>
      </form>
      <div className="mt-5 space-y-2">{documents.map((document) => <div key={document.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-3"><div><p className="text-sm font-semibold">{document.originalName}</p><p className="text-xs text-inkSoft">{document.contentType} · {(document.sizeBytes / 1024).toFixed(1)} KB · {new Date(document.createdAt).toLocaleString()}{document.diagnosticOrderId ? ` · ${orderLabel(document.diagnosticOrderId) || "Diagnostic report"}` : ""}</p></div><a href={`/api/documents/${document.id}`} className="rounded-lg border border-border px-3 py-1.5 text-xs font-bold">Download</a></div>)}</div>
    </>}
    {notice && <p className="mt-4 rounded-lg bg-accentSoft px-3 py-2 text-sm text-accentDark">{notice}</p>}
    {error && <p className="mt-4 rounded-lg bg-alertSoft px-3 py-2 text-sm text-alert">{error}</p>}
  </div>;
}
