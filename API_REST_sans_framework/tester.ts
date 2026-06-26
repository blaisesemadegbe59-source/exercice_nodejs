const BASE_URL = "http://localhost:3000";

interface RésultatTest {
  nom: string;
  succès: boolean;
  détail: string;
}

async function requête(
  method: string,
  chemin: string,
  body?: unknown,
  token?: string
): Promise<{ status: number; data: unknown }> {
  const headers: Record<string, string> = {};

  if (body) {
    headers["Content-Type"] = "application/json";
  }
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${BASE_URL}${chemin}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  const data = await res.json().catch(() => null);
  return { status: res.status, data };
}

let token: string | undefined;

async function tester(): Promise<void> {
  const résultats: RésultatTest[] = [];

  console.log("━━━ Test de l'API REST ━━━\n");

  const t1Data = await requête("POST", "/auth/inscription", {
    nom: "Alice",
    email: "alice@test.com",
    motDePasse: "secret123",
  });
  résultats.push({
    nom: "1. Inscription",
    succès: t1Data.status === 201,
    détail: `status ${t1Data.status}`,
  });
  token = (t1Data.data as { token?: string })?.token;

  const t2Data = await requête("POST", "/auth/connexion", {
    email: "alice@test.com",
    motDePasse: "secret123",
  });
  résultats.push({
    nom: "2. Connexion",
    succès: t2Data.status === 200 && !!(t2Data.data as { token?: string })?.token,
    détail: `status ${t2Data.status}`,
  });
  token = (t2Data.data as { token?: string })?.token ?? token;

  const ids: number[] = [];
  for (let i = 1; i <= 3; i++) {
    const tData = await requête("POST", "/tâches", {
      titre: `Tâche ${i}`,
      priorité: i === 2 ? "haute" : "normale",
    }, token);
    if (i === 1) {
      résultats.push({
        nom: "3. Créer 3 tâches",
        succès: tData.status === 201,
        détail: `status ${tData.status}`,
      });
    }
    const tâche = tData.data as { id?: number };
    if (tâche?.id) ids.push(tâche.id);
  }

  const t4Data = await requête("GET", "/tâches", undefined, token);
  const t4Array = t4Data.data as unknown[];
  résultats.push({
    nom: "4. Lister les tâches",
    succès: t4Data.status === 200 && Array.isArray(t4Array) && t4Array.length === 3,
    détail: `${t4Array?.length ?? 0} tâche(s)`,
  });

  if (ids[0]) {
    const t5Data = await requête("PATCH", `/tâches/${ids[0]}`, { statut: "terminé" }, token);
    résultats.push({
      nom: "5. Modifier statut",
      succès: t5Data.status === 200,
      détail: `status ${t5Data.status}`,
    });
  }

  if (ids[1]) {
    const t6Data = await requête("DELETE", `/tâches/${ids[1]}`, undefined, token);
    résultats.push({
      nom: "6. Supprimer une tâche",
      succès: t6Data.status === 200,
      détail: `status ${t6Data.status}`,
    });
  }

  const t7Data = await requête("GET", "/tâches/stats", undefined, token);
  résultats.push({
    nom: "7. Statistiques",
    succès: t7Data.status === 200,
    détail: `status ${t7Data.status}`,
  });

  const t8Data = await requête("GET", "/tâches");
  résultats.push({
    nom: "8. Accès sans token (401)",
    succès: t8Data.status === 401,
    détail: `status ${t8Data.status}`,
  });

  console.log("");
  let tousSuccès = true;
  for (const r of résultats) {
    const icône = r.succès ? "✅" : "❌";
    console.log(`  ${icône} ${r.nom} — ${r.détail}`);
    if (!r.succès) tousSuccès = false;
  }

  console.log("");
  if (tousSuccès) {
    console.log(" Tous les tests sont passés !");
  } else {
    console.log("  Certains tests ont échoué.");
  }
}

tester().catch((e) => console.error(" Erreur test :", e));
