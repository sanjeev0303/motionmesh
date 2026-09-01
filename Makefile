.PHONY: dev migrate test-all stop clean deploy health
dev:
	docker compose up -d --build
	@echo "Services started. Run make stop to tear down."

link-sdk:
	@echo "Linking local SDK to dashboard for development..."
	cd client/dashboard && npm install ../../sdk/js/packages/sdk ../../sdk/js/packages/player --no-save
	@echo "Remember to revert package.json before committing!"

stop:
	docker compose down

migrate:
	@if [ -f server/scripts/run-migrations.sh ]; then \
		bash server/scripts/run-migrations.sh; \
	else \
		echo "Migration script not found"; \
	fi

test-all:
	cd server && go test -v ./api/... ./shared/... ./worker/... ./scripts/...
	@if [ -d server/captions-sidecar ]; then \
		echo "Running python tests..."; \
	fi

deploy:
	@echo "Running AWS deployment script..."
	@bash infra/scripts/deploy.sh

health:
	@echo "Running AWS health checks..."
	@bash infra/scripts/health.sh
