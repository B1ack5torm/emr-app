"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Pill, Plus, Receipt, Clock, CheckCircle2 } from "lucide-react";

type Line = { description: string; quantity: number; unitPrice: number; taxRatePercent: number };

export default function PharmacyPage() {
  const [tab, setTab] = useState<"pending" | "dispensed">("pending");
  const [orders, setOrders] = useState<any[]>([]);
  const [invoices, setInvoices] = useState<any[]>([]);
  const [selected, setSelected] = useState<any>(null);
  const [items, setItems] = useState<Line[]>([]);
  const [error, setError] = useState("");

  const loadOrders = () => fetch("/api/pharmacy/orders?status=PENDING").then(r => r.json()).then(setOrders);
  const loadInvoices = () => fetch("/api/pharmacy/invoices").then(r => r.json()).then(setInvoices);

  useEffect(() => { loadOrders(); }, []);
  useEffect(() => { if (tab === "dispensed") loadInvoices(); }, [tab]);

  const select = (order: any) => { setSelected(order); setItems(order.items.map((i: any) => ({ description: i.medicine + (i.dosage ? ` ${i.dosage}` : ""), quantity: 1, unitPrice: 0, taxRatePercent: 0 }))); setError(""); };
  const update = (index: number, key: keyof Line, value: string) => setItems(items.map((line, i) => i === index ? { ...line, [key]: key === "description" ? value : Number(value) } : line));
  const dispense = async () => {
    const response = await fetch(`/api/pharmacy/orders/${selected.id}/dispense`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ items }) });
    const data = await response.json();
    if (!response.ok) return setError(data.error || "Could not create medicine invoice.");
    window.location.href = `/pharmacy/invoices/${data.id}`;
  };

  return (
    <div>
      <div className="font-serif text-lg font-semibold flex gap-2 items-center"><Pill size={18} /> Pharmacy queue</div>
      <p className="text-sm text-inkSoft mt-1 mb-4">Dispense prescribed medicines and issue a separate pharmacy invoice.</p>

      <div className="flex gap-2 mb-5">
        <button onClick={() => { setTab("pending"); setSelected(null); }} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${tab === "pending" ? "bg-accentSoft text-accentDark border-accentSoft" : "border-border text-inkSoft"}`}>
          <Clock size={13} /> Pending ({orders.length})
        </button>
        <button onClick={() => setTab("dispensed")} className={`flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-lg border ${tab === "dispensed" ? "bg-accentSoft text-accentDark border-accentSoft" : "border-border text-inkSoft"}`}>
          <CheckCircle2 size={13} /> Dispensed invoices
        </button>
      </div>

      {tab === "pending" ? (
        <div className="grid lg:grid-cols-2 gap-5">
          <div className="space-y-2">
            {orders.map(order => (
              <button key={order.id} onClick={() => select(order)} className="w-full text-left bg-card border border-border rounded-lg p-4">
                <b>{order.patient.name}</b> <span className="font-mono text-xs text-inkSoft">{order.patient.mrn}</span>
                <div className="text-xs text-inkSoft mt-1">{order.items.map((i: any) => i.medicine).join(", ")} · Dr. {order.visit.doctor?.name || "—"}</div>
              </button>
            ))}
            {orders.length === 0 && <div className="text-sm text-inkSoft border border-dashed border-border rounded-lg p-5">No prescriptions awaiting dispensing.</div>}
          </div>

          {selected && (
            <div className="bg-card border border-border rounded-lg p-4">
              <div className="font-semibold mb-1">{selected.patient.name}</div>
              <div className="text-xs text-inkSoft mb-3">{selected.patient.phone || "No phone"} · {selected.visit.chiefComplaint || "General visit"}</div>
              <div className="grid grid-cols-[2fr_70px_90px_70px] gap-2 mb-1">
                <span className="text-xs font-semibold text-inkSoft uppercase">Medicine</span>
                <span className="text-xs font-semibold text-inkSoft uppercase">Qty</span>
                <span className="text-xs font-semibold text-inkSoft uppercase">Unit ₹</span>
                <span className="text-xs font-semibold text-inkSoft uppercase">Tax %</span>
              </div>
              <div className="space-y-2">
                {items.map((item, i) => (
                  <div key={i} className="grid grid-cols-[2fr_70px_90px_70px] gap-2">
                    <input className="input" value={item.description} onChange={e => update(i, "description", e.target.value)} />
                    <input className="input no-spinner" type="number" min="1" value={item.quantity} onChange={e => update(i, "quantity", e.target.value)} />
                    <input className="input no-spinner" type="number" min="0" step="0.01" value={item.unitPrice} onChange={e => update(i, "unitPrice", e.target.value)} />
                    <input className="input no-spinner" type="number" min="0" value={item.taxRatePercent} onChange={e => update(i, "taxRatePercent", e.target.value)} />
                  </div>
                ))}
              </div>
              <button onClick={() => setItems([...items, { description: "", quantity: 1, unitPrice: 0, taxRatePercent: 0 }])} className="mt-3 text-sm text-accentDark"><Plus size={14} className="inline" /> Add medicine</button>
              {error && <div className="text-alert text-sm mt-2">{error}</div>}
              <button onClick={dispense} className="mt-4 w-full bg-accent text-white rounded-lg py-2 text-sm font-semibold"><Receipt size={14} className="inline mr-1" /> Dispense & create pharmacy invoice</button>
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {invoices.map((inv) => (
            <Link key={inv.id} href={`/pharmacy/invoices/${inv.id}`} className="bg-card border border-border rounded-lg px-4 py-3 flex items-center justify-between">
              <div>
                <div className="font-semibold text-sm">Invoice #{inv.invoiceNo} · {inv.patient.name}</div>
                <div className="text-xs text-inkSoft">{inv.patient.mrn} · {new Date(inv.createdAt).toLocaleDateString()}</div>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-sm font-mono">₹{(inv.grandTotal / 100).toFixed(2)}</span>
                <span className="px-2.5 py-1 rounded-full text-xs font-semibold bg-accentSoft text-accentDark">DISPENSED</span>
              </div>
            </Link>
          ))}
          {invoices.length === 0 && <div className="text-sm text-inkSoft border border-dashed border-border rounded-lg p-5">No dispensed invoices yet.</div>}
        </div>
      )}

      <style jsx>{`.input { width:100%; padding:8px; border:1px solid #E2DCCE; border-radius:8px; background:#FCFAF5; font-size:13px; } .no-spinner::-webkit-outer-spin-button, .no-spinner::-webkit-inner-spin-button { -webkit-appearance: none; margin: 0; } .no-spinner { -moz-appearance: textfield; }`}</style>
    </div>
  );
}