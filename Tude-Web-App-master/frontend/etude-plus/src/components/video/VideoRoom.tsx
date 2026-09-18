import { useEffect, useRef, useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

declare global {
  interface Window {
    JitsiMeetExternalAPI: new (domain: string, options: JitsiOptions) => JitsiAPI;
  }
}

interface JitsiOptions {
  roomName: string;
  parentNode: HTMLElement;
  userInfo?: { displayName?: string };
  jwt?: string;
  width?: string | number;
  height?: string | number;
  configOverwrite?: Record<string, unknown>;
  interfaceConfigOverwrite?: Record<string, unknown>;
}

interface JitsiAPI {
  dispose: () => void;
  addListener: (event: string, handler: () => void) => void;
  executeCommand: (command: string, ...args: unknown[]) => void;
}

export interface VideoRoomProps {
  roomName: string;
  displayName: string;
  onLeave: () => void;
  jwt?: string;
  domain?: string;
}

const DEFAULT_DOMAIN = "8x8.vc";

// Allowlist of approved Jitsi server domains.
// An attacker-controlled API response must not be able to inject an arbitrary script src.
const ALLOWED_JITSI_DOMAINS = new Set(["8x8.vc", "meet.jit.si", "jitsi.etude.tn"]);

function sanitizeDomain(domain: string): string {
  return ALLOWED_JITSI_DOMAINS.has(domain) ? domain : DEFAULT_DOMAIN;
}

function getScriptSrc(domain: string) {
  return `https://${domain}/external_api.js`;
}

function loadJitsiScript(domain: string): Promise<void> {
  const src = getScriptSrc(domain);
  return new Promise((resolve, reject) => {
    if (typeof window.JitsiMeetExternalAPI === "function") {
      resolve();
      return;
    }
    let script = document.querySelector<HTMLScriptElement>(`script[src="${src}"]`);
    if (script) {
      script.addEventListener("load", () => resolve());
      script.addEventListener("error", () => reject(new Error("Jitsi script failed to load")));
      return;
    }
    script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () =>
      reject(new Error("Impossible de charger le script Jitsi. Vérifiez votre connexion internet."));
    document.head.appendChild(script);
  });
}

export function VideoRoom({ roomName, displayName, onLeave, jwt, domain: rawDomain = DEFAULT_DOMAIN }: VideoRoomProps) {
  const domain = sanitizeDomain(rawDomain);
  const containerRef = useRef<HTMLDivElement>(null);
  const apiRef = useRef<JitsiAPI | null>(null);
  const onLeaveRef = useRef(onLeave);
  const [status, setStatus] = useState<"loading" | "ready" | "error">("loading");
  const [errorMsg, setErrorMsg] = useState("");

  // Keep onLeave ref fresh without re-triggering the effect
  useEffect(() => {
    onLeaveRef.current = onLeave;
  });

  useEffect(() => {
    let mounted = true;

    loadJitsiScript(domain)
      .then(() => {
        if (!mounted || !containerRef.current) return;

        const api = new window.JitsiMeetExternalAPI(domain, {
          roomName,
          parentNode: containerRef.current,
          width: "100%",
          height: "100%",
          userInfo: { displayName },
          ...(jwt ? { jwt } : {}),
          configOverwrite: {
            startWithAudioMuted: false,
            startWithVideoMuted: false,
            disableDeepLinking: true,
            prejoinPageEnabled: false,
            enableWelcomePage: false,
          },
          interfaceConfigOverwrite: {
            SHOW_JITSI_WATERMARK: false,
            SHOW_BRAND_WATERMARK: false,
            SHOW_POWERED_BY: false,
            TOOLBAR_BUTTONS: [
              "microphone",
              "camera",
              "desktop",
              "fullscreen",
              "fodeviceselection",
              "hangup",
              "chat",
              "raisehand",
              "tileview",
              "videoquality",
              "settings",
            ],
          },
        });

        api.addListener("readyToClose", () => {
          if (mounted) onLeaveRef.current();
        });
        api.addListener("videoConferenceLeft", () => {
          if (mounted) onLeaveRef.current();
        });

        apiRef.current = api;
        if (mounted) setStatus("ready");
      })
      .catch((err: Error) => {
        if (!mounted) return;
        setErrorMsg(err.message);
        setStatus("error");
      });

    return () => {
      mounted = false;
      if (apiRef.current) {
        try {
          apiRef.current.dispose();
        } catch {
          // ignore disposal errors on unmount
        }
        apiRef.current = null;
      }
    };
  }, [roomName, displayName]);

  return (
    <div className="relative w-full h-full bg-zinc-950">
      {/* Loading overlay */}
      {status === "loading" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10">
          <Loader2 className="w-10 h-10 animate-spin text-primary mb-4" />
          <p className="text-zinc-400 text-sm">Connexion à la salle vidéo...</p>
        </div>
      )}

      {/* Error state */}
      {status === "error" && (
        <div className="absolute inset-0 flex flex-col items-center justify-center z-10 p-10">
          <AlertCircle className="w-14 h-14 text-red-500 mb-4" />
          <p className="text-white font-semibold text-lg mb-2">
            La vidéo n'a pas pu se charger
          </p>
          <p className="text-zinc-400 text-sm text-center max-w-sm mb-4">
            {errorMsg}
          </p>
          <p className="text-zinc-500 text-xs text-center max-w-sm leading-relaxed">
            Si votre navigateur a bloqué la caméra ou le microphone, autorisez
            l'accès dans les paramètres de votre navigateur puis rechargez la
            page.
          </p>
          <button
            onClick={() => window.location.reload()}
            className="mt-6 px-6 py-2.5 bg-primary text-black font-semibold rounded-xl hover:bg-primary/90 transition-colors text-sm"
          >
            Réessayer
          </button>
        </div>
      )}

      {/* Jitsi mount point — hidden during error to avoid empty iframe showing */}
      <div
        ref={containerRef}
        className="w-full h-full"
        style={{ visibility: status === "error" ? "hidden" : "visible" }}
      />
    </div>
  );
}
