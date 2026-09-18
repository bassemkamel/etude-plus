import { Router } from "express";
import { requireAuth } from "../lib/auth.js";

const router = Router();

// Tunisian curriculum context per subject
const SUBJECT_CONTEXTS: Record<string, string> = {
  "Mathématiques": `Programme de Mathématiques du système éducatif tunisien:
- Analyse: Fonctions numériques, limites et continuité, dérivation, intégration, suites
- Algèbre: Arithmétique et divisibilité, polynômes, matrices et déterminants, systèmes linéaires
- Géométrie: Géométrie plane, vecteurs, géométrie analytique, géométrie de l'espace
- Probabilités et statistiques: Dénombrement, probabilités conditionnelles, distributions, statistiques inférentielles
- Nombres complexes: forme algébrique, trigonométrique, exponentielle`,

  "Physique": `Programme de Physique du système éducatif tunisien:
- Mécanique: Cinématique (vitesse, accélération), dynamique (lois de Newton), gravitation universelle, travail et énergie
- Électricité: Circuits courant continu, circuits RC et RL, courant alternatif, électromagnétisme
- Optique: Réflexion, réfraction, dispersion, lentilles minces, instruments optiques
- Ondes: Ondes mécaniques progressives, son, ondes stationnaires, effet Doppler
- Physique moderne: Radioactivité, physique nucléaire, effet photoélectrique`,

  "Chimie": `Programme de Chimie du système éducatif tunisien:
- Chimie organique: Alcanes, alcènes, alcools, aldéhydes, cétones, acides carboxyliques, esters, amines
- Réactions acide-base: Théorie de Brønsted, pH, constantes d'acidité, tampons
- Réactions d'oxydoréduction: Potentiels redox, piles électrochimiques, électrolyse
- Chimie des solutions: Solubilité, précipitation, complexation
- Cinétique chimique: Vitesse de réaction, loi de vitesse, catalyse`,

  "Sciences de la vie et de la terre": `Programme de SVT du système éducatif tunisien:
- Géologie: Sismologie, tectonique des plaques, roches magmatiques et métamorphiques, ressources géologiques
- Biologie cellulaire: Cellule eucaryote et procaryote, ADN, synthèse des protéines, mitose et méiose
- Génétique: Lois de Mendel, génétique moléculaire, mutations, génie génétique
- Physiologie humaine: Immunologie, nutrition, reproduction, système nerveux
- Écologie et environnement: Écosystèmes, biodiversité, cycles biogéochimiques`,

  "Informatique": `Programme d'Informatique du système éducatif tunisien:
- Algorithmique: Variables, structures conditionnelles, boucles, tableaux, fonctions, récursivité
- Langages de programmation: Python, Pascal, bases du C
- Bases de données: Modèle relationnel, SQL, algèbre relationnelle
- Réseaux informatiques: Architecture, protocoles TCP/IP, services web
- Systèmes d'information: Conception, modélisation UML/Merise`,

  "Arabe": `Programme d'Arabe du système éducatif tunisien:
- Grammaire (نحو): Analyse syntaxique, cas grammaticaux, conjugaison
- Morphologie (صرف): Dérivation, racines verbales, formes nominales
- Rhétorique (بلاغة): Figures de style, images poétiques
- Littérature: Textes classiques et contemporains, poésie, prose
- Expression écrite: Rédaction, dissertation, résumé`,

  "Français": `Programme de Français du système éducatif tunisien:
- Grammaire et syntaxe: Analyse grammaticale, propositions subordonnées, modes verbaux
- Littérature: Textes classiques et contemporains, genres littéraires (roman, théâtre, poésie)
- Expression écrite: Commentaire composé, dissertation, résumé, synthèse de documents
- Compréhension de texte: Lecture analytique, identification des thèmes et procédés stylistiques
- Vocabulaire: Lexique thématique, formation des mots`,

  "Anglais": `Tunisian English curriculum:
- Grammar: Tenses (simple, continuous, perfect), conditionals, passive voice, reported speech, modal verbs
- Vocabulary: Thematic word banks, collocations, idioms, academic vocabulary
- Reading comprehension: Identifying main ideas, inference, text types (articles, essays, stories)
- Writing: Essays, letters, reports, summaries, argumentative texts
- Literature: Short stories, poems, and novel extracts from the British and American canon`,

  "Histoire-Géographie": `Programme d'Histoire-Géographie du système éducatif tunisien:
- Histoire moderne et contemporaine: Révolutions, colonisation et décolonisation, guerres mondiales, guerre froide
- Histoire de la Tunisie: Période ottomane, protectorat français, indépendance, époque contemporaine
- Géographie humaine: Population, urbanisation, migration, mondialisation
- Géographie physique: Relief, climat, hydrologie, ressources naturelles
- Géopolitique: Relations internationales, organisations mondiales, conflits actuels`,

  "Philosophie": `Programme de Philosophie du système éducatif tunisien:
- La connaissance: Raison et expérience, science et vérité, langage et pensée
- L'existence humaine: La liberté, la conscience, le temps, la mort
- La morale et la politique: Le droit, la justice, l'État, la démocratie
- La nature et la technique: Relations homme-nature, progrès technique
- Textes philosophiques: Platon, Descartes, Kant, Hegel, Sartre, et philosophes arabes`,

  "Économie": `Programme d'Économie du système éducatif tunisien:
- Microéconomie: Offre et demande, marchés, élasticité, théorie du consommateur
- Macroéconomie: PIB, croissance, chômage, inflation, politique monétaire et budgétaire
- Commerce international: Échanges, balance des paiements, taux de change
- Économie tunisienne: Structure, secteurs, défis du développement
- Comptabilité nationale: Agrégats, tableaux économiques`,
};

const DEFAULT_SUBJECT_CONTEXT = `Programme du système éducatif tunisien: couvrant les matières scientifiques et littéraires du cursus national tunisien.`;

function getSystemPrompt(subject: string, gradeLevel: string): string {
  const subjectCtx = SUBJECT_CONTEXTS[subject] ?? DEFAULT_SUBJECT_CONTEXT;
  return `Tu es un assistant pédagogique expert spécialisé dans le programme scolaire tunisien officiel.

MATIÈRE: ${subject}
NIVEAU: ${gradeLevel}

PROGRAMME DE RÉFÉRENCE:
${subjectCtx}

INSTRUCTIONS:
- Réponds TOUJOURS en français (sauf pour la matière Anglais où tu peux alterner)
- Tes réponses doivent s'aligner strictement sur le programme officiel tunisien
- Fournis des explications claires, structurées et adaptées au niveau ${gradeLevel}
- Pour les exercices et questions, formule-les dans le style des examens tunisiens
- Quand tu génères des questions, varie les types: QCM, vrai/faux, questions ouvertes, problèmes
- Utilise des exemples concrets et pertinents pour le contexte tunisien
- Si on te pose une question hors programme, indique poliment que ça dépasse le cadre du cours
- Encourages les élèves et adopte un ton bienveillant et pédagogique
- Pour les mathématiques et sciences, n'hésite pas à montrer les étapes de résolution`;
}

router.post("/chat", requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI service not configured. Set ANTHROPIC_API_KEY." });
    return;
  }

  const { messages, subject, gradeLevel } = req.body as {
    messages: { role: "user" | "assistant"; content: string }[];
    subject?: string;
    gradeLevel?: string;
  };

  if (!messages || !Array.isArray(messages) || messages.length === 0) {
    res.status(400).json({ error: "messages array required" });
    return;
  }

  // Prevent oversized requests that could abuse API credits
  if (messages.length > 20) {
    res.status(400).json({ error: "Too many messages in conversation" });
    return;
  }
  for (const m of messages) {
    if (typeof m.content !== "string" || m.content.length > 4000) {
      res.status(400).json({ error: "Message too long (max 4000 chars)" });
      return;
    }
    if (m.role !== "user" && m.role !== "assistant") {
      res.status(400).json({ error: "Invalid message role" });
      return;
    }
  }

  const systemPrompt = getSystemPrompt(subject ?? "Général", gradeLevel ?? "Lycée");

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1200,
        system: systemPrompt,
        messages: messages.slice(-10), // keep last 10 turns for context
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error((err as any).error?.message ?? `Anthropic error ${response.status}`);
    }

    const data = await response.json() as any;
    const reply = data.content?.[0]?.text ?? "";
    res.json({ reply });
  } catch (err: any) {
    console.error("AI error:", err.message);
    res.status(500).json({ error: "Erreur lors de la génération de la réponse IA." });
  }
});

router.post("/practice-questions", requireAuth, async (req, res) => {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    res.status(503).json({ error: "AI service not configured." });
    return;
  }

  const { subject, gradeLevel, topic } = req.body as {
    subject?: string;
    gradeLevel?: string;
    topic?: string;
  };

  const systemPrompt = getSystemPrompt(subject ?? "Général", gradeLevel ?? "Lycée");
  const topicNote = topic ? ` sur le thème: "${topic}"` : "";

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-haiku-4-5-20251001",
        max_tokens: 1500,
        system: systemPrompt,
        messages: [{
          role: "user",
          content: `Génère 5 questions d'entraînement variées${topicNote} pour le niveau ${gradeLevel ?? "Lycée"} en ${subject ?? "cette matière"}, dans le style du programme tunisien.

Inclure: 2 QCM (avec 4 choix et la bonne réponse indiquée), 1 vrai/faux avec justification, 2 questions ouvertes ou problèmes.

Formate clairement avec numéros et types de questions. Pour les QCM et vrai/faux, indique la réponse correcte à la fin.`,
        }],
      }),
      signal: AbortSignal.timeout(30_000),
    });

    if (!response.ok) throw new Error(`Anthropic ${response.status}`);
    const data = await response.json() as any;
    res.json({ questions: data.content?.[0]?.text ?? "" });
  } catch (err: any) {
    console.error("AI practice questions error:", err.message);
    res.status(500).json({ error: "Erreur lors de la génération des questions." });
  }
});

export default router;
