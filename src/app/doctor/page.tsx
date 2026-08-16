"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, CalendarCheck2, Check, Clock, Mail, Phone, X } from "lucide-react";

type Visit = {
  id: string;
  chiefComplaint?: string;
  createdAt: string;
  patient: { name: string; age: number; gender: string; allergies: { name: string }[] };
};

type AppointmentRequest = {
  id: string;
  patientName: string;
  patientEmail: string;
  patientPhone: string;
  reason?: string | null;
  requestedAt: string;
  status: "PENDING" | "CONFIRMED";
  doctor: { id: string; name: string };
};

export default function DoctorQueuePage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [requests, setRequests] = useState<AppointmentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [responding, setResponding] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    try {
      const [visitsResponse, requestsResponse] = await Promise.all([
        fetch("/api/visits?status=WAITING"),
        fetch("/api/doctor/appointment-requests"),
      ]);
      const [visitData, requestData] = await Promise.all([visitsResponse.json(), requestsResponse.json()]);
      if (!visitsResponse.ok || !requestsResponse.ok) throw new Error(requestData.error || visitData.error || "Could not load the doctor's queue.");
      setVisits(visitData);
      setRequests(requestData);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not load the doctor's queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const respond = async (id: string, action: "confirm" | "reject") => {
    setResponding(id); setError("");
    try {
      const response = await fetch(`/api/doctor/appointment-requests/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Could not update the appointment request.");
      await load();
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : "Could not update the appointment request.");
    } finally {
      setResponding("");
    }
  };

  const pending = requests.filter((request) => request.status === "PENDING");
  const confirmed = requests.filter((request) => request.status === "CONFIRMED");

  if (loading) return <div className="text-inkSoft">Loading...</div>;

  return <div className="space-y-8">
    {error && <div className="rounded-lg bg-alertSoft p-3 text-sm text-alert">{error}</div>}

    <section>
      <div className="mb-3 flex items-center justify-between">
        <div className="font-serif text-lg font-semibold">Appointment Requests</div>
        {pending.length > 0 && <span className="rounded-full bg-waitingSoft px-2.5 py-1 text-xs font-semibold text-waiting">{pending.length} pending</span>}
      </div>
      {pending.length === 0 ? <Empty text="No appointment requests awaiting review." /> : <div className="grid gap-3 lg:grid-cols-2">
        {pending.map((request) => <RequestCard key={request.id} request={request} actions={<>
          <button disabled={responding === request.id} onClick={() => respond(request.id, "reject")} className="inline-flex items-center gap-1.5 rounded-lg border border-alert/30 px-3 py-2 text-xs font-semibold text-alert disabled:opacity-50"><X size={14} /> Reject</button>
          <button disabled={responding === request.id} onClick={() => respond(request.id, "confirm")} className="inline-flex items-center gap-1.5 rounded-lg bg-accent px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-accentDark disabled:opacity-50"><Check size={14} /> Accept</button>
        </>} />)}
      </div>}
    </section>

    <section>
      <div className="mb-3 font-serif text-lg font-semibold">Confirmed Appointment Queue</div>
      {confirmed.length === 0 ? <Empty text="No confirmed online appointments." /> : <div className="flex flex-col gap-2.5">
        {confirmed.map((request) => <RequestCard key={request.id} request={request} confirmed />)}
      </div>}
    </section>

    <section>
      <div className="mb-3 font-serif text-lg font-semibold">Waiting Room</div>
      {visits.length === 0 ? <Empty text="No patients currently waiting for consultation." /> : <div className="flex flex-col gap-2.5">
        {visits.map((visit) => <div key={visit.id} onClick={() => router.push(`/doctor/${visit.id}`)} className="cursor-pointer flex justify-between items-center bg-card border border-border rounded-lg px-4 py-3.5" style={{ borderLeft: `4px solid ${visit.patient.allergies.length ? "#B5533C" : "#B8862E"}` }}>
          <div><div className="font-semibold text-sm">{visit.patient.name} <span className="text-inkSoft font-normal">· {visit.patient.age} yrs, {visit.patient.gender}</span></div><div className="text-xs text-inkSoft mt-0.5">{visit.chiefComplaint || "No complaint noted"}</div></div>
          <div className="flex items-center gap-2.5">{visit.patient.allergies.length > 0 && <span className="inline-flex items-center gap-1 bg-alertSoft text-alert px-2.5 py-1 rounded-full text-xs font-semibold"><AlertTriangle size={11} /> Allergy</span>}<span className="inline-flex items-center gap-1 bg-waitingSoft text-waiting px-2.5 py-1 rounded-full text-xs font-semibold"><Clock size={11} /> {new Date(visit.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}</span></div>
        </div>)}
      </div>}
    </section>
  </div>;
}

function RequestCard({ request, actions, confirmed }: { request: AppointmentRequest; actions?: React.ReactNode; confirmed?: boolean }) {
  return <article className={`rounded-xl border bg-card p-4 ${confirmed ? "border-accent/30 border-l-4 border-l-accent" : "border-border"}`}>
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div><div className="font-semibold">{request.patientName}</div><div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-inkSoft"><span className="inline-flex items-center gap-1"><Mail size={12} /> {request.patientEmail}</span><span className="inline-flex items-center gap-1"><Phone size={12} /> {request.patientPhone}</span></div></div>
      {confirmed && <span className="inline-flex items-center gap-1 rounded-full bg-accentSoft px-2.5 py-1 text-xs font-semibold text-accent"><Check size={12} /> Confirmed</span>}
    </div>
    <div className="mt-3 inline-flex items-center gap-2 rounded-lg bg-bg px-3 py-2 text-sm font-semibold"><CalendarCheck2 size={15} className="text-accent" /> {new Date(request.requestedAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</div>
    <p className="mt-3 text-sm text-inkSoft"><b className="text-ink">Reason:</b> {request.reason || "Not provided"}</p>
    {actions && <div className="mt-4 flex justify-end gap-2">{actions}</div>}
  </article>;
}

function Empty({ text }: { text: string }) {
  return <div className="rounded-xl border border-dashed border-border p-6 text-center text-sm text-inkSoft">{text}</div>;
}
