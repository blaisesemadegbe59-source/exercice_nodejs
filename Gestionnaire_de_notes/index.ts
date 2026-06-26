#!/usr/bin/env node

import { ServiceNotes } from "./service-notes";
import type { Note, Priorité } from "./types";

const PRIORITÉS: Priorité[] = ["basse", "normale", "haute"];

function afficherAide(): void {
  console.log(`
 Gestionnaire de notes 

COMMANDES :

  notes ajouter "contenu" [--tag x] [--priorité haute]
      Crée une nouvelle note

  notes lister [--tag x] [--priorité haute]
      Affiche les notes (avec filtres optionnels)

  notes chercher "mot-clé"
      Recherche dans le contenu et les tags

  notes terminer <id>
      Marque une note comme terminée

  notes supprimer <id>
      Supprime une note

  notes exporter --format json|csv
      Exporte toutes les notes (rediriger avec >)

  notes stats
      Affiche les statistiques


`);
}

function icônePriorité(priorité: Priorité): string {
  switch (priorité) {
    case "haute": return "[!]";
    case "normale": return "[ ]";
    case "basse": return "[.]";
  }
}

function afficherNote(note: Note): void {
  const priorité = icônePriorité(note.priorité);
  const statut = note.statut === "terminée" ? "[✓]" : "[ ]";
  const tags = note.tags.length > 0 ? ` #${note.tags.join(" #")}` : "";

  console.log(`${statut} #${note.id} ${priorité} ${note.contenu}${tags}`);
}

function erreur(message: string): void {
  console.error(` ${message}`);
}

interface ArgsParse {
  commande: string;
  positionnels: string[];
  flags: Record<string, string | boolean>;
}

function parserArgs(argv: string[]): ArgsParse {
  const args = argv.slice(2);

  const commande = args[0] || "";
  const positionnels: string[] = [];
  const flags: Record<string, string | boolean> = {};

  let i = 1;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const clé = arg.slice(2);
      if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
        flags[clé] = args[i + 1];
        i += 2;
      } else {
        flags[clé] = true;
        i++;
      }
    } else {
      positionnels.push(arg);
      i++;
    }
  }

  return { commande, positionnels, flags };
}

function validerPriorité(valeur: string): Priorité {
  if (!PRIORITÉS.includes(valeur as Priorité)) {
    erreur(`Priorité invalide : "${valeur}". Valeurs : ${PRIORITÉS.join(", ")}`);
    process.exit(1);
  }
  return valeur as Priorité;
}

async function main(): Promise<void> {
  const { commande, positionnels, flags } = parserArgs(process.argv);
  const service = new ServiceNotes();

  switch (commande) {
    case "ajouter": {
      const contenu = positionnels.join(" ");
      if (!contenu) {
        erreur("Le contenu de la note est requis");
        afficherAide();
        process.exit(1);
      }

      const tags = typeof flags.tag === "string" ? flags.tag.split(",") : [];
      const priorité = flags.priorité ? validerPriorité(flags.priorité as string) : "normale";

      const note = await service.ajouter(contenu, tags, priorité);
      console.log(" Note créée :");
      afficherNote(note);
      break;
    }

    case "lister": {
      const filtres: { tag?: string; priorité?: Priorité } = {};
      if (typeof flags.tag === "string") filtres.tag = flags.tag;
      if (flags.priorité) filtres.priorité = validerPriorité(flags.priorité as string);

      const notes = await service.lister(filtres);

      if (notes.length === 0) {
        console.log(" Aucune note trouvée.");
        break;
      }

      console.log(`\n ${notes.length} note(s) :\n`);
      for (const note of notes) {
        afficherNote(note);
      }
      break;
    }

    case "chercher": {
      const requête = positionnels.join(" ");
      if (!requête) {
        erreur("La requête de recherche est requise");
        process.exit(1);
      }

      const notes = await service.chercher(requête);

      if (notes.length === 0) {
        console.log(` Aucune note trouvée pour "${requête}".`);
        break;
      }

      console.log(`\n ${notes.length} résultat(s) pour "${requête}" :\n`);
      for (const note of notes) {
        afficherNote(note);
      }
      break;
    }

    case "terminer": {
      const id = Number(positionnels[0]);
      if (!id) {
        erreur("L'id de la note est requis");
        process.exit(1);
      }

      try {
        const note = await service.terminer(id);
        console.log(" Note terminée :");
        afficherNote(note);
      } catch (e) {
        erreur((e as Error).message);
        process.exit(1);
      }
      break;
    }

    case "supprimer": {
      const id = Number(positionnels[0]);
      if (!id) {
        erreur("L'id de la note est requis");
        process.exit(1);
      }

      try {
        await service.supprimer(id);
        console.log(`  Note #${id} supprimée.`);
      } catch (e) {
        erreur((e as Error).message);
        process.exit(1);
      }
      break;
    }

    case "exporter": {
      const format = flags.format === "csv" ? "csv" : "json";
      const sortie = await service.exporter(format);
      process.stdout.write(sortie);
      break;
    }

    case "stats": {
      const stats = await service.stats();
      console.log("\n Statistiques :\n");
      console.log(`   Total       : ${stats.total}`);
      console.log(`   Terminées   : ${stats.terminées}`);
      console.log(`   Actives     : ${stats.total - stats.terminées}`);
      console.log(`   Par priorité `);
      console.log(`   [!] Haute   : ${stats.parPriorité.haute}`);
      console.log(`   [ ] Normale : ${stats.parPriorité.normale}`);
      console.log(`   [.] Basse   : ${stats.parPriorité.basse}`);
      break;
    }

    default:
      afficherAide();
      if (commande) {
        erreur(`Commande inconnue : "${commande}"`);
      }
      process.exit(commande ? 1 : 0);
  }
}

main().catch((e) => {
  erreur(e instanceof Error ? e.message : "Erreur inconnue");
  process.exit(1);
});
