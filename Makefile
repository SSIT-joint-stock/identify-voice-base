-include .env.production

ROOT_DIR := $(patsubst %/,%,$(dir $(abspath $(lastword $(MAKEFILE_LIST)))))

ENV_FILE ?= $(ROOT_DIR)/.env.production
COMPOSE_FILE ?= $(ROOT_DIR)/docker-compose.prod.yml
BACKEND_IMAGE ?= ghcr.io/your-org/identify-voice-backend
CLIENT_IMAGE ?= ghcr.io/your-org/identify-voice-client
BACKEND_IMAGE_TAG ?= latest
CLIENT_IMAGE_TAG ?= latest
CLIENT_PORT ?= 8080
CLIENT_API_BASE_URL ?= /api/v1

export ENV_FILE
export COMPOSE_FILE
export BACKEND_IMAGE
export CLIENT_IMAGE
export BACKEND_IMAGE_TAG
export CLIENT_IMAGE_TAG
export CLIENT_PORT
export CLIENT_API_BASE_URL

.PHONY: build build-backend build-client push pull up down logs ps migrate restart tools-up tools-down studio-logs

build: build-backend build-client

build-backend:
	docker build -f $(ROOT_DIR)/apps/api/Dockerfile -t $(BACKEND_IMAGE):$(BACKEND_IMAGE_TAG) $(ROOT_DIR)

build-client:
	docker build -f $(ROOT_DIR)/apps/client/Dockerfile \
		--build-arg VITE_API_BASE_URL=$(CLIENT_API_BASE_URL) \
		-t $(CLIENT_IMAGE):$(CLIENT_IMAGE_TAG) $(ROOT_DIR)

push:
	docker push $(BACKEND_IMAGE):$(BACKEND_IMAGE_TAG)
	docker push $(CLIENT_IMAGE):$(CLIENT_IMAGE_TAG)

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

tools-up:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) --profile tools up -d prisma-studio

tools-down:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) --profile tools stop prisma-studio
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) --profile tools rm -f prisma-studio

studio-logs:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) --profile tools logs -f prisma-studio

restart:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) restart

seed:
	docker compose -f $(COMPOSE_FILE) --env-file $(ENV_FILE) run --rm backend pnpm run db:seed:prod
