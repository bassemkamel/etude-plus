# Étude+ — projet v1

Monorepo **Next.js 15 + NestJS 11 + Prisma + Docker**.

Documents à suivre dans cet ordre :

1. [`CAHIER-DES-CHARGES.md`](./CAHIER-DES-CHARGES.md) — produit, écrans, API, recette  
2. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — stack, modules, schéma

`Tude-Web-App-master/` = **référence design uniquement**. Ne pas y ajouter de features v1.

---

## Prérequis

- Docker Desktop  
- Node.js 22+  
- pnpm 10 (`corepack enable`)

---

## 1. Démarrer l’infra

```powershell
cd "C:\Users\admin\Desktop\projects\etude plus"
# tout-en-un (Docker + Prisma + seed) :
.\scripts\setup.ps1
```

Sans script :

```powershell
Copy-Item .env.example .env
docker compose up -d
npx pnpm@10.32.1 install
npx pnpm@10.32.1 exec prisma generate
npx pnpm@10.32.1 exec prisma db push
npx pnpm@10.32.1 exec tsx prisma/seed.ts
```

| Service | URL | Accès |
|---|---|---|
| PostgreSQL | `localhost:5432` | user `etude` / mdp `etude` / base `etudeplus` |
| Adminer | http://localhost:8080 | Système PostgreSQL, serveur `postgres` (ou `localhost` depuis l’hôte), user `etude`, mdp `etude`, base `etudeplus` |
| Redis | `localhost:6379` | — |
| Mailpit (OTP) | http://localhost:8025 | boîte SMTP locale |
| MinIO console | http://localhost:9001 | `etude` / `etudeplus_minio` |

Depuis **Adminer dans le navigateur de Windows**, le serveur est `localhost` (pas `postgres`).  
`postgres` est le hostname **entre conteneurs**.

---

## 2. Base + seed

```powershell
npx pnpm@10.32.1 install
npx pnpm@10.32.1 exec prisma generate
npx pnpm@10.32.1 exec prisma db push
npx pnpm@10.32.1 exec tsx prisma/seed.ts
```

Comptes :

| Email | Mot de passe | Rôle |
|---|---|---|
| `super@etudeplus.local` | `EtudePlus!2026` | super_admin |
| `admin@etudeplus.local` | `EtudePlus!2026` | admin |
| `eleve@etudeplus.local` | `EtudePlus!2026` | élève Bac Maths + plan annuel |

---

## 3. Apps

```powershell
npx pnpm@10.32.1 dev:api    # http://localhost:3001/healthz  ·  /api/docs
npx pnpm@10.32.1 dev:web    # http://localhost:3000
```

## AI question generation with Ollama

For local development, set `ENABLE_AI=true` and configure `OLLAMA_BASE_URL` (default `http://127.0.0.1:11434`) plus `OLLAMA_MODEL`. The API sends PDF text to Ollama in page chunks (`OLLAMA_PDF_CHUNK_PAGES`, default 20) and carries a running summary forward. Restart the API after changing `.env`.

`gemma4:31b-cloud` uses Ollama's hosted cloud service; it is not fully local inference. To run inference on your own machine, install/pull a model supported by your hardware and set `OLLAMA_MODEL` to that exact local model tag. Ollama must be reachable from the API process. Scanned PDFs without a text layer currently need OCR before they can be processed by Ollama.

---

## Commandes utiles

```powershell
pnpm db:logs
pnpm prisma:studio
docker compose down          # stop
docker compose down -v       # stop + EFFACE postgres/redis/minio
```

---

## Implémentation

Respecter les phases **P0 → P12** du cahier des charges.  
P0 = ce repo (Docker + Prisma + health + landing).  
P1 = auth 3 étapes.
