#! /bin/bash

clear
reset

BUILD=local
APP_NAME=maxr

project_path="$( cd "$( dirname "${BASH_SOURCE[0]//scripts\/}" )" &> /dev/null && pwd )"
echo "project_path = ${project_path}"

docker compose --file "${project_path}/docker/docker-compose.local.yml" --project-name ${APP_NAME} up --build