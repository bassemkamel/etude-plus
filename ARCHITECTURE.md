# Étude+ — Architecture cible (Next.js + NestJS)

**Version :** 1.0  
**Date :** 17 septembre 2026  
**Statut :** document de référence — source de vérité avant implémentation  
**Produit :** plateforme SaaS de révision scolaire tunisienne (7ème → Bac)  
**Source analysée :** `Tude-Web-App-master/`

---

## 0. Décision produit (non négociable)

Étude+ n’est **plus** un marketplace de cours live professeurs.  
C’est une **plateforme d’abonnement** pour élèves tunisiens :

- banque de questions, examens pratiques, annales, flashcards ;
- progression scolaire par niveau + spécialité ;
- base de connaissances officielle (admin) + génération IA ;
- PDF élève → questions personnelles.

Le **design visuel** de `Tude-Web-App-master` est conservé à l’identique (palette, typo, symboles maths, composants Premium).  
Le **périmètre professeur / classes live / Jitsi / KYC** est **hors v1** (code existant = archive, pas à porter).

| Rôle | v1 |
|---|---|
| `student` | oui |
| `admin` | oui |
| `super_admin` | oui |
| `professor` | non (schéma conservé, routes absentes) |

---

## 1. Analyse de l’existant

### 1.1 Stack actuelle

| Couche | Choix actuel | Problème |
|---|---|---|
| Front | Vite 7 + React 19 + Wouter | SPA, pas de SSR, i18n client-only |
| Back | Express 5 (fichiers plats `routes/`) | pas de modules, pas de DI, tests difficiles |
| ORM | Drizzle + PostgreSQL | correct, mais dual-write avec Supabase Functions |
| Auth | HMAC custom + cookie `etude_session` | pas JWT, pas refresh, secret maison |
| API | OpenAPI partiel + Orval | spec en retard sur le code |
| i18n | i18next FR / EN / AR + RTL | déjà bon, à porter tel quel |
| Jobs IA | traitement synchrone dans le process Express | timeout, pas de retry, pas de file |
| Dual API | Express **et** Supabase Edge Functions | le front appelle les deux (`VITE_API_URL` + `hilqkzjqysqjbfftqlkf.supabase.co`) |

### 1.2 Ce qui est déjà solide (à conserver conceptuellement)

- Système éducatif tunisien complet : `7eme` → `bac` + sections (`lettres`, `mathematiques`, `sciences`, …).
- Curriculum (chapitres même à 0 question) — bon modèle.
- Banque de questions / examens pratiques / annales / flashcards.
- Pipeline KB admin : upload PDF → extraction → IA → **draft** → review → publish.
- Saisie manuelle de questions (`/admin/manual-question`).
- Génération IA Anthropic **sans save automatique** (`POST /admin/questions/generate`).
- Progression élève (`revision_attempts`, `student_answers`, moyenne /20).
- Profil : photo, nom, niveau, section.
- Codes promo : `%`, `maxUses` global, `expiresAt`.
- Soft-suspend (`isSuspended`) + audit logs + impersonation.
- Design system : jaune `#f59e0b`, navy `#1a1a2e`, coral, Inter + Playfair Display, `MathBackground`, cards `rounded-2xl`.

### 1.3 Ce qui est cassé, incomplet ou à remplacer

| Sujet | État actuel | Cible |
|---|---|---|
| Inscription | 1 écran trop chargé (nom, email, mdp ×2, ville, niveau, section, école, CGU) + OTP | flux 3 étapes ultra-léger |
| Plans / abonnements | **inexistant** | cœur métier v1 |
| Attribution manuelle d’abo | **inexistant** | super_admin |
| Codes promo | pas de « 50 premiers », pas de « 2 fois / user » | 3 types de règles combinables |
| Soft delete / archive | hard delete uniquement | `deletedAt` + `archivedAt` + `status` |
| Collège 7ème–9ème | code présent, **masqué** (`ENABLED_CYCLES = ["lycee"]`) | **tous les niveaux actifs** |
| Dashboard admin | KPI partiels, revenue souvent 0 (transactions classes live), mix Supabase | analytics abonnements + Recharts |
| PDF élève → questions | **inexistant** | workspace privé par élève |
| Dual backend Express/Supabase | dette | NestJS seul |
| Auth HMAC | non standard | JWT access + refresh httpOnly |

### 1.4 Mapping routes existantes → cible

**Public (garder)**  
`/` `/about` `/pricing` `/terms` `/privacy` `/cookies` `/login` `/register`

**Élève (garder + enrichir)**  
`/student/dashboard` `/student/progress` `/student/settings` `/student/notifications`  
`/revision` `/:subject/banque-de-questions` `/examens-blancs` `/examens-pratiques` `/flashcards`  
**Nouveau :** `/student/plan` `/student/documents`

**Admin (garder + enrichir)**  
`/admin/dashboard` `/admin/analytics` `/admin/users` `/admin/knowledge-base` `/admin/curriculum` `/admin/manual-question` `/admin/audit-logs` `/admin/settings`  
**Nouveau :** `/admin/plans` `/admin/subscriptions` `/admin/discounts` `/admin/questions` (revue IA)

**Supprimer en v1**  
tout `/professor/*`, `/classroom/*`, `/checkout/:classId`, `/student/browse`, `/student/mon-prof`, `/admin/professors`, `/admin/videos`.

---

## 2. Principes d’architecture

1. **Un backend, une vérité.** NestJS est le seul serveur métier. Next.js ne contient **aucune** logique métier (pas de Route Handlers qui écrivent en base, sauf BFF proxy si besoin).
2. **Contrat d’API d’abord.** OpenAPI 3.1 généré depuis Nest (`@nestjs/swagger`) → client TypeScript généré (`orval` ou `openapi-typescript`).
3. **Modular monolith.** Un process Nest, modules bornés par domaine. Pas de microservices en v1.
4. **Jobs asynchrones pour l’IA.** BullMQ + Redis. L’HTTP ne génère jamais un PDF de 40 pages inline.
5. **Soft delete partout** sur les entités utilisateur / contenu. Hard delete = job RGPD, super_admin only.
6. **Curriculum-first.** Un chapitre existe même à 0 question. L’UI ne disparaît jamais.
7. **IA = brouillon.** Rien de généré n’est publié sans action humaine **sauf** le workspace PDF de l’élève (contenu privé, non global).
8. **i18n dès le premier pixel.** FR défaut, EN, AR + `dir=rtl`.
9. **Design = port 1:1** de `frontend/etude-plus` (tokens CSS, Premium UI, landing).

---

## 3. Stack cible

```
┌─────────────────────────────────────────────────────────────┐
│  Next.js 15 (App Router)  —  Vercel / Node                  │
│  React 19 · Tailwind 4 · next-intl · TanStack Query         │
│  shadcn/ui + composants Premium portés                      │
└──────────────────────────┬──────────────────────────────────┘
                           │ HTTPS  JSON  cookie httpOnly
                           ▼
┌─────────────────────────────────────────────────────────────┐
│  NestJS 11  —  Node 22 LTS                                  │
│  Fastify adapter · JWT · Guards · Pipes Zod · Swagger       │
│  Prisma 6 · PostgreSQL 16 · BullMQ · Redis 7                │
└───────────────┬─────────────────────────────┬───────────────┘
                │                             │
                ▼                             ▼
         PostgreSQL 16                    Redis 7
         ( Neon / RDS )                   (sessions cache,
                                          rate-limit, queues)
                │
                ▼
         S3 / R2 (fichiers)
         Anthropic / OpenAI (IA)
         Stripe ou Konnect (paiement TND)
         Resend (email OTP)
```

| Couche | Technologie | Pourquoi |
|---|---|---|
| Front | **Next.js 15 App Router** | SSR landing, i18n URL, SEO, layouts par rôle |
| UI | Tailwind 4 + shadcn + **port Premium** | même look que Tude |
| i18n | `next-intl` | FR/EN/AR, RTL, messages JSON repris |
| Data fetching | TanStack Query v5 | cache, mutations, déjà en place |
| Forms | React Hook Form + Zod | déjà en place |
| Charts | Recharts | déjà en place (admin analytics) |
| API | **NestJS 11 + Fastify** | modules, DI, guards, OpenAPI natif |
| Validation | Zod (`nestjs-zod`) | un schéma = DTO + OpenAPI |
| ORM | **Prisma 6** | migrations, types, Nest-idiomatique |
| Queue | BullMQ | pipeline IA, emails, webhooks paiement |
| Auth | JWT access 15 min + refresh 30 j, **cookies httpOnly** `SameSite=Lax` (prod: domaine partagé) ou `None` si cross-origin |
| Fichiers | Cloudflare R2 (S3 API) | PDF KB + PDF élèves + photos |
| Paiement | Konnect (TND) **ou** Stripe | un adapter, pas deux logiques |
| Observabilité | Pino + Sentry | déjà Sentry côté front |

**Hors v1 :** GraphQL, Kafka, Kubernetes, Elasticsearch. Postgres `pg_trgm` suffit pour la recherche questions.

---

## 4. Monorepo

```
etude-plus/
├── apps/
│   ├── web/                          # Next.js 15
│   │   ├── app/
│   │   │   ├── [locale]/             # fr | en | ar
│   │   │   │   ├── (public)/         # landing, pricing, auth
│   │   │   │   ├── (student)/        # dashboard élève
│   │   │   │   └── (admin)/          # dashboard admin
│   │   │   └── api/health/           # health next only
│   │   ├── components/               # UI + Premium port
│   │   ├── features/                 # slices métier UI
│   │   ├── lib/                      # api client, auth, i18n
│   │   └── messages/                 # fr.json en.json ar.json
│   └── api/                          # NestJS
│       ├── src/
│       │   ├── main.ts
│       │   ├── app.module.ts
│       │   ├── common/               # filters, guards, interceptors, pipes
│       │   └── modules/              # un dossier = un bounded context
│       └── test/
├── packages/
│   ├── shared/                       # types, educationConfig, constants, Zod
│   ├── api-client/                   # client généré OpenAPI
│   └── ui/                           # (optionnel) design system partagé
├── prisma/
│   ├── schema.prisma
│   └── migrations/
├── docker-compose.yml                # postgres + redis locaux
├── pnpm-workspace.yaml
└── ARCHITECTURE.md                   # ce fichier
```

`packages/shared` **possède** `educationConfig.ts` (aujourd’hui dupliqué front/back). Un seul fichier. Front et Nest l’importent.

---

## 5. Front — Next.js (architecture)

### 5.1 Routing App Router

```
app/[locale]/
├── layout.tsx                    # next-intl, fonts Inter + Playfair, dir/rtl
├── (public)/
│   ├── page.tsx                  # Landing — clone visuel Tude
│   ├── about / pricing / terms / privacy / cookies
│   ├── login/page.tsx
│   └── register/
│       ├── page.tsx              # étape 1 : email + mdp + prénom
│       ├── verify/page.tsx       # étape 2 : OTP 6 chiffres
│       └── onboarding/page.tsx   # étape 3 : niveau + section
├── (student)/
│   ├── layout.tsx                # DashboardLayout élève + guard
│   ├── dashboard/page.tsx
│   ├── plan/page.tsx             # mon abonnement from → to
│   ├── progress/page.tsx
│   ├── settings/page.tsx         # photo, nom, niveau, mot de passe
│   ├── documents/page.tsx        # PDF perso → questions
│   └── revision/
│       ├── page.tsx
│       └── [subject]/
│           ├── banque-de-questions/[[...topic]]
│           ├── examens-pratiques
│           ├── examens-blancs
│           └── flashcards/[[...topic]]
└── (admin)/
    ├── layout.tsx                # guard admin | super_admin
    ├── dashboard/page.tsx
    ├── analytics/page.tsx
    ├── users/page.tsx
    ├── plans/page.tsx
    ├── subscriptions/page.tsx
    ├── discounts/page.tsx
    ├── knowledge-base/page.tsx
    ├── curriculum/page.tsx
    ├── questions/
    │   ├── page.tsx              # liste + review
    │   ├── new/page.tsx          # saisie manuelle (prioritaire)
    │   └── generate/page.tsx     # IA → édition manuelle → save draft
    ├── audit/page.tsx
    └── settings/page.tsx
```

Middleware Next :
- locale (`fr` défaut, cookie + Accept-Language) ;
- auth cookie présent → ne pas rediriger les pages publiques login ;
- `(student)` exige rôle `student` ;
- `(admin)` exige `admin` | `super_admin` ;
- routes super_admin only : analytics, plans write, finances, audit, settings.

### 5.2 Inscription — UX (critique)

**Aujourd’hui :** tout sur un écran + ville obligatoire + niveau obligatoire avant même l’OTP.

**Cible — 3 écrans, zéro friction :**

```
Écran 1 — Compte (30 secondes)
  Prénom · Email · Mot de passe
  Case CGU
  CTA unique : « Créer mon compte »
  → envoie OTP, ne bloque plus sur la ville / le lycée

Écran 2 — Vérifier l’email
  6 digits, auto-submit, renvoyer le code (cooldown 30 s)
  Compte créé seulement APRÈS OTP valide

Écran 3 — Ton parcours (onboarding, skippable 24 h)
  1. Cycle : Collège | Lycée
  2. Niveau : 7ème … Bac
  3. Si 2ème/3ème/Bac → spécialité (Sciences, Maths, Lettres…)
  CTA : « Accéder à mon espace »
```

Règles UX :
- pas de confirmation mot de passe (toggle œil + indicateur force) ;
- ville et école = **optionnel**, dans Settings plus tard ;
- niveau **obligatoire avant d’accéder à /revision** (gate, pas au register) ;
- erreurs inline, jamais un toast seul ;
- AR : formulaire RTL natif.

### 5.3 Dashboard élève

Widgets obligatoires :

| Widget | Source |
|---|---|
| Salutation + **niveau · spécialité** (ex. `Bac — Mathématiques`, `2ème — Sciences`) | `studentProfile` |
| **Mon plan** : nom, statut, `startsAt` → `endsAt`, jours restants, CTA renouveler | `subscription` |
| Moyenne générale /20 | `progress/overview` |
| Révisions (nb tentatives) | idem |
| Série / streak | idem |
| 4 modules : Banque · Examens blancs · Examens pratiques · Flashcards | curriculum filtré par niveau+section |
| Upload PDF « Génère mes questions » | `student-documents` |

Sans abonnement actif (et hors période d’essai) : modules en lecture **preview** (3 questions) + overlay « Débloquer avec un plan ».

### 5.4 Dashboard admin (analytics)

Page unique `/admin/dashboard` (super_admin voit tout, admin voit users/contenu, pas le CA si policy `finance:read` absente).

**KPI (cartes, toujours visibles) :**

1. Revenu MTD (TND) + Δ vs mois précédent  
2. Revenu 30 j  
3. Abonnements actifs  
4. Nouveaux abonnés (7 j)  
5. Élèves totaux / actifs 7 j / suspendus  
6. MRR (somme plans récurrents)  
7. Taux de churn 30 j  
8. Taux d’utilisation codes promo  
9. Questions publiées / brouillons IA en attente  
10. PDF élèves traités (7 j)

**Graphiques (Recharts, même palette amber/blue/emerald) :**

- ligne : revenu journalier 30/90 j  
- aire : nouveaux vs churnés  
- barres : élèves par niveau (7ème → Bac)  
- donut : répartition plans  
- barres : conversions landing → signup → abo  
- heatmap horaire (déjà existante, à recabler sur events)

Pas de chiffre inventé : empty state Premium si 0 donnée (déjà le pattern Tude).

### 5.5 Design system — tokens à porter tels quels

```
--primary:        43 96% 56%     /* golden yellow */
--foreground:     222 47% 11%    /* navy */
--accent:         214 84% 56%    /* light blue */
--destructive:    3 84% 60%      /* coral */
Landing bg:       #FFFDF7
Font sans:        Inter
Font serif:       Playfair Display  (H1 landing + PageHeader)
Radius cards:     rounded-2xl
Boutons:          rounded-xl, hover:-translate-y-0.5
```

Port obligatoire depuis Tude : `Premium.tsx`, `MathBackground`, `FloatingSymbols`, `DeskHero`/`LaptopHero`, `Navbar`, `DashboardLayout`, `LevelPicker`, `ProfileCard`, `LanguageSwitcher`.

---

## 6. Back — NestJS (architecture)

### 6.1 Modules (bounded contexts)

```
src/modules/
├── auth/                 # login, register, otp, refresh, logout
├── users/                # profil, photo, CRUD admin, soft delete
├── students/             # studentProfile, niveau, section
├── plans/                # catalogue plans
├── subscriptions/        # cycle de vie abo + grant manuel
├── payments/             # Konnect/Stripe adapter + webhooks
├── discounts/            # codes + rédemptions + engine
├── curriculum/           # niveaux, sections, matières, chapitres, cours
├── knowledge-base/       # fichiers officiels admin
├── questions/            # banque + review + publish
├── revision/             # attempts, annales, flashcards, practice
├── progress/             # agrégats élève
├── documents/            # PDF élève → job IA privé
├── ai/                   # clients LLM + prompts + quotas
├── notifications/
├── analytics/            # agrégats admin (lecture)
├── audit/
├── storage/              # signed URLs R2
└── health/
```

Chaque module expose :
- `*.module.ts`
- `*.controller.ts` (HTTP)
- `*.service.ts` (règles)
- `*.repository.ts` (Prisma, **jamais** dans le controller)
- `dto/*.ts` (Zod)
- `*.processor.ts` si queue

**Règle :** un module n’importe le PrismaService que via son repository. Les controllers ne connaissent pas Prisma.

### 6.2 Cross-cutting (`src/common`)

| Élément | Rôle |
|---|---|
| `JwtAuthGuard` | access token cookie / Bearer |
| `RolesGuard` + `@Roles()` | `student` `admin` `super_admin` |
| `PermissionsGuard` + `@Require('finance:read')` | finer than role |
| `ZodValidationPipe` | 400 structurées |
| `HttpExceptionFilter` | `{ code, message, details }` — jamais de stack en prod |
| `AuditInterceptor` | écrit `audit_logs` sur mutations admin |
| `Throttler` | login 5/min/IP, OTP 3/10 min/email |
| `ClsModule` | request-id, userId dans logs |

### 6.3 Auth

```
POST /api/v1/auth/register          { firstName, email, password, termsAccepted }
POST /api/v1/auth/otp/send          { email }          idempotent, cooldown
POST /api/v1/auth/otp/verify        { email, code }    crée user + set cookies
POST /api/v1/auth/login
POST /api/v1/auth/refresh
POST /api/v1/auth/logout
GET  /api/v1/auth/me
POST /api/v1/auth/password/change
POST /api/v1/auth/password/forgot
POST /api/v1/auth/password/reset
```

Cookies :
- `etude_access` — JWT 15 min, httpOnly, path `/`
- `etude_refresh` — opaque random 32 B hashé en DB, 30 j, path `/api/v1/auth/refresh`, rotation à chaque usage

Mot de passe : bcrypt cost 12. Migration SHA-256 legacy Tude **reprise** (verify + rehash à la volée).

Un user `isSuspended` / `status != active` → 403 `ACCOUNT_DISABLED`.

---

## 7. Modèle de données (Prisma)

Identifiants : `cuid()`. Dates : `timestamptz`. Soft delete : `deletedAt`. Jamais d’enum métier en string libre sauf `topic` (texte curriculum).

### 7.1 Identité

```prisma
enum Role   { student admin super_admin }
enum UserStatus { active suspended archived }

model User {
  id             String     @id @default(cuid())
  email          String     @unique
  passwordHash   String
  role           Role       @default(student)
  status         UserStatus @default(active)
  firstName      String
  lastName       String
  fullName       String
  profilePhoto   String?
  city           String?
  phone          String?
  emailVerified  Boolean    @default(false)
  termsAcceptedAt DateTime?
  lastLoginAt    DateTime?
  archivedAt     DateTime?
  deletedAt      DateTime?
  createdAt      DateTime   @default(now())
  updatedAt      DateTime   @updatedAt
  student        StudentProfile?
  subscriptions  Subscription[]
  refreshTokens  RefreshToken[]
}

model StudentProfile {
  id                String   @id @default(cuid())
  userId            String   @unique
  user              User     @relation(...)
  gradeLevel        String?  // 7eme | 8eme | 9eme | 1ere_secondaire | 2eme | 3eme | bac
  educationSection  String   @default("")  // "" si niveau simple ; jamais null (unicité SQL)
  schoolName        String?
  onboardingDoneAt  DateTime?
}
```

**Règle niveau/section** (serveur, `packages/shared`) :

- niveaux simples : `7eme` `8eme` `9eme` `1ere_secondaire` → `educationSection` **doit** être `""` ;
- niveaux à section : `2eme` `3eme` `bac` → section **obligatoire** et dans la whitelist.

### 7.2 Plans & abonnements

```prisma
enum BillingInterval { monthly quarterly yearly }
enum SubscriptionStatus { trialing active past_due canceled expired granted }
enum SubscriptionSource { checkout admin_grant promo }

model Plan {
  id              String          @id @default(cuid())
  code            String          @unique   // FREE, PLUS_MONTHLY, PLUS_YEARLY
  nameFr          String
  nameEn          String
  nameAr          String
  descriptionJson Json
  priceTnd        Decimal         @db.Decimal(10, 3)
  interval        BillingInterval
  features        Json            // { questionBank, practiceExams, pastPapers, flashcards, pdfQuotaMonth }
  isActive        Boolean         @default(true)
  sortOrder       Int             @default(0)
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
}

model Subscription {
  id              String               @id @default(cuid())
  userId          String
  planId          String
  status          SubscriptionStatus
  source          SubscriptionSource
  startsAt        DateTime
  endsAt          DateTime
  canceledAt      DateTime?
  grantedById     String?              // admin qui a offert
  grantReason     String?
  discountCodeId  String?
  externalPaymentId String?
  createdAt       DateTime             @default(now())
  updatedAt       DateTime             @updatedAt

  @@index([userId, status])
  @@index([endsAt])
}
```

**Grant manuel (super_admin) :**

```
POST /api/v1/admin/subscriptions/grant
{
  "userId": "...",
  "planId": "...",
  "startsAt": "2026-09-17",
  "endsAt":   "2027-09-17",
  "reason":   "Partenariat lycée X"
}
```

Effet : clôture l’abo actif éventuel (`canceled`), crée `status=granted`. Audit obligatoire.

Un élève a **au plus un abo non terminal** (`trialing|active|past_due|granted`) à la fois. Unique partiel SQL.

### 7.3 Codes promo — 3 familles demandées

Un code combine des **contraintes**. Toutes les contraintes présentes doivent passer.

```prisma
enum DiscountType { percent fixed }

model DiscountCode {
  id                 String       @id @default(cuid())
  code               String       @unique  // FIRST50, RAMADAN26
  type               DiscountType @default(percent)
  percentOff         Int?                  // 1..100
  amountOffTnd       Decimal?     @db.Decimal(10, 3)
  // Contraintes (toutes optionnelles, AND logique)
  maxRedemptions     Int?                  // ex. 50 → « 50 premiers »
  perUserLimit       Int?                  // ex. 2  → « deux fois »
  startsAt           DateTime?
  expiresAt          DateTime?             // « par durée »
  applicablePlanIds  String[]              // vide = tous
  isActive           Boolean      @default(true)
  createdById        String?
  createdAt          DateTime     @default(now())
}

model DiscountRedemption {
  id             String   @id @default(cuid())
  codeId         String
  userId         String
  subscriptionId String?
  createdAt      DateTime @default(now())

  @@index([codeId, userId])
}
```

Exemples :

| Intention | Config |
|---|---|
| 50 premiers inscrits −30 % | `maxRedemptions=50`, `percentOff=30` |
| Valable 10 jours | `startsAt` + `expiresAt` |
| Utilisable 2 fois par élève | `perUserLimit=2` |
| 50 premiers **et** 15 jours | les deux champs |

Engine `DiscountsService.validate(code, userId, planId)` atomique (`SELECT … FOR UPDATE` sur le code) pour éviter les courses sur les 50 premiers.

### 7.4 Curriculum & cours

```prisma
model CurriculumSubject {
  id         String @id @default(cuid())
  code       String @unique            // mathematiques
  name       String @unique            // Mathématiques
  icon       String
  colorClass String
  sortOrder  Int
}

model CurriculumChapter {
  id          String  @id @default(cuid())
  levelCode   String
  sectionKey  String?
  subject     String
  name        String
  slug        String
  sortOrder   Int
  isActive    Boolean @default(true)

  // sectionKey = "" (jamais null) pour les niveaux sans spécialité.
  // Postgres ne déduplique pas les NULL dans un UNIQUE.
  @@unique([levelCode, sectionKey, subject, slug])
}

model Course {
  id          String   @id @default(cuid())
  title       String
  levelCode   String
  sectionKey  String?
  subject     String
  chapterId   String?
  body        String   // markdown / HTML sanitizé
  fileId      String?  // PDF cours dans KB
  isPublished Boolean  @default(false)
  createdById String?
  createdAt   DateTime @default(now())
  updatedAt   DateTime @updatedAt
}
```

Admin peut **ajouter un cours** (texte et/ou PDF) rattaché à n’importe quel niveau 7ème → Bac.

**Tous les cycles sont actifs en v1** (supprimer `ENABLED_CYCLES = ["lycee"]`).

### 7.5 Questions & KB

```prisma
enum QuestionStatus { draft published archived }
enum QuestionOrigin { manual ai_admin ai_student_pdf }
enum QuestionType   { Exercice QCM Probleme Redaction }
enum Difficulty     { facile moyen difficile }

model Question {
  id              String          @id @default(cuid())
  origin          QuestionOrigin
  status          QuestionStatus  @default(draft)
  ownerUserId     String?         // NON null si origin=ai_student_pdf (privé)
  kbFileId        String?
  studentDocId    String?
  createdById     String?
  gradeLevel      String
  sectionKey      String?
  subject         String
  topic           String
  type            QuestionType
  difficulty      Difficulty
  language        String          @default("Français")
  questionText    String
  context         String?
  requiresCalculator Boolean      @default(false)
  totalMarks      Int?
  estimatedTimeMinutes Int?
  publishedAt     DateTime?
  deletedAt       DateTime?
  createdAt       DateTime        @default(now())
  updatedAt       DateTime        @updatedAt
  parts           QuestionPart[]
  markSchemes     MarkScheme[]
}

model KnowledgeBaseFile {
  id             String   @id @default(cuid())
  fileName       String
  storageKey     String
  contentType    String   // cours | examen | exercices | annale | resume | manuel
  subject        String
  gradeLevel     String
  sectionKey     String?
  topic          String
  status         String   // uploaded | processing | ready | published | error
  questionsCount Int      @default(0)
  flashcardsCount Int     @default(0)
  annalesCount   Int      @default(0)
  errorMessage   String?
  uploadedById   String?
  createdAt      DateTime @default(now())
  processedAt    DateTime?
}

model StudentDocument {
  id           String   @id @default(cuid())
  userId       String
  fileName     String
  storageKey   String
  status       String   // uploaded | processing | ready | error
  questionsCount Int    @default(0)
  errorMessage String?
  createdAt    DateTime @default(now())
  processedAt  DateTime?
}
```

Visibilité banque globale :

```sql
WHERE status = 'published'
  AND origin IN ('manual', 'ai_admin')
  AND ownerUserId IS NULL
  AND deletedAt IS NULL
  AND gradeLevel = :studentLevel
  AND (sectionKey IS NULL OR sectionKey = :studentSection)
```

Questions `ai_student_pdf` : **jamais** dans la banque globale. Uniquement `ownerUserId = currentUser`.

### 7.6 Paiements, audit, events

```prisma
model Payment {
  id              String   @id @default(cuid())
  userId          String
  subscriptionId  String?
  amountTnd       Decimal  @db.Decimal(10, 3)
  status          String   // pending | completed | failed | refunded
  provider        String   // konnect | stripe | admin_grant
  providerRef     String?
  discountCodeId  String?
  createdAt       DateTime @default(now())
}

model AuditLog {
  id         String   @id @default(cuid())
  actorId    String
  action     String
  entity     String
  entityId   String?
  metadata   Json
  ip         String?
  createdAt  DateTime @default(now())
}

model UserEvent {
  id         String   @id @default(cuid())
  userId     String?
  sessionId  String
  eventType  String
  page       String?
  deviceType String?
  data       Json?
  createdAt  DateTime @default(now())
}
```

Reprendre `revision_attempts` / `student_answers` / `flashcards` / `annales` / `notions` tels quels (mêmes colonnes sémantiques que Tude).

---

## 8. API REST (contrat)

Préfixe : `/api/v1`  
Format erreur :

```json
{ "code": "DISCOUNT_EXHAUSTED", "message": "Ce code a atteint sa limite.", "details": null }
```

Codes HTTP : 400 validation, 401 auth, 403 rôle, 404, 409 conflit (email, abo déjà actif), 422 règle métier, 429 throttle.

### 8.1 Auth / me / profil

| Méthode | Chemin | Rôle |
|---|---|---|
| POST | `/auth/register` | public |
| POST | `/auth/otp/send` | public |
| POST | `/auth/otp/verify` | public |
| POST | `/auth/login` | public |
| GET | `/auth/me` | auth |
| PATCH | `/users/me` | auth — `firstName`, `lastName`, `city`, `profilePhoto` |
| PATCH | `/students/me/profile` | student — `gradeLevel`, `educationSection`, `schoolName` |
| POST | `/storage/signed-upload` | auth — `{ purpose: "avatar"|"kb"|"student_pdf" }` |

### 8.2 Plans & abo (élève)

| Méthode | Chemin | Rôle |
|---|---|---|
| GET | `/plans` | public |
| POST | `/checkout` | student `{ planId, discountCode? }` |
| GET | `/subscriptions/me` | student — plan + from/to + status |
| POST | `/billing/webhook/:provider` | signature provider |

### 8.3 Admin

| Méthode | Chemin | Rôle |
|---|---|---|
| POST | `/admin/users` | super_admin — create |
| GET | `/admin/users` | admin — filtres status/role/level, pagination |
| GET | `/admin/users/:id` | admin |
| PATCH | `/admin/users/:id` | super_admin — edit |
| POST | `/admin/users/:id/suspend` | admin |
| POST | `/admin/users/:id/activate` | admin |
| POST | `/admin/users/:id/archive` | super_admin |
| DELETE | `/admin/users/:id` | super_admin — **soft** (`deletedAt`) |
| POST | `/admin/users/:id/restore` | super_admin |
| CRUD | `/admin/plans` | super_admin |
| POST | `/admin/subscriptions/grant` | super_admin |
| GET | `/admin/subscriptions` | super_admin |
| CRUD | `/admin/discounts` | admin |
| CRUD | `/admin/curriculum/chapters` | admin |
| CRUD | `/admin/courses` | admin |
| POST | `/admin/kb/files` | admin — upload |
| POST | `/admin/questions` | admin — **saisie manuelle (prioritaire)** |
| POST | `/admin/questions/generate` | admin — IA, **ne persiste pas** |
| POST | `/admin/questions/:id/publish` | admin — draft → published |
| GET | `/admin/analytics/overview` | super_admin |
| GET | `/admin/analytics/series?metric=&from=&to=` | super_admin |

### 8.4 Révision élève

Identique sémantiquement à Tude :

- `GET /curriculum/my` — matières + chapitres du niveau/section
- `GET /revision/questions` — banque
- `POST /revision/attempts`
- `GET /revision/annales`
- `GET /revision/flashcards`
- `GET /progress/overview`

Nouveau :

- `POST /documents` — upload PDF
- `GET /documents` — liste + status job
- `GET /documents/:id/questions` — questions privées

---

## 9. Pipeline IA (règle métier exacte)

Ordre imposé par le produit :

```
1) Saisie manuelle          → status=published (ou draft si l’admin choisit)
2) Génération IA admin      → JAMAIS auto-publiée
3) PDF élève                → questions privées, pas de revue admin
```

### 9.1 Manuelle d’abord

`POST /admin/questions` est le chemin **principal** de remplissage de la banque.  
UI `/admin/questions/new` = formulaire Tude `AdminManualQuestion` (niveaux 7ème→Bac, QCM / exercice / problème).

### 9.2 IA admin (deuxième)

```
Admin choisit niveau + section + matière + chapitre + type + difficulté
        │
        ▼
POST /admin/questions/generate     → JSON questions (pas de DB)
        │
        ▼
Écran d’édition (l’humain corrige énoncé, barème, langue)
        │
        ▼
POST /admin/questions              origin=ai_admin, status=draft
        │
        ▼
Review liste des drafts → Publish
```

Le bouton « Enregistrer » n’existe **qu’après** édition. Pas de « Generate & publish ».

### 9.3 PDF KB officiel

```
Upload admin (cours / annale / exercices)
  → BullMQ job `kb.process`
  → extraction texte (pdf-parse / mammoth)
  → LLM → questions + flashcards + annales (draft)
  → KnowledgeBaseFile.status = ready
  → Admin review / publish sélectif
```

### 9.4 PDF élève (nouveau)

```
Élève upload (quota = plan.features.pdfQuotaMonth, ex. 5/mois)
  → virus/mime check (PDF only, max 15 Mo)
  → job `student-pdf.process`
  → questions origin=ai_student_pdf, ownerUserId=élève, status=published (privé)
  → notification « Tes questions sont prêtes »
```

Quota dépassé → 402 `PDF_QUOTA_EXCEEDED`.  
Ces questions n’alimentent **pas** la KB globale.

Prompts : un seul module `AiPromptService`, spécialisé **programmes tunisiens**, langues FR/AR/EN. Modèle configurable `AI_PROVIDER=anthropic|openai`.

---

## 10. Autorisations

| Action | student | admin | super_admin |
|---|---|---|---|
| Réviser, progress, profil | oui | — | — |
| Upload PDF perso | si plan le permet | — | — |
| CRUD questions / KB / cours / curriculum | — | oui | oui |
| CRUD users (sauf super_admin) | — | suspend/activate | tout |
| Soft delete / archive user | — | — | oui |
| Plans + grant abo + finances | — | — | oui |
| Codes promo | — | oui | oui |
| Analytics CA / MRR | — | — | oui |

Un `admin` ne peut ni modifier un `super_admin`, ni s’auto-promouvoir.

Soft delete user : anonymisation email `deleted+{id}@invalid.local`, `status=archived`, sessions révoquées. Les tentatives de révision restent pour les stats agrégées (userId conservé, PII masquée).

---

## 11. Front features (découpage dossiers)

```
apps/web/features/
├── auth/                 # login, register 3 steps
├── landing/              # port Landing.tsx
├── student-dashboard/
├── student-plan/
├── student-progress/
├── student-settings/     # ProfileCard + LevelPicker
├── student-documents/
├── revision/             # 4 modules
├── admin-dashboard/      # KPI + graphs
├── admin-users/
├── admin-plans/
├── admin-subscriptions/
├── admin-discounts/
├── admin-kb/
├── admin-curriculum/
├── admin-questions/      # manual + generate + review
└── admin-analytics/
```

Chaque feature : `components/`, `hooks/`, `api.ts` (wrappers du client OpenAPI). **Interdiction** d’appeler `fetch` brut vers Supabase.

---

## 12. Nest — squelette d’un module (standard)

Exemple `subscriptions` :

```
modules/subscriptions/
  subscriptions.module.ts
  subscriptions.controller.ts          # élève : GET /me
  admin-subscriptions.controller.ts    # grant, list
  subscriptions.service.ts             # start, cancel, expire, grant
  subscriptions.repository.ts
  dto/grant-subscription.dto.ts
  jobs/expire-subscriptions.processor.ts   # cron toutes les heures
```

Cron : `SubscriptionCron` passe `active|granted` → `expired` si `endsAt < now()`. L’élève voit alors le overlay plan.

---

## 13. Paiement

Interface unique :

```ts
interface PaymentProvider {
  createCheckout(input: { userId: string; planId: string; discount?: DiscountSnapshot; returnUrl: string }): Promise<{ url: string; ref: string }>;
  parseWebhook(rawBody: Buffer, signature: string): Promise<PaymentEvent>;
}
```

Implémentations : `KonnectProvider`, `StripeProvider`, `NoopProvider` (dev).  
Grant admin **ne passe pas** par le provider (`source=admin_grant`, `Payment.provider=admin_grant`, amount 0).

Devise : **TND**. Affichage `formatTND` porté de Tude.

---

## 14. i18n

- `next-intl`, locales `fr` (default) `en` `ar`
- URL : `/fr/register`, `/ar/register` (RTL automatique sur `<html dir>`)
- Reprendre les clés de `src/locales/*.json` Tude, ajouter :
  - `register.stepAccount` `register.stepVerify` `register.stepPath`
  - `plan.*` `subscription.*` `discount.*` `admin.kpi.*` `documents.*`

LanguageSwitcher inchangé (drapeau + label).

---

## 15. Sécurité

- Helmet (Nest) + CORS allowlist (fail-closed en prod, comme Tude).
- Rate limit Redis : auth, OTP, generate IA (coûteux), upload.
- Upload : MIME sniff, taille max, signed PUT, pas de base64 20 Mo en JSON (dette Tude à tuer).
- XSS : DOMPurify sur `questionText` / cours HTML.
- CSRF : cookies SameSite + header `X-Requested-With` sur mutations si front/back same-site ; sinon CSRF token double-submit.
- Secrets : `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `DATABASE_URL`, `REDIS_URL`, `AI_API_KEY`, `R2_*`, `PAYMENT_*` — jamais dans le front.
- RGPD : export data élève, delete account (soft + purge PII 30 j).
- Audit de **toute** mutation admin.

---

## 16. Observabilité & perf

- `request-id` (UUID) dans chaque log Pino.
- Sentry front + Nest.
- Health : `GET /healthz` (process) `GET /readyz` (db + redis).
- Index Prisma minimum : `User.email`, `Subscription(userId,status)`, `Question(gradeLevel,sectionKey,subject,status,origin)`, `DiscountRedemption(codeId,userId)`, `UserEvent(createdAt,eventType)`.
- Analytics : requêtes SQL agrégées (comme `adminAnalytics.ts` actuel), cache Redis 30 s sur `/admin/analytics/overview`.

---

## 17. Migration depuis Tude-Web-App-master

| Donnée | Action |
|---|---|
| `users` + `student_profiles` | script Prisma, mapper `fullName` → first/last, `isSuspended` → `status` |
| `questions` + parts + mark_schemes | copy, `origin=manual` si `created_by` admin sans `kb_file_id`, sinon `ai_admin` |
| `curriculum_*` | copy 1:1 |
| `flashcards` `annales` `notions` | copy |
| `revision_attempts` `student_answers` | copy |
| `discount_codes` | `maxUses` → `maxRedemptions`, `timesUsed` recalculé via rédemptions |
| `knowledge_base_files` | copy + reupload R2 si `file_data` bytea |
| classes / professors / sessions / enrollments | **ne pas migrer en v1** |
| passwords SHA-256 | verify legacy + rehash bcrypt au login (déjà le cas) |

Feature flags :

```
ENABLE_COLLEGE=true
ENABLE_STUDENT_PDF=true
ENABLE_PAYMENTS=false   # jusqu’à Konnect live → grant manuel suffit
```

---

## 18. Plan d’implémentation (ordre zéro-faute)

Ne pas paralléliser au-delà de ce que le contrat d’API autorise.

| Phase | Livrable | Critère de fin |
|---|---|---|
| **P0** | Monorepo, Prisma, Nest health, Next landing portée (i18n + design Tude) | pixel-close landing + `/healthz` |
| **P1** | Auth + register 3 steps + profil (photo, nom, niveau, section) | un élève créé, photo OK, Bac Maths visible |
| **P2** | Curriculum 7ème→Bac + 4 modules révision lecture (seed Tude) | élève voit ses matières |
| **P3** | Attempts + progress dashboard | moyenne /20 réelle |
| **P4** | Users admin : create / edit / suspend / archive / soft delete | aucun hard delete |
| **P5** | Plans + grant manuel + écran « Mon plan from→to » | admin offre 1 an, élève le voit |
| **P6** | Discounts (50 premiers, durée, 2×/user) + checkout flaggé | 3 scénarios testés |
| **P7** | Questions manuelles + IA generate→edit→draft→publish | 0 auto-publish |
| **P8** | KB admin (cours PDF, tous niveaux) | un cours 8ème publié |
| **P9** | PDF élève → questions privées | quota plan respecté |
| **P10** | Analytics admin (CA, effectifs, graphes) | 10 KPI + 5 charts sur data réelle |
| **P11** | Paiement provider + emails | webhook idempotent |

Chaque phase : tests e2e Playwright (register, grant, revision) + tests Nest (discount engine, visibilité questions).

---

## 19. Tests (non optionnel)

**Nest**
- unit : `DiscountsService` (50e redemption refuse le 51e, perUserLimit=2)
- unit : `QuestionsService` refuse `publish` si `origin=ai_student_pdf` vers le global
- e2e : grant subscription + `GET /subscriptions/me`
- e2e : register OTP (mailhog)

**Next**
- Playwright : register 3 steps, RTL arabe, dashboard plan, admin KPI empty state

**Contrats**
- CI casse si le client OpenAPI n’est pas régénéré (`pnpm openapi:check`)

---

## 20. Variables d’environnement

```
# api
DATABASE_URL=
REDIS_URL=
JWT_ACCESS_SECRET=
JWT_REFRESH_SECRET=
CORS_ORIGINS=https://etudeplus.tn
R2_ACCOUNT_ID= R2_ACCESS_KEY= R2_SECRET= R2_BUCKET=
AI_PROVIDER=anthropic
AI_API_KEY=
PAYMENT_PROVIDER=konnect
KONNECT_API_KEY=
RESEND_API_KEY=
SENTRY_DSN=

# web
NEXT_PUBLIC_API_URL=https://api.etudeplus.tn
NEXT_PUBLIC_DEFAULT_LOCALE=fr
```

Aucun `NEXT_PUBLIC_*` secret. Aucune URL Supabase.

---

## 21. Ce que ce document tranche (pour ne pas re-débattre)

1. Next.js 15 + NestJS 11 + Prisma + Postgres + Redis + BullMQ.  
2. Design Tude conservé. Professeurs / live **hors v1**.  
3. Collège **activé** (7ème, 8ème, 9ème) + lycée jusqu’au Bac.  
4. Inscription courte, onboarding niveau après OTP.  
5. Plans + grant manuel + écran from/to élève.  
6. Codes : premiers N **ou** durée **ou** 2 fois / user (combinables).  
7. Users : create, edit, suspend, archive, soft delete — pas de DELETE SQL.  
8. IA : manuelle d’abord, IA ensuite en draft, PDF élève = privé.  
9. Un seul backend. Plus de Supabase Functions.  
10. Analytics = abonnements + élèves + contenu, pas les anciennes classes live.

---

## 22. Glossaire

| Terme | Sens |
|---|---|
| Niveau (`gradeLevel`) | `7eme` … `bac` |
| Section / spécialité | `mathematiques`, `sciences`, `lettres`, … |
| Banque globale | questions `manual` + `ai_admin` publiées |
| Workspace PDF | questions `ai_student_pdf` d’un élève |
| Grant | abonnement créé par un super_admin, sans paiement |
| Draft | contenu IA non visible des élèves |

---

*Fin du document de référence. Toute implémentation qui contredit une règle numérotée ci-dessus est un bug d’architecture, pas une « amélioration ». *
