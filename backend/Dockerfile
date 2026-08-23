# Stage 1: Build
FROM node:20-alpine AS builder
RUN apk add --no-cache openssl
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
RUN pnpm install --frozen-lockfile --filter=pk-backend...
COPY backend ./backend
RUN pnpm --filter=pk-backend exec prisma generate
RUN pnpm --filter=pk-backend build

# Stage 2: Runtime
FROM node:20-alpine
RUN apk add --no-cache openssl
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY backend/package.json ./backend/
COPY --chown=node:node --from=builder /app/backend/dist ./backend/dist
COPY --chown=node:node --from=builder /app/backend/prisma ./backend/prisma
COPY --chown=node:node --from=builder /app/backend/node_modules ./backend/node_modules
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

EXPOSE 5000
USER node
CMD ["node", "backend/dist/main"]
