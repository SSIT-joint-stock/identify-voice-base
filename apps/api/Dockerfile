FROM node:22-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/api/package.json ./apps/api/package.json
COPY apps/client/package.json ./apps/client/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

COPY . .

RUN pnpm --filter api run prisma:generate
RUN pnpm --filter api run build

FROM base AS runtime

ENV NODE_ENV=production

WORKDIR /app/apps/api

RUN apk add --no-cache ffmpeg poppler-utils

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/apps/api/node_modules ./node_modules
COPY --from=builder /app/apps/api/dist ./dist
RUN test -r ./dist/assets/terminal/install.sh \
  && grep -Fq '# Managed-By: identify-app' ./dist/assets/terminal/install.sh
COPY --from=builder /app/apps/api/docs ./docs
COPY --from=builder /app/apps/api/prisma ./prisma
COPY --from=builder /app/apps/api/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/apps/api/src/module/docs ./src/module/docs
COPY --from=builder /app/apps/api/package.json ./package.json
COPY --from=builder /app/package.json /app/package.json
COPY --from=builder /app/pnpm-lock.yaml /app/pnpm-lock.yaml
COPY --from=builder /app/pnpm-workspace.yaml /app/pnpm-workspace.yaml

RUN mkdir -p /app/storage /app/apps/api/logs \
  && chown -R node:node /app/storage /app/apps/api/logs

EXPOSE 3000

USER node

CMD ["node", "dist/src/main.js"]
