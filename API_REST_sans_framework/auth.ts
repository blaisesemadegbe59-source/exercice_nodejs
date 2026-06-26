import crypto from "crypto";
import type { PayloadToken } from "./types";

export function hasherMotDePasse(mdp: string): string {
  return crypto.createHash("sha256").update(mdp).digest("hex");
}

export function vérifierMotDePasse(mdp: string, hash: string): boolean {
  return hasherMotDePasse(mdp) === hash;
}

export function créerToken(userId: number, email: string, nom: string): string {
  const payload: PayloadToken = {
    userId,
    email,
    nom,
    exp: Date.now() + 86400000,
  };
  return Buffer.from(JSON.stringify(payload)).toString("base64");
}

export function décoderToken(token: string): PayloadToken | null {
  try {
    const payload = JSON.parse(
      Buffer.from(token, "base64").toString("utf-8")
    ) as PayloadToken;

    if (!payload.userId || !payload.exp) return null;
    if (payload.exp < Date.now()) return null;

    return payload;
  } catch {
    return null;
  }
}
