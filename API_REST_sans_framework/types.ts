import type { IncomingMessage, ServerResponse } from "http";

export type Priorité = "basse" | "normale" | "haute";
export type StatutTâche = "todo" | "en_cours" | "terminé";

export interface Entité {
  id: number;
  créeÀ: string;
  modifiéeÀ: string;
}

export interface UtilisateurStockage extends Entité {
  nom: string;
  email: string;
  motDePasse: string;
}

export interface Tâche extends Entité {
  titre: string;
  description?: string;
  priorité: Priorité;
  statut: StatutTâche;
  userId: number;
}

export interface UtilisateurPublique {
  id: number;
  nom: string;
  email: string;
}

export interface UtilisateurSession {
  id: number;
  nom: string;
  email: string;
}

export interface PayloadToken {
  userId: number;
  email: string;
  nom: string;
  exp: number;
}

export interface Statistiques {
  total: number;
  terminées: number;
  enCours: number;
  parPriorité: Record<Priorité, number>;
}

export interface RéponseAuth {
  token: string;
  utilisateur: UtilisateurPublique;
}

export interface Contexte {
  req: IncomingMessage;
  res: ServerResponse;
  params: Record<string, string>;
  query: Record<string, string>;
  body: unknown;
  utilisateur?: UtilisateurSession;
  json: (données: unknown, status?: number) => void;
  erreur: (message: string, status?: number) => void;
  lireBody: <T>() => Promise<T>;
}

export type Handler = (ctx: Contexte) => Promise<void> | void;
export type Middleware = (
  ctx: Contexte,
  suivant: () => Promise<void>
) => Promise<void> | void;
