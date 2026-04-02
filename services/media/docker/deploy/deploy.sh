#!/bin/sh

#echo "--- Downloading SSLs ---"
#echo "Connecting to ssl endpoint at: $EXCELL_HELPER"
#
#curl -H "Authorization: Bearer 12345" -o /app/storage/ssl/ssl.zip "$EXCELL_HELPER"
#rm -rf /app/ssl/*
#unzip /app/storage/ssl/ssl.zip -d /app/ssl > /app/logs/nulp7zip
#
#echo "SSLs installed!"

service nginx start && reflex -c ./reflex.conf