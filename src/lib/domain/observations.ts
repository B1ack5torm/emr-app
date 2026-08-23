import { ObservationInterpretation } from "@prisma/client";

export type NumericObservationRange = { value: number; referenceLow?: number | null; referenceHigh?: number | null; criticalLow?: number | null; criticalHigh?: number | null };

export function interpretNumericObservation(input: NumericObservationRange): { interpretation: ObservationInterpretation; isCritical: boolean } {
  const { value, referenceLow, referenceHigh, criticalLow, criticalHigh } = input;
  if (criticalLow != null && value <= criticalLow) return { interpretation: "CRITICAL_LOW", isCritical: true };
  if (criticalHigh != null && value >= criticalHigh) return { interpretation: "CRITICAL_HIGH", isCritical: true };
  if (referenceLow != null && value < referenceLow) return { interpretation: "LOW", isCritical: false };
  if (referenceHigh != null && value > referenceHigh) return { interpretation: "HIGH", isCritical: false };
  if (referenceLow != null || referenceHigh != null) return { interpretation: "NORMAL", isCritical: false };
  return { interpretation: "INDETERMINATE", isCritical: false };
}

export function exactlyOneObservationValue(input: { valueNumber?: unknown; valueText?: unknown; valueBoolean?: unknown }) {
  return [typeof input.valueNumber === "number" && Number.isFinite(input.valueNumber), typeof input.valueText === "string" && input.valueText.trim().length > 0, typeof input.valueBoolean === "boolean"].filter(Boolean).length === 1;
}
