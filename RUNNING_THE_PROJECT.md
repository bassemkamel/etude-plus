# Running Étude+ Locally

This guide is for Windows with PowerShell. The API and web app run on your computer; Docker Compose runs PostgreSQL, Redis, MinIO, Mailpit, and Ollama.

## Prerequisites

- Docker Desktop, running
- Node.js 22 or newer
- Git
- pnpm 10 (the repository pins pnpm 10.32.1)

## 1. Get the project and configure your environment

```powershell
git clone https://github.com/bassemkamel/etude-plus.git
cd etude-plus
Copy-Item .env.example .env
notepad .env
```

`.env` is for local settings and should not be committed or shared. Replace the development JWT secrets with private local values. If you change the PostgreSQL credentials, update `DATABASE_URL` to match.

AI generation is configured in the example environment to use the Docker-hosted Ollama service and `qwen3:8b`. The API runs on the host, so `OLLAMA_BASE_URL` should be `http://127.0.0.1:11435`. Keep the Ollama port bound to localhost.

## 2. Start Docker and prepare the database

To start the Docker services directly:

```powershell
docker compose up -d
```

Or use the setup script, which runs the same Docker command and then installs dependencies, generates the Prisma client, syncs the database schema, and seeds development data:

```powershell
.\scripts\setup.ps1
```

The first Ollama startup may take a while because it downloads the model. In another PowerShell window, monitor the download:

```powershell
docker compose logs -f ollama-model-init
```

Wait until the logs show that the model is present or the pull completed, then press **Ctrl+C** to exit the log view. This does not stop the containers. Confirm the model is installed with:

```powershell
docker compose exec ollama ollama list
```

The model is stored in a persistent Docker volume, so it is not downloaded again on each startup.

> The seed script creates demo accounts and currently contains a hard-coded development password. Do not share that password or commit a replacement; change it locally before seeding, or use the normal signup flow.

## 3. Run the API and frontend

Open two PowerShell windows at the project root.

**PowerShell window 1 — API:**

```powershell
npx --yes pnpm@10.32.1 dev:api
```

**PowerShell window 2 — web app:**

```powershell
npx --yes pnpm@10.32.1 dev:web
```

Open the app and check the API:

- Web app: <http://localhost:3000>
- API health: <http://localhost:3001/healthz>
- API documentation: <http://localhost:3001/api/docs>
- Ollama: <http://127.0.0.1:11435>

The first AI question generation can take longer while Ollama loads the model. Keep Docker and both development terminals running.

## Useful Docker commands

```powershell
docker compose ps
docker compose logs -f ollama
docker compose logs -f ollama-model-init
docker compose exec ollama ollama list
docker compose down
```

`docker compose down` stops the services but preserves their data. Avoid `docker compose down -v` unless you intentionally want to delete the database, downloaded model, and other persisted data.

For manual installation and project details, see [README.md](./README.md).
