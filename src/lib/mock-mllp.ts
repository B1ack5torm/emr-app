import { mkdir, writeFile } from "fs/promises";
import net from "net";
import path from "path";
import { randomUUID } from "crypto";
import { AckCode, frameMLLP, MLLP_CR, MLLP_FS, MLLP_VT } from "@/lib/mllp";

type MockReceiverOptions = {
  ackCode?: AckCode | ((message: string) => AckCode);
  errorText?: string;
  host?: string;
  port?: number;
  storageDirectory: string;
};

function timestamp(date = new Date()) {
  const part = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}${part(date.getMonth() + 1)}${part(date.getDate())}${part(date.getHours())}${part(date.getMinutes())}${part(date.getSeconds())}`;
}

function messageControlId(message: string) {
  return message.split(MllpSegmentPattern).find((segment) => segment.startsWith("MSH|"))?.split("|")[9] || "UNKNOWN";
}

const MllpSegmentPattern = /\r|\n/;

function buildAck(code: AckCode, controlId: string, errorText?: string) {
  const safeControlId = controlId.replace(/[|\r\n]/g, "");
  const safeError = errorText?.replace(/[|\r\n]/g, " ").slice(0, 500);
  return [
    `MSH|^~\\&|CARECHART_MOCK|IMAGING|CARECHART|EMR|${timestamp()}||ACK^O01|ACK-${randomUUID()}|P|2.3`,
    `MSA|${code}|${safeControlId}${safeError ? `|${safeError}` : ""}`,
  ].join(MLLP_CR) + MLLP_CR;
}

export async function createMockMLLPReceiver(options: MockReceiverOptions) {
  await mkdir(options.storageDirectory, { recursive: true });
  const receivedMessages: string[] = [];
  const server = net.createServer((socket) => {
    let buffer = Buffer.alloc(0);
    socket.on("data", (chunk) => {
      buffer = Buffer.concat([buffer, chunk]);
      const start = buffer.indexOf(MLLP_VT);
      const end = buffer.indexOf(MLLP_FS, Math.max(start, 0));
      if (start < 0 || end < 0) return;
      if (buffer[end + 1] !== 0x0d) {
        socket.destroy();
        return;
      }

      const message = buffer.subarray(start + 1, end).toString("utf8");
      buffer = buffer.subarray(end + 2);
      socket.pause();
      void (async () => {
        const controlId = messageControlId(message);
        const safeControlId = controlId.replace(/[^A-Za-z0-9._-]/g, "_").slice(0, 80);
        const filename = `${Date.now()}-${safeControlId}-${randomUUID().slice(0, 8)}.hl7`;
        await writeFile(path.join(options.storageDirectory, filename), message, { encoding: "utf8", flag: "wx" });
        receivedMessages.push(message);
        const code = typeof options.ackCode === "function" ? options.ackCode(message) : options.ackCode || "AA";
        socket.write(frameMLLP(buildAck(code, controlId, code === "AA" ? undefined : options.errorText || "Mock receiver response")));
        socket.resume();
      })().catch(() => socket.destroy());
    });
  });

  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(options.port || 0, options.host || "127.0.0.1", () => {
      server.off("error", reject);
      resolve();
    });
  });
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Mock MLLP receiver did not bind to a TCP port.");
  return {
    server,
    port: address.port,
    receivedMessages,
    close: () => new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())),
  };
}
