import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { getToken } from "@workspace/api-client-react";
import { Eye, EyeOff, CheckCircle2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

interface PracticeQuestion {
  id: string;
  difficulty: "facile" | "moyen" | "difficile";
  question: string;
  answer: string;
  explanation?: string;
}

interface PracticeQuestionsResponse {
  facile: PracticeQuestion[];
  moyen: PracticeQuestion[];
  difficile: PracticeQuestion[];
  subject?: string;
  key?: string;
}

// ── Fetch helper ──────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function fetchPracticeQuestions(classId: number): Promise<PracticeQuestionsResponse> {
  const token = getToken();
  const res = await fetch(`${API_URL}/classes/${classId}/practice-questions`, {
    headers: token ? { Authorization: `Bearer ${token}` } : {},
  });
  if (!res.ok) return { facile: [], moyen: [], difficile: [] };
  return res.json();
}

// ── Eye icon with hover-reveal + click-lock ───────────────────────────────────

function EyeToggle({
  questionId,
  isLocked,
  onToggleLock,
  colorClass,
}: {
  questionId: string;
  isLocked: boolean;
  onToggleLock: () => void;
  colorClass: string;
}) {
  const [hovered, setHovered] = useState(false);
  const active = isLocked || hovered;
  const tooltip = isLocked ? "Masquer la réponse" : "Voir la réponse";

  return (
    <div className="relative flex-shrink-0" style={{ width: 32, height: 32 }}>
      <button
        onClick={onToggleLock}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className="w-8 h-8 flex items-center justify-center rounded-lg transition-colors hover:bg-black/5"
        aria-label={tooltip}
      >
        {isLocked ? (
          <EyeOff className={`w-5 h-5 transition-colors ${active ? colorClass : "text-muted-foreground"}`} />
        ) : (
          <Eye className={`w-5 h-5 transition-colors ${active ? colorClass : "text-muted-foreground"}`} />
        )}
      </button>
      {/* Tooltip */}
      <div
        className="pointer-events-none absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 rounded-md bg-gray-900 text-white text-xs whitespace-nowrap transition-opacity duration-150"
        style={{ opacity: hovered ? 1 : 0 }}
      >
        {tooltip}
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-gray-900" />
      </div>
    </div>
  );
}

// ── Single question card ──────────────────────────────────────────────────────

const DIFF_STYLES = {
  facile:    { eyeColor: "text-green-500", answerBg: "bg-green-50 border-green-300 text-green-900" },
  moyen:     { eyeColor: "text-amber-500",  answerBg: "bg-amber-50 border-amber-300 text-amber-900" },
  difficile: { eyeColor: "text-red-500",    answerBg: "bg-red-50 border-red-300 text-red-900" },
};

function QuestionCard({
  q,
  userId,
  difficulty,
}: {
  q: PracticeQuestion;
  userId?: number;
  difficulty: "facile" | "moyen" | "difficile";
}) {
  const [hovered, setHovered] = useState(false);
  const [locked, setLocked] = useState(false);

  const lsKey = `understood_${userId ?? "guest"}_${q.id}`;
  const [understood, setUnderstood] = useState(() => {
    try { return localStorage.getItem(lsKey) === "1"; } catch { return false; }
  });

  const showAnswer = locked || hovered;
  const styles = DIFF_STYLES[difficulty];

  function toggleUnderstood() {
    const next = !understood;
    setUnderstood(next);
    try { if (next) localStorage.setItem(lsKey, "1"); else localStorage.removeItem(lsKey); } catch {}
  }

  return (
    <div className={`rounded-xl border bg-card p-4 transition-shadow hover:shadow-sm ${understood ? "opacity-70" : ""}`}>
      {/* Question row */}
      <div className="flex items-start gap-3">
        <p className="flex-1 font-medium text-foreground leading-relaxed">{q.question}</p>
        <div
          onMouseEnter={() => setHovered(true)}
          onMouseLeave={() => setHovered(false)}
          className="flex-shrink-0"
        >
          <EyeToggle
            questionId={q.id}
            isLocked={locked}
            onToggleLock={() => setLocked(v => !v)}
            colorClass={styles.eyeColor}
          />
        </div>
      </div>

      {/* Answer box — slide in/out */}
      <div
        className="overflow-hidden transition-all duration-200"
        style={{ maxHeight: showAnswer ? "400px" : "0", opacity: showAnswer ? 1 : 0 }}
      >
        <div className={`mt-3 rounded-lg border-l-4 p-4 ${styles.answerBg}`}>
          <p className="text-sm font-semibold mb-1">
            Réponse : <span className="font-normal">{q.answer}</span>
          </p>
          {q.explanation && (
            <p className="text-sm italic mt-1 opacity-80">
              Explication : {q.explanation}
            </p>
          )}
        </div>
      </div>

      {/* "J'ai compris" checkbox */}
      <div className="mt-3 flex justify-end">
        <button
          onClick={toggleUnderstood}
          className={`flex items-center gap-1.5 text-xs transition-colors ${understood ? "text-green-600 font-semibold" : "text-muted-foreground hover:text-foreground"}`}
        >
          <CheckCircle2 className={`w-4 h-4 ${understood ? "text-green-500" : "text-muted-foreground/50"}`} />
          J'ai compris
        </button>
      </div>
    </div>
  );
}

// ── Difficulty section ────────────────────────────────────────────────────────

const SECTION_META = {
  facile:    { emoji: "🟢", label: "Facile",    badge: "bg-green-100 text-green-700" },
  moyen:     { emoji: "🟡", label: "Moyen",     badge: "bg-amber-100 text-amber-700" },
  difficile: { emoji: "🔴", label: "Difficile", badge: "bg-red-100 text-red-700" },
};

function DifficultySection({
  difficulty,
  questions,
  userId,
}: {
  difficulty: "facile" | "moyen" | "difficile";
  questions: PracticeQuestion[];
  userId?: number;
}) {
  if (questions.length === 0) return null;
  const meta = SECTION_META[difficulty];
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <span className="text-lg">{meta.emoji}</span>
        <span className={`px-3 py-1 rounded-full text-sm font-semibold ${meta.badge}`}>{meta.label}</span>
        <span className="text-xs text-muted-foreground">{questions.length} question{questions.length > 1 ? "s" : ""}</span>
      </div>
      {questions.map(q => (
        <QuestionCard key={q.id} q={q} userId={userId} difficulty={difficulty} />
      ))}
    </div>
  );
}

// ── Main exported component ───────────────────────────────────────────────────

export function PracticeQuestionsTab({
  classId,
  userId,
  readOnly = false,
}: {
  classId: number;
  userId?: number;
  readOnly?: boolean;
}) {
  const { data, isLoading } = useQuery({
    queryKey: ["practice-questions", classId],
    queryFn: () => fetchPracticeQuestions(classId),
    staleTime: 1000 * 60 * 10,
  });

  const total = (data?.facile.length ?? 0) + (data?.moyen.length ?? 0) + (data?.difficile.length ?? 0);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        {[1, 2, 3].map(i => <div key={i} className="h-20 bg-muted rounded-xl" />)}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h2 className="text-xl font-bold">
          Questions d'entraînement{data?.subject ? ` — ${data.subject}` : ""}
        </h2>
        <p className="text-sm text-muted-foreground mt-1">
          {readOnly
            ? "Questions automatiques visibles par vos élèves"
            : "Entraîne-toi avec des questions classées par difficulté"}
        </p>
      </div>

      {total === 0 ? (
        <div className="rounded-2xl border bg-muted/30 p-12 text-center">
          <p className="text-muted-foreground">
            Les questions d'entraînement pour cette matière seront disponibles prochainement.
          </p>
        </div>
      ) : (
        <div className="space-y-10">
          <DifficultySection difficulty="facile"    questions={data?.facile    ?? []} userId={userId} />
          <DifficultySection difficulty="moyen"     questions={data?.moyen     ?? []} userId={userId} />
          <DifficultySection difficulty="difficile" questions={data?.difficile ?? []} userId={userId} />
        </div>
      )}
    </div>
  );
}
