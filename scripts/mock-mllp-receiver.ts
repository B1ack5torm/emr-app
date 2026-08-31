import path from "path";
import { createMockMLLPReceiver } from "../src/lib/mock-mllp";
import type { AckCode } from "../src/lib/mllp";

async function main() {
  const ackCode = String(process.env.MOCK_MLLP_ACK_CODE || "AA").toUpperCase();
  if (ackCode !== "AA" && ackCode !== "AE" && ackCode !== "AR") throw new Error("MOCK_MLLP_ACK_CODE must be AA, AE, or AR.");

  const storageDirectory = path.resolve(process.env.MOCK_MLLP_STORAGE_DIR || "storage/mllp-mock");
  const receiver = await createMockMLLPReceiver({
    ackCode: ackCode as AckCode,
    errorText: process.env.MOCK_MLLP_ERROR_TEXT,
    host: process.env.MOCK_MLLP_HOST || "127.0.0.1",
    port: Number(process.env.MOCK_MLLP_PORT || 2575),
    storageDirectory,
  });

  console.log(`Mock MLLP receiver listening on ${process.env.MOCK_MLLP_HOST || "127.0.0.1"}:${receiver.port}.`);
  console.log(`ACK mode: ${ackCode}. Received messages are stored in ${storageDirectory}.`);

  async function shutdown() {
    await receiver.close();
    process.exit(0);
  }

  process.once("SIGINT", () => { void shutdown(); });
  process.once("SIGTERM", () => { void shutdown(); });
}

void main().catch((error) => {
  console.error(error instanceof Error ? error.message : "Mock MLLP receiver failed to start.");
  process.exit(1);
});
