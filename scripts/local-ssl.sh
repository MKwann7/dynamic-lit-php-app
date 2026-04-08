#!/usr/bin/env bash
# =============================================================================
# local-ssl.sh — Generate a locally-trusted TLS certificate for local development
# =============================================================================
#
# Called by the Makefile:
#   make ssl      <domain> whitelabel=<id> [site=<id>]  →  single-domain cert  (CN = domain)
#   make ssl-wild <domain> whitelabel=<id> [site=<id>]  →  wildcard cert        (CN = *.domain)
#
# Direct usage:
#   ./scripts/local-ssl.sh <domain> [wildcard] <whitelabel_id> [site_id]
#
# Requires: mkcert  (brew install mkcert)
#   mkcert creates a local CA, registers it with the macOS Keychain and
#   Chrome/Firefox trust stores, then signs each domain cert with that CA.
#   This eliminates ERR_CERT_AUTHORITY_INVALID in browsers.
#
# Output files (scripts/local/ssl/tmp/):
#   <domain>.key   Private key
#   <domain>.crt   CA-signed certificate (browser-trusted)
#
# SQL output:
#   docker/database/init-scripts/initialize.98.LoadSsl.sql
#   An INSERT ... ON DUPLICATE KEY UPDATE block is appended (or replaced on
#   re-runs) so the cert is loaded into domain_ssl on next `make kill-db && make run`.
# =============================================================================
set -euo pipefail

# ── Resolve absolute paths regardless of where make was invoked ───────────────
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
SSL_LOCAL_DIR="$SCRIPT_DIR/local/ssl"
TMP_DIR="$SSL_LOCAL_DIR/tmp"
SQL_FILE="$REPO_ROOT/docker/database/init-scripts/initialize.98.LoadSsl.sql"

# ── Arguments ─────────────────────────────────────────────────────────────────
DOMAIN="${1:?Error: domain name is required.  Usage: local-ssl.sh <domain> [wildcard] <whitelabel_id> [site_id]}"
MODE="${2:-regular}"   # "wildcard"  →  *.domain cert;  anything else  →  regular
WHITELABEL_ID="${3:?Error: whitelabel_id is required.  Usage: local-ssl.sh <domain> <mode> <whitelabel_id> [site_id]}"
SITE_ID="${4:-}"       # optional — omit to store NULL in domain_ssl

# SQL-safe representations for numeric FK columns (no quotes; NULL when empty)
WHITELABEL_ID_SQL="${WHITELABEL_ID}"
SITE_ID_SQL="${SITE_ID:-NULL}"

mkdir -p "$TMP_DIR"

echo ""
if [ "$MODE" = "wildcard" ]; then
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "  🔐  Wildcard SSL  →  *.$DOMAIN"
    echo "      whitelabel_id: $WHITELABEL_ID  |  site_id: ${SITE_ID:-NULL}"
    echo "╚══════════════════════════════════════════════════════════╝"
else
    echo "╔══════════════════════════════════════════════════════════╗"
    echo "  🔐  Standard SSL  →  $DOMAIN"
    echo "      whitelabel_id: $WHITELABEL_ID  |  site_id: ${SITE_ID:-NULL}"
    echo "╚══════════════════════════════════════════════════════════╝"
fi
echo ""

# ── 1. Verify mkcert is installed ─────────────────────────────────────────────
if ! command -v mkcert &>/dev/null; then
    echo "  ❌  mkcert is required but not installed."
    echo ""
    case "$(uname)" in
        Darwin)
            echo "     Install it with:"
            echo "       brew install mkcert"
            ;;
        Linux)
            echo "     Install it with:"
            echo "       # Debian / Ubuntu:"
            echo "       sudo apt install mkcert libnss3-tools"
            echo ""
            echo "       # or download the binary directly:"
            echo "       curl -Lo /usr/local/bin/mkcert https://dl.filippo.io/mkcert/latest?for=linux/amd64"
            echo "       chmod +x /usr/local/bin/mkcert"
            echo "       sudo apt install libnss3-tools   # for Chrome/Chromium trust"
            ;;
        *)
            echo "     See https://github.com/FiloSottile/mkcert for install instructions."
            ;;
    esac
    echo ""
    echo "     Then re-run this command."
    exit 1
fi
echo "  ✔  mkcert found: $(command -v mkcert)"

# ── 2. Ensure mkcert's local CA is installed & trusted ────────────────────────
#
# Safe to call repeatedly — mkcert is a no-op when the CA is already registered.
# macOS: adds to the Keychain (prompts for sudo password).
# Linux: adds to the system trust store + NSS databases for Chrome/Firefox.
#        Requires libnss3-tools (certutil) for Chrome/Chromium support.
if [[ "$(uname)" == "Linux" ]] && ! command -v certutil &>/dev/null; then
    echo "  ⚠️  NSS tools not found — Chrome/Chromium may not trust this cert on Linux."
    echo "     Install them with:  sudo apt install libnss3-tools"
    echo ""
fi
echo "  ✔  Ensuring local CA is trusted (mkcert -install)..."
mkcert -install 2>&1 | sed 's/^/    /'

# ── 3. Generate CA-signed certificate ─────────────────────────────────────────
KEY_FILE="$TMP_DIR/${DOMAIN}.key"
CRT_FILE="$TMP_DIR/${DOMAIN}.crt"

if [ "$MODE" = "wildcard" ]; then
    mkcert \
        -key-file  "$KEY_FILE" \
        -cert-file "$CRT_FILE" \
        "*.${DOMAIN}" "${DOMAIN}" \
        2>&1 | sed 's/^/    /'
else
    mkcert \
        -key-file  "$KEY_FILE" \
        -cert-file "$CRT_FILE" \
        "${DOMAIN}" \
        2>&1 | sed 's/^/    /'
fi
echo "  ✔  Cert → $CRT_FILE  (CA-signed, browser-trusted)"
echo "  ✔  Key  → $KEY_FILE"

# ── 4. Print a summary of the generated certificate ───────────────────────────
echo ""
echo "  ── Details ───────────────────────────────────────────────"
openssl x509 -in "$CRT_FILE" -noout -subject -dates 2>/dev/null | \
    sed 's/^/    /'
echo "  ── SANs ──────────────────────────────────────────────────"
openssl x509 -in "$CRT_FILE" -noout -ext subjectAltName 2>/dev/null | \
    grep -v "X509v3" | sed 's/^/    /'
echo "  ──────────────────────────────────────────────────────────"
echo ""

# ── 5. Encode PEM files for MySQL string literals ─────────────────────────────
#
# Each actual newline → the two-character sequence \n (backslash + n).
# MySQL then stores and returns the newlines correctly.
# Single quotes are doubled ('') for safe SQL string embedding.
escape_pem() {
    awk '{ printf "%s\\n", $0 }' "$1" | sed "s/'/''/g"
}

CERT_SQL="$(escape_pem "$CRT_FILE")"
KEY_SQL="$(escape_pem "$KEY_FILE")"

# ── 6. Bootstrap the SQL file if it is missing or empty ───────────────────────
if [ ! -f "$SQL_FILE" ] || [ ! -s "$SQL_FILE" ]; then
    cat > "$SQL_FILE" <<'SQLHEADER'
-- Local SSL certificates for development.
-- Generated by: make ssl <domain>  or  make ssl-wild <domain>
--
-- This file is intentionally empty in the repository.
-- Run a make ssl target to generate and append certificate records.
-- Re-running for the same domain replaces the existing block.

USE `dynlit_identity`;
SQLHEADER
    echo "  ✔  Created SQL skeleton: $SQL_FILE"
fi

# ── 7. Remove any existing block for this domain (idempotent re-runs) ─────────
START_MARKER="-- [SSL-START: ${DOMAIN}]"
if grep -qFe "$START_MARKER" "$SQL_FILE" 2>/dev/null; then
    python3 - "$SQL_FILE" "$DOMAIN" <<'PYEOF'
import sys, re
path, domain = sys.argv[1], sys.argv[2]
content = open(path).read()
pattern = (
    r'\n-- \[SSL-START: ' + re.escape(domain) + r'\]'
    r'.*?'
    r'-- \[SSL-END: '    + re.escape(domain) + r'\]\n'
)
content = re.sub(pattern, '\n', content, flags=re.DOTALL)
open(path, 'w').write(content)
PYEOF
    echo "  ♻️   Replaced existing entry for '$DOMAIN'"
fi

# ── 8. Append the INSERT block ────────────────────────────────────────────────
GENERATED_AT="$(date '+%Y-%m-%d %H:%M:%S')"

cat >> "$SQL_FILE" << SQLEOF

-- [SSL-START: ${DOMAIN}]
-- mode: ${MODE}  whitelabel_id: ${WHITELABEL_ID}  site_id: ${SITE_ID:-NULL}  generated: ${GENERATED_AT}
INSERT INTO \`domain_ssl\`
    (\`domain\`, \`whitelabel_id\`, \`site_id\`, \`is_lets_encrypt\`, \`challenge_type\`, \`status\`,
     \`cert_pem\`, \`fullchain_pem\`, \`key_pem\`)
VALUES
    ('${DOMAIN}', ${WHITELABEL_ID_SQL}, ${SITE_ID_SQL}, 0, 'http-01', 'active',
     '${CERT_SQL}',
     '${CERT_SQL}',
     '${KEY_SQL}')
ON DUPLICATE KEY UPDATE
    whitelabel_id = VALUES(whitelabel_id),
    site_id       = VALUES(site_id),
    cert_pem      = VALUES(cert_pem),
    fullchain_pem = VALUES(fullchain_pem),
    key_pem       = VALUES(key_pem),
    status        = 'active',
    updated_on    = NOW();
-- [SSL-END: ${DOMAIN}]
SQLEOF

echo "  ✔  SQL  → $SQL_FILE"

# ── 9. Live-sync to the running dynlit-db container ───────────────────────────
#
# Read DB credentials from the local env file so we never hardcode them here.
DB_CONTAINER="dynlit-db"
ENV_FILE="$REPO_ROOT/docker/env/app-local.env"

if [ -f "$ENV_FILE" ]; then
    DB_USER="$(grep  '^DB_USERNAME='          "$ENV_FILE" | cut -d= -f2)"
    DB_PASS="$(grep  '^DB_PASSWORD='          "$ENV_FILE" | cut -d= -f2)"
    DB_NAME="$(grep  '^DB_IDENTITY_DATABASE=' "$ENV_FILE" | cut -d= -f2)"
else
    DB_USER="root"
    DB_PASS=""
    DB_NAME="dynlit_identity"
fi

echo ""
if docker ps --filter "name=^${DB_CONTAINER}$" --filter "status=running" \
       --format "{{.Names}}" 2>/dev/null | grep -q "^${DB_CONTAINER}$"; then

    echo "  🔄 dynlit-db is running — applying directly to the live database..."

    LIVE_SQL="$(mktemp /tmp/ssl-live-XXXXXX.sql)"

    cat > "$LIVE_SQL" << LIVESQL
USE \`${DB_NAME}\`;

INSERT INTO \`domain_ssl\`
    (\`domain\`, \`whitelabel_id\`, \`site_id\`, \`is_lets_encrypt\`, \`challenge_type\`, \`status\`,
     \`cert_pem\`, \`fullchain_pem\`, \`key_pem\`)
VALUES
    ('${DOMAIN}', ${WHITELABEL_ID_SQL}, ${SITE_ID_SQL}, 0, 'http-01', 'active',
     '${CERT_SQL}',
     '${CERT_SQL}',
     '${KEY_SQL}')
ON DUPLICATE KEY UPDATE
    whitelabel_id = VALUES(whitelabel_id),
    site_id       = VALUES(site_id),
    cert_pem      = VALUES(cert_pem),
    fullchain_pem = VALUES(fullchain_pem),
    key_pem       = VALUES(key_pem),
    status        = 'active',
    updated_on    = NOW();
LIVESQL

    if docker exec -i "$DB_CONTAINER" \
           mysql -u"${DB_USER}" -p"${DB_PASS}" --silent \
           < "$LIVE_SQL" 2>/dev/null; then
        echo "  ✔  Live DB updated — '$DOMAIN' is active immediately"
    else
        echo "  ⚠️  DB write failed — cert is in the SQL file but not yet live."
        echo "     Apply manually:  make kill-db && make run"
    fi

    rm -f "$LIVE_SQL"

else
    echo "  ℹ️  dynlit-db is not running."
    echo "     Cert is saved to the SQL file and will be applied on:"
    echo "       make kill-db && make run"
fi
echo ""
echo "╔══════════════════════════════════════════════════════════╗"
echo "  ✅  Done!  '$DOMAIN' certificate ready."
echo ""
echo "  Files:"
echo "    scripts/local/ssl/tmp/${DOMAIN}.crt"
echo "    scripts/local/ssl/tmp/${DOMAIN}.key"
echo ""
echo "  SQL file updated:"
echo "    docker/database/init-scripts/initialize.98.LoadSsl.sql"
echo ""
echo "  If dynlit-db was not running, apply the cert with:"
echo "    make kill-db && make run"
echo "╚══════════════════════════════════════════════════════════╝"
echo ""

