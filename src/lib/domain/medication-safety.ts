export type MedicationSafetyWarning = { index: number; code: "ALLERGY" | "DUPLICATE_THERAPY" | "INTERACTION"; severity: "HIGH" | "MODERATE"; message: string };
type MedicationInput = { medicine?: string; medication?: string; genericName?: string };

const interactionPairs: Array<[string[], string[], string]> = [
  [["warfarin"], ["aspirin", "ibuprofen", "diclofenac", "naproxen"], "Bleeding risk may increase when an anticoagulant is combined with an NSAID/antiplatelet."],
  [["sildenafil", "tadalafil"], ["nitroglycerin", "isosorbide"], "PDE-5 inhibitors with nitrates can cause severe hypotension."],
  [["clarithromycin", "erythromycin"], ["simvastatin", "lovastatin"], "This combination can substantially increase statin exposure and muscle toxicity risk."],
  [["spironolactone"], ["potassium", "losartan", "enalapril", "lisinopril", "ramipril"], "This combination can increase hyperkalaemia risk."],
  [["methotrexate"], ["trimethoprim", "cotrimoxazole", "co-trimoxazole"], "This combination can cause severe antifolate toxicity and marrow suppression."],
];

export function normalizeMedication(value: string) { return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim(); }
function terms(item: MedicationInput) { return normalizeMedication(`${item.genericName || ""} ${item.medicine || item.medication || ""}`); }
function containsAny(value: string, candidates: string[]) { return candidates.some((candidate) => value.includes(candidate)); }

export function evaluateMedicationSafety(proposed: MedicationInput[], activeMedications: MedicationInput[], allergies: string[]): MedicationSafetyWarning[] {
  const warnings: MedicationSafetyWarning[] = [];
  const activeTerms = activeMedications.map(terms).filter(Boolean);
  const proposedTerms = proposed.map(terms);
  proposedTerms.forEach((medication, index) => {
    if (!medication) return;
    const matchingAllergy = allergies.find((allergy) => { const normalized = normalizeMedication(allergy); return normalized.length >= 4 && (medication.includes(normalized) || normalized.includes(medication)); });
    if (matchingAllergy) warnings.push({ index, code: "ALLERGY", severity: "HIGH", message: `${proposed[index].medicine} may match the active allergy “${matchingAllergy}”.` });
    const duplicate = [...activeTerms, ...proposedTerms.slice(0, index)].some((other) => other === medication || (other.length >= 5 && medication.includes(other)) || (medication.length >= 5 && other.includes(medication)));
    if (duplicate) warnings.push({ index, code: "DUPLICATE_THERAPY", severity: "MODERATE", message: `${proposed[index].medicine} may duplicate an active or newly entered medication.` });
    const allOther = [...activeTerms, ...proposedTerms.filter((_, otherIndex) => otherIndex !== index)];
    for (const [left, right, message] of interactionPairs) {
      const matchesPair = (containsAny(medication, left) && allOther.some((other) => containsAny(other, right))) || (containsAny(medication, right) && allOther.some((other) => containsAny(other, left)));
      if (matchesPair && !warnings.some((warning) => warning.index === index && warning.code === "INTERACTION" && warning.message === message)) warnings.push({ index, code: "INTERACTION", severity: "HIGH", message });
    }
  });
  return warnings;
}
