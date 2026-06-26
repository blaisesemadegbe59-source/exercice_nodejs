
console.log(" Version de Node.js :", process.versions.node);

console.log(" Dossier courant (__dirname) :", __dirname);

console.log(" Chemin du fichier (__filename) :", __filename);


console.log(" Tableau complet (process.argv) :");
console.log("  ", process.argv);


console.log(" Mes arguments (.slice(2)) :", process.argv.slice(2));

console.log(" PATH (extrait) :", process.env.PATH?.slice(0, 50) + "...");


const nom = process.env.NOM;

if (nom) {
  console.log(` Bonjour ${nom} ! (variable NOM détectée)`);
} else {
  console.log(" Essaie : NOM=Alice node exo1.js");
}


console.log("\n=== TÂCHE 4 : Explorer process ===\n");


console.log(" Plateforme (OS) :", process.platform);

console.log(" PID du processus :", process.pid);


const memoire = process.memoryUsage();

const heapUsedMB = (memoire.heapUsed / 1024 / 1024).toFixed(2);
console.log(" Mémoire utilisée (heapUsed) :", heapUsedMB, "MB");


console.log(" PATH (extrait) :", process.env.PATH?.slice(0, 50) + "...");


const nom = process.env.NOM;
if (nom) {
  console.log(` Bonjour ${nom} ! (variable NOM détectée)`);
} else {
  console.log(" Essaie : NOM=Alice node exo1.js");
}




console.log("\n=== ÉTAPE 3 : Explorer process ===\n");

console.log(" Plateforme :", process.platform);

console.log("PID :", process.pid);


const memoire = process.memoryUsage();
console.log(" Mémoire (heapUsed) :", (memoire.heapUsed / 1024 / 1024).toFixed(2), "MB");


