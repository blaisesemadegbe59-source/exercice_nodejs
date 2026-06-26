import type { Contexte, Middleware } from "./types";
import { repoUtilisateurs } from "./db";
import { décoderToken } from "./auth";

export const loggerMiddleware: Middleware = async (ctx, suivant) => {
  const début = Date.now();
  const method = ctx.req.method || "?";
  const url = ctx.req.url || "/";

  await suivant();

  const durée = Date.now() - début;
  const status = ctx.res.statusCode;
  console.log(`[${new Date().toISOString()}] ${method} ${url} — ${status} — ${durée}ms`);
};

export const corsMiddleware: Middleware = async (ctx, suivant) => {
  ctx.res.setHeader("Access-Control-Allow-Origin", "*");
  ctx.res.setHeader("Access-Control-Allow-Methods", "GET, POST, PUT, PATCH, DELETE, OPTIONS");
  ctx.res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (ctx.req.method === "OPTIONS") {
    ctx.res.writeHead(204);
    ctx.res.end();
    return;
  }

  await suivant();
};

export const authMiddleware: Middleware = async (ctx, suivant) => {
  const header = ctx.req.headers.authorization;

  if (!header || !header.startsWith("Bearer ")) {
    ctx.erreur("Token manquant", 401);
    return;
  }

  const token = header.slice(7);
  const payload = décoderToken(token);

  if (!payload) {
    ctx.erreur("Token invalide ou expiré", 401);
    return;
  }

  const user = await repoUtilisateurs.trouverParId(payload.userId);

  if (!user) {
    ctx.erreur("Utilisateur introuvable", 401);
    return;
  }

  ctx.utilisateur = {
    id: user.id,
    nom: user.nom,
    email: user.email,
  };

  await suivant();
};

export function validerBodyMiddleware(champs: string[]): Middleware {
  return async (ctx, suivant) => {
    const body = ctx.body as Record<string, unknown> | undefined;

    if (!body) {
      ctx.erreur("Body manquant", 400);
      return;
    }

    for (const champ of champs) {
      if (!body[champ]) {
        ctx.erreur(`Le champ '${champ}' est requis`, 400);
        return;
      }
    }

    await suivant();
  };
}

export const gestionErreurMiddleware: Middleware = async (ctx, suivant) => {
  try {
    await suivant();
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur interne";
    const status = message.includes("introuvable") ? 404 : 500;
    ctx.erreur(message, status);
  }
};
