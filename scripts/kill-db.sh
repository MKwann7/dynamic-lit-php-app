#! /bin/bash

project_path="$( cd "$( dirname "${BASH_SOURCE[0]//scripts\/}" )" &> /dev/null && pwd )"
echo "Uninstalling dynlit db at path: ${project_path}"

docker compose -f docker/docker-compose.local.yml down --volumes

docker rm dynlit-db

echo "y" | docker volume prune

echo "Removing database: ${project_path}/docker/database/mysql-data/*"
chmod -R 777 docker/database/mysql-data
rm -rf docker/database/mysql-data/*

echo "dynlit db removed!"