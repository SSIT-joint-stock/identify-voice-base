-include .env.production

ENV_FILE ?= .env.production
COMPOSE_FILE ?= docker-compose.prod.yml
BACKEND_IMAGE ?= ghcr.io/your-org/identify-voice-backend
CLIENT_IMAGE ?= ghcr.io/your-org/identify-voice-client
IMAGE_TAG ?= latest
CLIENT_PORT ?= 8080
CLIENT_API_BASE_URL ?= /api/v1

export ENV_FILE
export COMPOSE_FILE
export BACKEND_IMAGE
export CLIENT_IMAGE
export IMAGE_TAG
export CLIENT_PORT
export CLIENT_API_BASE_URL

.PHONY: build build-backend build-client push pull up down logs ps migrate restart

build: build-backend build-client

build-backend:
	docker build -f apps/api/Dockerfile -t $(BACKEND_IMAGE):$(IMAGE_TAG) .

build-client:
	docker build -f apps/client/Dockerfile \
		--build-arg VITE_API_BASE_URL=$(CLIENT_API_BASE_URL) \
		-t $(CLIENT_IMAGE):$(IMAGE_TAG) .

push:
	docker push $(BACKEND_IMAGE):$(IMAGE_TAG)
	docker push $(CLIENT_IMAGE):$(IMAGE_TAG)

pull:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) pull

up:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) up -d

down:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) down

logs:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) logs -f

ps:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) ps

migrate:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) --profile ops run --rm migrate

restart:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) restart

seed:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) run --rm backend pnpm run db:seed:prod


