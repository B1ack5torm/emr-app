const HOSPITAL_SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeHospitalSlug(value: unknown) {
  const slug = typeof value === "string" ? value.trim().toLowerCase() : "";
  return HOSPITAL_SLUG.test(slug) ? slug : null;
}
