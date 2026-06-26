import path from "path";
import { promises as fs } from "fs";

function etape1() {

  console.log("path.join('/utilisateurs', 'alice', 'documents', 'fichier.txt')");
  console.log("  →", path.join("/utilisateurs", "alice", "documents", "fichier.txt"));

  console.log("\npath.join('/utilisateurs/alice', '../bob', 'fichier.txt')");
  console.log("  →", path.join("/utilisateurs/alice", "../bob", "fichier.txt"));

  console.log("\npath.resolve('relatif', 'chemin')");
  console.log("  →", path.resolve("relatif", "chemin"));

  console.log("\npath.basename('/utilisateurs/alice/fichier.txt')");
  console.log("  →", path.basename("/utilisateurs/alice/fichier.txt"));

  console.log("\npath.basename('/utilisateurs/alice/fichier.txt', '.txt')");
  console.log("  →", path.basename("/utilisateurs/alice/fichier.txt", ".txt"));

  console.log("\npath.dirname('/utilisateurs/alice/fichier.txt')");
  console.log("  →", path.dirname("/utilisateurs/alice/fichier.txt"));

  console.log("\npath.extname('archive.tar.gz')");
  console.log("  →", path.extname("archive.tar.gz"));

  console.log("\npath.parse('/utilisateurs/alice/fichier.txt')");
  console.log("  →", path.parse("/utilisateurs/alice/fichier.txt"));
}

async function construireArborescence(
  racine: string,
  structure: Record<string, unknown>
): Promise<void> {
  await fs.mkdir(racine, { recursive: true });

  for (const [nom, valeur] of Object.entries(structure)) {
    const chemin = path.join(racine, nom);

    if (typeof valeur === "string") {
      await fs.writeFile(chemin, valeur);
    } else if (typeof valeur === "object" && valeur !== null) {
      await construireArborescence(chemin, valeur as Record<string, unknown>);
    }
  }
}

async function etape2() {

  await construireArborescence("./projet-test", {
    src: {
      "index.ts": "console.log('hello')",
      utils: {
        "math.ts": "export const add = (a: number, b: number) => a + b",
      },
    },
    "package.json": JSON.stringify({ name: "projet", version: "1.0.0" }, null, 2),
    "README.md": "# Mon Projet",
  });

  console.log(" Arborescence créée dans ./projet-test/");
}

async function trouverFichiers(
  dossier: string,
  extension: string
): Promise<string[]> {
  const resultats: string[] = [];
  const entrees = await fs.readdir(dossier, { withFileTypes: true });

  for (const entree of entrees) {
    const chemin = path.join(dossier, entree.name);

    if (entree.isDirectory()) {
      const sousResultats = await trouverFichiers(chemin, extension);
      resultats.push(...sousResultats);
    } else if (entree.isFile()) {
      if (path.extname(entree.name) === extension) {
        resultats.push(path.resolve(chemin));
      }
    }
  }

  return resultats;
}

async function etape3() {

  const fichiers = await trouverFichiers("./projet-test", ".ts");
  fichiers.forEach((f) => console.log(` ${f}`));
}

async function main() {
  etape1();
  await etape2();
  await etape3();
}

main().catch((e) => console.error(" Erreur :", e));
