function hl7Timestamp(date: Date) {
  const part = (value: number, length = 2) => String(value).padStart(length, "0");
  return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}`;
}

/** Escape values placed in HL7 fields so user-entered text cannot inject fields or segments. */
export function escapeHL7(value: string) {
  return value
    .replaceAll("\\", "\\E\\")
    .replaceAll("|", "\\F\\")
    .replaceAll("^", "\\S\\")
    .replaceAll("~", "\\R\\")
    .replaceAll("&", "\\T\\")
    .replace(/[\r\n]+/g, " ");
}

function personName(name: string) {
  const parts = name.trim().split(/\s+/);
  const last = parts.pop() || name;
  return `${escapeHL7(last)}^${escapeHL7(parts.join(" "))}`;
}

function genderCode(gender: string) {
  if (gender === "MALE") return "M";
  if (gender === "FEMALE") return "F";
  return "U";
}

export function modalityCode(modality: string) {
  return ({ XRAY: "CR", CT: "CT", MRI: "MR", ULTRASOUND: "US", NUCLEAR: "NM", OTHER: "OT" } as Record<string, string>)[modality] || "OT";
}

export type ORMInput = {
  order: {
    accessionNumber: string;
    messageControlId: string;
    modality: string;
    procedureCode: string;
    procedureDescription: string;
    bodyPart?: string | null;
    clinicalIndication: string;
  };
  patient: { mrn: string; name: string; gender: string; dateOfBirth: Date };
  encounter: { id: string; providerId: string; providerName: string };
  sender: { application: string; facility: string };
  receiver: { application: string; facility: string };
  timestamp?: Date;
  stationAeTitle?: string;
};

/** Build the minimal ORM^O01 payload used by the CareChart imaging integration. */
export function buildORM(input: ORMInput) {
  const { order, patient, encounter, sender, receiver } = input;
  const now = input.timestamp || new Date();
  const timestamp = hl7Timestamp(now);
  const dob = hl7Timestamp(patient.dateOfBirth).slice(0, 8);
  const procedureDescription = order.bodyPart ? `${order.procedureDescription} - ${order.bodyPart}` : order.procedureDescription;

  const msh = `MSH|^~\\&|${escapeHL7(sender.application)}|${escapeHL7(sender.facility)}|${escapeHL7(receiver.application)}|${escapeHL7(receiver.facility)}|${timestamp}||ORM^O01|${escapeHL7(order.messageControlId)}|P|2.3`;
  const pid = `PID|1||${escapeHL7(patient.mrn)}||${personName(patient.name)}||${dob}|${genderCode(patient.gender)}`;

  const pv1Fields = new Array(19).fill("");
  pv1Fields[0] = "1";
  pv1Fields[1] = "O";
  pv1Fields[6] = `${escapeHL7(encounter.providerId)}^${personName(encounter.providerName)}`;
  pv1Fields[18] = escapeHL7(encounter.id);
  const pv1 = `PV1|${pv1Fields.join("|")}`;

  const orcFields = new Array(12).fill("");
  orcFields[0] = "NW";
  orcFields[1] = escapeHL7(order.accessionNumber);
  orcFields[2] = escapeHL7(order.accessionNumber);
  orcFields[8] = timestamp;
  orcFields[11] = `${escapeHL7(encounter.providerId)}^${personName(encounter.providerName)}`;
  const orc = `ORC|${orcFields.join("|")}`;

  const obrFields = new Array(27).fill("");
  obrFields[0] = "1";
  obrFields[1] = escapeHL7(order.accessionNumber);
  obrFields[2] = escapeHL7(order.accessionNumber);
  obrFields[3] = `${escapeHL7(order.procedureCode)}^${escapeHL7(procedureDescription)}`;
  obrFields[12] = escapeHL7(order.clinicalIndication);
  obrFields[18] = escapeHL7(input.stationAeTitle || "CARECHART_MODALITY");
  obrFields[19] = modalityCode(order.modality);
  obrFields[26] = `^^^${timestamp}`;
  const obr = `OBR|${obrFields.join("|")}`;

  return [msh, pid, pv1, orc, obr].join("\r") + "\r";
}
