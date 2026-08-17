import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { createCipheriv, createDecipheriv, randomBytes } from "crypto";

export interface DocumentStorage {
  put(storageKey: string, content: Uint8Array): Promise<void>;
  get(storageKey: string): Promise<Uint8Array>;
}
export interface MalwareScanner { scan(content: Uint8Array, contentType: string): Promise<{ safe: boolean; reason?: string }> }

export class LocalDocumentStorage implements DocumentStorage {
  private root = path.resolve(process.env.DOCUMENT_STORAGE_DIR || path.join(process.cwd(), "storage", "development"));
  private resolveKey(key: string) { const file = path.resolve(this.root, key); if (!file.startsWith(`${this.root}${path.sep}`)) throw new Error("Invalid storage key"); return file; }
  private encryptionKey() {
    const configured = process.env.DOCUMENT_ENCRYPTION_KEY;
    if (!configured) { if (process.env.NODE_ENV === "production") throw new Error("DOCUMENT_ENCRYPTION_KEY is required in production."); return null; }
    const key = Buffer.from(configured, "base64");
    if (key.length !== 32) throw new Error("DOCUMENT_ENCRYPTION_KEY must be a base64-encoded 32-byte key.");
    return key;
  }
  async put(storageKey: string, content: Uint8Array) {
    await mkdir(this.root, { recursive: true, mode: 0o700 });
    const key = this.encryptionKey();
    let payload = Buffer.from(content);
    if (key) {
      const iv = randomBytes(12), cipher = createCipheriv("aes-256-gcm", key, iv), encrypted = Buffer.concat([cipher.update(payload), cipher.final()]);
      payload = Buffer.concat([Buffer.from("CCDOC1"), iv, cipher.getAuthTag(), encrypted]);
    }
    await writeFile(this.resolveKey(storageKey), payload, { mode: 0o600 });
  }
  async get(storageKey: string) {
    const payload = await readFile(this.resolveKey(storageKey)), header = payload.subarray(0, 6).toString();
    if (header !== "CCDOC1") { if (process.env.NODE_ENV === "production") throw new Error("Unencrypted legacy document cannot be served in production."); return new Uint8Array(payload); }
    const key = this.encryptionKey(); if (!key) throw new Error("Document encryption key is unavailable.");
    const iv = payload.subarray(6, 18), tag = payload.subarray(18, 34), encrypted = payload.subarray(34), decipher = createDecipheriv("aes-256-gcm", key, iv);
    decipher.setAuthTag(tag); return new Uint8Array(Buffer.concat([decipher.update(encrypted), decipher.final()]));
  }
}

export class DevelopmentMalwareScanner implements MalwareScanner {
  async scan() { return { safe: true }; }
}

export class HttpMalwareScanner implements MalwareScanner {
  constructor(private endpoint: string, private token?: string) {}
  async scan(content: Uint8Array, contentType: string) {
    try {
      const bytes = content.buffer.slice(content.byteOffset, content.byteOffset + content.byteLength) as ArrayBuffer;
      const response = await fetch(this.endpoint, { method: "POST", headers: { "Content-Type": contentType, ...(this.token ? { Authorization: `Bearer ${this.token}` } : {}) }, body: bytes, cache: "no-store" });
      if (!response.ok) return { safe: false, reason: `Scanner returned ${response.status}.` };
      const result = await response.json() as { safe?: boolean; reason?: string };
      return { safe: result.safe === true, reason: result.reason };
    } catch { return { safe: false, reason: "Malware scanner unavailable." }; }
  }
}

export class BlockingProductionScanner implements MalwareScanner {
  async scan() { return { safe: false, reason: "MALWARE_SCAN_URL is required in production." }; }
}

export const documentStorage: DocumentStorage = new LocalDocumentStorage();
export const malwareScanner: MalwareScanner = process.env.MALWARE_SCAN_URL
  ? new HttpMalwareScanner(process.env.MALWARE_SCAN_URL, process.env.MALWARE_SCAN_TOKEN)
  : process.env.NODE_ENV === "production" ? new BlockingProductionScanner() : new DevelopmentMalwareScanner();
