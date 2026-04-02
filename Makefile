#-------------------------------------------------------------------------------
# Basic commands for managing Micah's dev stuff
#-------------------------------------------------------------------------------

.PHONY: run

run:
	@./scripts/run.sh

.PHONY: stop

stop:
	@./scripts/stop.sh

.PHONY: kill-db

kill-db:
	@./scripts/kill-db.sh

.PHONY: command

command:
	@./scripts/run-comand.sh $(wordlist 2, $(words $(MAKECMDGOALS)), $(MAKECMDGOALS))

.PHONY: refresh-composer

refresh-composer:
	@./scripts/composer-refresh.sh

.PHONY: unit

unit:
	@./scripts/unit-tests.sh

.PHONY: unit-class

unit-class:
	@./scripts/unit-test-class.sh $(wordlist 2, $(words $(MAKECMDGOALS)), $(MAKECMDGOALS))

.PHONY: ssh

ssh:
	@./scripts/ssh.sh

.PHONY: ui-build

ui-build:
	@./scripts/build-ui.sh

.PHONY: ui-watch

ui-watch:
	@./scripts/build-ui-watch.sh

.PHONY: ui-deploy

ui-deploy:
	npm --prefix frontend run deploy:components

.PHONY: ui-full-deploy

ui-full-deploy:
	@if ! docker ps --filter "name=dynlit-db" --filter "status=running" --format "{{.Names}}" 2>/dev/null | grep -q "dynlit-db"; then \
		echo ""; \
		echo "⚠️  The 'dynlit-db' Docker container is not running."; \
		echo "   Start the stack first with:  make run"; \
		echo "   The sync step will retry for up to 30s, then fail if the DB is still unreachable."; \
		echo ""; \
	fi
	npm --prefix frontend run full-deploy:components

.PHONY: ui-component

UUID := $(shell uuidgen | tr '[:upper:]' '[:lower:]')

ui-component:
	@if [ -z "$(location)" ]; then echo "Missing location"; exit 1; fi
	@if [ -z "$(name)" ]; then echo "Missing name"; exit 1; fi
	@if [ -z "$(tag)" ]; then echo "Missing tag"; exit 1; fi
	@if [ -z "$(uri)" ]; then echo "Missing uri"; exit 1; fi

	npm --prefix frontend run create:component -- \
		--location="$(location)" \
		--name="$(name)" \
		--uuid="$(or $(uuid),$(UUID))" \
		--tag="$(tag)" \
		--uri="$(uri)"