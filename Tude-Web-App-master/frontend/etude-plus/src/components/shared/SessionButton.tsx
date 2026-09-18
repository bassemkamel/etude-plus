/**
 * Shared session join/start buttons with countdown logic.
 *
 * Usage:
 *   <StartClassButton session={s} userName="Ahmed Ben Ali" onStart={mutateStart} />
 *   <JoinClassButton  session={s} userName="Rania Trabelsi" />
 */

import { useState, useEffect } from "react";
import { PlayCircle, Clock, Wifi } from "lucide-react";
import { cn } from "@/lib/utils";

// ── Countdown hook ─────────────────────────────────────────────────────────────

function useCountdown(targetMs: number) {
  const [remaining, setRemaining] = useState(() => targetMs - Date.now());
  useEffect(() => {
    const id = setInterval(() => setRemaining(targetMs - Date.now()), 1000);
    return () => clearInterval(id);
  }, [targetMs]);
  return remaining;
}

function formatCountdown(ms: number): string {
  if (ms <= 0) return "";
  const s = Math.floor(ms / 1000);
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = s % 60;
  if (h > 0) return `${h}h ${m}m`;
  if (m > 0) return `${m}m ${String(sec).padStart(2, "0")}s`;
  return `${sec}s`;
}

// ── Live badge ─────────────────────────────────────────────────────────────────

export function LiveBadge() {
  return (
    <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold bg-red-500/10 text-red-600 border border-red-200">
      <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse inline-block" />
      EN DIRECT
    </span>
  );
}

// ── Start Class button (professor) ─────────────────────────────────────────────

interface StartClassButtonProps {
  session: { id: number; scheduledAt: string; status: string; sessionLink?: string | null };
  userName: string;
  /** call this to mark the session live in the DB */
  onStart: (sessionId: number) => Promise<void>;
  className?: string;
}

export function StartClassButton({ session, userName, onStart, className }: StartClassButtonProps) {
  const [starting, setStarting] = useState(false);

  const scheduledMs = new Date(session.scheduledAt).getTime();
  const windowMs = scheduledMs - 15 * 60 * 1000; // 15 min before
  const remaining = useCountdown(windowMs);
  const isActive = remaining <= 0 && session.status !== "ended";

  const handleStart = async () => {
    if (!isActive || !session.sessionLink || starting) return;
    setStarting(true);
    try {
      await onStart(session.id);
    } catch {
      // ignore — toast is handled by caller
    } finally {
      setStarting(false);
    }
    const displayName = encodeURIComponent(userName);
    window.open(`${session.sessionLink}#userInfo.displayName="${displayName}"`, "_blank", "noopener");
  };

  if (session.status === "live") {
    // Already live — just open the link
    return (
      <button
        onClick={() => {
          if (!session.sessionLink) return;
          const displayName = encodeURIComponent(userName);
          window.open(`${session.sessionLink}#userInfo.displayName="${displayName}"`, "_blank", "noopener");
        }}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors",
          "bg-green-600 hover:bg-green-700 text-white shadow-lg shadow-green-600/25",
          className
        )}
      >
        <Wifi className="w-4 h-4" />
        Cours en cours — Rejoindre
      </button>
    );
  }

  if (!isActive) {
    return (
      <button
        disabled
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm",
          "bg-muted text-muted-foreground cursor-not-allowed opacity-60",
          className
        )}
      >
        <Clock className="w-4 h-4" />
        Démarrer dans {formatCountdown(remaining)}
      </button>
    );
  }

  return (
    <button
      onClick={handleStart}
      disabled={starting || !session.sessionLink}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors",
        "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 disabled:opacity-60",
        className
      )}
    >
      <PlayCircle className="w-4 h-4" />
      {starting ? "Démarrage..." : "Démarrer le cours"}
    </button>
  );
}

// ── Join Class button (student) ────────────────────────────────────────────────

interface JoinClassButtonProps {
  session: { scheduledAt: string; status: string; sessionLink?: string | null };
  userName: string;
  className?: string;
}

export function JoinClassButton({ session, userName, className }: JoinClassButtonProps) {
  const scheduledMs = new Date(session.scheduledAt).getTime();
  const windowMs = scheduledMs - 10 * 60 * 1000; // 10 min before
  const remaining = useCountdown(windowMs);
  const isActive = remaining <= 0 && session.status !== "ended";

  const openRoom = () => {
    if (!session.sessionLink) return;
    const displayName = encodeURIComponent(userName);
    window.open(`${session.sessionLink}#userInfo.displayName="${displayName}"`, "_blank", "noopener");
  };

  if (session.status === "live") {
    return (
      <button
        onClick={openRoom}
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors",
          "bg-red-600 hover:bg-red-700 text-white shadow-lg shadow-red-600/25 animate-pulse",
          className
        )}
      >
        <Wifi className="w-4 h-4" />
        Rejoindre — En direct
      </button>
    );
  }

  if (!isActive) {
    return (
      <button
        disabled
        className={cn(
          "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm",
          "bg-muted text-muted-foreground cursor-not-allowed opacity-60",
          className
        )}
      >
        <Clock className="w-4 h-4" />
        Rejoindre dans {formatCountdown(remaining)}
      </button>
    );
  }

  return (
    <button
      onClick={openRoom}
      disabled={!session.sessionLink}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm transition-colors",
        "bg-primary hover:bg-primary/90 text-primary-foreground shadow-lg shadow-primary/25 disabled:opacity-60",
        className
      )}
    >
      <PlayCircle className="w-4 h-4" />
      Rejoindre le cours
    </button>
  );
}
