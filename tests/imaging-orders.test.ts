import assert from "node:assert/strict";
import test from "node:test";
import { mkdtemp, readFile, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import net from "node:net";
import { buildORM } from "../src/lib/hl7";
import { frameMLLP, MLLP_FS, MLLP_VT, parseAck, sendHL7ViaMLLP, type AckCode } from "../src/lib/mllp";
import { createMockMLLPReceiver } from "../src/lib/mock-mllp";
import { imagingOrderStatusForAck, isActiveImagingOrderEncounter, newAccessionNumber, newMessageControlId, validateImagingOrderInput } from "../src/lib/domain/imaging-orders";

const controlId = "CC-TEST-0001";
const orm = buildORM({
  timestamp: new Date(2026, 7, 31, 9, 15, 30),
  sender: { application: "CARECHART", facility: "Demo Hospital" },
  receiver: { application: "IMAGING", facility: "MWL" },
  patient: { mrn: "MRN-1001", name: "Ananya Sharma", dateOfBirth: new Date(1988, 3, 12), gender: "FEMALE" },
  encounter: { id: "ENC-2001", providerId: "DOC-10", providerName: "Asha Rao" },
  order: { accessionNumber: "ACC-3001", messageControlId: controlId, modality: "XRAY", procedureCode: "XR-CHEST-2V", procedureDescription: "Chest X-ray, 2 views", bodyPart: "Chest", clinicalIndication: "Cough and fever for five days" },
});

test("ORM^O01 contains the required patient, encounter, provider, and order fields", () => {
  const segments = Object.fromEntries(orm.trimEnd().split("\r").map((segment) => [segment.slice(0, 3), segment.split("|")]));
  assert.deepEqual(Object.keys(segments), ["MSH", "PID", "PV1", "ORC", "OBR"]);
  assert.equal(segments.MSH[2], "CARECHART");
  assert.equal(segments.MSH[4], "IMAGING");
  assert.equal(segments.MSH[8], "ORM^O01");
  assert.equal(segments.MSH[9], controlId);
  assert.equal(segments.PID[3], "MRN-1001");
  assert.equal(segments.PID[5], "Sharma^Ananya");
  assert.equal(segments.PID[7], "19880412");
  assert.equal(segments.PID[8], "F");
  assert.equal(segments.PV1[7], "DOC-10^Rao^Asha");
  assert.equal(segments.PV1[19], "ENC-2001");
  assert.equal(segments.ORC[1], "NW");
  assert.equal(segments.OBR[3], "ACC-3001");
  assert.equal(segments.OBR[4], "XR-CHEST-2V^Chest X-ray, 2 views - Chest");
  assert.equal(segments.OBR[13], "Cough and fever for five days");
});

test("order input is bounded and restricted to active encounters", () => {
  assert.equal(isActiveImagingOrderEncounter("WAITING"), true);
  assert.equal(isActiveImagingOrderEncounter("IN_PROGRESS"), true);
  assert.equal(isActiveImagingOrderEncounter("COMPLETED"), false);
  assert.ok("error" in validateImagingOrderInput({ modality: "XRAY" }));
  assert.ok("data" in validateImagingOrderInput({ modality: "XRAY", procedureCode: "XR-CHEST-2V", procedureDescription: "Chest X-ray", clinicalIndication: "Cough" }));
  assert.notEqual(newAccessionNumber(), newAccessionNumber());
  assert.notEqual(newMessageControlId(), newMessageControlId());
});

test("ACK parsing captures AA, AE, AR and validates the control ID", () => {
  for (const code of ["AA", "AE", "AR"] as AckCode[]) {
    const ack = parseAck(`MSH|^~\\&|MOCK|IMG|CARECHART|EMR|20260831091530||ACK|ACK-1|P|2.3\rMSA|${code}|${controlId}|${code === "AA" ? "" : "Receiver detail"}\r`, controlId);
    assert.equal(ack.code, code);
    assert.equal(ack.errorText, code === "AA" ? null : "Receiver detail");
    assert.equal(imagingOrderStatusForAck(code), code === "AA" ? "SENT" : "FAILED");
  }
  assert.throws(() => parseAck(`MSA|AA|WRONG\r`, controlId), /did not match/);
});

test("MLLP sender frames one ORM and mock receiver stores it before returning each ACK outcome", async () => {
  for (const code of ["AA", "AE", "AR"] as AckCode[]) {
    const directory = await mkdtemp(path.join(tmpdir(), `carechart-mllp-${code.toLowerCase()}-`));
    const receiver = await createMockMLLPReceiver({ storageDirectory: directory, ackCode: code, errorText: "Test application response" });
    try {
      const ackMessage = await sendHL7ViaMLLP({ host: "127.0.0.1", port: receiver.port, message: orm, connectionTimeoutMs: 500, readTimeoutMs: 500 });
      const ack = parseAck(ackMessage, controlId);
      assert.equal(ack.code, code);
      assert.deepEqual(receiver.receivedMessages, [orm]);
      const storedFiles = await readdir(directory);
      assert.equal(storedFiles.length, 1);
      assert.equal(await readFile(path.join(directory, storedFiles[0]), "utf8"), orm);
    } finally {
      await receiver.close();
      await rm(directory, { recursive: true, force: true });
    }
  }
});

test("MLLP sender applies its ACK read timeout", async () => {
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.once("close", () => sockets.delete(socket));
  });
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  assert.ok(address && typeof address !== "string");
  try {
    await assert.rejects(() => sendHL7ViaMLLP({ host: "127.0.0.1", port: address.port, message: orm, connectionTimeoutMs: 200, readTimeoutMs: 50 }), /Timed out waiting for ACK/);
  } finally {
    sockets.forEach((socket) => socket.destroy());
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
  }
});

test("MLLP framing uses VT plus HL7 plus FS/CR", () => {
  const framed = frameMLLP(orm);
  assert.equal(framed[0], MLLP_VT);
  assert.equal(framed.at(-2), MLLP_FS);
  assert.equal(framed.at(-1), "\r");
});
