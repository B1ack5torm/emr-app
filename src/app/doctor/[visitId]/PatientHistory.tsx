import { useEffect, useState } from "react";
import { ChevronDown, FileText, History } from "lucide-react";
import { browserSessionPath, sessionFetch } from "@/lib/session-scope";
import type { HistoryVisit } from "@/app/api/visits/[id]/history/route";

const dateTime = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeStyle: "short" });
const clinicalDate = new Intl.DateTimeFormat(undefined, { dateStyle: "medium", timeZone: "UTC" });

export default function PatientHistory({ visitId }: { visitId: string }) {
  const [visits, setVisits] = useState<HistoryVisit[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    sessionFetch(`/api/visits/${visitId}/history`, { signal: controller.signal })
      .then((response) => {
        if (!response.ok) throw new Error("Could not load patient history.");
        return response.json() as Promise<HistoryVisit[]>;
      })
      .then((history) => { if (!controller.signal.aborted) setVisits(history); })
      .catch(() => { if (!controller.signal.aborted) setFailed(true); });
    return () => controller.abort();
  }, [visitId, attempt]);

  return (
    <aside aria-labelledby="patient-history-title" className="min-w-0 self-start rounded-xl border border-border bg-card lg:sticky lg:top-4">
      <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
        <h2 id="patient-history-title" tabIndex={-1} className="flex items-center gap-2 font-serif text-base font-semibold">
          <History size={17} aria-hidden="true" className="text-accent" /> Patient history
        </h2>
        {!!visits?.length && <span className="text-xs font-semibold text-inkSoft">{visits.length} previous {visits.length === 1 ? "visit" : "visits"}</span>}
      </div>
      {failed ? (
        <div className="p-4 text-sm">
          <p role="alert" className="text-alert">Could not load patient history.</p>
          <button
            type="button"
            className="mt-2 rounded-lg border border-border px-3 py-1.5 font-semibold text-accentDark hover:bg-accentSoft"
            onClick={() => { setFailed(false); setAttempt((current) => current + 1); }}
          >
            Try again
          </button>
        </div>
      ) : visits === null ? (
        <p role="status" className="p-4 text-sm text-inkSoft">Loading patient history…</p>
      ) : visits.length === 0 ? (
        <p className="p-4 text-sm text-inkSoft">No previous visits recorded.</p>
      ) : (
        <div className="space-y-2 p-3 lg:max-h-[calc(100dvh-6rem)] lg:overflow-y-auto">
          {visits.map((visit, index) => <PastVisit key={visit.id} visit={visit} initiallyOpen={index === 0} />)}
        </div>
      )}
    </aside>
  );
}

function PastVisit({ visit, initiallyOpen }: { visit: HistoryVisit; initiallyOpen: boolean }) {
  const diagnosis = visit.diagnosis || visit.diagnoses[0]?.description;
  return (
    <details open={initiallyOpen} className="group rounded-lg border border-border bg-[#FAF8F2]">
      <summary className="flex cursor-pointer list-none items-start justify-between gap-2 rounded-lg px-3 py-2.5 hover:bg-accentSoft [&::-webkit-details-marker]:hidden">
        <span className="min-w-0">
          <time dateTime={visit.createdAt} className="block text-sm font-semibold text-accentDark">{dateTime.format(new Date(visit.createdAt))}</time>
          <span className="block text-xs text-inkSoft">{visit.doctor ? `Dr. ${visit.doctor.name}` : "Doctor not recorded"}{visit.status === "AMENDED" ? " · Amended" : ""}</span>
          <span className="mt-1 block truncate text-sm font-medium">{diagnosis || visit.chiefComplaint || visit.reasonForVisit || "Consultation"}</span>
        </span>
        <ChevronDown size={16} aria-hidden="true" className="mt-0.5 shrink-0 text-accentDark group-open:rotate-180" />
      </summary>

      <div className="space-y-4 border-t border-border bg-white p-3 text-sm [overflow-wrap:anywhere]">
        <HistoryFields fields={[
          ["Chief complaint", visit.chiefComplaint],
          ["Reason for visit", visit.reasonForVisit],
          ["History of present illness", visit.historyOfPresentIllness],
          ["Past medical history", visit.pastMedicalHistory],
          ["Surgical history", visit.surgicalHistory],
          ["Family history", visit.familyHistory],
          ["Social history", visit.socialHistory],
          ["Review of systems", visit.reviewOfSystems],
          ["Examination", visit.examination],
          ["Doctor’s notes", visit.doctorNotes],
          ["Diagnosis", visit.diagnoses.some((item) => item.description === visit.diagnosis) ? null : visit.diagnosis],
        ]} />

        {visit.diagnoses.length > 0 && <HistorySection title="Recorded diagnoses">
          <ul className="space-y-1">
            {visit.diagnoses.map((item) => <li key={item.id}>
              {item.description}
              <DetailsLine values={[item.isPrimary ? "Primary" : null, [item.codingSystem, item.code].filter(Boolean).join(" "), item.clinicalStatus]} />
            </li>)}
          </ul>
        </HistorySection>}

        <VisitVitals visit={visit} />

        <HistoryFields fields={[
          ["Assessment", visit.assessment],
          ["Treatment plan", visit.treatmentPlan],
          ["Advice to patient", visit.advice],
          ["Follow-up date", visit.followUpDate && clinicalDate.format(new Date(visit.followUpDate))],
          ["Referral notes", visit.referralNotes],
          ["Private note", visit.privateNote],
        ]} />

        {visit.prescriptions.length > 0 && <HistorySection title="Prescriptions">
          <ul className="space-y-2.5">
            {visit.prescriptions.map((item) => <li key={item.id}>
              <p className="font-semibold">{item.medicine}</p>
              <DetailsLine values={[item.genericName, item.strength, item.status === "ACTIVE" ? null : statusLabel(item.status)]} />
              <DetailsLine values={[item.dosage, [item.dose, item.dosageUnit].filter(Boolean).join(" "), item.route, item.frequency, item.duration, item.foodInstruction]} />
              <DetailsLine values={[item.quantity != null ? `Quantity ${item.quantity}` : null, item.startDate && `Start ${clinicalDate.format(new Date(item.startDate))}`, item.reference]} />
              <HistoryFields fields={[["Directions", item.directions], ["Safety override reason", item.interactionOverrideReason]]} />
            </li>)}
          </ul>
        </HistorySection>}

        {visit.testsOrdered.length > 0 && <HistorySection title="Tests ordered">
          <ul className="list-disc space-y-1 pl-4">{visit.testsOrdered.map((item) => <li key={item.id}>{item.name}</li>)}</ul>
        </HistorySection>}

        {visit.imagingRecommendations.length > 0 && <HistorySection title="Imaging recommendations">
          <ul className="space-y-2">
            {visit.imagingRecommendations.map((item) => <li key={item.id}>
              <p className="font-semibold">{item.name}</p>
              <DetailsLine values={[item.modality, item.bodyPart, item.code]} />
              {item.description !== item.name && <p className="whitespace-pre-wrap">{item.description}</p>}
            </li>)}
          </ul>
        </HistorySection>}

        {visit.imagingOrders.length > 0 && <HistorySection title="Imaging orders">
          <ul className="space-y-2">
            {visit.imagingOrders.map((item) => <li key={item.id}>
              <p className="font-semibold">{item.procedureDescription}</p>
              <DetailsLine values={[item.modality, item.bodyPart, item.procedureCode, statusLabel(item.status), `Accession ${item.accessionNumber}`]} />
              <HistoryFields fields={[["Clinical indication", item.clinicalIndication]]} />
            </li>)}
          </ul>
        </HistorySection>}

        {visit.diagnosticOrders.length > 0 && <DiagnosticResults orders={visit.diagnosticOrders} />}
        {visit.documents.length > 0 && <HistorySection title="Visit documents"><DocumentLinks documents={visit.documents} /></HistorySection>}

        {visit.amendments.length > 0 && <HistorySection title="Amendments">
          <ul className="space-y-2">
            {visit.amendments.map((item) => <li key={item.id}>
              <time dateTime={item.createdAt} className="text-xs text-inkSoft">{dateTime.format(new Date(item.createdAt))}</time>
              <p className="whitespace-pre-wrap">{item.reason}</p>
            </li>)}
          </ul>
        </HistorySection>}

        {visit.signedAt && <footer className="border-t border-border pt-2 text-xs text-inkSoft">
          Signed <time dateTime={visit.signedAt}>{dateTime.format(new Date(visit.signedAt))}</time>
        </footer>}
      </div>
    </details>
  );
}

function VisitVitals({ visit }: { visit: HistoryVisit }) {
  const intake = [
    visit.bp && `BP ${visit.bp}`,
    visit.temperature && `Temp ${visit.temperature} °F`,
    visit.pulse && `Pulse ${visit.pulse} bpm`,
    visit.weight && `Weight ${visit.weight} kg`,
  ].filter(Boolean).join(" · ");
  if (!intake && !visit.vitals.length) return null;

  return <HistorySection title="Vitals">
    {intake && <p>Intake · {intake}</p>}
    {visit.vitals.map((item) => {
      const bp = item.systolicBp != null || item.diastolicBp != null ? `BP ${item.systolicBp ?? "—"}/${item.diastolicBp ?? "—"} mmHg` : null;
      return <div key={item.id} className="mt-1">
        <time dateTime={item.measuredAt} className="text-xs text-inkSoft">{dateTime.format(new Date(item.measuredAt))}</time>
        <p>{[
          bp,
          measurement("Temp", item.temperatureC, " °C"),
          measurement("Pulse", item.pulseBpm, " bpm"),
          measurement("Respiratory rate", item.respiratoryRate, " breaths/min"),
          measurement("SpO₂", item.oxygenSaturation, "%"),
          measurement("Height", item.heightCm, " cm"),
          measurement("Weight", item.weightKg, " kg"),
          measurement("BMI", item.bmi, ""),
        ].filter(Boolean).join(" · ")}</p>
      </div>;
    })}
  </HistorySection>;
}

function DiagnosticResults({ orders }: { orders: HistoryVisit["diagnosticOrders"] }) {
  return <HistorySection title="Diagnostic orders and results">
    <ul className="space-y-3">
      {orders.map((order) => <li key={order.id} className="rounded-md border border-border p-2">
        <p className="font-semibold">{order.procedureName}</p>
        <DetailsLine values={[statusLabel(order.type), statusLabel(order.status), order.orderNumber]} />
        <HistoryFields fields={[["Clinical indication", order.clinicalIndication], ["Result summary", order.resultSummary]]} />
        {order.observations.length > 0 && <ul className="mt-2 divide-y divide-border">
          {order.observations.map((item) => {
            const value = item.valueNumber ?? item.valueText ?? (item.valueBoolean == null ? "—" : item.valueBoolean ? "Yes" : "No");
            const reference = item.referenceText || [item.referenceLow, item.referenceHigh].filter((limit) => limit != null).join("–");
            return <li key={item.id} className="py-1.5 text-xs">
              <div className="flex justify-between gap-2"><span className="font-semibold">{item.display}</span><span className="text-right">{value} {item.unit}</span></div>
              <DetailsLine values={[reference && `Reference ${reference}`, statusLabel(item.status), statusLabel(item.interpretation)]} />
              {item.isCritical && <p className="font-semibold text-alert">Critical</p>}
            </li>;
          })}
        </ul>}
        {order.documents.length > 0 && <div className="mt-2"><DocumentLinks documents={order.documents} /></div>}
      </li>)}
    </ul>
  </HistorySection>;
}

function DocumentLinks({ documents }: { documents: HistoryVisit["documents"] }) {
  return <ul className="space-y-1">
    {documents.map((document) => <li key={document.id}>
      <a href={browserSessionPath(`/api/documents/${document.id}?inline=1`)} target="_blank" rel="noreferrer" className="inline-flex items-start gap-1.5 font-semibold text-accentDark underline">
        <FileText size={14} aria-hidden="true" className="mt-0.5 shrink-0" />{document.originalName}
      </a>
    </li>)}
  </ul>;
}

function HistoryFields({ fields }: { fields: [label: string, value: string | null][] }) {
  const recorded = fields.filter(([, value]) => value?.trim());
  if (!recorded.length) return null;
  return <dl className="space-y-2">
    {recorded.map(([label, value]) => <div key={label}>
      <dt className="text-xs font-semibold text-inkSoft">{label}</dt>
      <dd className="whitespace-pre-wrap">{value}</dd>
    </div>)}
  </dl>;
}

function HistorySection({ title, children }: { title: string; children: React.ReactNode }) {
  return <section>
    <h3 className="mb-1 text-xs font-semibold text-inkSoft">{title}</h3>
    {children}
  </section>;
}

function DetailsLine({ values }: { values: (string | null)[] }) {
  const text = values.filter(Boolean).join(" · ");
  return text ? <p className="text-xs text-inkSoft">{text}</p> : null;
}

function measurement(label: string, value: number | null, unit: string) {
  return value == null ? null : `${label} ${value}${unit}`;
}

function statusLabel(status: string) {
  return status.charAt(0) + status.slice(1).toLowerCase().replaceAll("_", " ");
}
