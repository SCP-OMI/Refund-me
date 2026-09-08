.PHONY: dev build up down migrate studio seed logs clean help watch

# Default target
help:
	@echo "Available commands:"
	@echo "  make dev      - Start development environment"
	@echo "  make watch    - Start development environment with Docker Compose Watch"
	@echo "  make build    - Build production images"
	@echo "  make up       - Start production containers"
	@echo "  make down      - Stop all containers"
	@echo "  make migrate  - Create a new Prisma migration (interactive)"
	@echo "  make studio   - Open Prisma Studio"
	@echo "  make seed     - Run database seeding"
	@echo "  make logs     - View application logs"
	@echo "  make clean    - Deep clean Docker resources (volumes, images, etc.)"

# Development
dev:
	docker compose -f docker-compose.dev.yml up -d

watch:
	docker compose -f docker-compose.dev.yml up --build --watch

# Production
build:
	docker compose build

up:
	docker compose up -d

down:
	docker compose -f docker-compose.dev.yml down
	docker compose down

# Prisma
migrate:
	docker compose -f docker-compose.dev.yml exec app npx prisma migrate dev

studio:
	docker compose -f docker-compose.dev.yml exec -d app npx prisma studio

seed:
	docker compose -f docker-compose.dev.yml exec app npx prisma db seed

# Utilities
logs:
	docker compose -f docker-compose.dev.yml logs -f app

clean:
	chmod +x ./scripts/docker-nuke-rebuild.sh
	./scripts/docker-nuke-rebuild.sh
