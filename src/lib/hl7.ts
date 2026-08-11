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

// DICOM standard modality codes expected by InteleShare's OBR-20
function modalityCode(modality: string) {
  const map: Record<string, string> = {
    XRAY: "CR",
    CT: "CT",
    MRI: "MR",
    ULTRASOUND: "US",
    NUCLEAR: "NM",
    OTHER: "OT",
  };
  return map[modality] || "OT";
}

function procedureCode(modality: string, description: string) {
  const prefix = modalityCode(modality);
  const short = description.trim().split(" ")[0].toUpperCase().slice(0, 8);
  return `${prefix}-${short}`;
}

export function buildORM({
  order,
  patient,
  orgName,
}: {
  order: { accessionNumber: string; modality: string; procedureDescription: string; bodyPart?: string | null };
  patient: { mrn: string; name: string; gender: string; dateOfBirth?: Date | null };
  orgName: string;
}) {
  const now = new Date();
  const ts = hl7Timestamp(now);
  const controlId = `${Date.now()}`;
  const dob = patient.dateOfBirth ? hl7Timestamp(patient.dateOfBirth).slice(0, 8) : "";
  // OBR-19 is the station AE Title consumed by the MWL server.
  const stationAeTitle = process.env.MWL_STATION_AETITLE || "DG_HARVESTER";

  const procId = procedureCode(order.modality, order.procedureDescription);
  const procDesc = order.bodyPart ? `${order.procedureDescription} - ${order.bodyPart}` : order.procedureDescription;

  const msh = `MSH|^~\\&|CARECHART|${orgName.replace(/[|^~]/g, "")}|MWL|MWL|${ts}||ORM^O01|${controlId}|P|2.3`;
  const pid = `PID|1||${patient.mrn}||${lastFirst(patient.name)}||${dob}|${genderCode(patient.gender)}`;
  const pv1 = `PV1|1|O`;

  // ORC-3 = accession number (filler order number) — this is what Ambra actually links on
  const orc = `ORC|NW||${order.accessionNumber}||||||${ts}`;

  // OBR fields, built by explicit position (1-indexed) so nothing shifts:
  // 3=accession, 4=procId^procDesc, 19=station AE title, 20=modality, 27-4=start date/time
  const obrFields: string[] = new Array(27).fill("");
  obrFields[0] = "1";
  obrFields[2] = order.accessionNumber;
  obrFields[3] = `${procId}^${procDesc}`;
  obrFields[18] = stationAeTitle;
  obrFields[19] = modalityCode(order.modality);
  obrFields[26] = `^^^${ts}`;
  const obr = `OBR|${obrFields.join("|")}`;

  return [msh, pid, pv1, orc, obr].join("\r") + "\r";
}
