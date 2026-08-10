"use client";
import { useEffect, useState } from "react";
import { Plus, X, Printer, CheckCircle2 } from "lucide-react";

type Item = { category: string; description: string; quantity: number; unitPrice: number; taxRatePercent: number };
const CATEGORIES = ["CONSULTATION", "MEDICINE", "TEST", "IMAGING", "OTHER"];
const METHODS = ["CASH", "CARD", "UPI", "BANK_TRANSFER", "OTHER"];

export default function InvoiceDetailPage({ params }: { params: { invoiceId: string } }) {
  const [invoice, setInvoice] = useState<any>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [payAmount, setPayAmount] = useState("");
  const [payMethod, setPayMethod] = useState("CASH");
  const [payRef, setPayRef] = useState("");
  const [payError, setPayError] = useState("");

  const load = () => fetch(`/api/invoices/${params.invoiceId}`).then((r) => r.json()).then((inv) => {
    setInvoice(inv);
    setItems(inv.items.map((it: any) => ({ category: it.category, description: it.description, quantity: it.quantity, unitPrice: it.unitPrice / 100, taxRatePercent: it.taxRatePercent })));
  });
  useEffect(() => { load(); }, [params.invoiceId]);

  if (!invoice) return <div className="text-inkSoft">Loading…</div>;

  const money = (paise: number) => `₹${(paise / 100).toLocaleString("en-IN", { minimumFractionDigits: 2 })}`;
  const locked = invoice.status === "VOID";
  const updateItem = (i: number, field: keyof Item, val: any) => setItems(items.map((it, idx) => idx === i ? { ...it, [field]: val } : it));
  const addItem = () => setItems([...items, { category: "OTHER", description: "", quantity: 1, unitPrice: 0, taxRatePercent: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));

  const preview = items.reduce((acc, it) => {
    const amount = it.quantity * it.unitPrice;
    const tax = (amount * it.taxRatePercent) / 100;
    return { subtotal: acc.subtotal + amount, tax: acc.tax + tax, total: acc.total + amount + tax };
  }, { subtotal: 0, tax: 0, total: 0 });

  const saveItems = async () => {
    setError("");
    if (items.some((it) => !it.description.trim())) { setError("Every line item needs a description."); return; }
    setSaving(true);
    const res = await fetch(`/api/invoices/${params.invoiceId}`, {
      method: "PATCH", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ items: items.map((it) => ({ ...it, unitPrice: Math.round(it.unitPrice * 100) })) }),
    });
    setSaving(false);
    if (res.ok) load(); else setError("Could not save changes.");
  };

  const recordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    setPayError("");
    const res = await fetch(`/api/invoices/${params.invoiceId}/payments`, {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ amount: Math.round(Number(payAmount) * 100), method: payMethod, reference: payRef }),
    });
    const data = await res.json();
    if (!res.ok) { setPayError(data.error || "Could not record payment."); return; }
    setPayAmount(""); setPayRef("");
    load();
  };

  const voidInvoice = async () => {
    if (!confirm("Void this invoice? This cannot be undone.")) return;
    await fetch(`/api/invoices/${params.invoiceId}`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ voided: true }) });
    load();
  };

  const remaining = invoice.grandTotal - invoice.amountPaid;

  return (
    <div>
      <div className="flex justify-between items-start mb-4 print:hidden">
        <div>
          <div className="font-serif text-lg font-semibold">Invoice INV-{invoice.invoiceNo}</div>
          <div className="text-xs text-inkSoft">{invoice.patient.name} · {new Date(invoice.createdAt).toLocaleDateString()}</div>
        </div>
        <div className="flex gap-2">
          <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5"><Printer size={14} /> Print</button>
          {!locked && <button onClick={voidInvoice} className="text-alert text-sm font-semibold border border-alertSoft rounded-lg px-3 py-1.5">Void invoice</button>}
        </div>
      </div>

      <div className="bg-card border border-border rounded-xl p-6">
        <div className="flex justify-between text-sm mb-4">
          <div>
            <div className="font-semibold">{invoice.patient.name}</div>
            <div className="text-inkSoft">{invoice.patient.phone || "—"}</div>
          </div>
          <span className={`h-fit px-2.5 py-1 rounded-full text-xs font-semibold ${invoice.status === "PAID" ? "bg-accentSoft text-accentDark" : invoice.status === "PARTIALLY_PAID" ? "bg-waitingSoft text-waiting" : invoice.status === "VOID" ? "bg-[#eee] text-inkSoft" : "bg-alertSoft text-alert"}`}>{invoice.status.replace("_", " ")}</span>
        </div>

        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-xs text-inkSoft uppercase border-b border-border">
              <th className="pb-2">Category</th><th className="pb-2">Description</th><th className="pb-2 text-right">Qty</th><th className="pb-2 text-right">Unit ₹</th><th className="pb-2 text-right">Tax %</th><th className="pb-2 text-right">Total ₹</th><th className="print:hidden"></th>
            </tr>
          </thead>
          <tbody>
            {items.map((it, i) => (
              <tr key={i} className="border-b border-border/50">
                <td className="py-1.5 pr-2">
                  <select disabled={locked} value={it.category} onChange={(e) => updateItem(i, "category", e.target.value)} className="text-xs border border-border rounded px-1.5 py-1 bg-[#FCFAF5]">
                    {CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </td>
                <td className="py-1.5 pr-2"><input disabled={locked} value={it.description} onChange={(e) => updateItem(i, "description", e.target.value)} className="w-full text-sm border border-border rounded px-1.5 py-1 bg-[#FCFAF5]" /></td>
                <td className="py-1.5 pr-2 text-right"><input disabled={locked} type="number" min={1} value={it.quantity} onChange={(e) => updateItem(i, "quantity", Number(e.target.value))} className="w-14 text-right border border-border rounded px-1.5 py-1 bg-[#FCFAF5]" /></td>
                <td className="py-1.5 pr-2 text-right"><input disabled={locked} type="number" min={0} step="0.01" value={it.unitPrice} onChange={(e) => updateItem(i, "unitPrice", Number(e.target.value))} className="w-20 text-right border border-border rounded px-1.5 py-1 bg-[#FCFAF5]" /></td>
                <td className="py-1.5 pr-2 text-right"><input disabled={locked} type="number" min={0} max={100} value={it.taxRatePercent} onChange={(e) => updateItem(i, "taxRatePercent", Number(e.target.value))} className="w-14 text-right border border-border rounded px-1.5 py-1 bg-[#FCFAF5]" /></td>
                <td className="py-1.5 pr-2 text-right font-mono">{(it.quantity * it.unitPrice * (1 + it.taxRatePercent / 100)).toFixed(2)}</td>
                <td className="print:hidden">{!locked && <X size={14} className="cursor-pointer text-inkSoft" onClick={() => removeItem(i)} />}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {!locked && <button onClick={addItem} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5 mt-3 print:hidden"><Plus size={14} /> Add line item</button>}

        <div className="flex justify-end mt-4">
          <div className="w-64 text-sm">
            <div className="flex justify-between py-1"><span className="text-inkSoft">Subtotal</span><span className="font-mono">₹{preview.subtotal.toFixed(2)}</span></div>
            <div className="flex justify-between py-1"><span className="text-inkSoft">Tax</span><span className="font-mono">₹{preview.tax.toFixed(2)}</span></div>
            <div className="flex justify-between py-1.5 border-t border-border font-semibold"><span>Grand total</span><span className="font-mono">₹{preview.total.toFixed(2)}</span></div>
          </div>
        </div>

        {error && <div className="text-alert text-sm mt-2">{error}</div>}
        {!locked && <div className="flex justify-end mt-2 print:hidden"><button disabled={saving} onClick={saveItems} className="bg-accent text-white text-sm font-semibold px-4 py-2 rounded-lg">{saving ? "Saving…" : "Save changes"}</button></div>}
      </div>

      <div className="bg-card border border-border rounded-xl p-6 mt-5 print:hidden">
        <div className="text-xs font-bold text-inkSoft uppercase mb-3">Payments</div>
        <div className="flex justify-between text-sm mb-3 bg-[#FAF8F2] rounded-lg px-3 py-2">
          <span>Paid: <b>{money(invoice.amountPaid)}</b></span>
          <span>Remaining: <b className={remaining > 0 ? "text-alert" : "text-accentDark"}>{money(Math.max(remaining, 0))}</b></span>
        </div>
        <div className="flex flex-col gap-2 mb-3">
          {invoice.payments.map((p: any) => (
            <div key={p.id} className="flex justify-between text-sm border-b border-border/50 pb-1.5">
              <span>{new Date(p.paidAt).toLocaleString()} · {p.method}{p.reference ? ` (${p.reference})` : ""}</span>
              <span className="font-mono">{money(p.amount)}</span>
            </div>
          ))}
          {invoice.payments.length === 0 && <div className="text-sm text-inkSoft">No payments recorded yet.</div>}
        </div>

        {remaining > 0 && !locked && (
          <form onSubmit={recordPayment} className="flex flex-wrap items-end gap-2 border-t border-border pt-3">
            <div>
              <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Amount (₹)</label>
              <input required type="number" min={0.01} step="0.01" value={payAmount} onChange={(e) => setPayAmount(e.target.value)} className="border border-border rounded-lg px-2.5 py-1.5 text-sm bg-[#FCFAF5] w-28" />
            </div>
            <div>
              <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Method</label>
              <select value={payMethod} onChange={(e) => setPayMethod(e.target.value)} className="border border-border rounded-lg px-2.5 py-1.5 text-sm bg-[#FCFAF5]">
                {METHODS.map((m) => <option key={m} value={m}>{m.replace("_", " ")}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-inkSoft uppercase mb-1">Reference (optional)</label>
              <input value={payRef} onChange={(e) => setPayRef(e.target.value)} placeholder="UPI txn ID, card last 4…" className="border border-border rounded-lg px-2.5 py-1.5 text-sm bg-[#FCFAF5]" />
            </div>
            <button className="flex items-center gap-1 bg-accent text-white text-sm font-semibold px-3 py-2 rounded-lg"><CheckCircle2 size={14} /> Record payment</button>
          </form>
        )}
        {payError && <div className="text-alert text-sm mt-2">{payError}</div>}
      </div>
    </div>
  );
}