export type BillingLineInput = { category: string; description: string; quantity: number; unitPrice: number; taxRatePercent: number; discount?: number };
export type CatalogPriceOption = { category: string; code: string; name: string; unitPrice: number; taxable: boolean };

export type SettlementStatus = "UNPAID" | "PARTIALLY_PAID" | "PAID" | "REFUNDED";

export function invoiceSettlementStatus(grandTotal: number, grossPaid: number, refunded: number): SettlementStatus {
  if (![grandTotal, grossPaid, refunded].every(Number.isSafeInteger) || grandTotal < 0 || grossPaid < 0 || refunded < 0 || refunded > grossPaid) throw new Error("Invalid invoice settlement totals.");
  const netPaid = grossPaid - refunded;
  if (grandTotal > 0 && grossPaid >= grandTotal && refunded >= grandTotal) return "REFUNDED";
  if (netPaid <= 0) return "UNPAID";
  if (netPaid < grandTotal) return "PARTIALLY_PAID";
  return "PAID";
}

export function calculateInvoice(lines: BillingLineInput[]) {
  if (!Array.isArray(lines) || lines.length === 0) throw new Error("At least one line item is required.");
  let subtotal = 0, discountTotal = 0, taxTotal = 0;
  const items = lines.map((line) => {
    if (!line.description?.trim()) throw new Error("Every line item needs a description.");
    if (!Number.isInteger(line.quantity) || line.quantity < 1 || line.quantity > 10_000) throw new Error("Quantity must be a positive whole number.");
    if (!Number.isInteger(line.unitPrice) || line.unitPrice < 0) throw new Error("Unit price must be a non-negative amount in paise.");
    if (!Number.isFinite(line.taxRatePercent) || line.taxRatePercent < 0 || line.taxRatePercent > 100) throw new Error("Tax rate must be between 0 and 100.");
    const grossAmount = line.quantity * line.unitPrice;
    const discount = Math.round(Number(line.discount) || 0);
    if (discount < 0 || discount > grossAmount) throw new Error("Discount cannot exceed the line amount.");
    const amount = grossAmount - discount;
    const taxAmount = Math.round(amount * line.taxRatePercent / 100);
    subtotal += grossAmount; discountTotal += discount; taxTotal += taxAmount;
    return { ...line, description: line.description.trim(), discount, amount, taxAmount, total: amount + taxAmount };
  });
  return { items, subtotal, discountTotal, taxTotal, grandTotal: subtotal - discountTotal + taxTotal };
}

function normalizedServiceText(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

export function resolveCatalogPrice(category: string, lookupTerms: string[], options: CatalogPriceOption[]) {
  const candidates = options.filter((option) => option.category === category && Number.isSafeInteger(option.unitPrice) && option.unitPrice >= 0);
  let best: { option: CatalogPriceOption; score: number } | null = null;
  for (const [termIndex, term] of lookupTerms.entries()) {
    const lookup = normalizedServiceText(term);
    if (!lookup) continue;
    for (const option of candidates) {
      const name = normalizedServiceText(option.name), code = normalizedServiceText(option.code);
      let match = 0;
      if (lookup === name) match = 100;
      else if (lookup === code) match = 95;
      else if (name.length >= 3 && lookup.includes(name)) match = 80 + Math.min(name.length, 19);
      else if (lookup.length >= 3 && name.includes(lookup)) match = 60 + Math.min(lookup.length, 19);
      if (!match) continue;
      const score = (lookupTerms.length - termIndex) * 1_000 + match;
      if (!best || score > best.score) best = { option, score };
    }
  }
  return best?.option || null;
}

export function splitOrderedTests(value: string) {
  return value.split(/[,;]+/).map((part) => part.trim().replace(/^and\s+/i, "").replace(/[.]+$/, "").trim()).filter(Boolean);
}
