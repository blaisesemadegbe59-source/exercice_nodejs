import { EventEmitter } from "events";

interface ÉvénementsMinuteur {
  tick: [secondes: number];
  terminé: [];
  erreur: [message: string];
}

class Minuteur extends EventEmitter {
  constructor(private durée: number) {
    super();
  }

  démarrer(): void {
    if (this.durée <= 0) {
      this.emit("erreur", "La durée doit être supérieure à 0");
      return;
    }

    let écoulées = 0;

    const interval = setInterval(() => {
      écoulées++;
      this.emit("tick", écoulées);

      if (écoulées >= this.durée) {
        clearInterval(interval);
        this.emit("terminé");
      }
    }, 1000);
  }

  on<K extends keyof ÉvénementsMinuteur>(
    événement: K,
    listener: (...args: ÉvénementsMinuteur[K]) => void
  ): this {
    return super.on(événement, listener as (...args: any[]) => void);
  }
}

async function etape1() {

  await new Promise<void>((resolve) => {
    const minuteur = new Minuteur(3);

    minuteur.on("tick", (secondes) => {
      console.log(`    ${secondes}s...`);
    });

    minuteur.on("terminé", () => {
      console.log("   Terminé !");
      resolve();
    });

    minuteur.on("erreur", (message) => {
      console.log(`   Erreur : ${message}`);
      resolve();
    });

    minuteur.démarrer();
  });
}

async function etape1b() {

  const minuteur = new Minuteur(0);
  minuteur.on("erreur", (message) => {
    console.log(`   Erreur : ${message}`);
  });
  minuteur.démarrer();
}

interface FilePrioritéÉvénements<T> {
  ajout: [élément: T, priorité: number];
  traitement: [élément: T];
  vide: [];
}

class FileDePriorité<T> extends EventEmitter {
  private file: { élément: T; priorité: number }[] = [];

  ajouter(élément: T, priorité: number): void {
    this.file.push({ élément, priorité });
    this.file.sort((a, b) => b.priorité - a.priorité);
    this.emit("ajout", élément, priorité);
  }

  traiterProchain(): T | undefined {
    if (this.file.length === 0) {
      this.emit("vide");
      return undefined;
    }

    const suivant = this.file.shift();
    this.emit("traitement", suivant!.élément);
    return suivant!.élément;
  }

  taille(): number {
    return this.file.length;
  }

  on<K extends keyof FilePrioritéÉvénements<T>>(
    événement: K,
    listener: (...args: FilePrioritéÉvénements<T>[K]) => void
  ): this {
    return super.on(événement, listener as (...args: any[]) => void);
  }
}

async function etape3() {

  const file = new FileDePriorité<string>();

  file.on("ajout", (élément, priorité) => {
    console.log(` Ajouté : "${élément}" (priorité ${priorité})`);
  });

  file.on("traitement", (élément) => {
    console.log(`  Traitement : "${élément}"`);
  });

  file.on("vide", () => {
    console.log("  File vide !");
  });

  file.ajouter("Tâche basse", 1);
  file.ajouter("Tâche haute", 10);
  file.ajouter("Tâche moyenne", 5);

  console.log(`\n  Taille de la file : ${file.taille()}`);

  file.traiterProchain();
  file.traiterProchain();
  file.traiterProchain();
  file.traiterProchain();
}

async function main() {
  await etape1();
  await etape1b();
  await etape3();
}

main().catch((e) => console.error(" Erreur :", e));
