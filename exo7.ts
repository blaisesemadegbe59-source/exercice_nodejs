import readline from "readline";
import { promises as fs } from "fs";
import process from "process";

interface ParseurRésultat<Schéma extends Record<string, boolean | string>> {
  flags: { [K in keyof Schéma]: Schéma[K] extends true ? boolean : string };
  positionnels: string[];
}

function parserArgs<Schéma extends Record<string, boolean | string>>(
  args: string[],
  schéma: Schéma
): ParseurRésultat<Schéma> {
  const flags = {} as { [K in keyof Schéma]: Schéma[K] extends true ? boolean : string };
  const positionnels: string[] = [];

  for (const clé in schéma) {
    flags[clé] = (schéma[clé] === true ? false : "") as any;
  }

  let i = 0;
  while (i < args.length) {
    const arg = args[i];

    if (arg.startsWith("--")) {
      const clé = arg.slice(2) as keyof Schéma;
      const définition = schéma[clé];

      if (définition === undefined) {
        positionnels.push(arg);
        i++;
        continue;
      }

      if (définition === true) {
        flags[clé] = true as any;
        i++;
      } else {
        if (i + 1 < args.length && !args[i + 1].startsWith("--")) {
          flags[clé] = args[i + 1] as any;
          i += 2;
        } else {
          flags[clé] = true as any;
          i++;
        }
      }
    } else {
      positionnels.push(arg);
      i++;
    }
  }

  return { flags, positionnels };
}

function démontrerParser(): void {

  const résultat = parserArgs(
    ["--port", "3000", "--env", "production", "--verbose", "fichier.txt"],
    {
      port: "string" as const,
      env: "string" as const,
      verbose: true,
    }
  );

  console.log("Commande simulée :");
  console.log('  ts-node cli.ts --port 3000 --env production --verbose fichier.txt\n');
  console.log("Résultat :");
  console.log("  flags :", résultat.flags);
  console.log("  positionnels :", résultat.positionnels);

  const avecArgsRéels = parserArgs(process.argv.slice(2), {
    port: "string" as const,
    env: "string" as const,
    verbose: true,
  });
  console.log("\n  (avec tes vrais args :", process.argv.slice(2), ")");
  console.log("  → flags :", avecArgsRéels.flags);
}

async function lireFichier(chemin: string): Promise<void> {
  try {
    const contenu = await fs.readFile(chemin, "utf-8");
    console.log(`\n Contenu de "${chemin}" :\n`);
    console.log(contenu);
  } catch (erreur) {
    const err = erreur as NodeJS.ErrnoException;
    if (err.code === "ENOENT") {
      console.log(`\n Fichier introuvable : "${chemin}"`);
    } else if (err.code === "EACCES") {
      console.log(`\n Permission refusée : "${chemin}"`);
    } else {
      console.log(`\n Erreur : ${err.message}`);
    }
  }
}

async function écrireFichier(chemin: string, contenu: string): Promise<void> {
  try {
    await fs.writeFile(chemin, contenu, "utf-8");
    console.log(`\n Fichier écrit : "${chemin}"`);
  } catch (erreur) {
    const err = erreur as NodeJS.ErrnoException;
    if (err.code === "EACCES") {
      console.log(`\n Permission refusée : "${chemin}"`);
    } else {
      console.log(`\n Erreur : ${err.message}`);
    }
  }
}

function afficherAide(): void {
  console.log(`

`);
}

function démarrerCLI(): void {

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: "> ",
  });

  console.log("Tapez 'aide' pour voir les commandes.\n");

  const traiterCommande = async (saisie: string): Promise<void> => {
    const parts = saisie.trim().split(/\s+/);
    const commande = parts[0]?.toLowerCase();

    switch (commande) {
      case "":
        break;

      case "aide":
        afficherAide();
        break;

      case "heure":
        console.log(` ${new Date().toLocaleString("fr-FR")}\n`);
        break;

      case "écho":
        console.log(` ${parts.slice(1).join(" ")}\n`);
        break;

      case "lire":
        if (!parts[1]) {
          console.log("Usage : lire [chemin]\n");
        } else {
          await lireFichier(parts[1]);
        }
        break;

      case "écrire":
        if (!parts[1] || !parts[2]) {
          console.log("Usage : écrire [chemin] [contenu]\n");
        } else {
          await écrireFichier(parts[1], parts.slice(2).join(" "));
        }
        break;

      case "quitter":
        console.log("\n Au revoir !");
        rl.close();
        return;

      default:
        console.log(` Commande inconnue : "${commande}". Tape 'aide'.\n`);
    }

    rl.prompt();
  };

  rl.prompt();

  rl.on("line", (saisie) => {
    void traiterCommande(saisie);
  });

  rl.on("close", () => {
    console.log("\n Session terminée.");
    process.exit(0);
  });

  process.on("SIGINT", () => {
    console.log("\n Ctrl+C détecté. Au revoir !");
    process.exit(0);
  });
}

async function main(): Promise<void> {
  démontrerParser();
  démarrerCLI();
}

main().catch((e) => console.error(" Erreur :", e));
