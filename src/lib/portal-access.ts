export type PortalArea =
  | "frontdesk"
  | "appointments"
  | "doctor"
  | "records"
  | "admin"
  | "billing"
  | "diagnostics"
  | "documents"
  | "audit"
  | "settings";

const rolesByArea: Record<PortalArea, readonly string[]> = {
  frontdesk: ["RECEPTION", "FRONT_DESK", "NURSE", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  appointments: ["RECEPTION", "FRONT_DESK", "NURSE", "DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  doctor: ["DOCTOR", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  records: ["RECEPTION", "FRONT_DESK", "NURSE", "DOCTOR", "BILLING", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  admin: ["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  billing: ["RECEPTION", "BILLING", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  diagnostics: ["DOCTOR", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  documents: ["DOCTOR", "NURSE", "RECEPTION", "FRONT_DESK", "LAB_RADIOLOGY", "ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  audit: ["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
  settings: ["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"],
};

export function roleCanAccessArea(role: string | null | undefined, area: PortalArea) {
  return !!role && rolesByArea[area].includes(role);
}

export function portalAreaForPath(pathname: string): PortalArea | null {
  const area = pathname.split("/").filter(Boolean)[0] as PortalArea | undefined;
  return area && area in rolesByArea ? area : null;
}

export function defaultPortalPath(role: string | null | undefined) {
  if (["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) return "/admin";
  if (role === "DOCTOR") return "/doctor";
  if (["RECEPTION", "FRONT_DESK"].includes(role || "")) return "/frontdesk";
  if (role === "NURSE") return "/frontdesk";
  if (role === "BILLING") return "/billing";
  if (role === "LAB_RADIOLOGY") return "/diagnostics";
  return "/records";
}
