"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle, Clock } from "lucide-react";

type Visit = {
  id: string; chiefComplaint?: string; createdAt: string;
  patient: { name: string; age: number; gender: string; allergies: { name: string }[] };
};

export default function DoctorQueuePage() {
  const router = useRouter();
  const [visits, setVisits] = useState<Visit[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch("/api/visits?status=WAITING").then((r) => r.json()).then((d) => { setVisits(d); setLoading(false); });
  }, []);

  return (
    <div>
      <div className="font-serif text-lg font-semibold mb-3">Waiting Room</div>
      {loading ? (
        <div className="text-inkSoft">Loading…</div>
      ) : visits.length === 0 ? (
        <div className="text-inkSoft border border-dashed border-border rounded-xl p-8 text-center">No patients currently waiting for consultation.</div>
      ) : (
        <div className="flex flex-col gap-2.5">
          {visits.map((v) => (
            <div key={v.id} onClick={() => router.push(`/doctor/${v.id}`)}
              className="cursor-pointer flex justify-between items-center bg-card border border-border rounded-lg px-4 py-3.5"
              style={{ borderLeft: `4px solid ${v.patient.allergies.length ? "#B5533C" : "#B8862E"}` }}>
              <div>
                <div className="font-semibold text-sm">{v.patient.name} <span className="text-inkSoft font-normal">· {v.patient.age} yrs, {v.patient.gender}</span></div>
                <div className="text-xs text-inkSoft mt-0.5">{v.chiefComplaint || "No complaint noted"}</div>
              </div>
              <div className="flex items-center gap-2.5">
                {v.patient.allergies.length > 0 && (
                  <span className="inline-flex items-center gap-1 bg-alertSoft text-alert px-2.5 py-1 rounded-full text-xs font-semibold"><AlertTriangle size={11} /> Allergy</span>
                )}
                <span className="inline-flex items-center gap-1 bg-waitingSoft text-waiting px-2.5 py-1 rounded-full text-xs font-semibold">
                  <Clock size={11} /> {new Date(v.createdAt).toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
