import { useState, useEffect } from "react";
import { motion, useReducedMotion } from "framer-motion";

const MON_W = 240;
const BEZEL = 12;
const SCR_W = MON_W - BEZEL * 2;  // 216
const SCR_H = 144;
const MON_H = SCR_H + BEZEL * 2;  // 168

export function DeskHero() {
  const [hovered,   setHovered]   = useState(false);
  const [touchOnly, setTouchOnly] = useState(false);
  const prefersReduced = useReducedMotion();
  const reduced = prefersReduced === true;

  useEffect(() => {
    setTouchOnly(window.matchMedia("(hover: none)").matches);
  }, []);

  const interactive = !touchOnly && !reduced;
  const lit = !interactive || hovered;

  return (
    <div
      className="relative select-none cursor-default"
      style={{ display: "flex", flexDirection: "column", alignItems: "center", width: MON_W }}
      onMouseEnter={() => interactive && setHovered(true)}
      onMouseLeave={() => interactive && setHovered(false)}
    >
      {/* Ambient glow behind screen */}
      <motion.div
        aria-hidden
        animate={{ opacity: lit ? 1 : 0 }}
        transition={{ duration: 0.6, delay: lit ? 0.35 : 0 }}
        style={{
          position: "absolute",
          top: MON_H * 0.15,
          left: "50%",
          transform: "translateX(-50%)",
          width: "130%",
          height: MON_H,
          background: "radial-gradient(ellipse, rgba(245,158,11,0.13) 0%, transparent 68%)",
          filter: "blur(22px)",
          pointerEvents: "none",
          zIndex: 0,
        }}
      />

      {/* Monitor bezel */}
      <div
        style={{
          position: "relative",
          zIndex: 1,
          width: MON_W,
          height: MON_H,
          background: "#191928",
          borderRadius: 13,
          padding: BEZEL,
          boxSizing: "border-box",
          border: "2px solid #24243a",
          boxShadow:
            "0 28px 60px rgba(0,0,0,0.5)," +
            "0 0 0 1px rgba(255,255,255,0.04)," +
            "inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        {/* Screen */}
        <motion.div
          animate={{ background: lit ? "#f0f0fc" : "#03030e" }}
          transition={{ duration: 0.42, delay: lit ? 0.1 : 0 }}
          style={{
            width: SCR_W,
            height: SCR_H,
            borderRadius: 4,
            position: "relative",
            overflow: "hidden",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          {/* Glass sheen when off */}
          <motion.div
            aria-hidden
            animate={{ opacity: lit ? 0 : 1 }}
            transition={{ duration: 0.35 }}
            style={{
              position: "absolute", inset: 0,
              background: "linear-gradient(160deg, rgba(255,255,255,0.035) 0%, transparent 55%)",
              pointerEvents: "none",
            }}
          />

          {/* Inner shadow */}
          <div style={{
            position: "absolute", inset: 0, borderRadius: 4,
            boxShadow: "inset 0 0 18px rgba(0,0,0,0.25)",
            pointerEvents: "none", zIndex: 2,
          }} />

          {/* Turn-on flash */}
          {!reduced && (
            <motion.div
              aria-hidden
              animate={{ opacity: lit ? [0, 0.6, 0] : 0 }}
              transition={{ duration: 0.75, delay: lit ? 0.14 : 0 }}
              style={{
                position: "absolute", inset: 0,
                background: "radial-gradient(ellipse at center, rgba(245,158,11,0.36) 0%, transparent 62%)",
                pointerEvents: "none",
              }}
            />
          )}

          {/* Étude+ logo */}
          <motion.div
            animate={{ opacity: lit ? 1 : 0, scale: lit ? 1 : 0.7 }}
            transition={{ duration: 0.3, delay: lit ? 0.38 : 0.04 }}
            style={{ textAlign: "center", position: "relative", zIndex: 1 }}
          >
            <p style={{
              fontFamily: "Georgia, 'Times New Roman', serif",
              fontWeight: 700, fontSize: 28,
              color: "#1a1a2e", letterSpacing: "-0.3px",
              lineHeight: 1, margin: 0,
            }}>
              Étude<span style={{ color: "#f59e0b" }}>+</span>
            </p>
            <div style={{
              width: 28, height: 2,
              background: "linear-gradient(90deg, #f59e0b, #fb923c)",
              borderRadius: 2, margin: "10px auto 0",
            }} />
          </motion.div>
        </motion.div>

        {/* Power LED */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 5 }}>
          <motion.div
            animate={{
              background: lit ? "#f59e0b" : "#252540",
              boxShadow: lit ? "0 0 6px 1px rgba(245,158,11,0.55)" : "none",
            }}
            transition={{ duration: 0.4, delay: lit ? 0.22 : 0 }}
            style={{ width: 4, height: 4, borderRadius: "50%" }}
          />
        </div>
      </div>

      {/* Stand neck — tapers from monitor to base */}
      <div style={{
        width: 36,
        height: 26,
        background: "linear-gradient(to bottom, #181826, #121220)",
        clipPath: "polygon(22% 0%, 78% 0%, 94% 100%, 6% 100%)",
      }} />

      {/* Stand base — sits flush on the desk surface */}
      <div style={{ position: "relative", width: 110 }}>
        <div style={{
          width: 110,
          height: 7,
          background: "linear-gradient(to bottom, #1c1c2c, #131320)",
          borderRadius: "0 0 5px 5px",
          boxShadow:
            "inset 0 1px 0 rgba(255,255,255,0.04)," +
            "0 2px 6px rgba(0,0,0,0.4)",
        }} />
        {/* Contact shadow directly under stand base */}
        <div aria-hidden style={{
          position: "absolute",
          bottom: -7,
          left: "50%",
          transform: "translateX(-50%)",
          width: "90%",
          height: 7,
          borderRadius: "50%",
          background: "rgba(0,0,0,0.3)",
          filter: "blur(5px)",
        }} />
      </div>
    </div>
  );
}
