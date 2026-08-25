export type DiagnosticState = "CREATED" | "SCHEDULED" | "IN_PROGRESS" | "COMPLETED" | "REVIEWED" | "CANCELLED";

const transitions: Record<DiagnosticState, DiagnosticState[]> = {
  CREATED: ["SCHEDULED", "IN_PROGRESS", "CANCELLED"],
  SCHEDULED: ["IN_PROGRESS", "CANCELLED"],
  IN_PROGRESS: ["COMPLETED", "CANCELLED"],
  COMPLETED: ["REVIEWED"],
  REVIEWED: [], CANCELLED: [],
};

export function canTransitionDiagnosticOrder(from: DiagnosticState, to: DiagnosticState) {
  return transitions[from]?.includes(to) || false;
}

export function canReviewDiagnosticOrder(role: string | null | undefined, userId: string | null | undefined, orderingPractitionerId: string) {
  if (["ADMIN", "CLINIC_ADMIN", "SUPER_ADMIN"].includes(role || "")) return true;
  return role === "DOCTOR" && !!userId && userId === orderingPractitionerId;
}

export interface DiagnosticIntegrationAdapter {
  sendADT(message: unknown): Promise<void>;
  sendORM(order: unknown): Promise<void>;
  receiveORU(message: unknown): Promise<void>;
  modalityWorklistLink(orderId: string): Promise<string | null>;
  pacsStudyLink(externalStudyId: string): Promise<string | null>;
}

export class LocalDiagnosticAdapter implements DiagnosticIntegrationAdapter {
  async sendADT() {} async sendORM() {} async receiveORU() {}
  async modalityWorklistLink() { return null; }
  async pacsStudyLink() { return null; }
}
