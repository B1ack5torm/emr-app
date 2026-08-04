"use client";

import { useEffect, useState } from "react";
import { Search, User, AlertTriangle, ChevronDown, ChevronUp, CheckCircle2, Clock } from "lucide-react";
import { AllergyBanner } from "@/components/shared";

export default function RecordsPage() {
  const [query, setQuery] = useState("");
  const [patients, setPatients] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [detail, setDetail] = useState<any>(null);

  useEffect(() => {
    const t = setTimeout(() => {
      fetch(`/api/patients?q=${encodeURIComponent(query)}`).then((r) => r.json()).then(setPatients);
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const toggle = async (id: string) => {
    if (expanded === id) { setExpanded(null); return; }
    setExpanded(id);
    const res = await fetch(`/api/patients/${id}`);
    setDetail(await res.json());
  };

  return (
    <div>
      <div className="relative max-w-md mb-4">
        <Search size={15} className="absolute left-3 top-3 text-inkSoft" />
        <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search by patient name or phone"
          className="w-full pl-9 pr-3 py-2.5 rounded-lg border border-border bg-[#FCFAF5]" />
      </div>

      {patients.length === 0 && <div className="text-inkSoft p-5">No patients found.</div>}

      <div className="flex flex-col gap-2.5">
        {patients.map((p) => {
          const isOpen = expanded === p.id;
          return (
            <div key={p.id} className="bg-card border border-border rounded-lg overflow-hidden"
              style={{ borderLeft: `4px solid ${p.allergies.length ? "#B5533C" : "#3D6A5C"}` }}>
              <div onClick={() => toggle(p.id)} className="cursor-pointer px-4 py-3.5 flex justify-between items-center">
                <div>
                  <div className="font-semibold text-sm flex items-center gap-2">
                    <User size={15} className="text-inkSoft" /> {p.name}
                    {p.allergies.length > 0 && <span className="inline-flex items-center gap-1 bg-alertSoft text-alert px-2 py-0.5 rounded-full text-xs font-semibold"><AlertTriangle size={10} /> Allergies</span>}
                  </div>
                  <div className="text-xs text-inkSoft mt-0.5">{p.age} yrs · {p.gender} · {p.visits.length} visit{p.visits.length !== 1 ? "s" : ""} on file</div>
                </div>
                {isOpen ? <ChevronUp size={18} className="text-inkSoft" /> : <ChevronDown size={18} className="text-inkSoft" />}
              </div>
              {isOpen && detail?.id === p.id && (
                <div className="px-4 pb-4">
                  <div className="grid grid-cols-2 gap-2 text-sm mb-3">
                    <div><b>Phone:</b> {detail.phone || "—"}</div>
                    <div><b>Date of birth:</b> {detail.dateOfBirth ? new Date(detail.dateOfBirth).toLocaleDateString() : "—"}</div>
                    <div><b>Blood group:</b> {detail.bloodGroup || "—"}</div>
                    <div><b>Address:</b> {detail.address || "—"}</div>
                    <div><b>Emergency contact:</b> {detail.emergencyContact || "—"}</div>
                  </div>
                  <AllergyBanner allergies={detail.allergies.map((a: any) => a.name)} />
                  <div className="text-xs font-bold text-inkSoft uppercase mt-3.5">Visit history</div>
                  <div className="flex flex-col gap-2 mt-2">
                    {detail.visits.length === 0 && <div className="text-sm text-inkSoft">No visits recorded yet.</div>}
                    {detail.visits.map((v: any) => <VisitRow key={v.id} visit={v} />)}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function VisitRow({ visit }: { visit: any }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="border border-border rounded-lg bg-[#FAF8F2]">
      <div onClick={() => setOpen(!open)} className="cursor-pointer px-3 py-2.5 flex justify-between items-center">
        <div className="text-sm">
          <span className="font-mono text-inkSoft">{new Date(visit.createdAt).toLocaleString()}</span>{"  "}
          <span className="font-semibold">{visit.chiefComplaint || "General visit"}</span>
        </div>
        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${visit.status === "COMPLETED" ? "bg-accentSoft text-accentDark" : "bg-waitingSoft text-waiting"}`}>
          {visit.status === "COMPLETED" ? <CheckCircle2 size={11} /> : <Clock size={11} />}
          {visit.status === "COMPLETED" ? "Completed" : "Waiting"}
        </span>
      </div>
      {open && (
        <div className="px-3 pb-3 text-sm flex flex-col gap-2">
          <div><b>Vitals:</b> BP {visit.bp || "—"}, Temp {visit.temperature || "—"}°F, Pulse {visit.pulse || "—"}, Wt {visit.weight || "—"}kg</div>
          {visit.diagnosis && <div><b>Diagnosis:</b> {visit.diagnosis}</div>}
          {visit.doctorNotes && <div><b>Doctor's notes:</b> {visit.doctorNotes}</div>}
          {visit.prescriptions?.length > 0 && (
            <div><b>Prescription:</b>
              <ul className="list-disc ml-5 mt-1">
                {visit.prescriptions.map((r: any, i: number) => <li key={i}>{r.medicine} — {r.dosage}, {r.frequency}, {r.duration}</li>)}
              </ul>
            </div>
          )}
          {visit.testsOrdered?.length > 0 && <div><b>Tests ordered:</b> {visit.testsOrdered.map((t: any) => t.name).join(", ")}</div>}
          {visit.doctor?.name && (
            <div className="pt-2 border-t border-dashed border-border font-serif italic text-accentDark">
              Signed — Dr. {visit.doctor.name}{visit.signedAt ? `, ${new Date(visit.signedAt).toLocaleString()}` : ""}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
