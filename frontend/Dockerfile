# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY frontend/package.json ./frontend/
RUN pnpm install --frozen-lockfile --filter=pk-frontend...
COPY frontend ./frontend
RUN pnpm --filter=pk-frontend build

# Stage 2: Runtime
FROM node:20-alpine
WORKDIR /app
ENV NODE_ENV=production
ENV PORT=3000
ENV HOSTNAME=0.0.0.0

COPY --chown=node:node --from=builder /app/frontend/public ./frontend/public
COPY --chown=node:node --from=builder /app/frontend/.next/standalone ./
COPY --chown=node:node --from=builder /app/frontend/.next/static ./frontend/.next/static

EXPOSE 3000
USER node
CMD ["node", "frontend/server.js"]
