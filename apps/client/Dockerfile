FROM node:20-alpine AS base

ENV PNPM_HOME="/pnpm"
ENV PATH="$PNPM_HOME:$PATH"

RUN corepack enable

WORKDIR /app

FROM base AS deps

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml turbo.json ./
COPY apps/client/package.json ./apps/client/package.json
COPY apps/api/package.json ./apps/api/package.json

RUN pnpm install --frozen-lockfile

FROM deps AS builder

ARG VITE_API_BASE_URL=/api/v1
ENV VITE_API_BASE_URL=$VITE_API_BASE_URL

COPY . .

RUN pnpm --filter voice-identify-fe run build

FROM nginx:1.27-alpine AS runtime

COPY apps/client/docker/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY apps/client/docker/entrypoint/40-generate-runtime-config.sh /docker-entrypoint.d/40-generate-runtime-config.sh
COPY apps/client/public/runtime-config.template.js /usr/share/nginx/html/runtime-config.template.js
COPY --from=builder /app/apps/client/dist /usr/share/nginx/html

RUN chmod +x /docker-entrypoint.d/40-generate-runtime-config.sh

EXPOSE 80

