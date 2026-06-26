import type { Contexte, Priorité, StatutTâche, Statistiques, UtilisateurPublique } from "./types";
import type { Tâche, UtilisateurStockage } from "./types";
import { repoUtilisateurs, repoTâches } from "./db";
import { hasherMotDePasse, vérifierMotDePasse, créerToken } from "./auth";

const PRIORITÉS: Priorité[] = ["basse", "normale", "haute"];
const STATUTS: StatutTâche[] = ["todo", "en_cours", "terminé"];

function sansMotDePasse(u: UtilisateurStockage): UtilisateurPublique {
  return { id: u.id, nom: u.nom, email: u.email };
}

export const authControleur = {
  async inscription(ctx: Contexte): Promise<void> {
    const body = ctx.body as { nom?: string; email?: string; motDePasse?: string };

    if (!body?.nom || !body?.email || !body?.motDePasse) {
      ctx.erreur("nom, email et motDePasse sont requis", 400);
      return;
    }

    const existant = await repoUtilisateurs.trouverTous({ email: body.email });
    if (existant.length > 0) {
      ctx.erreur("Un compte existe déjà avec cet email", 409);
      return;
    }

    const user = await repoUtilisateurs.créer({
      nom: body.nom,
      email: body.email,
      motDePasse: hasherMotDePasse(body.motDePasse),
    });

    const token = créerToken(user.id, user.email, user.nom);
    ctx.json({ token, utilisateur: sansMotDePasse(user) }, 201);
  },

  async connexion(ctx: Contexte): Promise<void> {
    const body = ctx.body as { email?: string; motDePasse?: string };

    if (!body?.email || !body?.motDePasse) {
      ctx.erreur("email et motDePasse sont requis", 400);
      return;
    }

    const candidats = await repoUtilisateurs.trouverTous({ email: body.email });
    const user = candidats[0];

    if (!user || !vérifierMotDePasse(body.motDePasse, user.motDePasse)) {
      ctx.erreur("Email ou mot de passe incorrect", 401);
      return;
    }

    const token = créerToken(user.id, user.email, user.nom);
    ctx.json({ token, utilisateur: sansMotDePasse(user) });
  },
};

export const tâcheControleur = {
  async lister(ctx: Contexte): Promise<void> {
    const tâches = await repoTâches.trouverTous({ userId: ctx.utilisateur!.id });
    ctx.json(tâches);
  },

  async créer(ctx: Contexte): Promise<void> {
    const body = ctx.body as {
      titre?: string;
      description?: string;
      priorité?: string;
      statut?: string;
    };

    if (!body?.titre) {
      ctx.erreur("Le champ 'titre' est requis", 400);
      return;
    }

    const priorité: Priorité = PRIORITÉS.includes(body.priorité as Priorité)
      ? (body.priorité as Priorité)
      : "normale";

    const statut: StatutTâche = STATUTS.includes(body.statut as StatutTâche)
      ? (body.statut as StatutTâche)
      : "todo";

    const tâche = await repoTâches.créer({
      titre: body.titre,
      description: body.description,
      priorité,
      statut,
      userId: ctx.utilisateur!.id,
    });

    ctx.json(tâche, 201);
  },

  async trouver(ctx: Contexte): Promise<void> {
    const id = Number(ctx.params.id);
    const tâche = await repoTâches.trouverParId(id);

    if (!tâche || tâche.userId !== ctx.utilisateur!.id) {
      ctx.erreur("Tâche introuvable", 404);
      return;
    }

    ctx.json(tâche);
  },

  async modifier(ctx: Contexte): Promise<void> {
    const id = Number(ctx.params.id);
    const tâche = await repoTâches.trouverParId(id);

    if (!tâche || tâche.userId !== ctx.utilisateur!.id) {
      ctx.erreur("Tâche introuvable", 404);
      return;
    }

    const body = ctx.body as Partial<Tâche>;
    const données: Partial<Tâche> = {};

    if (body.titre !== undefined) données.titre = body.titre;
    if (body.description !== undefined) données.description = body.description;
    if (body.priorité && PRIORITÉS.includes(body.priorité)) données.priorité = body.priorité;
    if (body.statut && STATUTS.includes(body.statut)) données.statut = body.statut;

    const modifiée = await repoTâches.modifier(id, données);
    ctx.json(modifiée);
  },

  async supprimer(ctx: Contexte): Promise<void> {
    const id = Number(ctx.params.id);
    const tâche = await repoTâches.trouverParId(id);

    if (!tâche || tâche.userId !== ctx.utilisateur!.id) {
      ctx.erreur("Tâche introuvable", 404);
      return;
    }

    await repoTâches.supprimer(id);
    ctx.json({ message: "Tâche supprimée" });
  },

  async stats(ctx: Contexte): Promise<void> {
    const tâches = await repoTâches.trouverTous({ userId: ctx.utilisateur!.id });

    const parPriorité: Record<Priorité, number> = { basse: 0, normale: 0, haute: 0 };
    let terminées = 0;
    let enCours = 0;

    for (const t of tâches) {
      parPriorité[t.priorité]++;
      if (t.statut === "terminé") terminées++;
      if (t.statut === "en_cours") enCours++;
    }

    const stats: Statistiques = {
      total: tâches.length,
      terminées,
      enCours,
      parPriorité,
    };

    ctx.json(stats);
  },
};
