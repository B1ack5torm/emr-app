function hl7Timestamp(date: Date) {
  const p = (n: number, len = 2) => String(n).padStart(len, "0");
  return `${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}`;
}

function lastFirst(name: string) {
  const parts = name.trim().split(" ");
  const last = parts.pop() || name;
  return `${last}^${parts.join(" ")}`;
}

function genderCode(gender: string) {
  if (gender === "MALE") return "M";
  if (gender === "FEMALE") return "F";
  return "U";
}

export function buildORM({
  order,
  patient,
  orgName,
}: {
  order: { accessionNumber: string; modality: string; procedureDescription: string; bodyPart?: string | null };
  patient: { id: string; name: string; gender: string; dateOfBirth?: Date | null };
  orgName: string;
}) {
  const now = new Date();
  const ts = hl7Timestamp(now);
  const controlId = `${Date.now()}`;
  const dob = patient.dateOfBirth ? hl7Timestamp(patient.dateOfBirth).slice(0, 8) : "";

  const segments = [
    `MSH|^~\\&|CARECHART|${orgName.replace(/[|^~]/g, "")}|MWL|MWL|${ts}||ORM^O01|${controlId}|P|2.3`,
    `PID|1||${patient.id}||${lastFirst(patient.name)}||${dob}|${genderCode(patient.gender)}`,
    `PV1|1|O`,
    `ORC|NW|${order.accessionNumber}|||||||${ts}`,
    `OBR|1|${order.accessionNumber}||${order.modality}^${order.procedureDescription}${order.bodyPart ? " - " + order.bodyPart : ""}|||${ts}`,
  ];

  return segments.join("\r") + "\r";
}