#!/bin/ash

echo "--- Downloading SSLs ---"
echo "Connecting to ssl endpoint at: $EXCELL_HELPER"

curl -H "Authorization: Bearer 12345" -o /app/storage/ssl/ssl.zip "$EXCELL_HELPER"
rm -rf /app/ssl/*
7z e /app/storage/ssl/ssl.zip -o/app/ssl -y > /app/logs/nulp7zip

echo "SSLs installed!"

# Start supervisord with the specified configuration file
exec /usr/bin/supervisord -c /etc/supervisor/conf.d/supervisord.conf