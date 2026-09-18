import { useEffect, useRef } from "react";

const CHARS  = ["Σ","π","∫","∂","√","α","β","θ","∞","Δ","λ","φ","ω","μ","ε","≈","≠","∈","∇","²","³"];
const COLORS = ["#f59e0b","#fb923c","#f97316","#fbbf24","#fde68a"];

function sr(seed: number): number {
  const x = Math.sin(seed + 1) * 10000;
  return x - Math.floor(x);
}

interface SymbolDef {
  char: string; color: string;
  homeX: number; homeY: number;
  size: number; opacity: number; rotation: number;
  floatDur: number; floatDelay: number; floatAmp: number;
}

function buildSymbols(): SymbolDef[] {
  const defs: SymbolDef[] = [];
  for (let i = 0; i < 23; i++) {
    const r = (n: number) => sr(i * 31 + n);
    const homeX =
      i < 9  ? 3  + r(1) * 48
      : i < 14 ? 58 + r(1) * 38
      :          8  + r(1) * 84;
    const homeY  = 4 + r(2) * 88;
    const tier   = r(3);
    const size   =
      tier < 0.20 ? 80 + r(4) * 40
      : tier < 0.55 ? 40 + r(4) * 20
      :               20 + r(4) * 10;
    const opacity =
      size > 70 ? 0.10 + r(5) * 0.05
      : size > 40 ? 0.07 + r(5) * 0.04
      :             0.04 + r(5) * 0.03;
    defs.push({
      char: CHARS[i % CHARS.length], color: COLORS[Math.floor(r(10) * COLORS.length)],
      homeX, homeY, size, opacity,
      rotation: -30 + r(6) * 60,
      floatDur: 8 + r(7) * 12, floatDelay: r(8) * 8, floatAmp: 6 + r(9) * 10,
    });
  }
  return defs;
}

const SYMBOL_DEFS = buildSymbols();

// Tuned to user spec: radius 100-130 px, displacement 20-35 px
const REPEL_RADIUS = 120;
const MAX_PUSH     = 26;
const SPRING       = 0.05;
const DAMPING      = 0.85;

export function FloatingSymbols() {
  const containerRef  = useRef<HTMLDivElement>(null);
  const spansRef      = useRef<(HTMLSpanElement | null)[]>([]);
  const physRef       = useRef(SYMBOL_DEFS.map(() => ({ x: 0, y: 0, vx: 0, vy: 0 })));
  const mouseRef      = useRef({ x: -9999, y: -9999 });
  const rafRef        = useRef<number>(0);
  const activeRef     = useRef(false);
  const lastThrottle  = useRef(0);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const isTouchOnly    = window.matchMedia("(hover: none)").matches;
    const prefersReduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // ── Mouse tracking ─────────────────────────────────────────────────────────
    // Attach to window (not container) so events fire even through pointer-events:none layers.
    function onMouseMove(e: MouseEvent) {
      if (isTouchOnly) return;
      const now = performance.now();
      if (now - lastThrottle.current < 16) return; // ~60 fps
      lastThrottle.current = now;
      const rect = container!.getBoundingClientRect();
      const relX = e.clientX - rect.left;
      const relY = e.clientY - rect.top;
      // Ignore when outside the hero section
      if (relX < 0 || relY < 0 || relX > rect.width || relY > rect.height) {
        mouseRef.current = { x: -9999, y: -9999 };
        return;
      }
      mouseRef.current = { x: relX, y: relY };
    }

    function onMouseLeave() {
      mouseRef.current = { x: -9999, y: -9999 };
    }

    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseleave", onMouseLeave);

    // ── Animation loop ─────────────────────────────────────────────────────────
    function tick(ts: number) {
      if (!activeRef.current) return;

      const W  = container!.offsetWidth;
      const H  = container!.offsetHeight;
      const mx = mouseRef.current.x;
      const my = mouseRef.current.y;

      for (let i = 0; i < SYMBOL_DEFS.length; i++) {
        const def  = SYMBOL_DEFS[i];
        const phys = physRef.current[i];
        const span = spansRef.current[i];
        if (!span) continue;

        const homeX = (def.homeX / 100) * W;
        const homeY = (def.homeY / 100) * H;

        // Idle float — skipped under prefers-reduced-motion
        const floatY = prefersReduced
          ? 0
          : Math.sin((ts / 1000 + def.floatDelay) * ((2 * Math.PI) / def.floatDur)) * def.floatAmp;

        const symX = homeX + phys.x;
        const symY = homeY + phys.y + floatY;

        // Repulsion — skipped under touch / reduced-motion
        let targetX = 0;
        let targetY = 0;
        if (!prefersReduced && !isTouchOnly) {
          const dx   = symX - mx;
          const dy   = symY - my;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist > 0.1 && dist < REPEL_RADIUS) {
            const strength = ((REPEL_RADIUS - dist) / REPEL_RADIUS) * MAX_PUSH;
            targetX = (dx / dist) * strength;
            targetY = (dy / dist) * strength;
          }
        }

        phys.vx = phys.vx * DAMPING + (targetX - phys.x) * SPRING;
        phys.vy = phys.vy * DAMPING + (targetY - phys.y) * SPRING;
        phys.x += phys.vx;
        phys.y += phys.vy;

        span.style.transform = `translate(${phys.x.toFixed(2)}px, ${(phys.y + floatY).toFixed(2)}px) rotate(${def.rotation}deg)`;
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    function startLoop() {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = requestAnimationFrame(tick);
    }

    // ── IntersectionObserver — pause loop when hero scrolls off-screen ─────────
    const observer = new IntersectionObserver(
      ([entry]) => {
        activeRef.current = entry.isIntersecting;
        if (entry.isIntersecting) startLoop();
        else cancelAnimationFrame(rafRef.current);
      },
      { threshold: 0.01 }
    );
    observer.observe(container);

    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseleave", onMouseLeave);
      observer.disconnect();
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      aria-hidden="true"
      className="absolute inset-0 pointer-events-none select-none overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {SYMBOL_DEFS.map((def, i) => (
        <span
          key={i}
          ref={(el) => { spansRef.current[i] = el; }}
          style={{
            position: "absolute",
            left: `${def.homeX}%`,
            top:  `${def.homeY}%`,
            fontSize:   def.size,
            color:      def.color,
            opacity:    def.opacity,
            fontFamily: "Georgia, 'Times New Roman', serif",
            fontWeight: 700,
            lineHeight: 1,
            transform:  `translate(0, 0) rotate(${def.rotation}deg)`,
            willChange: "transform",
          }}
        >
          {def.char}
        </span>
      ))}
    </div>
  );
}
