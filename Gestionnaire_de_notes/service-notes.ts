import { promises as fs } from "fs";
import path from "path";
import os from "os";
import type { Note, Priorité, StatutNote, Statistiques, FiltresListe } from "./types";

const DOSSIER_STORAGE = path.join(os.homedir(), ".notes");
const FICHIER_STORAGE = path.join(DOSSIER_STORAGE, "notes.json");

export class ServiceNotes {
  private async sAssurerStorage(): Promise<void> {
    await fs.mkdir(DOSSIER_STORAGE, { recursive: true });

    try {
      await fs.access(FICHIER_STORAGE);
    } catch {
      await fs.writeFile(FICHIER_STORAGE, "[]", "utf-8");
    }
  }

  async charger(): Promise<Note[]> {
    await this.sAssurerStorage();

    try {
      const contenu = await fs.readFile(FICHIER_STORAGE, "utf-8");
      const notes = JSON.parse(contenu) as Note[];

      if (!Array.isArray(notes)) {
        throw new Error("Le fichier de notes est corrompu");
      }

      return notes;
    } catch (erreur) {
      if (erreur instanceof SyntaxError) {
        throw new Error("Le fichier JSON est corrompu et illisible");
      }
      throw erreur;
    }
  }

  async sauvegarder(notes: Note[]): Promise<void> {
    await this.sAssurerStorage();
    const contenu = JSON.stringify(notes, null, 2);
    await fs.writeFile(FICHIER_STORAGE, contenu, "utf-8");
  }

  async ajouter(contenu: string, tags: string[], priorité: Priorité): Promise<Note> {
    const notes = await this.charger();
    const maintenant = new Date().toISOString();

    const nextId = notes.length > 0
      ? Math.max(...notes.map((n) => n.id)) + 1
      : 1;

    const note: Note = {
      id: nextId,
      contenu,
      tags,
      priorité,
      statut: "active",
      créeÀ: maintenant,
      modifiéeÀ: maintenant,
    };

    notes.push(note);
    await this.sauvegarder(notes);

    return note;
  }

  async lister(filtres?: FiltresListe): Promise<Note[]> {
    let notes = await this.charger();

    if (filtres?.tag) {
      notes = notes.filter((n) => n.tags.includes(filtres.tag!));
    }
    if (filtres?.priorité) {
      notes = notes.filter((n) => n.priorité === filtres!.priorité);
    }
    if (filtres?.statut) {
      notes = notes.filter((n) => n.statut === filtres!.statut);
    }

    return notes;
  }

  async chercher(requête: string): Promise<Note[]> {
    const notes = await this.charger();
    const requêteMin = requête.toLowerCase();

    return notes.filter((n) => {
      const dansContenu = n.contenu.toLowerCase().includes(requêteMin);
      const dansTags = n.tags.some((t) => t.toLowerCase().includes(requêteMin));
      return dansContenu || dansTags;
    });
  }

  async terminer(id: number): Promise<Note> {
    const notes = await this.charger();
    const note = notes.find((n) => n.id === id);

    if (!note) {
      throw new Error(`Aucune note avec l'id ${id}`);
    }

    note.statut = "terminée";
    note.modifiéeÀ = new Date().toISOString();

    await this.sauvegarder(notes);
    return note;
  }

  async supprimer(id: number): Promise<void> {
    const notes = await this.charger();
    const index = notes.findIndex((n) => n.id === id);

    if (index === -1) {
      throw new Error(`Aucune note avec l'id ${id}`);
    }

    notes.splice(index, 1);
    await this.sauvegarder(notes);
  }

  async exporter(format: "json" | "csv"): Promise<string> {
    const notes = await this.charger();

    if (format === "json") {
      return JSON.stringify(notes, null, 2);
    }

    const enTête = "id,contenu,tags,priorité,statut,créeÀ,modifiéeÀ";
    const lignes = notes.map((n) => {
      const contenu = `"${n.contenu.replace(/"/g, '""')}"`;
      const tags = `"${n.tags.join(",")}"`;
      return [
        n.id.toString(),
        contenu,
        tags,
        n.priorité,
        n.statut,
        n.créeÀ,
        n.modifiéeÀ,
      ].join(",");
    });

    return [enTête, ...lignes].join("\n");
  }

  async stats(): Promise<Statistiques> {
    const notes = await this.charger();

    const parPriorité: Record<Priorité, number> = {
      basse: 0,
      normale: 0,
      haute: 0,
    };

    let terminées = 0;

    for (const note of notes) {
      parPriorité[note.priorité]++;
      if (note.statut === "terminée") terminées++;
    }

    return {
      total: notes.length,
      terminées,
      parPriorité,
    };
  }
}
