import { NextRequest, NextResponse } from "next/server";
import { ItemCategory } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { audit, requirePermission } from "@/lib/security";
import { calculateInvoice, CatalogPriceOption, resolveCatalogPrice, splitOrderedTests } from "@/lib/domain/billing";

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("invoice:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;

  const invoice = await prisma.invoice.findUnique({
    where: { visitId: params.id },
    include: { items: true, payments: { orderBy: { paidAt: "desc" } }, patient: true },
  });
  if (!invoice || invoice.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  return NextResponse.json(invoice);
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const access = await requirePermission("invoice:create");
  if (access.response) return access.response;
  const session = { user: access.user } as any;
  const organizationId = (session.user as any).organizationId;
  const userId = (session.user as any).id;

  const visit = await prisma.visit.findUnique({
    where: { id: params.id },
    include: {
      patient: true, prescriptions: true, testsOrdered: true, imagingOrders: true, invoice: true,
      appointment: { select: { clinicId: true, appointmentType: { select: { name: true } } } },
      doctor: { select: { practitionerProfile: { select: { clinicId: true, specialty: true } } } },
    },
  });
  if (!visit || visit.patient.organizationId !== organizationId) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (visit.invoice) return NextResponse.json({ error: "An invoice already exists for this visit." }, { status: 409 });

  let clinicId = visit.appointment?.clinicId || visit.doctor?.practitionerProfile?.clinicId || null;
  if (!clinicId) {
    const clinics = await prisma.clinicLocation.findMany({ where: { organizationId, active: true }, select: { id: true }, take: 2 });
    if (clinics.length === 1) clinicId = clinics[0].id;
  }
  const [configuredPrices, taxRules] = clinicId ? await Promise.all([
    prisma.clinicPrice.findMany({ where: { organizationId, clinicId, active: true, service: { active: true } }, include: { service: { select: { category: true, code: true, name: true, taxable: true } } } }),
    prisma.taxConfiguration.findMany({ where: { organizationId, clinicId, active: true }, orderBy: { effectiveFrom: "desc" } }),
  ]) : [[], []];
  const catalog: CatalogPriceOption[] = configuredPrices.map((price) => ({ ...price.service, unitPrice: price.unitPrice }));
  const now = new Date(), activeTax = taxRules.find((rule) => (!rule.effectiveFrom || rule.effectiveFrom <= now) && (!rule.effectiveTo || rule.effectiveTo >= now));
  const pricedLine = (category: ItemCategory, description: string, lookupTerms: string[], quantity = 1) => {
    const price = resolveCatalogPrice(category, lookupTerms, catalog);
    return { category, description, quantity, unitPrice: price?.unitPrice || 0, taxRatePercent: price?.taxable ? activeTax?.ratePercent || 0 : 0 };
  };
  const specialtyConsultation = visit.doctor?.practitionerProfile?.specialty ? `${visit.doctor.practitionerProfile.specialty} Consultation` : "";
  const draftItems = [
    pricedLine("CONSULTATION", `Consultation${visit.chiefComplaint ? " — " + visit.chiefComplaint : ""}`, [visit.appointment?.appointmentType?.name || "", specialtyConsultation, "General Consultation"]),
    ...visit.prescriptions.map((prescription) => pricedLine("MEDICINE", `${prescription.medicine}${prescription.dosage ? " " + prescription.dosage : ""}`, [prescription.medicine])),
    ...visit.testsOrdered.flatMap((test) => splitOrderedTests(test.name).map((name) => pricedLine("TEST", name, [name]))),
    ...visit.imagingOrders.map((order) => pricedLine("IMAGING", `${order.procedureDescription}${order.bodyPart ? " - " + order.bodyPart : ""}`, [order.procedureDescription])),
  ];
  const { items: computed, subtotal, taxTotal, grandTotal } = calculateInvoice(draftItems);

  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const invoice = await prisma.$transaction(async (tx) => {
        const agg = await tx.invoice.aggregate({ where: { organizationId }, _max: { invoiceNo: true } });
        return tx.invoice.create({
          data: {
            invoiceNo: (agg._max.invoiceNo || 0) + 1,
            visitId: visit.id, patientId: visit.patientId, organizationId,
            subtotal, taxTotal, grandTotal, status: "UNPAID", createdById: userId,
            items: { create: computed.map(({ discount, category, ...item }) => ({ ...item, category: category as ItemCategory, discountAmount: discount })) },
          },
          include: { items: true },
        });
      });
      await audit({ organizationId, userId, patientId: visit.patientId, action: "INVOICE_CREATED", resourceType: "Invoice", resourceId: invoice.id, newValue: { invoiceNo: invoice.invoiceNo, grandTotal: invoice.grandTotal }, request: req });
      return NextResponse.json(invoice, { status: 201 });
    } catch (e: any) {
      if (e.code === "P2002" && attempt < 4) continue;
      throw e;
    }
  }
}
