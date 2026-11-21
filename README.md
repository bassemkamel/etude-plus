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

Ollama runs in Docker; no host Ollama installation is required. After copying `.env.example` to `.env`, start the services:

```powershell
docker compose up -d
```

Compose starts Ollama and automatically checks for `OLLAMA_MODEL` (default `qwen3:8b`), pulling it if it is missing. The first startup can take time while the model downloads; follow progress with `docker compose logs -f ollama-model-init`. The model files are stored in the persistent `ollama_data` Docker volume. `OLLAMA_PORT` controls the host port (default `11435`), and `OLLAMA_BASE_URL` must point to it; the example values are already aligned. `ENABLE_AI=true` enables question generation. For each PDF, the API extracts page text and groups complete pages into excerpts of about 1,800 characters, ranking them by normalized topic-word matches. It sends a relevant excerpt with each question request and tries at most one alternate excerpt if a response is unsuitable; it does not create or carry a running summary between requests. Restart the API after changing `.env`.

Each selected type (`QCM`, `Exercice`, `Probleme`, or `Redaction`) has its own output schema and validation. QCM responses require choices, a matching correct answer, and an explanation; the other types require type-appropriate tasks and matching solutions or a writing rubric. Mixed or incomplete responses are rejected rather than saved under the wrong type.

If you already have the standalone `etudeplus-ollama` container running on port `11435`, stop it before starting the Compose service to release that port:

```powershell
docker stop etudeplus-ollama
docker compose up -d
```

The Compose service reuses the existing `etudeplus_ollama_data` volume, so a model already downloaded there does not need to be downloaded again. Do not remove the old container until you have verified the Compose service works. Scanned PDFs without a text layer currently need OCR before they can be processed by Ollama.

The API currently runs on the host, so it uses `http://127.0.0.1:11435`. If you later run the API as a container on the `etudeplus` Compose network, configure `OLLAMA_BASE_URL=http://ollama:11434` instead. The Ollama port is bound to localhost and is not exposed publicly; keep it that way on production servers unless there is a specific network-security requirement.

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
