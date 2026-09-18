-- Migration 0004: Update section keys to match official Tunisian lycée structure
--
-- IMPORTANT: Read the full migration plan before running.
-- Run in a transaction so all-or-nothing semantics apply.
-- Back up (or snapshot the Neon branch) before executing.
--
-- Key renames:
--   2ème:  economie       → economie_services
--          technique      → technologie_informatique  (closest equivalent)
--          informatique   → technologie_informatique  (closest equivalent)
--          sport          → NULL  (no official path in 2ème — nulled)
--   3ème:  sciences_maths → mathematiques
--          sciences_exp   → sciences_experimentales
--          technique      → sciences_techniques
--          economie       → economie_gestion
--          informatique   → sciences_informatique
--          sport          → NULL  (no official section — nulled)
--   Bac:   sciences_maths → mathematiques
--          sciences_exp   → sciences_experimentales
--          technique      → sciences_techniques
--          economie       → economie_gestion
--          informatique   → sciences_informatique
--          sport          → NULL  (no official section — nulled)

BEGIN;

-- ── student_profiles.education_section ──────────────────────────────────────

UPDATE student_profiles SET education_section = 'economie_services'       WHERE grade_level = '2eme' AND education_section = 'economie';
UPDATE student_profiles SET education_section = 'technologie_informatique' WHERE grade_level = '2eme' AND education_section = 'technique';
UPDATE student_profiles SET education_section = 'technologie_informatique' WHERE grade_level = '2eme' AND education_section = 'informatique';
UPDATE student_profiles SET education_section = NULL                       WHERE grade_level = '2eme' AND education_section = 'sport';

UPDATE student_profiles SET education_section = 'mathematiques'           WHERE grade_level = '3eme' AND education_section = 'sciences_maths';
UPDATE student_profiles SET education_section = 'sciences_experimentales' WHERE grade_level = '3eme' AND education_section = 'sciences_exp';
UPDATE student_profiles SET education_section = 'sciences_techniques'     WHERE grade_level = '3eme' AND education_section = 'technique';
UPDATE student_profiles SET education_section = 'economie_gestion'        WHERE grade_level = '3eme' AND education_section = 'economie';
UPDATE student_profiles SET education_section = 'sciences_informatique'   WHERE grade_level = '3eme' AND education_section = 'informatique';
UPDATE student_profiles SET education_section = NULL                       WHERE grade_level = '3eme' AND education_section = 'sport';

UPDATE student_profiles SET education_section = 'mathematiques'           WHERE grade_level = 'bac' AND education_section = 'sciences_maths';
UPDATE student_profiles SET education_section = 'sciences_experimentales' WHERE grade_level = 'bac' AND education_section = 'sciences_exp';
UPDATE student_profiles SET education_section = 'sciences_techniques'     WHERE grade_level = 'bac' AND education_section = 'technique';
UPDATE student_profiles SET education_section = 'economie_gestion'        WHERE grade_level = 'bac' AND education_section = 'economie';
UPDATE student_profiles SET education_section = 'sciences_informatique'   WHERE grade_level = 'bac' AND education_section = 'informatique';
UPDATE student_profiles SET education_section = NULL                       WHERE grade_level = 'bac' AND education_section = 'sport';

-- ── questions.section_key ────────────────────────────────────────────────────

UPDATE questions SET section_key = 'economie_services'       WHERE grade_level = '2eme' AND section_key = 'economie';
UPDATE questions SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'technique';
UPDATE questions SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'informatique';
UPDATE questions SET section_key = NULL                        WHERE grade_level = '2eme' AND section_key = 'sport';

UPDATE questions SET section_key = 'mathematiques'           WHERE grade_level = '3eme' AND section_key = 'sciences_maths';
UPDATE questions SET section_key = 'sciences_experimentales' WHERE grade_level = '3eme' AND section_key = 'sciences_exp';
UPDATE questions SET section_key = 'sciences_techniques'     WHERE grade_level = '3eme' AND section_key = 'technique';
UPDATE questions SET section_key = 'economie_gestion'        WHERE grade_level = '3eme' AND section_key = 'economie';
UPDATE questions SET section_key = 'sciences_informatique'   WHERE grade_level = '3eme' AND section_key = 'informatique';
UPDATE questions SET section_key = NULL                        WHERE grade_level = '3eme' AND section_key = 'sport';

UPDATE questions SET section_key = 'mathematiques'           WHERE grade_level = 'bac' AND section_key = 'sciences_maths';
UPDATE questions SET section_key = 'sciences_experimentales' WHERE grade_level = 'bac' AND section_key = 'sciences_exp';
UPDATE questions SET section_key = 'sciences_techniques'     WHERE grade_level = 'bac' AND section_key = 'technique';
UPDATE questions SET section_key = 'economie_gestion'        WHERE grade_level = 'bac' AND section_key = 'economie';
UPDATE questions SET section_key = 'sciences_informatique'   WHERE grade_level = 'bac' AND section_key = 'informatique';
UPDATE questions SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

-- ── knowledge_base_files.section_key ────────────────────────────────────────

UPDATE knowledge_base_files SET section_key = 'economie_services'       WHERE grade_level = '2eme' AND section_key = 'economie';
UPDATE knowledge_base_files SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'technique';
UPDATE knowledge_base_files SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'informatique';
UPDATE knowledge_base_files SET section_key = NULL                        WHERE grade_level = '2eme' AND section_key = 'sport';

UPDATE knowledge_base_files SET section_key = 'mathematiques'           WHERE grade_level = '3eme' AND section_key = 'sciences_maths';
UPDATE knowledge_base_files SET section_key = 'sciences_experimentales' WHERE grade_level = '3eme' AND section_key = 'sciences_exp';
UPDATE knowledge_base_files SET section_key = 'sciences_techniques'     WHERE grade_level = '3eme' AND section_key = 'technique';
UPDATE knowledge_base_files SET section_key = 'economie_gestion'        WHERE grade_level = '3eme' AND section_key = 'economie';
UPDATE knowledge_base_files SET section_key = 'sciences_informatique'   WHERE grade_level = '3eme' AND section_key = 'informatique';
UPDATE knowledge_base_files SET section_key = NULL                        WHERE grade_level = '3eme' AND section_key = 'sport';

UPDATE knowledge_base_files SET section_key = 'mathematiques'           WHERE grade_level = 'bac' AND section_key = 'sciences_maths';
UPDATE knowledge_base_files SET section_key = 'sciences_experimentales' WHERE grade_level = 'bac' AND section_key = 'sciences_exp';
UPDATE knowledge_base_files SET section_key = 'sciences_techniques'     WHERE grade_level = 'bac' AND section_key = 'technique';
UPDATE knowledge_base_files SET section_key = 'economie_gestion'        WHERE grade_level = 'bac' AND section_key = 'economie';
UPDATE knowledge_base_files SET section_key = 'sciences_informatique'   WHERE grade_level = 'bac' AND section_key = 'informatique';
UPDATE knowledge_base_files SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

-- ── flashcards.section_key ───────────────────────────────────────────────────

UPDATE flashcards SET section_key = 'economie_services'       WHERE grade_level = '2eme' AND section_key = 'economie';
UPDATE flashcards SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'technique';
UPDATE flashcards SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'informatique';
UPDATE flashcards SET section_key = NULL                        WHERE grade_level = '2eme' AND section_key = 'sport';

UPDATE flashcards SET section_key = 'mathematiques'           WHERE grade_level = '3eme' AND section_key = 'sciences_maths';
UPDATE flashcards SET section_key = 'sciences_experimentales' WHERE grade_level = '3eme' AND section_key = 'sciences_exp';
UPDATE flashcards SET section_key = 'sciences_techniques'     WHERE grade_level = '3eme' AND section_key = 'technique';
UPDATE flashcards SET section_key = 'economie_gestion'        WHERE grade_level = '3eme' AND section_key = 'economie';
UPDATE flashcards SET section_key = 'sciences_informatique'   WHERE grade_level = '3eme' AND section_key = 'informatique';
UPDATE flashcards SET section_key = NULL                        WHERE grade_level = '3eme' AND section_key = 'sport';

UPDATE flashcards SET section_key = 'mathematiques'           WHERE grade_level = 'bac' AND section_key = 'sciences_maths';
UPDATE flashcards SET section_key = 'sciences_experimentales' WHERE grade_level = 'bac' AND section_key = 'sciences_exp';
UPDATE flashcards SET section_key = 'sciences_techniques'     WHERE grade_level = 'bac' AND section_key = 'technique';
UPDATE flashcards SET section_key = 'economie_gestion'        WHERE grade_level = 'bac' AND section_key = 'economie';
UPDATE flashcards SET section_key = 'sciences_informatique'   WHERE grade_level = 'bac' AND section_key = 'informatique';
UPDATE flashcards SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

-- ── notions.section_key ──────────────────────────────────────────────────────

UPDATE notions SET section_key = 'economie_services'       WHERE grade_level = '2eme' AND section_key = 'economie';
UPDATE notions SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'technique';
UPDATE notions SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'informatique';
UPDATE notions SET section_key = NULL                        WHERE grade_level = '2eme' AND section_key = 'sport';

UPDATE notions SET section_key = 'mathematiques'           WHERE grade_level = '3eme' AND section_key = 'sciences_maths';
UPDATE notions SET section_key = 'sciences_experimentales' WHERE grade_level = '3eme' AND section_key = 'sciences_exp';
UPDATE notions SET section_key = 'sciences_techniques'     WHERE grade_level = '3eme' AND section_key = 'technique';
UPDATE notions SET section_key = 'economie_gestion'        WHERE grade_level = '3eme' AND section_key = 'economie';
UPDATE notions SET section_key = 'sciences_informatique'   WHERE grade_level = '3eme' AND section_key = 'informatique';
UPDATE notions SET section_key = NULL                        WHERE grade_level = '3eme' AND section_key = 'sport';

UPDATE notions SET section_key = 'mathematiques'           WHERE grade_level = 'bac' AND section_key = 'sciences_maths';
UPDATE notions SET section_key = 'sciences_experimentales' WHERE grade_level = 'bac' AND section_key = 'sciences_exp';
UPDATE notions SET section_key = 'sciences_techniques'     WHERE grade_level = 'bac' AND section_key = 'technique';
UPDATE notions SET section_key = 'economie_gestion'        WHERE grade_level = 'bac' AND section_key = 'economie';
UPDATE notions SET section_key = 'sciences_informatique'   WHERE grade_level = 'bac' AND section_key = 'informatique';
UPDATE notions SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

-- ── annales.section_key ──────────────────────────────────────────────────────

UPDATE annales SET section_key = 'economie_services'       WHERE grade_level = '2eme' AND section_key = 'economie';
UPDATE annales SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'technique';
UPDATE annales SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'informatique';
UPDATE annales SET section_key = NULL                        WHERE grade_level = '2eme' AND section_key = 'sport';

UPDATE annales SET section_key = 'mathematiques'           WHERE grade_level = '3eme' AND section_key = 'sciences_maths';
UPDATE annales SET section_key = 'sciences_experimentales' WHERE grade_level = '3eme' AND section_key = 'sciences_exp';
UPDATE annales SET section_key = 'sciences_techniques'     WHERE grade_level = '3eme' AND section_key = 'technique';
UPDATE annales SET section_key = 'economie_gestion'        WHERE grade_level = '3eme' AND section_key = 'economie';
UPDATE annales SET section_key = 'sciences_informatique'   WHERE grade_level = '3eme' AND section_key = 'informatique';
UPDATE annales SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

UPDATE annales SET section_key = 'mathematiques'           WHERE grade_level = 'bac' AND section_key = 'sciences_maths';
UPDATE annales SET section_key = 'sciences_experimentales' WHERE grade_level = 'bac' AND section_key = 'sciences_exp';
UPDATE annales SET section_key = 'sciences_techniques'     WHERE grade_level = 'bac' AND section_key = 'technique';
UPDATE annales SET section_key = 'economie_gestion'        WHERE grade_level = 'bac' AND section_key = 'economie';
UPDATE annales SET section_key = 'sciences_informatique'   WHERE grade_level = 'bac' AND section_key = 'informatique';
UPDATE annales SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

-- ── curriculum_chapters.section_key ─────────────────────────────────────────

UPDATE curriculum_chapters SET section_key = 'economie_services'       WHERE grade_level = '2eme' AND section_key = 'economie';
UPDATE curriculum_chapters SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'technique';
UPDATE curriculum_chapters SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'informatique';
UPDATE curriculum_chapters SET section_key = NULL                        WHERE grade_level = '2eme' AND section_key = 'sport';

UPDATE curriculum_chapters SET section_key = 'mathematiques'           WHERE grade_level = '3eme' AND section_key = 'sciences_maths';
UPDATE curriculum_chapters SET section_key = 'sciences_experimentales' WHERE grade_level = '3eme' AND section_key = 'sciences_exp';
UPDATE curriculum_chapters SET section_key = 'sciences_techniques'     WHERE grade_level = '3eme' AND section_key = 'technique';
UPDATE curriculum_chapters SET section_key = 'economie_gestion'        WHERE grade_level = '3eme' AND section_key = 'economie';
UPDATE curriculum_chapters SET section_key = 'sciences_informatique'   WHERE grade_level = '3eme' AND section_key = 'informatique';
UPDATE curriculum_chapters SET section_key = NULL                        WHERE grade_level = '3eme' AND section_key = 'sport';

UPDATE curriculum_chapters SET section_key = 'mathematiques'           WHERE grade_level = 'bac' AND section_key = 'sciences_maths';
UPDATE curriculum_chapters SET section_key = 'sciences_experimentales' WHERE grade_level = 'bac' AND section_key = 'sciences_exp';
UPDATE curriculum_chapters SET section_key = 'sciences_techniques'     WHERE grade_level = 'bac' AND section_key = 'technique';
UPDATE curriculum_chapters SET section_key = 'economie_gestion'        WHERE grade_level = 'bac' AND section_key = 'economie';
UPDATE curriculum_chapters SET section_key = 'sciences_informatique'   WHERE grade_level = 'bac' AND section_key = 'informatique';
UPDATE curriculum_chapters SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

-- ── classes.section_key ──────────────────────────────────────────────────────

UPDATE classes SET section_key = 'economie_services'       WHERE grade_level = '2eme' AND section_key = 'economie';
UPDATE classes SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'technique';
UPDATE classes SET section_key = 'technologie_informatique' WHERE grade_level = '2eme' AND section_key = 'informatique';
UPDATE classes SET section_key = NULL                        WHERE grade_level = '2eme' AND section_key = 'sport';

UPDATE classes SET section_key = 'mathematiques'           WHERE grade_level = '3eme' AND section_key = 'sciences_maths';
UPDATE classes SET section_key = 'sciences_experimentales' WHERE grade_level = '3eme' AND section_key = 'sciences_exp';
UPDATE classes SET section_key = 'sciences_techniques'     WHERE grade_level = '3eme' AND section_key = 'technique';
UPDATE classes SET section_key = 'economie_gestion'        WHERE grade_level = '3eme' AND section_key = 'economie';
UPDATE classes SET section_key = 'sciences_informatique'   WHERE grade_level = '3eme' AND section_key = 'informatique';
UPDATE classes SET section_key = NULL                        WHERE grade_level = '3eme' AND section_key = 'sport';

UPDATE classes SET section_key = 'mathematiques'           WHERE grade_level = 'bac' AND section_key = 'sciences_maths';
UPDATE classes SET section_key = 'sciences_experimentales' WHERE grade_level = 'bac' AND section_key = 'sciences_exp';
UPDATE classes SET section_key = 'sciences_techniques'     WHERE grade_level = 'bac' AND section_key = 'technique';
UPDATE classes SET section_key = 'economie_gestion'        WHERE grade_level = 'bac' AND section_key = 'economie';
UPDATE classes SET section_key = 'sciences_informatique'   WHERE grade_level = 'bac' AND section_key = 'informatique';
UPDATE classes SET section_key = NULL                        WHERE grade_level = 'bac' AND section_key = 'sport';

COMMIT;

-- ── Verify counts after migration ────────────────────────────────────────────
-- Run these SELECTs after COMMIT to confirm no rows still hold legacy keys:
--
-- SELECT grade_level, education_section, count(*) FROM student_profiles
--   WHERE education_section IN ('sciences_maths','sciences_exp','technique','economie','sport','informatique')
--   GROUP BY 1, 2;
--
-- SELECT grade_level, section_key, count(*) FROM questions
--   WHERE section_key IN ('sciences_maths','sciences_exp','technique','economie','sport','informatique')
--   GROUP BY 1, 2;
