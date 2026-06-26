import { promises as fs, createReadStream, createWriteStream } from "fs";
import readline from "readline";
import { Transform, pipeline } from "stream";
import { promisify } from "util";

const pipelineAsync = promisify(pipeline);

async function genererGrosFichier(chemin: string, nbLignes: number): Promise<void> {
  const lignes: string[] = [];
  for (let i = 0; i < nbLignes; i++) {
    const aleatoire = Math.random().toString(36).substring(2, 15);
    lignes.push(`Ligne ${i} : ${aleatoire}`);
  }
  await fs.writeFile(chemin, lignes.join("\n"));
}

async function etape1() {

  const fichier = "gros-fichier.txt";

  await genererGrosFichier(fichier, 100_000);

  const avant1 = process.memoryUsage().heapUsed;
  const contenu = await fs.readFile(fichier, "utf-8");
  const apres1 = process.memoryUsage().heapUsed;
  const memoireReadFile = (apres1 - avant1) / 1024 / 1024;

  console.log(` fs.readFile : ${memoireReadFile.toFixed(2)} MB utilisés`);
  console.log(`  (fichier de ${contenu.length} caractères chargé en RAM)`);

  const avant2 = process.memoryUsage().heapUsed;
  let compteur = 0;

  await new Promise<void>((resolve, reject) => {
    const stream = createReadStream(fichier, "utf-8");
    stream.on("data", () => compteur++);
    stream.on("end", resolve);
    stream.on("error", reject);
  });

  const apres2 = process.memoryUsage().heapUsed;
  const memoireStream = (apres2 - avant2) / 1024 / 1024;

  console.log(` createReadStream : ${memoireStream.toFixed(2)} MB utilisés`);
  console.log(`   (${compteur} morceaux traités)`);

  console.log(`\n Différence : ${(memoireReadFile - memoireStream).toFixed(2)} MB économisés !`);
}

async function compterLignes(chemin: string): Promise<number> {
  const stream = createReadStream(chemin, "utf-8");
  const rl = readline.createInterface({ input: stream });

  let nbLignes = 0;
  for await (const _ligne of rl) {
    nbLignes++;
  }

  return nbLignes;
}

async function etape2() {

  const total = await compterLignes("gros-fichier.txt");
  console.log(`Nombre de lignes : ${total}`);
}

async function filtrerVersCSV(
  source: string,
  destination: string,
  predicat: (ligne: string) => boolean
): Promise<void> {
  const stream = createReadStream(source, "utf-8");
  const rl = readline.createInterface({ input: stream });
  const sortie = createWriteStream(destination);

  for await (const ligne of rl) {
    if (predicat(ligne)) {
      sortie.write(ligne + "\n");
    }
  }

  sortie.end();
  await new Promise<void>((resolve) => sortie.on("finish", resolve));
}

async function etape3() {

  const predicat = (ligne: string) => ligne.includes("Ligne 1");

  await filtrerVersCSV("gros-fichier.txt", "resultat-filtre.csv", predicat);

  const lignesResultat = await compterLignes("resultat-filtre.csv");
  console.log(` Filtre terminé : ${lignesResultat} lignes écrites dans resultat-filtre.csv`);
  console.log("   (lignes contenant 'Ligne 1' = 1, 10-19, 100-199, 1000-9999...)");
}

async function etape4() {
  
  const transformMajuscules = new Transform({
    transform(chunk: Buffer, _encoding, callback) {
      this.push(chunk.toString().toUpperCase());
      callback();
    },
  });

  const debutStream = Date.now();

  await pipelineAsync(
    createReadStream("gros-fichier.txt"),
    transformMajuscules,
    createWriteStream("gros-fichier-majuscules.txt")
  );

  const finStream = Date.now();
  console.log(` Pipeline (stream) : ${(finStream - debutStream)} ms`);


  const debutClassique = Date.now();

  const contenu = await fs.readFile("gros-fichier.txt", "utf-8");
  await fs.writeFile("gros-fichier-classique.txt", contenu.toUpperCase());

  const finClassique = Date.now();
  console.log(` Version classique (read+write) : ${(finClassique - debutClassique)} ms`);

  const streamMemoire = process.memoryUsage().heapUsed / 1024 / 1024;
  console.log(` Mémoire finale (heapUsed) : ${streamMemoire.toFixed(2)} MB`);
}

async function main() {
  await etape1();
  await etape2();
  await etape3();
  await etape4();

  console.log("\n Tous les fichiers ont été créés !");
  console.log("   - gros-fichier.txt");
  console.log("   - gros-fichier-majuscules.txt");
  console.log("   - gros-fichier-classique.txt");
  console.log("   - resultat-filtre.csv");
}

main().catch((e) => console.error(" Erreur :", e));
