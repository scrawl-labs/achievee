import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";

// Diary text and expense memos are encrypted at rest (AES-256-GCM) so a database leak doesn't expose them.
// ENCRYPTION_KEY: 32 bytes, base64 or hex (`openssl rand -base64 32`). Without it, values are stored as-is (dev only).
const PREFIX = "enc:v1:";
let key: Buffer | null | undefined;

function getKey(): Buffer | null {
  if (key !== undefined) return key;
  const raw = process.env.ENCRYPTION_KEY;
  if (!raw) {
    if (process.env.NODE_ENV === "production") throw new Error("ENCRYPTION_KEY is required in production");
    return (key = null);
  }
  const b = /^[0-9a-f]{64}$/i.test(raw) ? Buffer.from(raw, "hex") : Buffer.from(raw, "base64");
  if (b.length !== 32) throw new Error("ENCRYPTION_KEY must decode to 32 bytes");
  return (key = b);
}

export function encrypt(text: string): string {
  const k = getKey();
  if (!k || text === "") return text;
  const iv = randomBytes(12);
  const c = createCipheriv("aes-256-gcm", k, iv);
  const ct = Buffer.concat([c.update(text, "utf8"), c.final()]);
  return PREFIX + [iv, c.getAuthTag(), ct].map((b) => b.toString("base64")).join(".");
}

export function decrypt(text: string): string {
  if (!text.startsWith(PREFIX)) return text;
  const k = getKey();
  if (!k) return "";
  const [iv, tag, ct] = text.slice(PREFIX.length).split(".").map((s) => Buffer.from(s, "base64"));
  const d = createDecipheriv("aes-256-gcm", k, iv);
  d.setAuthTag(tag);
  return Buffer.concat([d.update(ct), d.final()]).toString("utf8");
}
