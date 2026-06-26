import http, { IncomingMessage, ServerResponse, Server } from "http";

type Handler = (
  req: IncomingMessage,
  res: ServerResponse,
  params: Record<string, string>,
  query: Record<string, string>
) => void | Promise<void>;

type Route = {
  method: string;
  pattern: string;
  paramNames: string[];
  regex: RegExp;
  handler: Handler;
};

function analyserBody(req: IncomingMessage): Promise<unknown> {
  return new Promise((resolve, reject) => {
    let données = "";

    req.on("data", (chunk: Buffer) => {
      données += chunk.toString();
    });

    req.on("end", () => {
      if (!données) {
        resolve(undefined);
        return;
      }
      try {
        resolve(JSON.parse(données));
      } catch {
        reject(new Error("JSON invalide"));
      }
    });

    req.on("error", reject);
  });
}

function envoyerJSON(res: ServerResponse, données: unknown, status = 200): void {
  res.writeHead(status, { "Content-Type": "application/json" });
  res.end(JSON.stringify(données));
}

function compilerRoute(pattern: string): { regex: RegExp; paramNames: string[] } {
  const paramNames: string[] = [];

  const regexStr = pattern.replace(/:([^/]+)/g, (_match, nom) => {
    paramNames.push(nom);
    return "([^/]+)";
  });

  return { regex: new RegExp(`^${regexStr}$`), paramNames };
}

class Router {
  private routes: Route[] = [];

  private ajouter(method: string, pattern: string, handler: Handler): void {
    const { regex, paramNames } = compilerRoute(pattern);
    this.routes.push({ method, pattern, paramNames, regex, handler });
  }

  get(pattern: string, handler: Handler): void {
    this.ajouter("GET", pattern, handler);
  }

  post(pattern: string, handler: Handler): void {
    this.ajouter("POST", pattern, handler);
  }

  trouverRoute(
    method: string,
    pathname: string
  ): { route: Route; params: Record<string, string> } | null {
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
}

async function traiterRequête(
  req: IncomingMessage,
  res: ServerResponse,
  router: Router
): Promise<void> {
  const url = new URL(req.url || "/", `http://${req.headers.host}`);
  const pathname = decodeURIComponent(url.pathname);
  const method = req.method || "GET";

  const query: Record<string, string> = {};
  url.searchParams.forEach((valeur, clé) => {
    query[clé] = valeur;
  });

  console.log(`[${new Date().toISOString()}] ${method} ${pathname}`);

  if (method === "POST") {
    try {
      const body = await analyserBody(req);
      (req as any).parsedBody = body;
    } catch (e) {
      envoyerJSON(res, { erreur: "JSON invalide" }, 400);
      return;
    }
  }

  const trouvé = router.trouverRoute(method, pathname);

  if (!trouvé) {
    envoyerJSON(res, { erreur: "Route introuvable" }, 404);
    return;
  }

  try {
    await trouvé.route.handler(req, res, trouvé.params, query);
  } catch (e) {
    const message = e instanceof Error ? e.message : "Erreur inconnue";
    envoyerJSON(res, { erreur: message }, 500);
  }
}

function démarrerServeur(): Server {
  const router = new Router();

  const utilisateurs: Array<{ id: number; nom: string; email: string }> = [];
  let prochainId = 1;

  router.get("/", (_req, res, _params, _query) => {
    envoyerJSON(res, { message: "Bienvenue" });
  });

  router.get("/santé", (_req, res, _params, _query) => {
    envoyerJSON(res, { statut: "ok", timestamp: Date.now() });
  });

  router.get("/utilisateurs/:id", (_req, res, params, _query) => {
    const id = Number(params.id);
    const user = utilisateurs.find((u) => u.id === id);

    if (!user) {
      envoyerJSON(res, { erreur: "Utilisateur introuvable" }, 404);
      return;
    }

    envoyerJSON(res, user);
  });

  router.get("/utilisateurs", (_req, res, _params, _query) => {
    envoyerJSON(res, utilisateurs);
  });

  router.get("/recherche", (_req, res, _params, query) => {
    envoyerJSON(res, { résultats: [], requête: query.q || "" });
  });

  router.post("/utilisateurs", (req, res, _params, _query) => {
    const body = (req as any).parsedBody as { nom?: string; email?: string };

    if (!body?.nom || !body?.email) {
      envoyerJSON(res, { erreur: "nom et email sont requis" }, 400);
      return;
    }

    const user = { id: prochainId++, nom: body.nom, email: body.email };
    utilisateurs.push(user);

    envoyerJSON(res, user, 201);
  });

  const serveur = http.createServer((req, res) => {
    void traiterRequête(req, res, router);
  });

  serveur.listen(3000, () => {
    console.log(" Serveur démarré sur http://localhost:3000");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Routes disponibles :");
    console.log("  GET  /                    → Bienvenue");
    console.log("  GET  /santé               → Statut du serveur");
    console.log("  GET  /utilisateurs        → Liste des utilisateurs");
    console.log("  GET  /utilisateurs/:id    → Détail d'un utilisateur");
    console.log("  GET  /recherche?q=alice   → Recherche");
    console.log("  POST /utilisateurs        → Créer un utilisateur");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Appuie sur Ctrl+C pour arrêter.\n");
  });

  return serveur;
}

const serveur = démarrerServeur();

process.on("SIGINT", () => {
  console.log("\n Arrêt du serveur...");
  serveur.close(() => {
    console.log(" Serveur arrêté proprement.");
    process.exit(0);
  });
});

//     pour tester le serveur 
// GET /
//    curl http://localhost:3000/

// GET /santé
//    curl http://localhost:3000/santé

// POST /utilisateurs (créer)
//     curl -X POST http://localhost:3000/utilisateurs -H "Content-Type: application/json" -d '{"nom":"Alice","email":"alice@mail.com"}'

// GET /utilisateurs/1 (param de route)
//    curl http://localhost:3000/utilisateurs/1

// GET /recherche?q=alice (query string)
//     curl "http://localhost:3000/recherche?q=alice"

// Route inconnue (404)
//     curl http://localhost:3000/inconnue