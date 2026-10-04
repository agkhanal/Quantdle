import crypto from "node:crypto";
import type { Puzzle } from "./types";

/**
 * Puzzles are sealed with AES-256-GCM and handed to the browser as an opaque
 * token. The server stays stateless, and answers never reach the client until
 * the game is over.
 */

const secret = process.env.QUANTDLE_SECRET || crypto.randomBytes(32).toString("hex");
const key = crypto.createHash("sha256").update(secret).digest();

export function seal(puzzle: Puzzle): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key, iv);
  const body = Buffer.concat([cipher.update(JSON.stringify(puzzle), "utf8"), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]).toString("base64url");
}

export function unseal(token: string): Puzzle | null {
  try {
    const buf = Buffer.from(token, "base64url");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key, buf.subarray(0, 12));
    decipher.setAuthTag(buf.subarray(12, 28));
    const json = Buffer.concat([decipher.update(buf.subarray(28)), decipher.final()]).toString("utf8");
    return JSON.parse(json) as Puzzle;
  } catch {
    return null;
  }
}
