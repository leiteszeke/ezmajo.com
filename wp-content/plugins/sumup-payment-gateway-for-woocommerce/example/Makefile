ENV_FILE ?= .env
ENV_TEMPLATE ?= .env.example

-include $(ENV_FILE)

.PHONY: setup up bootstrap down reset logs

up:
	docker compose up -d db wordpress phpmyadmin

setup:
	@if [ ! -f "$(ENV_FILE)" ]; then cp "$(ENV_TEMPLATE)" "$(ENV_FILE)"; fi
	docker compose up -d db wordpress phpmyadmin
	docker compose run --rm wpcli

bootstrap:
	docker compose run --rm wpcli

down:
	docker compose down

reset:
	docker compose down -v

logs:
	docker compose logs -f wordpress
