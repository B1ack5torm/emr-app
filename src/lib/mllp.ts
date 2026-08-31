import net from "net";

export const MLLP_VT = String.fromCharCode(0x0b);
export const MLLP_FS = String.fromCharCode(0x1c);
export const MLLP_CR = String.fromCharCode(0x0d);

export type AckCode = "AA" | "AE" | "AR";
export type ParsedAck = { code: AckCode; messageControlId: string; errorText: string | null };

export function frameMLLP(message: string) {
  return MLLP_VT + message + MLLP_FS + MLLP_CR;
}

export function parseAck(message: string, expectedMessageControlId?: string): ParsedAck {
  const segments = message.replace(/^\x0b/, "").replace(/\x1c\r?$/, "").split(/\r|\n/).filter(Boolean);
  const msa = segments.find((segment) => segment.startsWith("MSA|"));
  if (!msa) throw new Error("The MLLP response did not contain an MSA segment.");
  const fields = msa.split("|");
  const code = fields[1]?.toUpperCase();
  if (code !== "AA" && code !== "AE" && code !== "AR") throw new Error("The MLLP response contained an unsupported ACK code.");
  const messageControlId = fields[2] || "";
  if (!messageControlId) throw new Error("The ACK did not contain a message control ID.");
  if (expectedMessageControlId && messageControlId !== expectedMessageControlId) throw new Error("The ACK message control ID did not match the order.");
  const errText = segments.filter((segment) => segment.startsWith("ERR|")).map((segment) => segment.split("|").slice(1).filter(Boolean).join(" ")).join("; ");
  return { code, messageControlId, errorText: fields[3]?.trim() || errText || null };
}

export type MLLPSendOptions = {
  host: string;
  port: number;
  message: string;
  connectionTimeoutMs?: number;
  readTimeoutMs?: number;
  maxAckBytes?: number;
  onSent?: (sentAt: Date) => void;
};

export function sendHL7ViaMLLP(options: MLLPSendOptions): Promise<string> {
  const connectionTimeoutMs = options.connectionTimeoutMs ?? 5_000;
  const readTimeoutMs = options.readTimeoutMs ?? 10_000;
  const maxAckBytes = options.maxAckBytes ?? 256 * 1024;

  return new Promise((resolve, reject) => {
    const client = new net.Socket();
    let response = Buffer.alloc(0);
    let settled = false;
    let readTimer: NodeJS.Timeout | undefined;

    const finish = (error?: Error, ack?: string) => {
      if (settled) return;
      settled = true;
      clearTimeout(connectionTimer);
      if (readTimer) clearTimeout(readTimer);
      client.destroy();
      if (error) reject(error); else resolve(ack || "");
    };

    const connectionTimer = setTimeout(() => finish(new Error("Timed out connecting to the MLLP endpoint.")), connectionTimeoutMs);
    client.once("error", () => finish(new Error("Could not connect to the MLLP endpoint.")));
    client.once("close", () => { if (!settled) finish(new Error("The MLLP endpoint closed before returning an ACK.")); });
    client.on("data", (chunk) => {
      response = Buffer.concat([response, chunk]);
      if (response.length > maxAckBytes) return finish(new Error("The MLLP ACK exceeded the configured size limit."));
      const start = response.indexOf(MLLP_VT);
      const end = response.indexOf(MLLP_FS, Math.max(start, 0));
      if (end === -1) return;
      if (start === -1 || response[end + 1] !== 0x0d) return finish(new Error("The MLLP endpoint returned an incorrectly framed ACK."));
      finish(undefined, response.subarray(start + 1, end).toString("utf8"));
    });

    client.connect(options.port, options.host, () => {
      clearTimeout(connectionTimer);
      readTimer = setTimeout(() => finish(new Error("Timed out waiting for ACK from the MLLP endpoint.")), readTimeoutMs);
      client.write(frameMLLP(options.message), "utf8", () => options.onSent?.(new Date()));
    });
  });
}
