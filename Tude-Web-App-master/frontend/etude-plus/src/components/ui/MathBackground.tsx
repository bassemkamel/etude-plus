/* Full-page animated math/Greek symbol background */

const SYMBOLS = [
  // Top row
  { char: "Σ",  left: "3%",  top: "4%",   size: 78,  opacity: 0.22, color: "#f59e0b", anim: 0 },
  { char: "π",  left: "18%", top: "2%",   size: 52,  opacity: 0.16, color: "#fb923c", anim: 1 },
  { char: "∞",  left: "37%", top: "5%",   size: 68,  opacity: 0.18, color: "#fbbf24", anim: 2 },
  { char: "∂",  left: "54%", top: "2%",   size: 44,  opacity: 0.14, color: "#f97316", anim: 3 },
  { char: "Δ",  left: "71%", top: "6%",   size: 60,  opacity: 0.20, color: "#f59e0b", anim: 4 },
  { char: "√",  left: "87%", top: "3%",   size: 56,  opacity: 0.17, color: "#fde68a", anim: 5 },
  // Left column
  { char: "α",  left: "1%",  top: "22%",  size: 48,  opacity: 0.16, color: "#fb923c", anim: 6 },
  { char: "β",  left: "4%",  top: "44%",  size: 66,  opacity: 0.19, color: "#f59e0b", anim: 7 },
  { char: "γ",  left: "2%",  top: "66%",  size: 40,  opacity: 0.13, color: "#fbbf24", anim: 8 },
  { char: "∇",  left: "5%",  top: "84%",  size: 58,  opacity: 0.18, color: "#f97316", anim: 9 },
  // Right column
  { char: "λ",  left: "93%", top: "18%",  size: 54,  opacity: 0.17, color: "#f97316", anim: 2 },
  { char: "μ",  left: "91%", top: "40%",  size: 46,  opacity: 0.14, color: "#f59e0b", anim: 5 },
  { char: "ω",  left: "94%", top: "62%",  size: 64,  opacity: 0.19, color: "#fbbf24", anim: 0 },
  { char: "Φ",  left: "90%", top: "82%",  size: 50,  opacity: 0.15, color: "#fb923c", anim: 3 },
  // Scattered mid-layer (large, very faint — depth)
  { char: "∫",  left: "22%", top: "32%",  size: 120, opacity: 0.05, color: "#f59e0b", anim: 1 },
  { char: "θ",  left: "48%", top: "42%",  size: 100, opacity: 0.04, color: "#fb923c", anim: 4 },
  { char: "Ψ",  left: "68%", top: "30%",  size: 110, opacity: 0.04, color: "#fbbf24", anim: 7 },
  { char: "Ω",  left: "32%", top: "60%",  size: 90,  opacity: 0.05, color: "#f97316", anim: 2 },
  // Bottom row
  { char: "ζ",  left: "12%", top: "90%",  size: 46,  opacity: 0.15, color: "#f59e0b", anim: 6 },
  { char: "Ξ",  left: "30%", top: "92%",  size: 60,  opacity: 0.14, color: "#fbbf24", anim: 3 },
  { char: "ε",  left: "50%", top: "88%",  size: 52,  opacity: 0.17, color: "#fb923c", anim: 8 },
  { char: "ρ",  left: "68%", top: "91%",  size: 44,  opacity: 0.13, color: "#f59e0b", anim: 5 },
  { char: "η",  left: "84%", top: "88%",  size: 58,  opacity: 0.18, color: "#fde68a", anim: 1 },
  // Extra accent symbols
  { char: "σ",  left: "13%", top: "55%",  size: 38,  opacity: 0.12, color: "#f97316", anim: 9 },
  { char: "τ",  left: "58%", top: "16%",  size: 50,  opacity: 0.14, color: "#fb923c", anim: 4 },
  { char: "χ",  left: "80%", top: "54%",  size: 42,  opacity: 0.12, color: "#fbbf24", anim: 6 },
  { char: "ξ",  left: "76%", top: "76%",  size: 36,  opacity: 0.11, color: "#f59e0b", anim: 2 },
  { char: "÷",  left: "40%", top: "78%",  size: 44,  opacity: 0.13, color: "#fb923c", anim: 7 },
  { char: "∑",  left: "25%", top: "14%",  size: 54,  opacity: 0.15, color: "#f59e0b", anim: 3 },
];

const ANIM_NAMES = [
  "mathfloat-a",
  "mathfloat-b",
  "mathfloat-c",
  "mathfloat-d",
  "mathfloat-e",
  "mathfloat-f",
  "mathfloat-g",
  "mathfloat-h",
  "mathfloat-i",
  "mathfloat-j",
];

const DURATIONS = [14, 11, 16, 9, 13, 18, 10, 15, 12, 17];
const DELAYS    = [0, 2.5, 1, 4, 0.5, 3, 1.5, 5, 2, 3.5];

export function MathBackground() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none select-none fixed inset-0 w-full h-full overflow-hidden"
      style={{ zIndex: 0 }}
    >
      {SYMBOLS.map((s, i) => (
        <span
          key={i}
          style={{
            position: "absolute",
            left: s.left,
            top: s.top,
            fontSize: s.size,
            color: s.color,
            opacity: s.opacity,
            fontFamily: "'Playfair Display', 'Times New Roman', serif",
            fontWeight: 700,
            lineHeight: 1,
            animation: `${ANIM_NAMES[s.anim]} ${DURATIONS[s.anim]}s ease-in-out ${DELAYS[s.anim]}s infinite alternate`,
            textShadow: `0 0 ${Math.round(s.size * 0.4)}px ${s.color}88`,
            willChange: "transform",
          }}
        >
          {s.char}
        </span>
      ))}
    </div>
  );
}
