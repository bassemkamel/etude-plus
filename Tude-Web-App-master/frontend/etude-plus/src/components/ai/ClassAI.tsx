import { useState, useRef, useEffect } from "react";
import { getToken } from "@workspace/api-client-react";
import { Bot, Send, Loader2, BookOpen, HelpCircle, RotateCcw, Sparkles, ChevronDown, ChevronUp } from "lucide-react";
import { cn } from "@/lib/utils";

type Message = { role: "user" | "assistant"; content: string };

// Static syllabus data per subject (Tunisian curriculum)
const SYLLABUS: Record<string, { topics: string[]; icon: string }> = {
  "Mathématiques": {
    icon: "∑",
    topics: ["Analyse réelle : limites, continuité, dérivées", "Intégration et primitives", "Suites numériques", "Algèbre linéaire : matrices, déterminants", "Géométrie analytique et vectorielle", "Probabilités et dénombrement", "Nombres complexes"],
  },
  "Physique": {
    icon: "⚡",
    topics: ["Mécanique newtonienne et énergie", "Électricité et circuits", "Optique géométrique", "Ondes mécaniques et son", "Physique nucléaire et radioactivité", "Électromagnétisme"],
  },
  "Chimie": {
    icon: "⚗",
    topics: ["Chimie organique : fonctions et réactions", "Réactions acide-base et pH", "Oxydoréduction et piles", "Cinétique chimique", "Équilibres chimiques", "Électrochimie"],
  },
  "Sciences de la vie et de la terre": {
    icon: "🧬",
    topics: ["Biologie cellulaire et ADN", "Génétique et hérédité", "Physiologie humaine", "Géologie et tectonique", "Écologie et environnement", "Évolution et biodiversité"],
  },
  "Informatique": {
    icon: "</> ",
    topics: ["Algorithmique et structures de données", "Programmation (Python/Pascal)", "Bases de données et SQL", "Réseaux informatiques", "Systèmes d'information", "Architecture des ordinateurs"],
  },
  "Français": {
    icon: "📖",
    topics: ["Grammaire et syntaxe avancée", "Analyse littéraire et genres", "Commentaire composé", "Dissertation philosophique et littéraire", "Résumé et synthèse de documents", "Stylistique et figures de rhétorique"],
  },
  "Anglais": {
    icon: "🇬🇧",
    topics: ["Grammar: tenses, modals, conditionals", "Reading comprehension strategies", "Essay writing and argumentation", "Vocabulary building", "Literature and text analysis", "Spoken English and communication"],
  },
  "Arabe": {
    icon: "ع",
    topics: ["النحو والصرف (Grammaire)", "البلاغة والأسلوب (Rhétorique)", "تحليل النصوص الأدبية", "التعبير الكتابي والإنشاء", "الأدب العربي القديم والحديث", "الشعر والنثر"],
  },
  "Histoire-Géographie": {
    icon: "🌍",
    topics: ["Histoire mondiale contemporaine (XIXe-XXIe s.)", "Histoire de la Tunisie moderne", "Géographie humaine et mondialisation", "Géopolitique et relations internationales", "Géographie physique et ressources", "Cartographie et analyse de documents"],
  },
  "Philosophie": {
    icon: "φ",
    topics: ["Théorie de la connaissance", "Liberté, conscience et existence", "Morale et éthique", "Philosophie politique et État", "Logique et argumentation", "Grands textes philosophiques"],
  },
};

const DEFAULT_SYLLABUS = {
  icon: "📚",
  topics: ["Programme officiel tunisien", "Théorie et applications", "Exercices et entraînement", "Révisions et examens"],
};

const API_URL = import.meta.env.VITE_API_URL ?? "";

async function callAI(endpoint: string, body: object): Promise<string> {
  const token = getToken();
  const res = await fetch(`${API_URL}/ai/${endpoint}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error((err as any).error ?? "Erreur IA");
  }
  return res.json().then(d => d.reply ?? d.questions ?? "");
}

interface ClassAIProps {
  subject: string;
  gradeLevel: string;
  classTitle: string;
}

export function ClassAI({ subject, gradeLevel, classTitle }: ClassAIProps) {
  const [tab, setTab] = useState<"syllabus" | "practice" | "chat">("syllabus");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [practiceQuestions, setPracticeQuestions] = useState<string>("");
  const [loadingPractice, setLoadingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState("");
  const [expandedTopic, setExpandedTopic] = useState<number | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  const syllabusData = SYLLABUS[subject] ?? DEFAULT_SYLLABUS;

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const loadPracticeQuestions = async () => {
    setLoadingPractice(true);
    setPracticeError("");
    setPracticeQuestions("");
    try {
      const q = await callAI("practice-questions", { subject, gradeLevel });
      setPracticeQuestions(q);
    } catch (err: any) {
      setPracticeError(err.message);
    } finally {
      setLoadingPractice(false);
    }
  };

  useEffect(() => {
    if (tab === "practice" && !practiceQuestions && !loadingPractice) {
      loadPracticeQuestions();
    }
  }, [tab]);

  const sendMessage = async () => {
    const text = input.trim();
    if (!text || sending) return;
    const newMessages: Message[] = [...messages, { role: "user", content: text }];
    setMessages(newMessages);
    setInput("");
    setSending(true);
    try {
      const reply = await callAI("chat", { messages: newMessages, subject, gradeLevel });
      setMessages(prev => [...prev, { role: "assistant", content: reply }]);
    } catch (err: any) {
      setMessages(prev => [...prev, { role: "assistant", content: `❌ ${err.message}` }]);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col h-[650px] rounded-2xl border border-border overflow-hidden bg-card">
      {/* Header */}
      <div className="px-6 py-4 border-b border-border bg-gradient-to-r from-amber-50 to-orange-50 flex items-center gap-3 shrink-0">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shadow-sm">
          <Sparkles className="w-5 h-5 text-white" />
        </div>
        <div>
          <p className="font-bold text-gray-900 text-sm">IA Académique — {subject}</p>
          <p className="text-xs text-gray-500">Programme officiel tunisien · {gradeLevel}</p>
        </div>
      </div>

      {/* Tab bar */}
      <div className="flex border-b border-border shrink-0">
        {([
          { id: "syllabus" as const, icon: BookOpen, label: "Syllabus" },
          { id: "practice" as const, icon: HelpCircle, label: "Questions pratiques" },
          { id: "chat" as const, icon: Bot, label: "Demander à l'IA" },
        ]).map(t => (
          <button
            key={t.id}
            onClick={() => setTab(t.id)}
            className={cn(
              "flex-1 flex items-center justify-center gap-2 py-3 text-sm font-medium transition-colors",
              tab === t.id
                ? "border-b-2 border-amber-500 text-amber-700 bg-amber-50/40"
                : "text-muted-foreground hover:text-foreground hover:bg-muted/30"
            )}
          >
            <t.icon className="w-4 h-4" />
            <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* Content */}
      <div className="flex-1 overflow-hidden">

        {/* Syllabus tab */}
        {tab === "syllabus" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="mb-6">
              <div className="flex items-center gap-3 mb-2">
                <span className="text-3xl">{syllabusData.icon}</span>
                <div>
                  <h3 className="font-bold text-gray-900">{subject}</h3>
                  <p className="text-sm text-muted-foreground">Niveau : {gradeLevel}</p>
                </div>
              </div>
              <p className="text-sm text-muted-foreground mt-3">
                Voici les chapitres couverts dans le programme officiel tunisien pour ce cours.
                Cliquez sur un chapitre pour voir les sous-thèmes et demander des questions à l'IA.
              </p>
            </div>

            <div className="space-y-3">
              {syllabusData.topics.map((topic, i) => (
                <div key={i} className="rounded-xl border border-border overflow-hidden">
                  <button
                    onClick={() => setExpandedTopic(expandedTopic === i ? null : i)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-muted/30 transition-colors text-left"
                  >
                    <div className="flex items-center gap-3">
                      <span
                        className="w-7 h-7 rounded-lg text-xs font-bold flex items-center justify-center shrink-0"
                        style={{ background: "linear-gradient(135deg,#f59e0b,#f97316)", color: "#fff" }}
                      >
                        {i + 1}
                      </span>
                      <span className="font-medium text-sm text-gray-900">{topic}</span>
                    </div>
                    {expandedTopic === i ? (
                      <ChevronUp className="w-4 h-4 text-muted-foreground shrink-0" />
                    ) : (
                      <ChevronDown className="w-4 h-4 text-muted-foreground shrink-0" />
                    )}
                  </button>
                  {expandedTopic === i && (
                    <div className="px-4 pb-4 pt-1 bg-muted/20 border-t border-border">
                      <p className="text-xs text-muted-foreground mb-3">
                        Ce chapitre fait partie du programme officiel tunisien de {subject} ({gradeLevel}).
                      </p>
                      <button
                        onClick={() => {
                          setTab("chat");
                          setInput(`Explique-moi le chapitre "${topic}" en ${subject} pour le niveau ${gradeLevel}`);
                        }}
                        className="text-xs font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-1.5 rounded-lg hover:bg-amber-100 transition-colors"
                      >
                        <Bot className="w-3 h-3 inline mr-1" />
                        Demander à l'IA sur ce chapitre
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Practice questions tab */}
        {tab === "practice" && (
          <div className="h-full overflow-y-auto p-6">
            <div className="flex items-center justify-between mb-5">
              <div>
                <h3 className="font-bold text-gray-900">Questions d'entraînement</h3>
                <p className="text-sm text-muted-foreground">Générées par IA selon le programme tunisien</p>
              </div>
              <button
                onClick={loadPracticeQuestions}
                disabled={loadingPractice}
                className="flex items-center gap-2 text-sm font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-3 py-2 rounded-lg hover:bg-amber-100 transition-colors disabled:opacity-50"
              >
                <RotateCcw className={cn("w-4 h-4", loadingPractice && "animate-spin")} />
                Nouvelles questions
              </button>
            </div>

            {loadingPractice && (
              <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-amber-500" />
                <p className="text-sm">Génération des questions en cours...</p>
              </div>
            )}

            {practiceError && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
                {practiceError}
              </div>
            )}

            {practiceQuestions && !loadingPractice && (
              <div className="prose prose-sm max-w-none">
                <div className="whitespace-pre-wrap text-sm text-gray-800 leading-relaxed font-sans">
                  {practiceQuestions}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Chat tab */}
        {tab === "chat" && (
          <div className="flex flex-col h-full">
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-10 text-muted-foreground">
                  <Bot className="w-12 h-12 mx-auto mb-4 opacity-30" />
                  <p className="font-medium text-gray-700 mb-1">Assistant IA — {subject}</p>
                  <p className="text-sm">Posez vos questions sur le programme de {subject} ({gradeLevel}).</p>
                  <div className="mt-6 flex flex-wrap justify-center gap-2">
                    {[
                      `Explique-moi ${syllabusData.topics[0]}`,
                      "Donne-moi un exemple d'exercice",
                      "Quels sont les points importants pour le bac ?",
                    ].map((suggestion, i) => (
                      <button
                        key={i}
                        onClick={() => setInput(suggestion)}
                        className="text-xs bg-amber-50 border border-amber-200 text-amber-700 px-3 py-1.5 rounded-full hover:bg-amber-100 transition-colors"
                      >
                        {suggestion}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((msg, i) => (
                <div key={i} className={cn("flex gap-3", msg.role === "user" ? "justify-end" : "justify-start")}>
                  {msg.role === "assistant" && (
                    <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0 mt-0.5">
                      <Sparkles className="w-3.5 h-3.5 text-white" />
                    </div>
                  )}
                  <div
                    className={cn(
                      "max-w-[80%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap",
                      msg.role === "user"
                        ? "bg-amber-500 text-white rounded-br-sm"
                        : "bg-muted text-foreground rounded-bl-sm"
                    )}
                  >
                    {msg.content}
                  </div>
                </div>
              ))}

              {sending && (
                <div className="flex gap-3">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center shrink-0">
                    <Sparkles className="w-3.5 h-3.5 text-white" />
                  </div>
                  <div className="bg-muted px-4 py-3 rounded-2xl rounded-bl-sm flex items-center gap-2">
                    <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                    <span className="text-sm text-muted-foreground">Réflexion en cours...</span>
                  </div>
                </div>
              )}
              <div ref={bottomRef} />
            </div>

            <div className="p-4 border-t border-border bg-background shrink-0">
              <div className="flex gap-3">
                <input
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && !e.shiftKey && sendMessage()}
                  placeholder={`Posez une question sur ${subject}...`}
                  className="flex-1 bg-muted border-0 rounded-xl px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-amber-400/50 placeholder:text-muted-foreground"
                />
                <button
                  onClick={sendMessage}
                  disabled={!input.trim() || sending}
                  className="w-11 h-11 rounded-xl bg-gradient-to-br from-amber-400 to-orange-500 flex items-center justify-center text-white hover:opacity-90 transition-opacity disabled:opacity-40 shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
