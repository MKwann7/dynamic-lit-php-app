#! /bin/bash

clear
reset

BUILD=local
APP_NAME=dynlit

project_path="$( cd "$( dirname "${BASH_SOURCE[0]//scripts\/}" )" &> /dev/null && pwd )"
echo "project_path = ${project_path}"

# ── Default SSL bootstrap ─────────────────────────────────────────────────────
# The initialize.98.LoadSsl.sql file is intentionally empty in the repo.
# dynlit.docker is the fallback cert baked into the nginx config, so it must
# always be present before the stack starts.  Generate it automatically on
# first run (or any time it has been removed).
SQL_FILE="${project_path}/docker/database/init-scripts/initialize.98.LoadSsl.sql"

if ! grep -q "\[SSL-START: dynlit.docker\]" "${SQL_FILE}" 2>/dev/null; then
    echo ""
    echo "⚠️  No dynlit.docker SSL found in ${SQL_FILE}"

    if ! command -v mkcert &>/dev/null; then
        echo ""
        echo "  ❌  mkcert is required to generate the default SSL certificate."
        echo ""
        case "$(uname)" in
            Darwin)
                echo "     Install it with:  brew install mkcert"
                ;;
            Linux)
                echo "     Install it with:  sudo apt install mkcert libnss3-tools"
                echo "     or:  https://github.com/FiloSottile/mkcert"
                ;;
            *)
                echo "     See: https://github.com/FiloSottile/mkcert"
                ;;
        esac
        echo ""
        echo "     Then re-run:  make run"
        echo ""
        exit 1
    fi

    echo "   Generating default wildcard cert (whitelabel=1000)..."
    echo ""
    make -C "${project_path}" ssl-wild dynlit.docker whitelabel=1000
    echo ""
fi
# ─────────────────────────────────────────────────────────────────────────────

docker compose --file "${project_path}/docker/docker-compose.local.yml" --project-name ${APP_NAME} up --build