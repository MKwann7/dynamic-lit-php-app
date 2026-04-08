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

# ── SSL certificate generation ────────────────────────────────────────────────
# Usage:
#   make ssl      excell.docker whitelabel=1 [site=2]  →  single-domain cert
#   make ssl-wild excell.docker whitelabel=1 [site=2]  →  wildcard cert
#
# whitelabel  is required.
# site        is optional — omitted value stores NULL in domain_ssl.
#
# Generates key + cert in scripts/local/ssl/tmp/ and appends an INSERT block
# to docker/database/init-scripts/initialize.98.LoadSsl.sql.
# Re-running for the same domain replaces the previous block.
# ─────────────────────────────────────────────────────────────────────────────

.PHONY: ssl

ssl:
	@./scripts/local-ssl.sh $(word 2,$(MAKECMDGOALS)) regular $(whitelabel) $(site)

.PHONY: ssl-wild

ssl-wild:
	@./scripts/local-ssl.sh $(word 2,$(MAKECMDGOALS)) wildcard $(whitelabel) $(site)

# Catch-all: silently absorbs the domain-name argument passed after ssl / ssl-wild
# so make does not error with "No rule to make target 'excell.docker'".
# Placed last so it never shadows an explicit named target.
%:
	@:

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