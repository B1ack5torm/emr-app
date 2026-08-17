export function calculateBmi(heightCm?: number | null, weightKg?: number | null) {
  if (!heightCm || !weightKg || heightCm <= 0 || weightKg <= 0) return null;
  return Math.round((weightKg / Math.pow(heightCm / 100, 2)) * 10) / 10;
}

export function medicationMatchesAllergy(medication: string, allergies: string[]) {
  const normalized = medication.trim().toLocaleLowerCase();
  return !!normalized && allergies.some((allergy) => {
    const value = allergy.trim().toLocaleLowerCase();
    return !!value && (normalized.includes(value) || value.includes(normalized));
  });
}

export function validateVitalRange(input: { heightCm?: number; weightKg?: number; temperatureC?: number; pulseBpm?: number; respiratoryRate?: number; systolicBp?: number; diastolicBp?: number; oxygenSaturation?: number }) {
  if (input.heightCm != null && (input.heightCm < 20 || input.heightCm > 275)) return "Height is outside the supported range.";
  if (input.weightKg != null && (input.weightKg < 0.2 || input.weightKg > 700)) return "Weight is outside the supported range.";
  if (input.temperatureC != null && (input.temperatureC < 25 || input.temperatureC > 45)) return "Temperature is outside the supported range.";
  if (input.pulseBpm != null && (input.pulseBpm < 10 || input.pulseBpm > 350)) return "Pulse is outside the supported range.";
  if (input.respiratoryRate != null && (input.respiratoryRate < 2 || input.respiratoryRate > 100)) return "Respiratory rate is outside the supported range.";
  if (input.systolicBp != null && (input.systolicBp < 30 || input.systolicBp > 300)) return "Systolic blood pressure is outside the supported range.";
  if (input.diastolicBp != null && (input.diastolicBp < 20 || input.diastolicBp > 200)) return "Diastolic blood pressure is outside the supported range.";
  if (input.oxygenSaturation != null && (input.oxygenSaturation < 40 || input.oxygenSaturation > 100)) return "Oxygen saturation is outside the supported range.";
  return null;
}
