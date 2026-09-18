FROM node:20-alpine

# Native build tools needed by some npm packages
RUN apk add --no-cache libc6-compat python3 make g++

WORKDIR /app

# Pin exact pnpm version to match local (lockfile created with 10.32.1)
RUN npm install -g pnpm@10.32.1

# Copy workspace config files explicitly (better cache + guarantees lockfile is present)
COPY pnpm-workspace.yaml pnpm-lock.yaml package.json .npmrc tsconfig.base.json tsconfig.json ./

# Debug: confirm build context has what we need
RUN echo "=== Root ===" && ls -1 && echo "=== pnpm-lock present ===" && test -f pnpm-lock.yaml && echo YES || echo NO

# Copy workspace packages needed by the API server
COPY backend/db/ ./backend/db/
COPY backend/api-zod/ ./backend/api-zod/
COPY backend/api-server/ ./backend/api-server/

# Install all workspace dependencies
RUN pnpm install --no-frozen-lockfile

# Build only the API server
RUN pnpm --filter @workspace/api-server run build

EXPOSE 3001
CMD ["node", "backend/api-server/dist/index.cjs"]
