import assert from "node:assert/strict";
import test from "node:test";
import { calculateInvoice, invoiceSettlementStatus } from "../src/lib/domain/billing";

test("invoice totals are calculated from server inputs in paise", () => {
  const result = calculateInvoice([{ category: "CONSULTATION", description: "Consultation", quantity: 2, unitPrice: 10_000, discount: 1_000, taxRatePercent: 5 }]);
  assert.deepEqual({ subtotal: result.subtotal, discountTotal: result.discountTotal, taxTotal: result.taxTotal, grandTotal: result.grandTotal }, { subtotal: 20_000, discountTotal: 1_000, taxTotal: 950, grandTotal: 19_950 });
});

test("invoice validation rejects invalid money and discounts", () => {
  assert.throws(() => calculateInvoice([{ category: "OTHER", description: "Bad", quantity: 1, unitPrice: -1, taxRatePercent: 0 }]), /non-negative/);
  assert.throws(() => calculateInvoice([{ category: "OTHER", description: "Bad", quantity: 1, unitPrice: 100, discount: 101, taxRatePercent: 0 }]), /exceed/);
});

test("invoice settlement status accounts for refunds", () => {
  assert.equal(invoiceSettlementStatus(10_000, 10_000, 0), "PAID");
  assert.equal(invoiceSettlementStatus(10_000, 10_000, 2_500), "PARTIALLY_PAID");
  assert.equal(invoiceSettlementStatus(10_000, 10_000, 10_000), "REFUNDED");
  assert.equal(invoiceSettlementStatus(10_000, 4_000, 4_000), "UNPAID");
});
