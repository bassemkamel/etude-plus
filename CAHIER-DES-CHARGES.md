# Étude+ — Cahier des charges v1.0

**Produit :** Étude+  
**Type :** plateforme SaaS de révision scolaire (Tunisie), 7ème → Bac  
**Stack imposée :** Next.js 15 (App Router) + NestJS 11 + Prisma 6 + PostgreSQL 16  
**Design :** clone visuel de `Tude-Web-App-master/frontend/etude-plus`  
**Documents liés :** `ARCHITECTURE.md` (technique) · ce fichier (fonctionnel + recette + environnement)  
**Date :** 17 septembre 2026  
**Statut :** document d’implémentation — toute ambiguïté ici est un bug, à corriger dans ce fichier avant de coder

---

## A. Comment utiliser ce document

Ce cahier est la **source de vérité produit**. `ARCHITECTURE.md` est la source de vérité technique.

Un agent ou un développeur qui « recrée l’application » doit :

1. Lire **A → D** (périmètre, acteurs, règles).
2. Implémenter **module par module** (E), dans l’ordre de la section **P**.
3. Respecter les **écrans** (F), les **API** (G), le **schéma Prisma** du repo, Docker (H).
4. Ne livrer une story que si **tous les critères d’acceptation** sont verts.
5. Ne **jamais** inventer un écran, un champ ou un endpoint absent d’ici. S’il manque : mettre à jour ce fichier d’abord.

Convention d’IDs :

| Préfixe | Sens |
|---|---|
| RM-xxx | Règle métier |
| EF-xxx | Exigence fonctionnelle |
| EN-xxx | Exigence non fonctionnelle |
| EC-xxx | Écran |
| API-xxx | Endpoint |
| CA-xxx | Critère d’acceptation |

---

## B. Objet, vision, périmètre

### B.1 Objet

Livrer une application web production-ready permettant à un élève tunisien de réviser son programme officiel (collège + lycée jusqu’au Bac), via un abonnement, avec :

- banque de questions, examens pratiques, annales (examens blancs), flashcards ;
- suivi de progression (moyenne /20) ;
- profil (photo, nom, niveau, spécialité) ;
- génération de questions IA **après** saisie manuelle côté admin ;
- upload PDF élève → questions **privées**.

Et côté administration :

- analytics (CA, effectifs, graphes) ;
- gestion users (create / edit / suspend / archive / soft-delete) ;
- plans + attribution manuelle d’abonnement ;
- codes promo (N premiers, durée, N fois / user) ;
- base de connaissances + cours par niveau.

### B.2 Hors périmètre v1 (interdit de coder)

- Rôle professeur, classes live, Jitsi, KYC, marketplace.
- Application mobile native.
- Chat temps réel, forum.
- Paiement live **tant que** `ENABLE_PAYMENTS=false` (le checkout UI existe, le provider peut être `noop` ; le **grant manuel** est le chemin réel v1).
- Hard delete SQL des users (sauf job RGPD ultérieur).
- GraphQL, microservices, Elasticsearch.

### B.3 Invariants produit

1. Design Tude : landing `#FFFDF7`, primary yellow, navy, Playfair Display + Inter, `rounded-2xl`, fond symboles maths.
2. FR défaut, EN, AR + RTL.
3. Collège **et** lycée actifs (7ème, 8ème, 9ème, 1ère, 2ème, 3ème, Bac).
4. IA admin = brouillon. Publication humaine obligatoire.
5. Questions PDF élève jamais dans la banque globale.
6. Un élève = au plus un abonnement non terminal.
7. Next.js n’écrit pas en base. NestJS est le seul backend.

---

## C. Acteurs

| Acteur | Auth | Accès |
|---|---|---|
| Visiteur | non | landing, pricing, about, legal, login, register |
| Élève (`student`) | oui, email vérifié | dashboards élève, révision (selon plan), profil, PDF |
| Admin (`admin`) | oui | users (sauf super_admin), contenu, codes, KB, questions — **pas** CA / plans write / grant |
| Super admin (`super_admin`) | oui | tout admin + finances, plans, grant abo, archive, soft-delete, analytics CA |

Comptes seed (dev uniquement, documentés dans `.env.example`) :

| Email | Mot de passe | Rôle |
|---|---|---|
| `super@etudeplus.local` | `EtudePlus!2026` | super_admin |
| `admin@etudeplus.local` | `EtudePlus!2026` | admin |
| `eleve@etudeplus.local` | `EtudePlus!2026` | student — Bac Mathématiques, plan PLUS_YEARLY granted 1 an |

---

## D. Glossaire & règles métier

### D.1 Glossaire

| Terme | Définition |
|---|---|
| Niveau (`gradeLevel`) | `7eme` `8eme` `9eme` `1ere_secondaire` `2eme` `3eme` `bac` |
| Spécialité (`educationSection`) | `lettres` `sciences` `economie_services` `technologie_informatique` `mathematiques` `sciences_experimentales` `sciences_techniques` `economie_gestion` `sciences_informatique` — `""` si niveau simple |
| Label affiché | ex. `Bac — Mathématiques`, `2ème — Sciences`, `7ème année de base` |
| Banque globale | questions `origin ∈ {manual, ai_admin}` + `status=published` + `ownerUserId=null` |
| Workspace PDF | questions `origin=ai_student_pdf` + `ownerUserId=élève` |
| Grant | abonnement créé par super_admin, sans paiement |
| Plan FREE | accès preview (3 questions / module / jour) |
| Abo actif | `status ∈ {trialing, active, granted}` et `now ∈ [startsAt, endsAt]` |

Le catalogue officiel niveaux / matières est `packages/shared/src/education-config.ts`. **Interdiction** de dupliquer cette liste dans le front ou Nest.

### D.2 Règles métier

**RM-001 Identité.** Email unique, lowercase, trim. Mot de passe ≥ 8 caractères, bcrypt cost 12.

**RM-002 Inscription.** Compte créé **uniquement** après OTP email valide (6 digits, TTL 10 min, 3 envois / 10 min / email).

**RM-003 Onboarding.** Niveau obligatoire avant `/revision` et `/student/documents`. Settings accessibles avant. Dashboard visible avec banner « Choisis ton niveau ».

**RM-004 Niveau/section.**  
- Simple (`7eme` `8eme` `9eme` `1ere_secondaire`) → `educationSection=""`.  
- `2eme` `3eme` `bac` → section whitelist obligatoire.  
Rejeté 422 `INVALID_LEVEL_SECTION` sinon.

**RM-005 Soft delete user.** `DELETE` admin pose `deletedAt=now()`, `status=archived`, email `deleted+{id}@invalid.local`, révoque refresh tokens. Jamais `DELETE FROM users`.

**RM-006 Archive.** `archivedAt` + `status=archived` : plus de login (403 `ACCOUNT_DISABLED`). Restorable par super_admin.

**RM-007 Suspend.** `status=suspended` : login refusé, données conservées. Admin peut suspendre un élève ou un admin (pas un super_admin).

**RM-008 Un abo non terminal.** Contrainte : un user n’a qu’une souscription `trialing|active|past_due|granted`. Un grant clôture l’existant (`canceled`).

**RM-009 Grant.** super_admin only. `startsAt < endsAt`. Motif obligatoire (min 5 chars). Audit.

**RM-010 Accès contenu.**  
- FREE / pas d’abo / abo expiré → 3 questions preview / module / jour, overlay CTA plan.  
- Abo actif PLUS → banque, examens, annales, flashcards illimités + quota PDF.

**RM-011 Codes promo (AND).** Toutes les contraintes renseignées s’appliquent :  
- `maxRedemptions` → N premiers (course : `SELECT FOR UPDATE`) ;  
- `startsAt` / `expiresAt` → fenêtre ;  
- `perUserLimit` → ex. 2 fois / user ;  
- `applicablePlanIds` vide = tous.  
Code normalisé `UPPER TRIM`. 422 `DISCOUNT_INVALID` | `DISCOUNT_EXPIRED` | `DISCOUNT_EXHAUSTED` | `DISCOUNT_USER_LIMIT`.

**RM-012 Questions manuelles.** Chemin principal. `origin=manual`. Admin choisit draft ou published.

**RM-013 IA admin.** `POST generate` ne persiste pas. Persist = `POST /questions` après édition humaine, `origin=ai_admin`, `status=draft`. Publish = action séparée.

**RM-014 PDF élève.** PDF only, ≤ 15 Mo. Quota `plan.features.pdfQuotaMonth` (FREE=0, PLUS=5). Questions `origin=ai_student_pdf`, `status=published` (privé), jamais listées dans la banque globale.

**RM-015 Curriculum-first.** Un chapitre s’affiche même à 0 question (empty state Premium).

**RM-016 Visibilité banque.** Filtre : `gradeLevel` élève + (`sectionKey=""` **ou** `sectionKey=éducationSection`).

**RM-017 Devise.** TND, 3 décimales, affichage `formatTND` (espace insécable + `DT`).

**RM-018 Audit.** Toute mutation admin → `AuditLog` (acteur, action, entity, entityId, metadata, ip).

**RM-019 i18n.** Aucune string UI hardcodée. Clés dans `apps/web/messages/{fr,en,ar}.json`.

**RM-020 Photo profil.** JPEG/PNG/WebP, ≤ 5 Mo. Signed upload MinIO/R2, jamais base64 JSON.

---

## E. Exigences fonctionnelles

### E.1 Site public

**EF-001 Landing `EC-PUB-01`**  
Clone Tude : Navbar (logo, liens, LanguageSwitcher, Login, CTA), hero « Étude+ améliore tes notes », `MathBackground` + `FloatingSymbols`, tabs live/resources/assessments/dashboard **réécrits** autour de la révision (plus de « cours live prof »), matières, CTA register.  
**CA-001** Lighthouse mobile ≥ 90 perf landing. **CA-002** Switch FR/EN/AR change tout le copy + `dir`.

**EF-002 Pricing `EC-PUB-02`**  
Cartes lues depuis `GET /plans` (pas hardcodées). Plan FREE + PLUS mensuel + PLUS annuel. FAQ. CTA register / checkout si connecté.

**EF-003 Legal**  
Terms, Privacy, Cookies — pages statiques i18n, cookie banner (reprise Tude).

### E.2 Auth & inscription (critique UX)

**EF-010 Register étape 1 `EC-AUTH-01`**

| Champ | Obligatoire | Validation |
|---|---|---|
| Prénom | oui | 2–50, trim |
| Email | oui | RFC, unique |
| Mot de passe | oui | ≥ 8, toggle œil, barre de force |
| CGU | oui | checkbox |

Pas de confirmation mdp, pas de ville, pas de niveau. CTA unique « Créer mon compte » → `POST /auth/register` puis `POST /auth/otp/send` → redirect verify.

Erreurs inline sous le champ. Email déjà pris → 409 `EMAIL_TAKEN`.

**EF-011 Verify `EC-AUTH-02`**  
6 digits, auto-submit à 6, cooldown renvoi 30 s. Dev : Mailhog, **pas** d’affichage du code dans l’UI (contrairement à Tude). Succès → cookies + onboarding.

**EF-012 Onboarding `EC-AUTH-03`**  
1) Cycle Collège | Lycée. 2) Niveau. 3) Spécialité si besoin (`LevelPicker`). CTA « Accéder à mon espace ». Skip 24 h possible, gate révision.

**EF-013 Login `EC-AUTH-04`**  
Email + mdp. Compte suspendu/archivé → 403 message clair, pas « identifiants invalides ». Lien forgot password.

**EF-014 Logout**  
Invalide refresh en DB, clear cookies, redirect `/`.

### E.3 Espace élève

**EF-020 Dashboard `EC-STU-01`**

Toujours afficher en header : **prénom** + **badge niveau · spécialité** (`getClassLevelLabel`).

Widgets :

1. **Mon plan** — nom, statut badge, `startsAt` → `endsAt` (dates locales `fr-TN`), jours restants. Si aucun : carte « Passe à Plus » → `/pricing`.  
2. Moyenne générale /20 (gradient primary, comme Tude).  
3. Nb révisions.  
4. Streak.  
5. Grille 4 modules (Banque, Examens blancs, Examens pratiques, Flashcards) → `/revision`.  
6. Carte « Envoie un PDF, reçois tes questions » → `/student/documents` (si quota > 0).  
7. Banner onboarding si niveau manquant.

Empty state si 0 tentative : copy encourageant, pas de graphe vide.

**EF-021 Mon plan `EC-STU-02`**  
Détail plan, features cochées, dates from/to, historique paiements (vide OK), CTA renouveler (disabled si `ENABLE_PAYMENTS=false` + tooltip).

**EF-022 Progression `EC-STU-03`**  
Par matière : moyenne, nb tentatives, barres. Lien vers le module.

**EF-023 Settings `EC-STU-04`**  
- Photo (clic avatar, crop carré simple).  
- Prénom, nom.  
- Niveau + spécialité (`LevelPicker`).  
- Ville, école (optionnel).  
- Mot de passe (actuel + nouveau).

**CA-010** Changer Bac Maths → 2ème Sciences : dashboard et révision filtrent immédiatement.

**EF-024 Révision hub `EC-REV-01`**  
Matières du niveau/section uniquement. Compteur chapitres / questions. Clic matière → 4 cartes modules.

**EF-025 Banque `EC-REV-02`**  
Liste chapitres (même à 0). Session : énoncé, parties, timer optionnel, validation, barème, score /20, `POST /revision/attempts`.

**EF-026 Examens pratiques `EC-REV-03`**  
QCM / exercices packagés, correction immédiate.

**EF-027 Examens blancs (annales) `EC-REV-04`**  
Filtre année. Tentative complète, note /20.

**EF-028 Flashcards `EC-REV-05`**  
Recto/verso, clavier espace = flip.

Preview FREE : après 3 items, overlay « Débloquer avec Plus » (blur du reste). **CA-011** Un élève PLUS ne voit jamais l’overlay.

**EF-029 Documents PDF `EC-STU-05`**  
Dropzone PDF. Liste : nom, date, status (`uploaded|processing|ready|error`), nb questions. Clic ready → liste questions privées, même player que la banque. Quota restant visible. Dépassement → 402 UI claire.

### E.4 Admin

**EF-040 Dashboard `EC-ADM-01`** (super_admin : tout ; admin : users + contenu, **pas** les cartes CA/MRR)

KPI (nombres réels, empty « — ») :

| KPI | Formule |
|---|---|
| Revenu MTD | `SUM(Payment.amountTnd)` status completed, mois courant |
| Revenu 30 j | idem rolling 30 |
| MRR | somme `Plan.priceTnd` des abo `active|granted` mensuels + annuel/12 |
| Abos actifs | count status in active,granted,trialing and endsAt>now |
| Nouveaux 7 j | users student createdAt ≥ now-7d |
| Élèves totaux | student, deletedAt null, status ≠ archived |
| Actifs 7 j | distinct userId events 7 j |
| Suspendus | status=suspended |
| Churn 30 j | canceled|expired last 30 / abos début de période |
| Codes utilisés 30 j | count redemptions |
| Questions published | count |
| Drafts IA | origin=ai_admin status=draft |
| PDF élèves 7 j | StudentDocument created 7 j |

Graphiques Recharts (palette `#f59e0b` `#3b82f6` `#10b981` `#8b5cf6`) :

- ligne revenu journalier 30/90 j ;  
- aire nouveaux vs expirés ;  
- barres élèves par `gradeLevel` ;  
- donut plans ;  
- barres funnel signup → onboarding → abo.

Filtres : 7 j / 30 j / 90 j / MTD.

**EF-041 Users `EC-ADM-02`**

Table : avatar, nom, email, rôle, statut, niveau/spécialité, plan, dates. Recherche email/nom. Filtres rôle, statut, niveau.

Actions selon rôle (voir RM-005 à 007) :

| Action | Qui |
|---|---|
| Créer | super_admin — modal : nom, email, mdp, rôle, niveau si student |
| Éditer | super_admin — nom, email, rôle, niveau |
| Suspendre / Activer | admin |
| Archiver | super_admin |
| Soft-delete | super_admin + confirm taper email |
| Restaurer | super_admin |
| Grant abo | raccourci vers EF-043 |

**CA-020** Un admin ne voit pas le bouton delete. **CA-021** Soft-delete : l’élève ne peut plus login, la ligne reste avec badge « Supprimé ».

**EF-042 Plans `EC-ADM-03`** super_admin  
CRUD : code, noms FR/EN/AR, prix TND, interval, features JSON (toggles : questionBank, practiceExams, pastPapers, flashcards, pdfQuotaMonth), isActive, sortOrder. Impossible de supprimer un plan avec abos : `isActive=false`.

Plans seed :

| code | prix | interval | pdfQuotaMonth | contenu |
|---|---|---|---|---|
| `FREE` | 0 | monthly | 0 | preview 3 |
| `PLUS_MONTHLY` | 29.900 | monthly | 5 | full |
| `PLUS_YEARLY` | 249.000 | yearly | 5 | full |

**EF-043 Subscriptions `EC-ADM-04`**  
Liste abos. **Grant** : user search typeahead, plan, startsAt, endsAt, reason. Confirmation résumé. Toast + audit.

**EF-044 Discounts `EC-ADM-05`**  
Formulaire :

- code, type percent|fixed, valeur ;  
- `maxRedemptions` (placeholder « ex. 50 premiers ») ;  
- `perUserLimit` (placeholder « ex. 2 ») ;  
- startsAt, expiresAt ;  
- plans applicables (multi) ;  
- isActive.

Liste : used / max, dates, toggle. Impossible de modifier un code déjà used sauf isActive/expiry.

**EF-045 Curriculum & cours `EC-ADM-06`**  
Arbre : niveau → (section) → matière → chapitres. Ajouter chapitre. **Ajouter un cours** (titre, body markdown, PDF optionnel, publish). Tous les niveaux 7ème→Bac.

**EF-046 Knowledge base `EC-ADM-07`**  
Upload fichier (PDF/DOCX) + metadata (niveau, section, matière, topic, contentType ∈ cours|examen|exercices|annale|resume|manuel). Status pipeline. Erreurs visibles. Compteurs générés.

**EF-047 Questions manuelles `EC-ADM-08` (prioritaire)**  
Formulaire : niveau, section, matière, chapitre, type (Exercice QCM Problème Rédaction), difficulté, langue FR/AR/EN, énoncé, parties (label, texte, points), barème, calculatrice, temps estimé. Save draft **ou** publish.

**EF-048 Generate IA `EC-ADM-09`**  
Même métadata. CTA « Générer » → JSON éditable (énoncé, parties, barème). CTA « Enregistrer en brouillon » uniquement après génération. **Pas** de « Générer et publier ».

**EF-049 Review `EC-ADM-10`**  
Liste drafts. Preview. Publish / Archive / Edit.

**EF-050 Audit `EC-ADM-11`** super_admin — table filtres action/acteur/date.

**EF-051 Settings `EC-ADM-12`** super_admin — maintenanceMode, mail from, feature flags.

---

## F. Navigation (sidebars)

### Élève

```
Tableau de bord          /{locale}/dashboard
Révision Étude+          /{locale}/revision
Ma progression           /{locale}/progress
Mon plan                 /{locale}/plan
Mes documents            /{locale}/documents
Notifications            /{locale}/notifications
Paramètres               /{locale}/settings
```

### Admin

```
Tableau de bord          /{locale}/admin
Utilisateurs             /{locale}/admin/users
Plans                    /{locale}/admin/plans          (super)
Abonnements              /{locale}/admin/subscriptions  (super)
Codes promo              /{locale}/admin/discounts
Base de connaissances    /{locale}/admin/knowledge-base
Curriculum & cours       /{locale}/admin/curriculum
Questions                /{locale}/admin/questions
  → Nouvelle (manuelle)
  → Générer (IA)
Analytiques              /{locale}/admin/analytics      (super)
Journal d’audit          /{locale}/admin/audit          (super)
Réglages                 /{locale}/admin/settings       (super)
```

URLs locales : `fr` défaut. Middleware rewrite.

Layouts : `DashboardLayout` porté de Tude (sidebar collapsible, avatar, logout).

---

## G. API — contrat v1

Base : `http://localhost:3001/api/v1`  
Swagger : `http://localhost:3001/api/docs`  
Erreur :

```json
{ "code": "STRING_ENUM", "message": "humain i18n-ready FR", "details": null }
```

Auth : cookies `etude_access` (15 min) + `etude_refresh` (30 j, path `/api/v1/auth/refresh`). CORS credentials, origin allowlist.

### G.1 Public / auth

| ID | Méthode | Path | Body / notes |
|---|---|---|---|
| API-001 | POST | `/auth/register` | `{ firstName, email, password, termsAccepted }` — ne crée pas le user, crée un pending OTP |
| API-002 | POST | `/auth/otp/send` | `{ email }` |
| API-003 | POST | `/auth/otp/verify` | `{ email, code }` — crée user student, set cookies |
| API-004 | POST | `/auth/login` | `{ email, password }` |
| API-005 | POST | `/auth/refresh` | cookie |
| API-006 | POST | `/auth/logout` | |
| API-007 | GET | `/auth/me` | user + studentProfile + currentSubscription |
| API-008 | POST | `/auth/password/forgot` | `{ email }` toujours 200 |
| API-009 | POST | `/auth/password/reset` | `{ token, newPassword }` |
| API-010 | GET | `/plans` | plans isActive |
| API-011 | GET | `/healthz` | `{ status, db, redis }` |

### G.2 Élève

| ID | Méthode | Path |
|---|---|---|
| API-020 | PATCH | `/users/me` `{ firstName, lastName, city, profilePhoto }` |
| API-021 | POST | `/users/me/password` `{ currentPassword, newPassword }` |
| API-022 | PATCH | `/students/me/profile` `{ gradeLevel, educationSection, schoolName }` |
| API-023 | GET | `/subscriptions/me` |
| API-024 | POST | `/checkout` `{ planId, discountCode? }` — 501 si payments off |
| API-025 | POST | `/discounts/validate` `{ code, planId }` |
| API-026 | GET | `/curriculum/my` |
| API-027 | GET | `/revision/questions` query: subject, topic, difficulty |
| API-028 | POST | `/revision/attempts` |
| API-029 | GET | `/revision/annales` |
| API-030 | GET | `/revision/flashcards` |
| API-031 | GET | `/progress/overview` |
| API-032 | POST | `/storage/signed-upload` `{ purpose: avatar\|student_pdf, contentType, size }` |
| API-033 | POST | `/documents` `{ storageKey, fileName }` lance job |
| API-034 | GET | `/documents` |
| API-035 | GET | `/documents/:id/questions` |
| API-036 | GET | `/notifications` |

### G.3 Admin

Préfixe `/admin`, guards rôle.

| ID | Path | Qui |
|---|---|---|
| API-040 | CRUD `/admin/users` | create/edit/delete/restore : super ; list/get/suspend : admin |
| API-041 | `POST /admin/users/:id/suspend` `.../activate` `.../archive` `.../restore` | voir E |
| API-042 | CRUD `/admin/plans` | super |
| API-043 | `GET /admin/subscriptions` | super |
| API-044 | `POST /admin/subscriptions/grant` | super `{ userId, planId, startsAt, endsAt, reason }` |
| API-045 | CRUD `/admin/discounts` | admin |
| API-046 | CRUD `/admin/curriculum/chapters` | admin |
| API-047 | CRUD `/admin/courses` | admin |
| API-048 | `POST /admin/kb/files` + GET list | admin |
| API-049 | `POST /admin/questions` | admin — manuel ou save après IA |
| API-050 | `POST /admin/questions/generate` | admin — **no persist** |
| API-051 | `POST /admin/questions/:id/publish` | admin |
| API-052 | `GET /admin/analytics/overview` | super |
| API-053 | `GET /admin/analytics/series?metric&from&to` | super |
| API-054 | `GET /admin/audit` | super |
| API-055 | `POST /storage/signed-upload` purpose=`kb` | admin |

Pagination listes : `?page=1&limit=20` max 100. Réponse `{ items, total, page, limit }`.

---

## H. Environnement Docker (obligatoire dès le jour 1)

Services **dev** (docker compose) :

| Service | Image | Port hôte | Rôle |
|---|---|---|---|
| `postgres` | postgres:16-alpine | 5432 | base `etudeplus` |
| `adminer` | adminer:4 | **8080** | GUI SQL |
| `redis` | redis:7-alpine | 6379 | queues, cache, throttle |
| `mailpit` | axllent/mailpit | 1025 SMTP · **8025** UI | OTP emails |
| `minio` | minio/minio | 9000 API · **9001** console | fichiers (S3) |
| `minio-init` | minio/mc | — | crée bucket `etudeplus` |

Connexion Adminer :

- Système : `PostgreSQL`
- Serveur : `postgres` (depuis le réseau Docker) **ou** `localhost` depuis le navigateur hôte
- Utilisateur : `etude`
- Mot de passe : `etude`
- Base : `etudeplus`

MinIO console : `http://localhost:9001` — user `etude` / `etudeplus_minio`.  
Mailhog : `http://localhost:8025`.

Commandes :

```bash
docker compose up -d
docker compose ps
docker compose logs -f postgres
docker compose down          # stop
docker compose down -v       # stop + wipe volumes (destructif)
```

Apps Node **hors** compose en v1 (hot reload plus simple) :

- API : `http://localhost:3001`
- Web : `http://localhost:3000`

---

## I. Stack & arborescence repo

```
etude plus/
├── CAHIER-DES-CHARGES.md          ← ce fichier
├── ARCHITECTURE.md
├── docker-compose.yml
├── .env.example
├── package.json                   # pnpm workspace
├── pnpm-workspace.yaml
├── prisma/schema.prisma
├── prisma/seed.ts
├── apps/
│   ├── api/                       # NestJS Fastify :3001
│   └── web/                       # Next.js :3000
├── packages/shared/               # education-config, constants, types
└── Tude-Web-App-master/           # référence design UNIQUEMENT, ne pas modifier pour v1
```

Packages :

- Node 22 LTS  
- pnpm 10  
- TypeScript 5.9 strict  
- NestJS 11 + Fastify + `@nestjs/swagger` + Prisma + BullMQ + cookie-parser + helmet  
- Next 15 App Router + next-intl + TanStack Query + RHF + Zod + Tailwind 4 + Recharts  

Port design depuis Tude (fichiers à copier, pas réinventer) :

`Premium.tsx`, `MathBackground`, `FloatingSymbols`, `LaptopHero`/`DeskHero`, `Navbar`, `DashboardLayout`, `LevelPicker`, `ProfileCard`, `LanguageSwitcher`, `index.css` tokens, `fr.json`/`en.json`/`ar.json` (étendre, ne pas jeter).

---

## J. Données — seed obligatoire

1. 3 users (section C).  
2. 3 plans (EF-042).  
3. Grant PLUS_YEARLY → `eleve@etudeplus.local` (today → +365 j).  
4. Code `FIRST50` : 30 %, `maxRedemptions=50`.  
5. Code `TRY2` : 20 %, `perUserLimit=2`, expiresAt +30 j.  
6. Curriculum : au minimum Mathématiques + Français pour `7eme`, `2eme/sciences`, `bac/mathematiques` (chapitres réels Tude si dump disponible, sinon 3 chapitres chacun).  
7. 10 questions manuelles published Bac Maths.  
8. 5 flashcards, 1 annale.

---

## K. Exigences non fonctionnelles

| ID | Exigence |
|---|---|
| EN-001 | Temps réponse p95 API lecture < 300 ms local (hors IA) |
| EN-002 | Generate IA timeout HTTP 60 s ; job PDF async (poll status) |
| EN-003 | Throttle login 5/min/IP ; OTP 3/10 min/email ; generate 10/h/admin |
| EN-004 | Helmet, CORS fail-closed prod, cookies httpOnly Secure en prod |
| EN-005 | Logs JSON Pino + `request-id` |
| EN-006 | Accessible : labels, focus ring, contraste WCAG AA sur textes navy/gray |
| EN-007 | Responsive 375 / 768 / 1280 — dashboards utilisables mobile |
| EN-008 | Empty states partout (jamais crash 0 data) |
| EN-009 | Aucun secret dans `NEXT_PUBLIC_*` |
| EN-010 | `ENABLE_PAYMENTS` `ENABLE_STUDENT_PDF` `ENABLE_AI` flags |
| EN-011 | Tests : unit discount engine + e2e register OTP (Mailhog) + grant |
| EN-012 | OpenAPI généré, client web généré, CI `openapi:check` |

---

## L. Sécurité (recette)

1. Élève n’atteint jamais `/admin` (redirect dashboard).  
2. Admin n’atteint pas grant / delete user (403 API + UI hidden).  
3. Question `ai_student_pdf` d’un élève A → 404 pour élève B et pour `GET /revision/questions`.  
4. SQL injection : Prisma only, 0 raw SQL sauf analytics paramétré.  
5. Upload : MIME sniff, extension, taille.  
6. XSS : sanitize HTML questions/cours.  
7. Token refresh rotation (reuse d’un refresh déjà usé → revoke famille).

---

## M. i18n & design — checklist pixel

Landing, Navbar, boutons, cards, PageHeader = Tude.  
Primary `hsl(43 96% 56%)`, navy `hsl(222 47% 11%)`, fond landing `#FFFDF7`.  
H1 landing : Playfair, gradient amber sur « Étude+ ».  
Arabe : `dir=rtl` sur `<html>`, sidebar miroir.

Copy **interdit** en v1 : « professeur », « cours live », « KYC », « réserver une séance ». Remplacer par révision / abonnement / questions.

---

## N. Recette fonctionnelle (cahier de tests)

Exécuter après chaque phase. Environnement : compose up + seed.

| # | Scénario | Attendu |
|---|---|---|
| T-01 | Visiteur ouvre `/fr` | Landing Tude, pas d’erreur console |
| T-02 | Switch AR | RTL, textes arabes |
| T-03 | Register prénom+email+mdp+CGU | Mail dans Mailhog en < 5 s |
| T-04 | OTP faux | erreur inline, pas de session |
| T-05 | OTP vrai | cookies, onboarding |
| T-06 | Skip onboarding, aller /revision | redirect + banner niveau |
| T-07 | Choisir Bac + Mathématiques | badge dashboard « Bac — Mathématiques » |
| T-08 | Login super@ | dashboard admin + KPI (peuvent être 0) |
| T-09 | Grant 1 an à eleve@ | eleve voit from/to sur /plan |
| T-10 | Code FIRST50 × 51e fois | 422 EXHAUSTED (simuler 50 redemptions) |
| T-11 | TRY2 3e fois même user | 422 USER_LIMIT |
| T-12 | Admin crée question manuelle published | visible banque Bac Maths |
| T-13 | Generate IA → save draft | pas visible élève tant que unpublished |
| T-14 | Publish draft | visible élève |
| T-15 | Élève upload PDF (PLUS) | status processing → ready, questions privées |
| T-16 | FREE upload PDF | 402 quota |
| T-17 | Suspend eleve@ | login 403 |
| T-18 | Soft-delete | plus dans liste active, badge supprimé, login 403 |
| T-19 | Restore | login OK |
| T-20 | Admin tente DELETE user | 403 |
| T-21 | Churn / CA cards | chiffres = SUM payments, pas NaN |
| T-22 | Empty analytics | empty state, pas graphe cassé |

---

## O. Definition of Done (une story)

- [ ] Règles RM concernées implémentées côté Nest (pas seulement UI)  
- [ ] Écran i18n FR+EN+AR  
- [ ] Empty + error + loading  
- [ ] Responsive 375px  
- [ ] Swagger à jour  
- [ ] Audit si mutation admin  
- [ ] Tests listés en N pour le module  
- [ ] Pas d’appel Supabase, pas de `any` injustifié, pas de string UI hardcodée  

DoD **produit v1** = T-01 → T-22 verts + P0–P10 livrés.

---

## P. Ordre d’implémentation (ne pas sauter)

| Phase | Contenu | Preuve |
|---|---|---|
| P0 | Docker + Prisma migrate + seed users/plans + Nest `/healthz` + Next landing i18n | `docker compose ps` healthy, landing |
| P1 | Auth register 3 steps + login + me + cookies | T-03..T-07 |
| P2 | Settings photo/nom/niveau | T-07 |
| P3 | Curriculum + 4 modules lecture + 10 questions seed | élève voit Bac Maths |
| P4 | Attempts + progress dashboard | moyenne affichée |
| P5 | Admin users CRUD soft | T-17..T-20 |
| P6 | Plans + grant + /plan from-to | T-09 |
| P7 | Discounts engine | T-10 T-11 |
| P8 | Questions manuel + IA generate/draft/publish | T-12..T-14 |
| P9 | KB + cours tous niveaux | cours 8ème publiable |
| P10 | PDF élève + quota | T-15 T-16 |
| P11 | Analytics KPI + graphes | T-21 T-22 |
| P12 | Paiement provider (flag) | optionnel v1.1 |

---

## Q. Variables d’environnement

Voir `.env.example` à la racine. Obligatoires API :

`DATABASE_URL` `REDIS_URL` `JWT_ACCESS_SECRET` `JWT_REFRESH_SECRET` `CORS_ORIGINS` `S3_ENDPOINT` `S3_BUCKET` `S3_ACCESS_KEY` `S3_SECRET_KEY` `MAIL_HOST` `MAIL_PORT` `AI_API_KEY` (vide OK si `ENABLE_AI=false`)

Web : `NEXT_PUBLIC_API_URL=http://localhost:3001`

---

## R. Décisions figées (ne pas re-débattre en implémentation)

1. Next 15 + Nest 11 + Prisma + Postgres 16 + Redis + MinIO + Mailhog + Adminer.  
2. Pas de professeurs v1.  
3. Inscription 3 écrans.  
4. Grant manuel = chemin abo v1.  
5. Codes : N premiers ∪ durée ∪ N/user.  
6. Soft delete only.  
7. IA : manuel d’abord, generate sans persist, PDF élève privé.  
8. Design Tude, copy révision.  
9. `packages/shared` unique pour le programme tunisien.  
10. Ce fichier + `ARCHITECTURE.md` battent n’importe quel commentaire de code.

---

*Fin du cahier des charges v1.0. Toute story hors liste E est du scope creep.*
