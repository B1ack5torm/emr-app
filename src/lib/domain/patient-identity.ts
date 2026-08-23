export type PatientIdentityInput = {
  id?: string;
  mrn?: string;
  name?: string | null;
  dateOfBirth?: Date | string | null;
  phone?: string | null;
  email?: string | null;
};

export function normalizePatientName(value: string | null | undefined) {
  return String(value || "").normalize("NFKD").replace(/[^a-zA-Z0-9\s]/g, " ").toLowerCase().replace(/\s+/g, " ").trim();
}

export function normalizePatientPhone(value: string | null | undefined) {
  const digits = String(value || "").replace(/\D/g, "");
  return digits.length > 10 ? digits.slice(-10) : digits;
}

export function normalizePatientEmail(value: string | null | undefined) {
  return String(value || "").trim().toLowerCase();
}

function dateKey(value: Date | string | null | undefined) {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  return Number.isNaN(date.getTime()) ? "" : date.toISOString().slice(0, 10);
}

function nameSimilarity(left: string, right: string) {
  if (!left || !right) return 0;
  if (left === right) return 1;
  const leftParts = new Set(left.split(" ").filter(Boolean));
  const rightParts = new Set(right.split(" ").filter(Boolean));
  const shared = [...leftParts].filter((part) => rightParts.has(part)).length;
  return shared / Math.max(leftParts.size, rightParts.size, 1);
}

export function scorePotentialDuplicate(input: PatientIdentityInput, candidate: PatientIdentityInput) {
  const reasons: string[] = [];
  let score = 0;
  const inputName = normalizePatientName(input.name);
  const candidateName = normalizePatientName(candidate.name);
  const similarity = nameSimilarity(inputName, candidateName);
  if (similarity === 1) { score += 35; reasons.push("same name"); }
  else if (similarity >= 0.67) { score += 20; reasons.push("similar name"); }

  const inputDob = dateKey(input.dateOfBirth), candidateDob = dateKey(candidate.dateOfBirth);
  if (inputDob && inputDob === candidateDob) { score += 35; reasons.push("same date of birth"); }

  const inputPhone = normalizePatientPhone(input.phone), candidatePhone = normalizePatientPhone(candidate.phone);
  if (inputPhone.length >= 7 && inputPhone === candidatePhone) { score += 45; reasons.push("same phone"); }

  const inputEmail = normalizePatientEmail(input.email), candidateEmail = normalizePatientEmail(candidate.email);
  if (inputEmail && inputEmail === candidateEmail) { score += 45; reasons.push("same email"); }

  return { score: Math.min(score, 100), reasons };
}

export function rankPotentialDuplicates<T extends PatientIdentityInput>(input: PatientIdentityInput, candidates: T[], minimumScore = 45) {
  return candidates
    .filter((candidate) => !input.id || candidate.id !== input.id)
    .map((candidate) => ({ ...candidate, ...scorePotentialDuplicate(input, candidate) }))
    .filter((candidate) => candidate.score >= minimumScore)
    .sort((left, right) => right.score - left.score);
}
