#!/bin/ash

echo "--- Waiting for operator service to be ready ---"
HEALTH_URL="$OPERATOR_SERVER_URL/health-check"
MAX_RETRIES=30
RETRY_INTERVAL=5
i=0

until [ "$i" -ge "$MAX_RETRIES" ]; do
    RESPONSE=$(curl -sf "$HEALTH_URL" 2>/dev/null)
    if echo "$RESPONSE" | grep -q '"success":true'; then
        echo "Operator service is ready!"
        break
    fi
    i=$((i + 1))
    echo "Operator not ready yet (attempt $i/$MAX_RETRIES), retrying in ${RETRY_INTERVAL}s..."
    sleep "$RETRY_INTERVAL"
done

if [ "$i" -ge "$MAX_RETRIES" ]; then
    echo "ERROR: Operator service did not become ready after $((MAX_RETRIES * RETRY_INTERVAL))s. Aborting."
    exit 1
fi

echo "--- Downloading SSLs ---"
SSL_ENDPOINT="$OPERATOR_SERVER_URL/api/v1/ssls/get-all-active"
echo "Connecting to SSL endpoint at: $SSL_ENDPOINT"

HTTP_STATUS=$(curl -s \
    -H "Authorization: Bearer $OPERATOR_API_KEY" \
    -o /app/storage/ssl/ssl.zip \
    -w "%{http_code}" \
    "$SSL_ENDPOINT")

echo "SSL endpoint returned HTTP status: $HTTP_STATUS"

if [ "$HTTP_STATUS" = "404" ]; then
    echo "No SSL certificates are configured in domain_ssl — skipping SSL install."
elif [ "$HTTP_STATUS" != "200" ]; then
    echo "ERROR: SSL endpoint returned HTTP $HTTP_STATUS — expected 200."
    echo "--- Response body (first 500 chars) ---"
    head -c 500 /app/storage/ssl/ssl.zip
    echo ""
    echo "--- End of response body ---"
    exit 1
fi

# Only extract when the operator returned an actual zip (HTTP 200).
if [ "$HTTP_STATUS" = "200" ]; then
    SSL_SIZE=$(wc -c < /app/storage/ssl/ssl.zip | awk '{print $1}')
    echo "Downloaded SSL zip size: $SSL_SIZE bytes"

    if [ "$SSL_SIZE" -lt 22 ]; then
        echo "ERROR: Downloaded file is too small to be a valid zip ($SSL_SIZE bytes)."
        echo "--- File contents ---"
        cat /app/storage/ssl/ssl.zip
        echo ""
        exit 1
    fi

    echo "Extracting SSL certificates..."
    rm -rf /app/ssl/*
    7z e /app/storage/ssl/ssl.zip -o/app/ssl -y > /app/logs/nulp7zip 2>&1

    if [ $? -ne 0 ]; then
        echo "ERROR: 7z extraction failed. See /app/logs/nulp7zip for details."
        cat /app/logs/nulp7zip
        exit 1
    fi

    # 7z does not reliably preserve Unix permissions from Go-generated ZIPs
    # (external attributes are not stored).  Ensure .key files are readable by
    # the nobody user (nginx worker) but not world-readable.
    chmod 0640 /app/ssl/*.key 2>/dev/null || true
    chown -R nobody:nobody /app/ssl 2>/dev/null || true

    echo "SSLs installed!"
fi

# Start supervisord with the specified configuration file
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf