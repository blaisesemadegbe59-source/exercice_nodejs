import { Repository } from "./repository";
import type { UtilisateurStockage, Tâche } from "./types";

export const repoUtilisateurs = new Repository<UtilisateurStockage>("data/utilisateurs.json");
export const repoTâches = new Repository<Tâche>("data/tâches.json");
