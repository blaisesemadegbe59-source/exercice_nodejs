import { writeFileSync, readFileSync } from "fs";
import { promises as fs } from "fs";
import path from "path";

async function etape1() {
  console.log("\n");

  const dossier = "données";
  const fichier = path.join(dossier, "journal.txt");

  await fs.mkdir(dossier, { recursive: true });

  writeFileSync(fichier, "Première ligne\nDeuxième ligne\nTroisième ligne\n");
  const contenuSync = readFileSync(fichier, "utf-8");
  console.log(" [Synchrone] Contenu lu :");
  console.log(contenuSync);

  await fs.writeFile(fichier, "Ligne A\nLigne B\nLigne C\n");
  const contenuAsync = await fs.readFile(fichier, "utf-8");
  console.log(" [Asynchrone] Contenu lu :");
  console.log(contenuAsync);
}

async function listerFichiers(dossier: string): Promise<string[]> {
  const entrees = await fs.readdir(dossier, { withFileTypes: true });
  return entrees.filter((e) => e.isFile()).map((e) => e.name);
}

async function etape2() {
  console.log("\n");

  const fichiers = await listerFichiers("données");

  for (const nom of fichiers) {
    const chemin = path.join("données", nom);
    const stats = await fs.stat(chemin);
    console.log(` ${nom} — ${stats.size} octets`);
  }
}

async function copierFichier(source: string, destination: string): Promise<void> {
  try {
    const contenu = await fs.readFile(source, "utf-8");

    const dossierDest = path.dirname(destination);
    await fs.mkdir(dossierDest, { recursive: true });

    await fs.writeFile(destination, contenu);

    console.log(` Copié : ${source} → ${destination}`);
  } catch (erreur) {
    if ((erreur as NodeJS.ErrnoException).code === "ENOENT") {
      console.error(` Fichier source introuvable : ${source}`);
    } else {
      throw erreur;
    }
  }
}

async function etape3() {
  console.log("\n\n");

  await copierFichier("données/journal.txt", "données/copie.txt");
  await copierFichier("données/inexistant.txt", "données/x.txt");
}

async function rechercherDansFichier(
  chemin: string,
  motif: string
): Promise<{ ligne: number; contenu: string }[]> {
  const contenu = await fs.readFile(chemin, "utf-8");
  const lignes = contenu.split("\n");

  const resultats: { ligne: number; contenu: string }[] = [];

  lignes.forEach((texte, index) => {
    if (texte.includes(motif)) {
      resultats.push({ ligne: index + 1, contenu: texte });
    }
  });

  return resultats;
}

async function etape4() {
  console.log("\n\n");

  const resultats = await rechercherDansFichier("données/journal.txt", "Ligne");

  if (resultats.length === 0) {
    console.log("Aucune ligne trouvée.");
  } else {
    resultats.forEach((r) => {
      console.log(`  Ligne ${r.ligne} : ${r.contenu}`);
    });
  }
}

async function main() {
  await etape1();
  await etape2();
  await etape3();
  await etape4();
}

main().catch((e) => console.error(" Erreur :", e));
