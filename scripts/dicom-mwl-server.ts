import { prisma } from "../src/lib/prisma";
import { matchesWorklistQuery, toDicomWorklistItem } from "../src/lib/dicom-worklist";
import net from "node:net";
import {
  Dataset,
  Scp,
  Server,
  association,
  constants,
  requests,
  responses,
} from "dcmjs-dimse";

const { PresentationContextResult, RejectReason, RejectResult, RejectSource, SopClass, Status, TransferSyntax } = constants;
const calledAeTitle = String(process.env.DICOM_MWL_AETITLE || "CARECHART_MWL").trim().toUpperCase();
const port = Number(process.env.DICOM_MWL_PORT || 11112);
const allowedCallingAeTitles = new Set(String(process.env.DICOM_MWL_ALLOWED_CALLING_AETS || "")
  .split(",")
  .map((value) => value.trim().toUpperCase())
  .filter(Boolean));
const worklistConfig = {
  stationAeTitle: String(process.env.MWL_STATION_AETITLE || "CARECHART_MODALITY").trim().toUpperCase(),
  stationName: String(process.env.MWL_STATION_NAME || "CareChart Imaging").trim(),
  timeZone: String(process.env.APPOINTMENT_TIME_ZONE || "Asia/Kolkata").trim(),
};

if (!/^[A-Z0-9 _-]{1,16}$/.test(calledAeTitle)) throw new Error("DICOM_MWL_AETITLE must be 1-16 DICOM AE-title characters.");
if (!Number.isInteger(port) || port < 1 || port > 65535) throw new Error("DICOM_MWL_PORT must be a valid TCP port.");

class CareChartWorklistScp extends Scp {
  associationRequested(requestedAssociation: association.Association) {
    const callingAeTitle = requestedAssociation.getCallingAeTitle().trim().toUpperCase();
    const requestedCalledAeTitle = requestedAssociation.getCalledAeTitle().trim().toUpperCase();
    if (requestedCalledAeTitle !== calledAeTitle) {
      this.sendAssociationReject(RejectResult.Permanent, RejectSource.ServiceUser, RejectReason.CalledAeNotRecognized);
      return;
    }
    if (allowedCallingAeTitles.size && !allowedCallingAeTitles.has(callingAeTitle)) {
      this.sendAssociationReject(RejectResult.Permanent, RejectSource.ServiceUser, RejectReason.CallingAeNotRecognized);
      return;
    }

    for (const entry of requestedAssociation.getPresentationContexts()) {
      const context = requestedAssociation.getPresentationContext(entry.id);
      if (context.getAbstractSyntaxUid() !== SopClass.Verification
        && context.getAbstractSyntaxUid() !== SopClass.ModalityWorklistInformationModelFind) {
        context.setResult(PresentationContextResult.RejectAbstractSyntaxNotSupported);
        continue;
      }
      const acceptedSyntax = context.getTransferSyntaxUids().find((syntax) =>
        syntax === TransferSyntax.ImplicitVRLittleEndian || syntax === TransferSyntax.ExplicitVRLittleEndian);
      context.setResult(
        acceptedSyntax ? PresentationContextResult.Accept : PresentationContextResult.RejectTransferSyntaxesNotSupported,
        acceptedSyntax,
      );
    }
    this.sendAssociationAccept();
  }

  associationReleaseRequested() {
    this.sendAssociationReleaseResponse();
  }

  cEchoRequest(request: requests.CEchoRequest, callback: (response: responses.CEchoResponse) => void) {
    const response = responses.CEchoResponse.fromRequest(request);
    response.setStatus(Status.Success);
    callback(response);
  }

  async cFindRequest(request: requests.CFindRequest, callback: (result: responses.CFindResponse[]) => void) {
    try {
      const query = request.getDataset()?.getElements() || {};
      const orders = await prisma.imagingOrder.findMany({
        where: { status: { in: ["SENT", "ACK_OK"] } },
        include: {
          visit: {
            include: {
              doctor: { select: { id: true, name: true } },
              appointment: { select: { scheduledAt: true, clinic: { select: { name: true } } } },
              patient: { include: { organization: { select: { name: true } } } },
            },
          },
        },
        orderBy: { createdAt: "asc" },
      });
      const results = orders
        .map((order) => toDicomWorklistItem(order, worklistConfig))
        .filter((item) => matchesWorklistQuery(item, query));
      const pending = results.map((item) => {
        const response = responses.CFindResponse.fromRequest(request);
        response.setDataset(new Dataset(item));
        response.setStatus(Status.Pending);
        return response;
      });
      const complete = responses.CFindResponse.fromRequest(request);
      complete.setStatus(Status.Success);
      callback([...pending, complete]);
      console.log(`MWL C-FIND returned ${results.length} order(s).`);
    } catch (error) {
      const failed = responses.CFindResponse.fromRequest(request);
      failed.setStatus(Status.ProcessingFailure);
      failed.setErrorComment("Could not query the CareChart worklist.");
      callback([failed]);
      console.error(error instanceof Error ? error.message : "MWL query failed.");
    }
  }
}

let server: Server;

async function assertIpv4PortAvailable() {
  const probe = net.createServer();
  await new Promise<void>((resolve, reject) => {
    probe.once("error", reject);
    probe.listen(port, "0.0.0.0", () => probe.close((error) => error ? reject(error) : resolve()));
  });
}

async function start() {
  await assertIpv4PortAvailable();
  server = new Server(CareChartWorklistScp);
  server.on("networkError", (error) => console.error("DICOM network error:", error));
  server.on("listening", () => console.log(`CareChart MWL listening as ${calledAeTitle} on TCP port ${port}.`));
  server.listen(port, { customOptions: { calledAeTitle } });
}

async function shutdown() {
  server?.close();
  await prisma.$disconnect();
  process.exit(0);
}

process.once("SIGINT", shutdown);
process.once("SIGTERM", shutdown);

start().catch(async (error) => {
  console.error(error instanceof Error && "code" in error && error.code === "EADDRINUSE"
    ? `DICOM_MWL_PORT ${port} is already in use. Stop the existing service or configure another port.`
    : error);
  await prisma.$disconnect();
  process.exit(1);
});
