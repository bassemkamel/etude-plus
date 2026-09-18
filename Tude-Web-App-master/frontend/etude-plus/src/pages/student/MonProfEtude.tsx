import { useState, useEffect, useRef } from "react";
import { DashboardLayout } from "@/components/layout/DashboardLayout";
import { useAuth } from "@/hooks/use-auth";
import { getToken } from "@workspace/api-client-react";
import {
  Sparkles, Crown, BookOpen, Play, Eye, EyeOff,
  ChevronUp, ChevronDown, Volume2, VolumeX, Filter, GraduationCap,
} from "lucide-react";
import { Link } from "wouter";
import { useTranslation } from "react-i18next";

// ── Types ─────────────────────────────────────────────────────────────────────

interface UsageData {
  tier: "gratuit" | "standard" | "premium";
  responsesUsed: number;
  responsesLimit: number | "unlimited";
  bonusUnlocked: number;
  adsWatched: number;
  enrolledClasses: number;
}

interface PracticeQuestion {
  id: string;
  difficulty: "facile" | "moyen" | "difficile";
  question: string;
  answer: string;
  explanation?: string;
  subject?: string;
}

interface QuestionsResponse {
  noProfile: boolean;
  questions: PracticeQuestion[];
  tier: "gratuit" | "standard" | "premium";
  enrolledClasses: number;
  responsesUsed: number;
  responsesLimit: number | "unlimited";
  bonusUnlocked: number;
  adsWatched: number;
  gradeLevel?: string;
  educationSection?: string;
}

interface QuestionGroup {
  key: string;
  questions: PracticeQuestion[];
}

interface StudyVideo {
  id: number;
  title: string;
  description: string | null;
  videoPath: string;
  thumbnailPath: string | null;
  gradeLevel: string | null;
  subject: string | null;
  views: number;
  createdAt: string;
  uploaderName: string | null;
}

type Tab = "pratique" | "questions"; // "shorts" tab disabled

// ── API helper ────────────────────────────────────────────────────────────────

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function apiFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  const res = await fetch(url, {
    ...opts,
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
  if (!res.ok && res.status === 401) {
    throw new Error("unauthorized");
  }
  return res.json();
}

// ── Difficulty styles ─────────────────────────────────────────────────────────

const DIFFICULTY_COLORS = {
  facile: "bg-green-50 border-green-200 text-green-800",
  moyen: "bg-amber-50 border-amber-200 text-amber-800",
  difficile: "bg-red-50 border-red-200 text-red-800",
};

const DIFFICULTY_BADGE = {
  facile: "bg-green-100 text-green-700",
  moyen: "bg-amber-100 text-amber-700",
  difficile: "bg-red-100 text-red-700",
};

// ── Ad Modal ──────────────────────────────────────────────────────────────────

function AdModal({
  onClose,
  onComplete,
  adsWatched,
}: {
  onClose: () => void;
  onComplete: (result: { unlockedThisAd: boolean; adsUntilNextBonus: number }) => void;
  adsWatched: number;
}) {
  const [secondsLeft, setSecondsLeft] = useState(15);
  const [done, setDone] = useState(false);
  const [completing, setCompleting] = useState(false);
  const adClientId = import.meta.env.VITE_ADSENSE_CLIENT_ID as string | undefined;
  const adSlotId = import.meta.env.VITE_ADSENSE_SLOT_ID as string | undefined;

  // How many more ads needed for next bonus
  const adsUntilBonus = 3 - (adsWatched % 3);

  useEffect(() => {
    if (secondsLeft <= 0) { setDone(true); return; }
    const t = setTimeout(() => setSecondsLeft(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [secondsLeft]);

  async function handleClose() {
    if (!done || completing) return;
    setCompleting(true);
    const data = await apiFetch(`${API_URL}/mon-prof/watch-ad`, { method: "POST" });
    onComplete({ unlockedThisAd: data.unlockedThisAd ?? false, adsUntilNextBonus: data.adsUntilNextBonus ?? 2 });
    onClose();
  }

  const progress = Math.round(((15 - secondsLeft) / 15) * 100);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-background rounded-2xl shadow-2xl w-full max-w-sm p-6 space-y-5">
        <div className="text-center">
          <p className="font-bold text-lg">Regarde une courte pub</p>
          <p className="text-sm text-muted-foreground mt-1">
            {adsUntilBonus === 1
              ? "Cette pub te donne <strong>+1 question</strong> !"
              : `encore ${adsUntilBonus} pub${adsUntilBonus > 1 ? "s" : ""} pour débloquer +1 question`}
          </p>
          <p className="text-xs text-muted-foreground mt-0.5">3 pubs = 1 question bonus</p>
        </div>
        <div className="rounded-xl bg-muted/50 border border-border flex items-center justify-center" style={{ width: "100%", minHeight: 180 }}>
          {adClientId && adSlotId ? (
            <ins
              className="adsbygoogle"
              style={{ display: "block", width: 300, height: 180 }}
              data-ad-client={adClientId}
              data-ad-slot={adSlotId}
              data-ad-format="rectangle"
            />
          ) : (
            <p className="text-xs text-muted-foreground text-center px-4">
              Ad placeholder — configure VITE_ADSENSE_CLIENT_ID et VITE_ADSENSE_SLOT_ID
            </p>
          )}
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-muted-foreground">
              {done ? "✅ Pub terminée !" : `⏱ Attends ${secondsLeft} seconde${secondsLeft !== 1 ? "s" : ""}...`}
            </span>
            <span className="font-semibold text-primary">{15 - secondsLeft}s / 15s</span>
          </div>
          <div className="w-full bg-muted rounded-full h-2 overflow-hidden">
            <div className="h-2 rounded-full bg-primary transition-all duration-1000" style={{ width: `${progress}%` }} />
          </div>
        </div>
        <button
          onClick={handleClose}
          disabled={!done || completing}
          className="w-full py-3 rounded-xl font-semibold transition-all disabled:opacity-40 disabled:cursor-not-allowed bg-primary text-primary-foreground hover:opacity-90"
        >
          {completing ? "Enregistrement..." : done ? "Fermer" : "Fermer (attends la fin)"}
        </button>
      </div>
    </div>
  );
}

// ── Practice Tab ──────────────────────────────────────────────────────────────

function PracticeTab({
  questions,
  noProfile,
  usage,
  onRefreshUsage,
  onShowAd,
}: {
  questions: PracticeQuestion[];
  noProfile: boolean;
  usage: UsageData | null;
  onRefreshUsage: () => Promise<void>;
  onShowAd: () => void;
}) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [consuming, setConsuming] = useState(false);

  const isPremium = usage?.tier === "premium";
  const remaining = usage
    ? usage.responsesLimit === "unlimited" ? null : (usage.responsesLimit as number) - usage.responsesUsed
    : null;
  const atLimit = remaining !== null && remaining <= 0;

  async function handleNext() {
    if (consuming) return;
    setConsuming(true);

    const data = await apiFetch(`${API_URL}/mon-prof/use-question`, { method: "POST" });

    if (data.error === "limit_reached") {
      onShowAd();
      setConsuming(false);
      return;
    }

    await onRefreshUsage();
    setCurrentIndex(i => i + 1);
    setRevealed(false);
    setConsuming(false);
  }

  if (noProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-8">
        <GraduationCap className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold text-lg">Configure ton profil d'abord</p>
          <p className="text-sm text-muted-foreground mt-1">
            Indique ton niveau et ta section pour accéder aux questions adaptées à ton programme.
          </p>
        </div>
        <Link href="/student/settings">
          <a className="text-sm px-5 py-2.5 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity">
            Compléter mon profil
          </a>
        </Link>
      </div>
    );
  }

  if (atLimit && !isPremium) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 text-center py-8">
        <div className="text-5xl">⏰</div>
        <div>
          <p className="font-bold text-lg">Limite quotidienne atteinte</p>
          <p className="text-sm text-muted-foreground mt-1">
            {usage?.tier === "gratuit"
              ? "5 questions gratuites utilisées aujourd'hui."
              : "20 questions standard utilisées aujourd'hui."}
            {" "}Reviens demain !
          </p>
        </div>
        <div className="flex flex-col gap-2 w-full max-w-xs">
          {usage?.tier === "gratuit" && (
            <button
              onClick={onShowAd}
              className="py-3 px-4 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity"
            >
              Regarder une pub (+1 question)
            </button>
          )}
          <Link href="/student/browse">
            <a className="block py-3 px-4 rounded-xl border border-border bg-background hover:bg-muted text-sm font-medium text-center transition-colors">
              Explorer les cours
            </a>
          </Link>
        </div>
      </div>
    );
  }

  if (!questions[currentIndex]) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-8">
        <div className="text-5xl">🎉</div>
        <p className="font-bold text-lg">Toutes les questions parcourues !</p>
        <p className="text-sm text-muted-foreground">
          {questions.length === 0
            ? "Aucune question disponible pour ton niveau. Configure tes matières dans les paramètres."
            : "Reviens demain pour de nouvelles questions."}
        </p>
        {questions.length === 0 && (
          <Link href="/student/settings">
            <a className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">
              Paramètres
            </a>
          </Link>
        )}
      </div>
    );
  }

  const q = questions[currentIndex];
  const total = questions.length;
  const progress = total > 0 ? Math.round((currentIndex / total) * 100) : 0;

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {/* Progress bar */}
      <div className="space-y-1 flex-shrink-0">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>Question {currentIndex + 1} / {total}</span>
          {!isPremium && (
            <span className={(remaining ?? 0) <= 1 ? "text-red-500 font-medium" : ""}>
              {Math.max(0, remaining ?? 0)} restante{(remaining ?? 0) !== 1 ? "s" : ""} aujourd'hui
            </span>
          )}
        </div>
        <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
          <div
            className="h-1.5 rounded-full bg-primary transition-all duration-300"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Question card */}
      <div className="flex-1 flex flex-col gap-4 overflow-y-auto min-h-0">
        <div className="border border-border rounded-2xl p-6 space-y-4 bg-card shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <p className="text-base font-medium leading-relaxed flex-1">{q.question}</p>
            <span className={`text-xs px-2.5 py-1 rounded-full font-semibold flex-shrink-0 ${DIFFICULTY_BADGE[q.difficulty]}`}>
              {q.difficulty}
            </span>
          </div>

          {!revealed ? (
            <button
              onClick={() => setRevealed(true)}
              className="flex items-center gap-2 text-sm px-4 py-2.5 rounded-xl border border-primary/30 bg-primary/5 text-primary hover:bg-primary/10 transition-colors font-medium"
            >
              <Eye className="w-4 h-4" />
              Voir la réponse
            </button>
          ) : (
            <div className={`rounded-xl border p-4 space-y-2 ${DIFFICULTY_COLORS[q.difficulty]}`}>
              <p className="font-semibold text-sm">Réponse :</p>
              <p className="leading-relaxed text-sm">{q.answer}</p>
              {q.explanation && (
                <p className="text-xs opacity-75 leading-relaxed mt-1 border-t border-current/10 pt-2">
                  {q.explanation}
                </p>
              )}
            </div>
          )}
        </div>

        {/* Next button — only visible after revealing answer */}
        {revealed && (
          <button
            onClick={handleNext}
            disabled={consuming}
            className="flex-shrink-0 w-full py-3 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90 transition-opacity disabled:opacity-50 disabled:cursor-wait"
          >
            {consuming
              ? "..."
              : currentIndex >= total - 1
              ? "Terminer ✓"
              : "Question suivante →"}
          </button>
        )}

        {/* Low-quota ad hint */}
        {usage?.tier === "gratuit" && !isPremium && (remaining ?? 0) > 0 && (remaining ?? 0) <= 2 && (
          <p className="text-center text-xs text-muted-foreground">
            <button onClick={onShowAd} className="underline hover:text-primary transition-colors">
              Regarder une pub pour débloquer +1 question (après 3 pubs)
            </button>
          </p>
        )}
      </div>
    </div>
  );
}

// ── Question Bank Tab ─────────────────────────────────────────────────────────

function QuestionCard({ q, userId }: { q: PracticeQuestion; userId?: number }) {
  const storageKey = `understood_${userId}_${q.id}`;
  const [revealed, setRevealed] = useState(false);
  const [understood, setUnderstood] = useState(() => {
    try { return localStorage.getItem(storageKey) === "1"; } catch { return false; }
  });

  function toggleUnderstood() {
    const next = !understood;
    setUnderstood(next);
    try { next ? localStorage.setItem(storageKey, "1") : localStorage.removeItem(storageKey); } catch {}
  }

  return (
    <div className={`border rounded-xl p-4 space-y-3 transition-all ${understood ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium leading-relaxed flex-1">{q.question}</p>
        <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${DIFFICULTY_BADGE[q.difficulty]}`}>
          {q.difficulty}
        </span>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={() => setRevealed(r => !r)}
          className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg border border-border bg-background hover:bg-muted transition-colors"
        >
          {revealed ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
          {revealed ? "Masquer la réponse" : "Voir la réponse"}
        </button>
        {revealed && (
          <label className="flex items-center gap-1.5 text-xs text-muted-foreground cursor-pointer select-none">
            <input type="checkbox" checked={understood} onChange={toggleUnderstood} className="rounded" />
            J'ai compris
          </label>
        )}
      </div>
      {revealed && (
        <div className={`rounded-lg border p-3 text-sm ${DIFFICULTY_COLORS[q.difficulty]}`}>
          <p className="font-semibold mb-1">Réponse :</p>
          <p className="leading-relaxed">{q.answer}</p>
          {q.explanation && (
            <p className="mt-2 text-xs opacity-80 leading-relaxed">{q.explanation}</p>
          )}
        </div>
      )}
    </div>
  );
}

function QuestionsTab({ userId }: { userId?: number }) {
  const [groups, setGroups] = useState<QuestionGroup[]>([]);
  const [gradeLabel, setGradeLabel] = useState<string>("");
  const [noProfile, setNoProfile] = useState(false);
  const [loading, setLoading] = useState(true);
  const [difficulty, setDifficulty] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [expandedKey, setExpandedKey] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    const params = difficulty !== "all" ? `?difficulty=${difficulty}` : "";
    fetch(`${API_URL}/mon-prof/question-bank${params}`, {
      headers: { Authorization: `Bearer ${getToken() ?? ""}` },
    })
      .then(r => r.json())
      .then(data => {
        if (data.noProfile) {
          setNoProfile(true);
        } else if (Array.isArray(data.subjects)) {
          setGradeLabel(data.gradeLabel ?? "");
          setGroups(data.subjects.map((s: { name: string; questions: PracticeQuestion[] }) => ({
            key: s.name,
            questions: s.questions,
          })));
        }
        setLoading(false);
      });
  }, [difficulty]);

  const filtered = groups.filter(g => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      g.key.toLowerCase().includes(q) ||
      g.questions.some(qst => qst.question.toLowerCase().includes(q) || qst.answer.toLowerCase().includes(q))
    );
  });

  if (noProfile) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center py-8">
        <GraduationCap className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold">Configure ton profil d'abord</p>
          <p className="text-sm text-muted-foreground mt-1">Indique ton niveau pour accéder à la banque de questions.</p>
        </div>
        <Link href="/student/settings">
          <a className="text-sm px-4 py-2 rounded-xl bg-primary text-primary-foreground font-semibold hover:opacity-90">
            Compléter mon profil
          </a>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-4">
      {gradeLabel && (
        <div className="flex-shrink-0 flex items-center gap-2">
          <GraduationCap className="w-4 h-4 text-primary flex-shrink-0" />
          <p className="text-sm font-semibold text-foreground">{gradeLabel}</p>
        </div>
      )}
      <div className="flex flex-wrap gap-2 items-center flex-shrink-0">
        <div className="flex items-center gap-1 bg-muted rounded-xl p-1">
          {(["all", "facile", "moyen", "difficile"] as const).map(d => (
            <button
              key={d}
              onClick={() => setDifficulty(d)}
              className={`text-xs px-3 py-1.5 rounded-lg font-medium transition-colors ${
                difficulty === d ? "bg-background shadow-sm text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {d === "all" ? "Tous" : d.charAt(0).toUpperCase() + d.slice(1)}
            </button>
          ))}
        </div>
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Rechercher une matière ou question..."
          className="flex-1 min-w-40 px-3 py-2 text-sm rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:border-primary"
        />
        <span className="text-xs text-muted-foreground ml-auto">
          {filtered.reduce((acc, g) => acc + g.questions.length, 0)} questions
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-3 pr-1">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-12 text-muted-foreground text-sm">Aucune question trouvée.</div>
        ) : (
          filtered.map(group => (
            <div key={group.key} className="border border-border rounded-2xl overflow-hidden">
              <button
                onClick={() => setExpandedKey(k => k === group.key ? null : group.key)}
                className="w-full flex items-center justify-between px-4 py-3 bg-muted/30 hover:bg-muted/50 transition-colors text-left"
              >
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-primary flex-shrink-0" />
                  <span className="font-semibold text-sm">{group.key}</span>
                  <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
                    {group.questions.length} questions
                  </span>
                </div>
                {expandedKey === group.key ? <ChevronUp className="w-4 h-4 text-muted-foreground" /> : <ChevronDown className="w-4 h-4 text-muted-foreground" />}
              </button>
              {expandedKey === group.key && (
                <div className="p-4 space-y-3 border-t border-border">
                  {group.questions.map(q => (
                    <QuestionCard key={q.id} q={q} userId={userId} />
                  ))}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
}

// ── Shorts / Video Tab ────────────────────────────────────────────────────────

function ShortsTab() {
  const [videos, setVideos] = useState<StudyVideo[]>([]);
  const [loading, setLoading] = useState(true);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [muted, setMuted] = useState(false);
  const [gradeFilter, setGradeFilter] = useState("");
  const [subjectFilter, setSubjectFilter] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewedRef = useRef<Set<number>>(new Set());

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (gradeFilter) params.set("gradeLevel", gradeFilter);
    if (subjectFilter) params.set("subject", subjectFilter);
    apiFetch(`${API_URL}/mon-prof/videos?${params}`).then(data => {
      if (Array.isArray(data)) { setVideos(data); setCurrentIndex(0); }
      setLoading(false);
    });
  }, [gradeFilter, subjectFilter]);

  const current = videos[currentIndex];

  useEffect(() => {
    if (!current || viewedRef.current.has(current.id)) return;
    viewedRef.current.add(current.id);
    apiFetch(`${API_URL}/mon-prof/videos/${current.id}/view`, { method: "POST" });
  }, [current]);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.currentTime = 0;
      videoRef.current.play().catch(() => {});
    }
  }, [currentIndex]);

  function goNext() { if (currentIndex < videos.length - 1) setCurrentIndex(i => i + 1); }
  function goPrev() { if (currentIndex > 0) setCurrentIndex(i => i - 1); }

  function handleWheel(e: React.WheelEvent) {
    if (e.deltaY > 0) goNext(); else goPrev();
  }

  const touchStartY = useRef(0);
  function handleTouchStart(e: React.TouchEvent) { touchStartY.current = e.touches[0].clientY; }
  function handleTouchEnd(e: React.TouchEvent) {
    const delta = touchStartY.current - e.changedTouches[0].clientY;
    if (Math.abs(delta) > 50) { if (delta > 0) goNext(); else goPrev(); }
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  if (videos.length === 0) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-4 text-center">
        <Play className="w-12 h-12 text-muted-foreground/30" />
        <div>
          <p className="font-semibold text-muted-foreground">Aucune vidéo disponible</p>
          <p className="text-sm text-muted-foreground/70 mt-1">Les admins n'ont pas encore publié de courtes vidéos.</p>
        </div>
        {(gradeFilter || subjectFilter) && (
          <button onClick={() => { setGradeFilter(""); setSubjectFilter(""); }} className="text-sm text-primary hover:underline">
            Effacer les filtres
          </button>
        )}
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col min-h-0 gap-3">
      <div className="flex-shrink-0 flex items-center gap-2">
        <button
          onClick={() => setShowFilters(f => !f)}
          className="flex items-center gap-1.5 text-xs px-3 py-2 rounded-xl border border-border bg-background hover:bg-muted transition-colors"
        >
          <Filter className="w-3.5 h-3.5" />
          Filtres
          {(gradeFilter || subjectFilter) && <span className="w-2 h-2 rounded-full bg-primary" />}
        </button>
        {showFilters && (
          <>
            <input
              value={gradeFilter}
              onChange={e => setGradeFilter(e.target.value)}
              placeholder="Niveau (ex: bac)"
              className="text-xs px-3 py-2 rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:border-primary w-32"
            />
            <input
              value={subjectFilter}
              onChange={e => setSubjectFilter(e.target.value)}
              placeholder="Matière (ex: Maths)"
              className="text-xs px-3 py-2 rounded-xl border border-border bg-background focus-visible:outline-none focus-visible:border-primary w-36"
            />
          </>
        )}
        <span className="text-xs text-muted-foreground ml-auto">{currentIndex + 1} / {videos.length}</span>
      </div>

      <div
        className="flex-1 flex items-center justify-center min-h-0"
        onWheel={handleWheel}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
      >
        <div className="relative bg-black rounded-2xl overflow-hidden shadow-2xl" style={{ aspectRatio: "9/16", maxHeight: "100%", maxWidth: 360, width: "100%" }}>
          <video
            ref={videoRef}
            key={current.id}
            src={`${API_URL}/storage${current.videoPath}`}
            muted={muted}
            loop
            playsInline
            className="w-full h-full object-cover"
          />
          <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 via-black/30 to-transparent">
            <p className="text-white font-bold text-sm leading-tight">{current.title}</p>
            {current.description && (
              <p className="text-white/80 text-xs mt-1 leading-relaxed line-clamp-2">{current.description}</p>
            )}
            <div className="flex items-center gap-2 mt-2">
              {current.gradeLevel && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-white/20 text-white backdrop-blur">{current.gradeLevel}</span>
              )}
              {current.subject && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-primary/80 text-primary-foreground backdrop-blur">{current.subject}</span>
              )}
              <span className="text-white/60 text-xs ml-auto">{current.views} vues</span>
            </div>
          </div>
          <button
            onClick={() => setMuted(m => !m)}
            className="absolute top-3 right-3 w-8 h-8 rounded-full bg-black/40 backdrop-blur flex items-center justify-center text-white hover:bg-black/60 transition-colors"
          >
            {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 flex items-center justify-center gap-4">
        <button
          onClick={goPrev}
          disabled={currentIndex === 0}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors text-sm font-medium"
        >
          <ChevronUp className="w-4 h-4" />
          Précédente
        </button>
        <button
          onClick={goNext}
          disabled={currentIndex === videos.length - 1}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl border border-border bg-background hover:bg-muted disabled:opacity-40 transition-colors text-sm font-medium"
        >
          Suivante
          <ChevronDown className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────

export function MonProfEtude() {
  const { t } = useTranslation();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>("pratique");
  const [pageData, setPageData] = useState<QuestionsResponse | null>(null);
  const [loadError, setLoadError] = useState<string | false>(false);
  const [showAdModal, setShowAdModal] = useState(false);

  // Single fetch on mount — gets both questions AND usage in one round-trip
  useEffect(() => {
    apiFetch(`${API_URL}/mon-prof/questions`)
      .then((data: any) => {
        if (!data) { setLoadError("Réponse vide du serveur"); return; }
        if (data.error) { setLoadError(data.message ?? data.error); return; }
        setPageData({
          ...data,
          questions: Array.isArray(data.questions) ? data.questions : [],
          noProfile: !!data.noProfile,
          tier: data.tier ?? "gratuit",
          enrolledClasses: data.enrolledClasses ?? 0,
          responsesUsed: data.responsesUsed ?? 0,
          responsesLimit: data.responsesLimit ?? 5,
          bonusUnlocked: data.bonusUnlocked ?? 0,
          adsWatched: data.adsWatched ?? 0,
        });
      })
      .catch((err: any) => setLoadError(err?.message ?? "Erreur réseau"));
  }, []);

  async function refreshUsage() {
    const data = await apiFetch(`${API_URL}/mon-prof/usage`).catch(() => null);
    if (data && !data.error) {
      setPageData(prev => prev ? { ...prev, ...data } : prev);
    }
  }

  function handleAdComplete({ unlockedThisAd, adsUntilNextBonus }: { unlockedThisAd: boolean; adsUntilNextBonus: number }) {
    refreshUsage();
    const msg = unlockedThisAd
      ? "✅ +1 question débloquée !"
      : `Pub enregistrée — encore ${adsUntilNextBonus} pub${adsUntilNextBonus > 1 ? "s" : ""} pour débloquer +1 question`;
    const div = document.createElement("div");
    div.textContent = msg;
    div.className = "fixed bottom-6 left-1/2 -translate-x-1/2 bg-green-600 text-white px-4 py-2 rounded-xl text-sm font-semibold shadow-lg z-[9999] whitespace-nowrap";
    document.body.appendChild(div);
    setTimeout(() => div.remove(), 3500);
  }

  // Build usage object from pageData for backwards compat with sub-components
  const usage: UsageData | null = pageData && !pageData.noProfile ? {
    tier: pageData.tier,
    responsesUsed: pageData.responsesUsed,
    responsesLimit: pageData.responsesLimit,
    bonusUnlocked: pageData.bonusUnlocked,
    adsWatched: pageData.adsWatched,
    enrolledClasses: pageData.enrolledClasses,
  } : null;

  const isPremium = usage?.tier === "premium";
  const remaining = usage
    ? usage.responsesLimit === "unlimited" ? null : (usage.responsesLimit as number) - usage.responsesUsed
    : null;

  const tierLabel = usage?.tier === "gratuit"
    ? t("student.monProf.tierFree")
    : usage?.tier === "standard"
    ? t("student.monProf.tierStandard")
    : usage?.tier === "premium"
    ? t("student.monProf.tierPremium")
    : "";

  const TABS: { id: Tab; label: string; icon: React.ReactNode }[] = [
    { id: "pratique", label: t("student.monProf.tabPractice"), icon: <Sparkles className="w-4 h-4" /> },
    { id: "questions", label: t("student.monProf.tabQuestions"), icon: <BookOpen className="w-4 h-4" /> },
    // { id: "shorts", label: t("student.monProf.tabShorts"), icon: <Play className="w-4 h-4" /> }, // shorts disabled
  ];

  // Loading state
  const isLoading = pageData === null && loadError === false;

  return (
    <DashboardLayout>
      <div className="flex flex-col h-[calc(100vh-10rem)] max-w-3xl mx-auto">

        {/* Header */}
        <div className="flex items-start justify-between mb-4 flex-shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <Sparkles className="w-6 h-6 text-yellow-400" />
              <h1 className="text-2xl font-bold">{t("student.monProf.title")}</h1>
              {isPremium && (
                <span className="text-xs px-2 py-0.5 rounded-full bg-yellow-100 text-yellow-700 font-bold flex items-center gap-1">
                  <Crown className="w-3 h-3" /> Premium
                </span>
              )}
            </div>
            {tierLabel && <p className="text-sm text-muted-foreground mt-0.5">{tierLabel}</p>}
          </div>

          {/* Counter badge — only for practice tab */}
          {activeTab === "pratique" && usage && (
            isPremium ? (
              <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-yellow-100 text-yellow-700 text-xs font-semibold">
                <Crown className="w-3.5 h-3.5" />
                {t("student.monProf.unlimited")}
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <span className={`text-xs ${(remaining ?? 0) <= 1 ? "text-red-500 font-medium" : "text-muted-foreground"}`}>
                  {Math.max(0, remaining ?? 0)} question{remaining !== 1 ? "s" : ""} restante{remaining !== 1 ? "s" : ""}
                </span>
                {usage.tier === "gratuit" && (
                  <button
                    onClick={() => setShowAdModal(true)}
                    className="text-xs px-2 py-1 rounded-lg bg-primary/10 text-primary font-semibold hover:bg-primary/20 transition-colors"
                  >
                    +pub
                  </button>
                )}
              </div>
            )
          )}
        </div>

        {/* Single loading / error state for the whole page */}
        {isLoading && (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        )}

        {loadError !== false && (
          <div className="flex-1 flex flex-col items-center justify-center gap-3 text-center">
            <p className="text-muted-foreground text-sm">{t("student.monProf.loadError")}</p>
            <p className="text-xs text-red-500 font-mono bg-red-50 px-3 py-1.5 rounded-lg max-w-sm break-all">{loadError}</p>
            <button
              onClick={() => { setLoadError(false); setPageData(null); window.location.reload(); }}
              className="text-sm px-4 py-2 rounded-xl border border-border hover:bg-muted transition-colors"
            >
              {t("student.monProf.retry")}
            </button>
          </div>
        )}

        {!isLoading && loadError === false && (
          <>
        {/* Tab bar */}
        <div className="flex-shrink-0 flex gap-1 bg-muted/40 rounded-xl p-1 mb-4 border border-border">
          {TABS.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex-1 flex items-center justify-center gap-1.5 px-3 py-2.5 rounded-lg text-sm font-medium transition-all ${
                activeTab === tab.id
                  ? "bg-background shadow-sm text-foreground"
                  : "text-muted-foreground hover:text-foreground"
              }`}
            >
              {tab.icon}
              <span className="hidden sm:inline">{tab.label}</span>
            </button>
          ))}
        </div>

        {/* Tab content */}
        {activeTab === "pratique" && (
          <PracticeTab
            questions={pageData?.questions ?? []}
            noProfile={pageData?.noProfile ?? false}
            usage={usage}
            onRefreshUsage={refreshUsage}
            onShowAd={() => setShowAdModal(true)}
          />
        )}
        {activeTab === "questions" && (
          <QuestionsTab userId={user?.id} />
        )}
        {/* shorts tab disabled */}
          </>
        )}
      </div>

      {showAdModal && (
        <AdModal
          onClose={() => setShowAdModal(false)}
          onComplete={handleAdComplete}
          adsWatched={usage?.adsWatched ?? 0}
        />
      )}
    </DashboardLayout>
  );
}
