#!/usr/bin/env bash
set -euo pipefail

NETWORK_NAME="devcontainer_proxy"
TRAEFIK_CONTAINER="dev-shared-traefik"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCKER_CONFIG_FILE="${DOCKER_CONFIG:-$HOME/.docker}/config.json"

fix_wsl_docker_credsstore() {
  if [ ! -f "${DOCKER_CONFIG_FILE}" ]; then
    return 0
  fi

  node -e '
const fs = require("fs");
const path = process.argv[1];
let parsed;
try {
  parsed = JSON.parse(fs.readFileSync(path, "utf8"));
} catch {
  process.exit(0);
}
if (parsed && parsed.credsStore === "desktop.exe") {
  delete parsed.credsStore;
  fs.writeFileSync(path, `${JSON.stringify(parsed, null, 2)}\n`);
}
' "${DOCKER_CONFIG_FILE}"
}

# Ensure the shared Docker network exists.
docker network create "${NETWORK_NAME}" >/dev/null 2>&1 || true
fix_wsl_docker_credsstore

if docker container inspect "${TRAEFIK_CONTAINER}" >/dev/null 2>&1; then
  if [ "$(docker inspect -f '{{.State.Running}}' "${TRAEFIK_CONTAINER}")" = "true" ]; then
    exit 0
  fi

  docker start "${TRAEFIK_CONTAINER}" >/dev/null
  exit 0
fi

docker compose -f "${SCRIPT_DIR}/docker-compose.network.yml" up -d reverse-proxy >/dev/null
