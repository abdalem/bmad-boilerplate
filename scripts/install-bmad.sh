#!/usr/bin/env bash
set -euo pipefail

TARGET_DIR="${PWD}"
BMAD_INSTALLER="${BMAD_INSTALLER:-bmad-method@next}"
BMAD_MODULES="${BMAD_MODULES:-bmm}"
BMAD_TOOLS="${BMAD_TOOLS:-claude-code,codex}"
BMAD_CHANNEL="${BMAD_CHANNEL:-stable}"
USER_NAME="${BMAD_USER_NAME:-}"
COMMUNICATION_LANGUAGE="${BMAD_COMMUNICATION_LANGUAGE:-English}"
DOCUMENT_OUTPUT_LANGUAGE="${BMAD_DOCUMENT_OUTPUT_LANGUAGE:-English}"
OUTPUT_FOLDER="${BMAD_OUTPUT_FOLDER:-_bmad-output}"

usage() {
  cat <<'USAGE'
Usage: scripts/install-bmad.sh [options]

Install BMAD into a project directory.

Options:
  --target <dir>                 Project directory. Defaults to current directory.
  --installer <pkg>              npx package. Defaults to bmad-method@next.
  --modules <ids>                Comma-separated BMAD modules. Defaults to bmm.
  --tools <ids>                  Comma-separated tools. Defaults to claude-code,codex.
  --channel <stable|next>        External module channel. Defaults to stable.
  --user-name <name>             Name BMAD agents should use.
  --communication-language <l>   Agent communication language. Defaults to English.
  --document-language <l>        Document output language. Defaults to English.
  --output-folder <path>         BMAD output folder. Defaults to _bmad-output.
  -h, --help                     Show this help.

Environment overrides:
  BMAD_INSTALLER, BMAD_MODULES, BMAD_TOOLS, BMAD_CHANNEL,
  BMAD_USER_NAME, BMAD_COMMUNICATION_LANGUAGE,
  BMAD_DOCUMENT_OUTPUT_LANGUAGE, BMAD_OUTPUT_FOLDER
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target|--directory)
      TARGET_DIR="$2"
      shift 2
      ;;
    --installer)
      BMAD_INSTALLER="$2"
      shift 2
      ;;
    --modules)
      BMAD_MODULES="$2"
      shift 2
      ;;
    --tools)
      BMAD_TOOLS="$2"
      shift 2
      ;;
    --channel)
      BMAD_CHANNEL="$2"
      shift 2
      ;;
    --user-name)
      USER_NAME="$2"
      shift 2
      ;;
    --communication-language)
      COMMUNICATION_LANGUAGE="$2"
      shift 2
      ;;
    --document-language|--document-output-language)
      DOCUMENT_OUTPUT_LANGUAGE="$2"
      shift 2
      ;;
    --output-folder)
      OUTPUT_FOLDER="$2"
      shift 2
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
  esac
done

TARGET_DIR="$(cd "${TARGET_DIR}" && pwd)"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required to install BMAD. Use the devcontainer or install Node >=20.12." >&2
  exit 20
fi

node -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 20 || (major === 20 && minor < 12)) {
  console.error(`BMAD requires Node >=20.12. Current Node is ${process.versions.node}.`);
  console.error("Open the devcontainer or run `nvm use 20`/`nvm use 24`, then retry.");
  process.exit(20);
}
' >/dev/null

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to install BMAD." >&2
  exit 20
fi

args=(
  "--yes"
  "${BMAD_INSTALLER}"
  "install"
  "--directory"
  "${TARGET_DIR}"
  "--modules"
  "${BMAD_MODULES}"
  "--tools"
  "${BMAD_TOOLS}"
  "--yes"
  "--channel"
  "${BMAD_CHANNEL}"
  "--communication-language"
  "${COMMUNICATION_LANGUAGE}"
  "--document-output-language"
  "${DOCUMENT_OUTPUT_LANGUAGE}"
  "--output-folder"
  "${OUTPUT_FOLDER}"
)

if [[ -n "${USER_NAME}" ]]; then
  args+=("--user-name" "${USER_NAME}")
fi

echo "Installing BMAD into ${TARGET_DIR}"
echo "Installer: ${BMAD_INSTALLER}"
echo "Modules: ${BMAD_MODULES}"
echo "Tools: ${BMAD_TOOLS}"

NPM_CONFIG_ENGINE_STRICT=false npx "${args[@]}"

echo "BMAD install complete."
