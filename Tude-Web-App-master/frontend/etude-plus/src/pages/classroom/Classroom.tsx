import { useState, useEffect, useRef, useCallback } from "react";
import { useRoute, Link, useLocation } from "wouter";
import { MessageSquare, Users, AlertCircle, Loader2, Send, Clock } from "lucide-react";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";
import { VideoRoom } from "@/components/video/VideoRoom";

type SessionData = {
  session: { id: number; classId: number; title: string; description?: string | null; status: string; scheduledAt: string; durationHours: number; price: number };
  class: { id: number; title: string; subject: string; gradeLevel: string } | null;
  professor: { fullName: string; id: number } | null;
  students: { id: number; fullName: string; email: string }[];
};

type ChatMsg = { id: number; sender: string; text: string; time: string; isMe: boolean };

function initials(name: string) {
  return name.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase();
}

function BadgeEl({ children, className }: { children: React.ReactNode; className?: string }) {
  return <span className={cn("px-2 py-0.5 rounded text-xs font-bold", className)}>{children}</span>;
}

const API_URL = import.meta.env.VITE_API_URL ?? "";

function getToken() {
  return localStorage.getItem("etude_auth_token");
}

async function apiFetch(url: string, opts: RequestInit = {}) {
  const token = getToken();
  return fetch(url, {
    ...opts,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  });
}

export function Classroom() {
  const [, params] = useRoute("/classroom/:id");
  const [, setLocation] = useLocation();
  const { user } = useAuth();
  const sessionId = params?.id ? parseInt(params.id) : 0;

  const [data, setData] = useState<SessionData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const [sessionStatus, setSessionStatus] = useState<string>("");
  const [starting, setStarting] = useState(false);
  const [jitsiJwt, setJitsiJwt] = useState<string | undefined>(undefined);
  const [jitsiDomain, setJitsiDomain] = useState<string>("8x8.vc");
  const [roomName, setRoomName] = useState<string>("");

  const [chatInput, setChatInput] = useState("");
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const chatBottomRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const isProfessor = user?.role === "professor";

  const fetchSession = useCallback(async () => {
    if (!sessionId) return;
    const token = getToken();
    const r = await fetch(`${API_URL}/classes/sessions/${sessionId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!r.ok) throw new Error("Session introuvable");
    return r.json();
  }, [sessionId]);

  // Initial load
  useEffect(() => {
    if (!sessionId) { setError("Session invalide."); setLoading(false); return; }

    fetchSession()
      .then(async d => {
        setData(d);
        setSessionStatus(d.session.status);

        // Fetch JaaS JWT token (works for both professor and student)
        try {
          const tokenRes = await apiFetch(`${API_URL}/classes/sessions/${sessionId}/jitsi-token`);
          if (tokenRes.ok) {
            const tokenData = await tokenRes.json();
            setJitsiJwt(tokenData.token);
            setJitsiDomain(tokenData.domain ?? "8x8.vc");
          }
          // If JaaS not configured (503), silently fall back to meet.jit.si without JWT
        } catch { /* ignore — video still loads without JWT */ }

        // Professor auto-starts the session
        if (user?.role === "professor" && d.session.status !== "live") {
          setStarting(true);
          apiFetch(`${API_URL}/classes/sessions/${sessionId}/start`, { method: "POST" })
            .then(r => r.json())
            .then(updated => { setSessionStatus(updated.status ?? "live"); setStarting(false); })
            .catch(() => { setSessionStatus("live"); setStarting(false); });
        }

        setLoading(false);
      })
      .catch(e => { setError(e.message); setLoading(false); });
  }, [sessionId, user?.role]);

  // Students poll every 5s until session is live
  useEffect(() => {
    if (isProfessor || sessionStatus === "live" || sessionStatus === "ended" || sessionStatus === "cancelled") return;

    pollRef.current = setInterval(async () => {
      try {
        const d = await fetchSession();
        setSessionStatus(d.session.status);
        if (d.session.status === "live") {
          if (pollRef.current) clearInterval(pollRef.current);
        }
      } catch { /* ignore */ }
    }, 5000);

    return () => { if (pollRef.current) clearInterval(pollRef.current); };
  }, [isProfessor, sessionStatus, fetchSession]);

  useEffect(() => {
    const t = setInterval(() => setElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    chatBottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const pad = (n: number) => String(n).padStart(2, "0");
  const timerStr = `${pad(Math.floor(elapsed / 3600))}:${pad(Math.floor((elapsed % 3600) / 60))}:${pad(elapsed % 60)}`;

  const handleExit = useCallback(() => {
    if (pollRef.current) clearInterval(pollRef.current);
    if (user?.role === "professor") setLocation("/professor/dashboard");
    else setLocation("/student/dashboard");
  }, [user?.role, setLocation]);

  const sendMessage = () => {
    const text = chatInput.trim();
    if (!text) return;
    const now = new Date();
    setMessages(prev => [...prev, {
      id: Date.now(),
      sender: user?.fullName ?? "Vous",
      text,
      time: `${pad(now.getHours())}:${pad(now.getMinutes())}`,
      isMe: true,
    }]);
    setChatInput("");
  };

  if (loading || starting) {
    return (
      <div className="h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center text-white">
          <Loader2 className="w-10 h-10 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-zinc-400">
            {starting ? "Démarrage de la session..." : "Connexion à la salle..."}
          </p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center text-white max-w-sm">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-bold mb-2">Session introuvable</h2>
          <p className="text-zinc-400 mb-6">{error || "Cette session n'existe pas ou n'est plus disponible."}</p>
          <button onClick={handleExit} className="px-6 py-3 bg-primary text-black font-bold rounded-xl hover:bg-primary/90 transition-colors">
            Retourner au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  // Student waiting room — professor hasn't started yet
  if (!isProfessor && sessionStatus !== "live") {
    const { session, professor } = data;
    const profName = professor?.fullName ?? "Professeur";
    return (
      <div className="h-screen bg-[#0A0A0A] flex items-center justify-center">
        <div className="text-center text-white max-w-md px-6">
          <div className="w-24 h-24 rounded-full bg-primary/10 border-2 border-primary/30 flex items-center justify-center mx-auto mb-6">
            <Clock className="w-10 h-10 text-primary animate-pulse" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{session.title}</h2>
          <p className="text-zinc-400 mb-1">avec <span className="text-white font-medium">{profName}</span></p>
          <p className="text-zinc-500 text-sm mb-8">En attente que le professeur démarre la session...</p>
          <div className="flex items-center justify-center gap-2 bg-zinc-900 border border-zinc-800 rounded-full px-5 py-2.5 text-sm text-zinc-400 mb-8">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            Vérification automatique toutes les 5 secondes
          </div>
          <button onClick={handleExit} className="text-sm text-zinc-500 hover:text-zinc-300 transition-colors">
            ← Retourner au tableau de bord
          </button>
        </div>
      </div>
    );
  }

  const { session, professor, students } = data;
  const profName = professor?.fullName ?? "Professeur";
  const profInitials = initials(profName);
  const myName = user?.fullName ?? "Vous";

  const displayName = user?.fullName ?? "Participant";

  const participantsList = [
    { id: 0, name: `${profName} (Hôte)`, initials: profInitials, role: "host" as const },
    ...students.map(s => ({
      id: s.id,
      name: s.id === user?.id ? `${s.fullName} (Vous)` : s.fullName,
      initials: initials(s.fullName),
      role: (s.id === user?.id ? "you" : "student") as "you" | "student",
    })),
    ...(isProfessor ? [] : user ? [{ id: -1, name: `${myName} (Vous)`, initials: initials(myName), role: "you" as const }] : []),
  ];
  const uniqueParticipants = Array.from(
    new Map(participantsList.map(p => [p.id === user?.id && p.role === "you" ? "me" : p.id, p])).values()
  );

  return (
    <div className="h-screen bg-[#0A0A0A] text-white flex flex-col overflow-hidden font-sans">
      {/* Top Bar */}
      <header className="h-16 bg-[#111] border-b border-zinc-800 flex items-center justify-between px-6 shrink-0 z-10 shadow-md">
        <div className="flex items-center gap-4">
          <button
            onClick={handleExit}
            className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center border border-primary/30 hover:bg-primary/30 transition-colors"
            title="Retourner au tableau de bord"
          >
            <span className="font-serif font-bold text-primary text-lg">É</span>
          </button>
          <div>
            <div className="flex items-center gap-3">
              <BadgeEl className="bg-red-500/10 text-red-500 border border-red-500/20 px-2.5 py-0.5 animate-pulse flex items-center gap-1.5">
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                EN DIRECT
              </BadgeEl>
              <h1 className="font-bold text-base tracking-tight">{session.title}</h1>
              {isProfessor && (
                <BadgeEl className="bg-primary/10 text-primary border border-primary/20">
                  Modérateur
                </BadgeEl>
              )}
            </div>
            <p className="text-xs text-zinc-400 mt-0.5">{profName} • {timerStr}</p>
          </div>
        </div>
        <div className="flex items-center gap-3 bg-zinc-900/80 px-4 py-2 rounded-full border border-zinc-800">
          <Users className="w-4 h-4 text-zinc-400" />
          <span className="text-sm font-medium text-zinc-300">
            {uniqueParticipants.length} Participant{uniqueParticipants.length !== 1 ? "s" : ""}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Sidebar – Participants */}
        <aside className="w-64 bg-[#111] border-r border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
              <Users className="w-4 h-4" /> Participants ({uniqueParticipants.length})
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {uniqueParticipants.map(p => (
              <div key={`${p.role}-${p.id}`} className="flex items-center gap-3 p-2 hover:bg-zinc-800/50 rounded-lg transition-colors">
                <div className={cn("w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold ring-1 ring-white/5", p.role === "host" ? "bg-primary/20 text-primary" : "bg-zinc-800 text-zinc-300")}>
                  {p.initials}
                </div>
                <div>
                  <span className="text-sm font-medium text-zinc-200 block">{p.name}</span>
                  {p.role === "host" && <span className="text-[10px] text-primary">Modérateur</span>}
                </div>
              </div>
            ))}
            {uniqueParticipants.length === 1 && (
              <p className="text-xs text-zinc-600 text-center px-4 py-6">En attente d'autres participants...</p>
            )}
          </div>
        </aside>

        {/* Video Area — Jitsi embedded */}
        <main className="flex-1 flex flex-col overflow-hidden bg-zinc-950">
          <VideoRoom
            roomName={jitsiJwt ? roomName : `etude-class-${session.classId}-session-${session.id}`}
            displayName={displayName}
            onLeave={handleExit}
            jwt={jitsiJwt}
            domain={jitsiJwt ? jitsiDomain : "meet.jit.si"}
          />
        </main>

        {/* Right Sidebar – Chat */}
        <aside className="w-80 bg-[#111] border-l border-zinc-800 flex flex-col shrink-0">
          <div className="p-4 border-b border-zinc-800">
            <h2 className="font-semibold text-sm flex items-center gap-2 text-zinc-200">
              <MessageSquare className="w-4 h-4" /> Chat de la classe
            </h2>
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.length === 0 ? (
              <div className="text-center text-zinc-600 text-xs py-8">
                <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-30" />
                Personne n'a encore écrit. Soyez le premier!
              </div>
            ) : (
              messages.map(msg => (
                <div key={msg.id} className={cn("rounded-xl p-3 text-sm", msg.isMe ? "bg-primary/10 border border-primary/20" : "bg-zinc-800/40 border border-zinc-800/50")}>
                  <div className="flex justify-between items-start mb-1.5">
                    <p className={cn("text-xs font-medium", msg.isMe ? "text-primary" : "text-zinc-400")}>{msg.sender}</p>
                    <span className="text-[10px] text-zinc-600">{msg.time}</span>
                  </div>
                  <p className="text-zinc-200">{msg.text}</p>
                </div>
              ))
            )}
            <div ref={chatBottomRef} />
          </div>
          <div className="p-4 border-t border-zinc-800 bg-[#111]">
            <div className="relative">
              <input
                type="text"
                placeholder="Envoyer un message..."
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendMessage()}
                className="w-full bg-zinc-900 border border-zinc-700 rounded-xl py-3 pl-4 pr-12 text-sm text-white focus:ring-2 focus:ring-primary/50 focus:border-primary outline-none placeholder:text-zinc-500 transition-all"
              />
              <button onClick={sendMessage} className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-primary hover:bg-primary/10 rounded-lg transition-colors">
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
