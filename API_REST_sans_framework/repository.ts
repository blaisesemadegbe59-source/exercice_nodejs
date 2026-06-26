import { promises as fs } from "fs";
import path from "path";
import type { Entité } from "./types";

export class Repository<T extends Entité> {
  constructor(private fichier: string) {}

  private async sAssurerFichier(): Promise<void> {
    const dossier = path.dirname(this.fichier);
    await fs.mkdir(dossier, { recursive: true });

    try {
      await fs.access(this.fichier);
    } catch {
      await fs.writeFile(this.fichier, "[]", "utf-8");
    }
  }

  private async lire(): Promise<T[]> {
    await this.sAssurerFichier();
    const contenu = await fs.readFile(this.fichier, "utf-8");
    return JSON.parse(contenu) as T[];
  }

  private async écrire(données: T[]): Promise<void> {
    await this.sAssurerFichier();
    await fs.writeFile(this.fichier, JSON.stringify(données, null, 2), "utf-8");
  }

  async trouverTous(filtre?: Partial<T>): Promise<T[]> {
    const entités = await this.lire();
    if (!filtre) return entités;

    return entités.filter((e) =>
      Object.entries(filtre).every(([clé, valeur]) => e[clé as keyof T] === valeur)
    );
  }

  async trouverParId(id: number): Promise<T | undefined> {
    const entités = await this.lire();
    return entités.find((e) => e.id === id);
  }

  async créer(données: Omit<T, "id" | "créeÀ" | "modifiéeÀ">): Promise<T> {
    const entités = await this.lire();
    const nextId = entités.length > 0 ? Math.max(...entités.map((e) => e.id)) + 1 : 1;
    const maintenant = new Date().toISOString();

    const entité = {
      ...données,
      id: nextId,
      créeÀ: maintenant,
      modifiéeÀ: maintenant,
    } as T;

    entités.push(entité);
    await this.écrire(entités);
    return entité;
  }

  async modifier(id: number, données: Partial<T>): Promise<T> {
    const entités = await this.lire();
    const entité = entités.find((e) => e.id === id);

    if (!entité) {
      throw new Error(`Entité ${id} introuvable`);
    }

    Object.assign(entité, données, { modifiéeÀ: new Date().toISOString() });
    await this.écrire(entités);
    return entité;
  }

  async supprimer(id: number): Promise<boolean> {
    const entités = await this.lire();
    const index = entités.findIndex((e) => e.id === id);

    if (index === -1) return false;

    entités.splice(index, 1);
    await this.écrire(entités);
    return true;
  }
}
