import React from "react";

// Math/science symbols to float
const SYMBOLS = [
  { char: "Σ", size: 64, x: 18, y: 22, z: 0, opacity: 0.13, blur: 0 },
  { char: "π", size: 44, x: 70, y: 10, z: 1, opacity: 0.09, blur: 2 },
  { char: "∫", size: 54, x: 60, y: 70, z: 2, opacity: 0.11, blur: 1 },
  { char: "∂", size: 38, x: 30, y: 80, z: 3, opacity: 0.08, blur: 3 },
  { char: "√", size: 50, x: 80, y: 40, z: 1, opacity: 0.12, blur: 1 },
  { char: "α", size: 36, x: 10, y: 60, z: 2, opacity: 0.09, blur: 2 },
  { char: "β", size: 40, x: 85, y: 80, z: 0, opacity: 0.10, blur: 0 },
  { char: "θ", size: 32, x: 55, y: 30, z: 2, opacity: 0.08, blur: 2 },
  { char: "∞", size: 60, x: 40, y: 50, z: 1, opacity: 0.14, blur: 0 },
  { char: "Δ", size: 48, x: 75, y: 65, z: 3, opacity: 0.09, blur: 3 },
];

function getAnimProps(idx: number) {
  // Vary duration, direction, and rotation for each symbol
  const base = 8 + (idx % 4) * 3 + Math.random() * 2;
  const dir = idx % 2 === 0 ? 1 : -1;
  return {
    duration: `${base}s`,
    delay: `${(idx % 5) * 0.7}s`,
    rotate: `${dir * (10 + idx * 3)}deg`,
    translate: `${dir * (10 + idx * 5)}px`,
  };
}

export const Hero3DVisual = () => (
  <div className="hero3d-bg">
    <svg
      viewBox="0 0 100 100"
      className="absolute inset-0 w-full h-full"
      style={{ zIndex: 1 }}
    >
      {SYMBOLS.map((s, i) => {
        const anim = getAnimProps(i);
        return (
          <text
            key={i}
            x={s.x}
            y={s.y}
            fontSize={s.size}
            fill="#222"
            opacity={s.opacity}
            style={{
              filter: s.blur ? `blur(${s.blur}px)` : undefined,
              transform: `translateZ(${s.z * 12}px)`,
              transformOrigin: "50% 50%",
              animation: `hero3d-float${i} ${anim.duration} ease-in-out infinite alternate`,
              mixBlendMode: "lighten",
            }}
            className="select-none pointer-events-none"
          >
            {s.char}
          </text>
        );
      })}
    </svg>
    {/* Gradient background */}
    <div className="hero3d-gradient absolute inset-0 rounded-[3rem]" />
  </div>
);

// CSS for animation and background (to be added in index.css):
// .hero3d-bg { position: absolute; inset: 0; width: 100%; height: 100%; overflow: visible; background: none; }
// .hero3d-gradient { background: linear-gradient(135deg, #f5f5f7 60%, #fff 100%); z-index: 0; opacity: 1; }
// [class*='hero3d-float'] { will-change: transform, opacity; }
// (Animations will be injected below)

// Generate keyframes for each symbol (to be injected in index.css)
