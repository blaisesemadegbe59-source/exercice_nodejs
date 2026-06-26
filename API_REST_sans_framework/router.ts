import type { IncomingMessage, ServerResponse } from "http";
import type { Contexte, Handler, Middleware, UtilisateurSession } from "./types";

export class ContexteImpl implements Contexte {
  body: unknown = undefined;
  utilisateur: UtilisateurSession | undefined;

  constructor(
    public req: IncomingMessage,
    public res: ServerResponse,
    public params: Record<string, string>,
    public query: Record<string, string>
  ) {}

  json(données: unknown, status = 200): void {
    this.res.writeHead(status, { "Content-Type": "application/json" });
    this.res.end(JSON.stringify(données));
  }

  erreur(message: string, status = 400): void {
    this.json({ erreur: message }, status);
  }

  private bodyLectureEnCours = false;

  async lireBody<T>(): Promise<T> {
    if (this.bodyLectureEnCours) return this.body as T;

    const morceaux: Buffer[] = [];
    for await (const morceau of this.req) {
      morceaux.push(morceau as Buffer);
    }

    const texte = Buffer.concat(morceaux).toString("utf-8");

    if (texte) {
      try {
        this.body = JSON.parse(texte);
      } catch {
        throw new Error("JSON invalide");
      }
    }

    this.bodyLectureEnCours = true;
    return this.body as T;
  }
}

interface DéfinitionRoute {
  method: string;
  pattern: string;
  paramNames: string[];
  regex: RegExp;
  middlewares: Middleware[];
  handler: Handler;
}

function compilerPattern(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  const regexStr = pattern.replace(/:([^/]+)/g, (_match, nom: string) => {
    paramNames.push(nom);
    return "([^/]+)";
  });

  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

export class Router {
  private routes: DéfinitionRoute[] = [];
  private middlewaresGlobaux: Middleware[] = [];

  use(middleware: Middleware): void {
    this.middlewaresGlobaux.push(middleware);
  }

  private ajouter(
    method: string,
    pattern: string,
    middlewares: Middleware[],
    handler: Handler
  ): void {
    const { regex, paramNames } = compilerPattern(pattern);
    this.routes.push({ method, pattern, paramNames, regex, middlewares, handler });
  }

  get(pattern: string, middlewares: Middleware[], handler: Handler): void {
    this.ajouter("GET", pattern, middlewares, handler);
  }

  post(pattern: string, middlewares: Middleware[], handler: Handler): void {
    this.ajouter("POST", pattern, middlewares, handler);
  }

  patch(pattern: string, middlewares: Middleware[], handler: Handler): void {
    this.ajouter("PATCH", pattern, middlewares, handler);
  }

  delete(pattern: string, middlewares: Middleware[], handler: Handler): void {
    this.ajouter("DELETE", pattern, middlewares, handler);
  }

  trouverRoute(
    method: string,
    pathname: string
  ): { route: DéfinitionRoute; params: Record<string, string> } | null {
    for (const route of this.routes) {
      if (route.method !== method) continue;

      const match = route.regex.exec(pathname);
      if (!match) continue;

      const params: Record<string, string> = {};
      route.paramNames.forEach((nom, i) => {
        params[nom] = decodeURIComponent(match[i + 1]);
      });

      return { route, params };
    }

    return null;
  }

  async exécuter(ctx: Contexte, route: DéfinitionRoute): Promise<void> {
    const couches: Middleware[] = [
      ...this.middlewaresGlobaux,
      ...route.middlewares,
    ];

    let index = 0;

    const suivant = async (): Promise<void> => {
      if (index >= couches.length) return;

      const couche = couches[index];
      index++;
      await couche(ctx, suivant);
    };

    await suivant();

    if (index <= couches.length) {
      await route.handler(ctx);
    }
  }
}
