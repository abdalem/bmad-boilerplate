#!/usr/bin/env bash
set -euo pipefail

TRAEFIK_CONTAINER="dev-shared-traefik"

if ! docker container inspect "${TRAEFIK_CONTAINER}" >/dev/null 2>&1; then
  echo "Shared Traefik is not running."
  exit 0
fi

docker stop "${TRAEFIK_CONTAINER}" >/dev/null || true
docker rm "${TRAEFIK_CONTAINER}" >/dev/null || true

echo "Stopped and removed ${TRAEFIK_CONTAINER}."
