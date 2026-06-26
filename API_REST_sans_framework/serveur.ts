import http from "http";
import { Router, ContexteImpl } from "./router";
import {
  loggerMiddleware,
  corsMiddleware,
  authMiddleware,
  validerBodyMiddleware,
  gestionErreurMiddleware,
} from "./middlewares";
import { authControleur, tâcheControleur } from "./controleurs";

function configurerRouter(): Router {
  const router = new Router();

  router.use(gestionErreurMiddleware);
  router.use(corsMiddleware);
  router.use(loggerMiddleware);

  router.post("/auth/inscription", [validerBodyMiddleware(["nom", "email", "motDePasse"])], authControleur.inscription);
  router.post("/auth/connexion", [validerBodyMiddleware(["email", "motDePasse"])], authControleur.connexion);

  router.get("/tâches", [authMiddleware], tâcheControleur.lister);
  router.post("/tâches", [authMiddleware, validerBodyMiddleware(["titre"])], tâcheControleur.créer);
  router.get("/tâches/stats", [authMiddleware], tâcheControleur.stats);
  router.get("/tâches/:id", [authMiddleware], tâcheControleur.trouver);
  router.patch("/tâches/:id", [authMiddleware], tâcheControleur.modifier);
  router.delete("/tâches/:id", [authMiddleware], tâcheControleur.supprimer);

  return router;
}

function démarrerServeur(): http.Server {
  const router = configurerRouter();

  const serveur = http.createServer(async (req, res) => {
    const url = new URL(req.url || "/", `http://${req.headers.host}`);
    const pathname = decodeURIComponent(url.pathname);
    const method = req.method || "GET";

    const query: Record<string, string> = {};
    url.searchParams.forEach((valeur, clé) => {
      query[clé] = valeur;
    });

    if (method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const trouvé = router.trouverRoute(method, pathname);

    if (!trouvé) {
      res.writeHead(404, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ erreur: "Route introuvable" }));
      return;
    }

    const ctx = new ContexteImpl(req, res, trouvé.params, query);

    try {
      if (["POST", "PUT", "PATCH"].includes(method)) {
        await ctx.lireBody();
      }

      await router.exécuter(ctx, trouvé.route);
    } catch (e) {
      if (!res.headersSent) {
        const message = e instanceof Error ? e.message : "Erreur interne";
        const status = message === "JSON invalide" ? 400 : 500;
        res.writeHead(status, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ erreur: message }));
      }
    }
  });

  serveur.listen(3000, () => {
    console.log("🚀 API démarrée sur http://localhost:3000");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("AUTH :");
    console.log("  POST   /auth/inscription   { nom, email, motDePasse }");
    console.log("  POST   /auth/connexion     { email, motDePasse }");
    console.log("TÂCHES (protégées) :");
    console.log("  GET    /tâches             Liste");
    console.log("  POST   /tâches             Créer");
    console.log("  GET    /tâches/:id         Détail");
    console.log("  PATCH  /tâches/:id         Modifier");
    console.log("  DELETE /tâches/:id         Supprimer");
    console.log("  GET    /tâches/stats       Statistiques");
    console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
    console.log("Ctrl+C pour arrêter.\n");
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
