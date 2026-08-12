"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Printer } from "lucide-react";

export default function PharmacyInvoicePage({ params }: { params: { id: string } }) {
  const [invoice, setInvoice] = useState<any>(null);
  useEffect(() => { fetch(`/api/pharmacy/invoices/${params.id}`).then(r => r.json()).then(setInvoice); }, [params.id]);
  if (!invoice) return <div className="text-inkSoft">Loading invoice…</div>;

  return (
    <div className="max-w-xl">
      <div className="flex justify-between items-center print:hidden">
        <Link href="/pharmacy" className="text-sm text-accentDark">← Pharmacy queue</Link>
        <button onClick={() => window.print()} className="flex items-center gap-1 text-sm text-accentDark border border-border rounded-lg px-3 py-1.5">
          <Printer size={14} /> Print
        </button>
      </div>
      <div className="bg-card border border-border rounded-xl p-6 mt-3">
        <div className="flex justify-between">
          <div>
            <div className="font-serif text-xl font-semibold">Pharmacy Invoice #{invoice.invoiceNo}</div>
            <div className="text-sm text-inkSoft">{invoice.patient.name} · {invoice.patient.mrn}</div>
          </div>
          <div className="text-sm">{new Date(invoice.createdAt).toLocaleDateString()}</div>
        </div>
        <div className="border-t border-border mt-5 pt-3 space-y-2">
          {invoice.items.map((item: any) => (
            <div key={item.id} className="flex justify-between text-sm">
              <span>{item.description} × {item.quantity}</span>
              <span>₹{(item.total / 100).toFixed(2)}</span>
            </div>
          ))}
        </div>
        <div className="border-t border-border mt-4 pt-3 text-right font-semibold">
          Total: ₹{(invoice.grandTotal / 100).toFixed(2)}
        </div>
      </div>
    </div>
  );
}