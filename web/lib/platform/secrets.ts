import "server-only";

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from "node:crypto";

/**
 * Symmetric encryption for secret platform settings stored in Postgres.
 *
 * Algorithm: AES-256-GCM. Format: `v1:<iv_b64>:<tag_b64>:<ciphertext_b64>`.
 * The 32-byte key is derived (scrypt) from SETTINGS_ENCRYPTION_KEY, with
 * AUTH_SECRET as a safe fallback so dev environments work out of the box.
 *
 * Threat model: protects against accidental DB dumps / casual reads. Does
 * NOT defend against an attacker with code-execution on the host (they'd
 * read the env var). For that level you'd swap this for a KMS-backed flow.
 */

const VERSION = "v1";
const KEY_SALT = "iox-platform-settings-v1";

let _key: Buffer | null = null;
function key(): Buffer {
  if (_key) return _key;
  const seed = process.env.SETTINGS_ENCRYPTION_KEY ?? process.env.AUTH_SECRET ?? "";
  if (seed.length < 16) {
    throw new Error(
      "SETTINGS_ENCRYPTION_KEY (or AUTH_SECRET fallback) must be at least 16 chars to encrypt platform settings.",
    );
  }
  _key = scryptSync(seed, KEY_SALT, 32);
  return _key;
}

export function encrypt(plaintext: string): string {
  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${VERSION}:${iv.toString("base64")}:${tag.toString("base64")}:${encrypted.toString("base64")}`;
}

export function decrypt(packed: string): string {
  const parts = packed.split(":");
  if (parts.length !== 4 || parts[0] !== VERSION) {
    throw new Error("Encrypted setting in unexpected format");
  }
  const [, ivB64, tagB64, encB64] = parts;
  const iv = Buffer.from(ivB64, "base64");
  const tag = Buffer.from(tagB64, "base64");
  const enc = Buffer.from(encB64, "base64");
  const decipher = createDecipheriv("aes-256-gcm", key(), iv);
  decipher.setAuthTag(tag);
  const decrypted = Buffer.concat([decipher.update(enc), decipher.final()]);
  return decrypted.toString("utf8");
}

/** Mask a secret for display: last 4 chars only. */
export function maskSecret(s: string | null | undefined): string {
  if (!s) return "";
  if (s.length <= 4) return "•".repeat(s.length);
  return "•".repeat(Math.min(s.length - 4, 12)) + s.slice(-4);
}
