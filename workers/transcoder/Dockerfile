# Stage 1: Build
FROM node:20-alpine AS builder
WORKDIR /app
RUN npm i -g pnpm
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY workers/transcoder/package.json ./workers/transcoder/
RUN pnpm install --frozen-lockfile --filter=pk-transcoder-worker...
COPY workers/transcoder ./workers/transcoder
RUN pnpm --filter=pk-transcoder-worker build

# Stage 2: Runtime
FROM node:20-alpine
# Install FFmpeg for video processing in production
RUN apk add --no-cache ffmpeg
WORKDIR /app
COPY package.json pnpm-workspace.yaml pnpm-lock.yaml* ./
COPY workers/transcoder/package.json ./workers/transcoder/
COPY --chown=node:node --from=builder /app/workers/transcoder/dist ./workers/transcoder/dist
COPY --chown=node:node --from=builder /app/workers/transcoder/node_modules ./workers/transcoder/node_modules
COPY --chown=node:node --from=builder /app/node_modules ./node_modules

USER node
CMD ["node", "workers/transcoder/dist/worker.js"]
