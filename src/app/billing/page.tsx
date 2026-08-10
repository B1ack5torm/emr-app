"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Receipt, Plus, IndianRupee } from "lucide-react";

export default function BillingPage() {
  const [invoices, setInvoices] = useState<any[]>([]);
  const [pendingVisits, setPendingVisits] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = async () => {
    const [invRes, visitRes] = await Promise.all([
      fetch("/api/invoices").then((r) => r.json()),
      fetch("/api/visits?status=COMPLETED").then((r) => r.json()),
    ]);
    setInvoices(invRes);
    setPendingVisits(visitRes.filter((v: any) => !v.invoice));
    setLoading(false);
  };
  useEffect(() => { load(); }, []);

  const generate = async (visitId: string) => {
    const res = await fetch(`/api/visits/${visitId}/invoice`, { method: "POST" });
    if (res.ok) { const inv = await res.json(); window.location.href = `/billing/${inv.id}`; }
  };

  const statusColor = (s: string) => s === "PAID" ? "bg-accentSoft text-accentDark" : s === "PARTIALLY_PAID" ? "bg-waitingSoft text-waiting" : s === "VOID" ? "bg-[#eee] text-inkSoft" : "bg-alertSoft text-alert";

  if (loading) return <div className="text-inkSoft">Loading…</div>;

  return (
    <div>
      <div className="font-serif text-lg font-semibold mb-1 flex items-center gap-2"><Receipt size={18} /> Billing</div>
      <p className="text-sm text-inkSoft mb-6">Generate invoices for completed visits and track payments.</p>

      {pendingVisits.length > 0 && (
        <div className="mb-8">
          <div className="text-xs font-bold text-inkSoft uppercase mb-2">Completed visits awaiting invoice ({pendingVisits.length})</div>
          <div className="flex flex-col gap-2">
            {pendingVisits.map((v) => (
              <div key={v.id} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
                <div>
                  <div className="font-semibold text-sm">{v.patient.name}</div>
                  <div className="text-xs text-inkSoft">{new Date(v.createdAt).toLocaleDateString()} · {v.chiefComplaint || "General visit"}</div>
                </div>
                <button onClick={() => generate(v.id)} className="flex items-center gap-1 bg-accent text-white text-sm font-semibold px-3 py-1.5 rounded-lg"><Plus size={14} /> Generate invoice</button>
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="text-xs font-bold text-inkSoft uppercase mb-2">Invoices</div>
      <div className="flex flex-col gap-2">
        {invoices.map((inv) => (
          <Link key={inv.id} href={`/billing/${inv.id}`} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
            <div>
              <div className="font-semibold text-sm">INV-{inv.invoiceNo} · {inv.patient.name}</div>
              <div className="text-xs text-inkSoft">{new Date(inv.createdAt).toLocaleDateString()}</div>
            </div>
            <div className="flex items-center gap-3">
              <span className="text-sm font-mono flex items-center gap-0.5"><IndianRupee size={12} />{(inv.grandTotal / 100).toFixed(2)}</span>
              <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColor(inv.status)}`}>{inv.status.replace("_", " ")}</span>
            </div>
          </Link>
        ))}
        {invoices.length === 0 && <div className="text-sm text-inkSoft">No invoices yet.</div>}
      </div>
    </div>
  );
}