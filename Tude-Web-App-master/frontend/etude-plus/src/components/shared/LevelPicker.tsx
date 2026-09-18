import { useState } from "react";
import { CheckCircle2 } from "lucide-react";
import {
  SIMPLE_LEVELS, SECTION_LEVELS,
  getNiveauLabel, getSectionLabel,
  isSimpleLevel, isSectionLevel,
  ENABLED_CYCLES, isCycleEnabled,
} from "@/lib/educationConfig";
import { cn } from "@/lib/utils";

type Cycle = "college" | "lycee" | null;
type LyceeYear = "1ere" | "2eme" | "3eme" | "bac" | null;

interface LevelPickerProps {
  /** Current niveau key ("7eme", "bac", "2eme", …) */
  niveauValue: string;
  /** Current section key ("sciences_maths", null for simple levels) */
  sectionValue: string | null;
  onChange: (niveauKey: string, sectionKey: string | null) => void;
  className?: string;
}

function detectCycle(niveauKey: string): Cycle {
  if (!niveauKey) return ENABLED_CYCLES[0] ?? null;
  if (["7eme", "8eme", "9eme"].includes(niveauKey)) {
    return isCycleEnabled("college") ? "college" : (ENABLED_CYCLES[0] ?? null);
  }
  return "lycee";
}

function detectLyceeYear(niveauKey: string): LyceeYear {
  if (niveauKey === "1ere_secondaire") return "1ere";
  if (niveauKey === "2eme") return "2eme";
  if (niveauKey === "3eme") return "3eme";
  if (niveauKey === "bac") return "bac";
  return null;
}

export function LevelPicker({ niveauValue, sectionValue, onChange, className }: LevelPickerProps) {
  const [cycle, setCycle] = useState<Cycle>(() => detectCycle(niveauValue));
  const [lyceeYear, setLyceeYear] = useState<LyceeYear>(() => detectLyceeYear(niveauValue));

  const handleCycle = (c: Cycle) => {
    setCycle(c);
    setLyceeYear(null);
    onChange("", null);
  };

  const handleLyceeYear = (yr: LyceeYear) => {
    setLyceeYear(yr);
    if (yr === "1ere") {
      onChange("1ere_secondaire", null);
    } else {
      onChange("", null);
    }
  };

  const handleSection = (sectionKey: string) => {
    onChange(niveauValue, sectionKey);
  };

  const btn = (selected: boolean, onClick: () => void, children: React.ReactNode, key?: string) => (
    <button
      key={key}
      type="button"
      onClick={onClick}
      className={cn(
        "py-2 px-3 rounded-xl border-2 text-sm font-medium transition-all text-left",
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border hover:border-primary/40 text-foreground"
      )}
    >
      {children}
    </button>
  );

  const confirmLabel = (() => {
    if (!niveauValue) return null;
    if (isSimpleLevel(niveauValue)) return getNiveauLabel(niveauValue);
    if (isSectionLevel(niveauValue) && sectionValue) {
      return `${getNiveauLabel(niveauValue)} — ${getSectionLabel(niveauValue, sectionValue)}`;
    }
    return null;
  })();

  // Sections to show in step 3 (for 2eme, 3eme, bac)
  const sectionEntries = lyceeYear && lyceeYear !== "1ere"
    ? Object.entries((SECTION_LEVELS as any)[lyceeYear]?.sections ?? {})
    : [];

  // Cycle buttons — only the ones enabled in ENABLED_CYCLES
  const visibleCycles = [
    { id: "college" as const, label: "Collège", sub: "7ème – 9ème de base" },
    { id: "lycee"   as const, label: "Lycée",   sub: "1ère année – Bac" },
  ].filter(c => isCycleEnabled(c.id));

  return (
    <div className={cn("space-y-3", className)}>
      {/* Step 1 — Cycle (hidden when only one cycle is enabled) */}
      {visibleCycles.length > 1 && (
        <div className="grid grid-cols-3 gap-2">
          {visibleCycles.map(({ id, label, sub }) => (
            <button
              key={id}
              type="button"
              onClick={() => handleCycle(id)}
              className={cn(
                "p-3 rounded-xl border-2 text-left transition-all",
                cycle === id ? "border-primary bg-primary/5" : "border-border hover:border-primary/40"
              )}
            >
              <p className={cn("font-bold text-sm", cycle === id && "text-primary")}>{label}</p>
              <p className="text-xs text-muted-foreground">{sub}</p>
            </button>
          ))}
        </div>
      )}

      {/* Step 2 — Collège: pick year directly */}
      {cycle === "college" && isCycleEnabled("college") && (
        <div className="grid grid-cols-3 gap-2">
          {(["7eme", "8eme", "9eme"] as const).map(k => {
            const labels: Record<string, string> = { "7eme": "7ème", "8eme": "8ème", "9eme": "9ème" };
            return btn(niveauValue === k, () => onChange(k, null), labels[k], k);
          })}
        </div>
      )}

      {/* Step 2 — Lycée: pick year */}
      {cycle === "lycee" && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {([
            { yr: "1ere" as LyceeYear, label: "1ère année" },
            { yr: "2eme" as LyceeYear, label: "2ème année" },
            { yr: "3eme" as LyceeYear, label: "3ème année" },
            { yr: "bac"  as LyceeYear, label: "Baccalauréat" },
          ]).map(({ yr, label }) =>
            btn(
              lyceeYear === yr && (yr !== "1ere" || niveauValue === "1ere_secondaire"),
              () => {
                setLyceeYear(yr);
                if (yr === "1ere") {
                  onChange("1ere_secondaire", null);
                } else {
                  // Set the niveau key but no section yet
                  onChange(yr as string, null);
                }
              },
              label,
              yr!
            )
          )}
        </div>
      )}

      {/* Step 3 — Section picker for 2eme / 3eme / bac */}
      {cycle === "lycee" && lyceeYear && lyceeYear !== "1ere" && sectionEntries.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {sectionEntries.map(([sk, sv]: [string, any]) =>
            btn(
              niveauValue === lyceeYear && sectionValue === sk,
              () => {
                onChange(lyceeYear as string, sk);
              },
              sv.label,
              sk
            )
          )}
        </div>
      )}

      {/* Confirmation chip */}
      {confirmLabel && (
        <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-xl">
          <CheckCircle2 className="w-4 h-4 text-green-600 shrink-0" />
          <span className="text-sm font-semibold text-green-800">{confirmLabel}</span>
        </div>
      )}
    </div>
  );
}
