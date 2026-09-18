// Types for /api/curriculum/* endpoints

export interface CurriculumSubject {
  id:         number;
  code:       string;
  name:       string;          // "Mathématiques" — matches questions.subject
  icon:       string;
  colorClass: string;
  orderIndex: number;
}

export interface CurriculumChapter {
  id:             number;
  levelCode:      string;      // "1ere_secondaire" | "2eme" | "3eme" | "bac"
  sectionKey:     string | null;
  subject:        string;      // "Mathématiques"
  name:           string;      // "Dérivation — définition et règles de calcul"
  shortName:      string | null;
  slug:           string;      // "derivation-definition-et-regles-de-calcul"
  orderIndex:     number;
  isActive:       boolean;
  // Counts LEFT-JOINed by the API — always present, may be 0
  questionCount:  number;
  flashcardCount: number;
}
