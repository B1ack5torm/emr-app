"use client";
import { useEffect, useState } from "react";

export default function AuditPage() {
  const [events, setEvents] = useState<any[]>([]), [error, setError] = useState("");
  useEffect(() => { fetch("/api/audit?pageSize=100").then(async response => { const data = await response.json(); if (!response.ok) throw new Error(data.error); setEvents(data.events); }).catch(reason => setError(reason.message || "Could not load audit events.")); }, []);
  return <div><h1 className="font-serif text-xl font-semibold">Audit history</h1><p className="mt-1 text-sm text-inkSoft">Append-only security and workflow events for this organization.</p>{error && <p className="mt-4 text-alert">{error}</p>}<div className="mt-5 overflow-x-auto rounded-xl border border-border bg-card"><table className="w-full text-left text-sm"><thead className="bg-[#F5F1E8] text-xs uppercase text-inkSoft"><tr><th className="p-3">Time</th><th>Action</th><th>Resource</th><th>User</th><th>Reason</th></tr></thead><tbody>{events.map(event => <tr key={event.id} className="border-t border-border"><td className="p-3 whitespace-nowrap">{new Date(event.createdAt).toLocaleString()}</td><td className="font-semibold">{event.action}</td><td>{event.resourceType}{event.resourceId ? ` · ${event.resourceId}` : ""}</td><td>{event.userId || "System"}</td><td>{event.reason || "—"}</td></tr>)}</tbody></table>{!events.length && !error && <p className="p-8 text-center text-inkSoft">No audit events yet.</p>}</div></div>;
}
