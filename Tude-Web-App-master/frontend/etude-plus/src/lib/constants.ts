// Re-export education config as the single source of truth
export { ALL_SUBJECTS as SUBJECTS, VALID_LEVEL_KEYS as GRADE_LEVELS, getLevelLabel, getSubjectsForLevel } from "./educationConfig";

export const TUNISIA_CITIES = [
  "Tunis", "Sfax", "Sousse", "Kairouan", "Bizerte", "Gabès",
  "Ariana", "Gafsa", "Monastir", "Ben Arous", "Kasserine",
  "Médenine", "Nabeul", "Tataouine", "Béja",
] as const;
