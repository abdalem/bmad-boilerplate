#!/usr/bin/env bash
set -uo pipefail

TARGET_DIR="$PWD"
BMAD_INSTALLER="$(printenv BMAD_INSTALLER 2>/dev/null || true)"
BMAD_MODULES="$(printenv BMAD_MODULES 2>/dev/null || true)"
BMAD_TOOLS="$(printenv BMAD_TOOLS 2>/dev/null || true)"
BMAD_CHANNEL="$(printenv BMAD_CHANNEL 2>/dev/null || true)"
USER_NAME="$(printenv BMAD_USER_NAME 2>/dev/null || true)"
COMMUNICATION_LANGUAGE="$(printenv BMAD_COMMUNICATION_LANGUAGE 2>/dev/null || true)"
DOCUMENT_OUTPUT_LANGUAGE="$(printenv BMAD_DOCUMENT_OUTPUT_LANGUAGE 2>/dev/null || true)"
OUTPUT_FOLDER="$(printenv BMAD_OUTPUT_FOLDER 2>/dev/null || true)"
[[ -n "$BMAD_INSTALLER" ]] || BMAD_INSTALLER="bmad-method@latest"
[[ -n "$BMAD_MODULES" ]] || BMAD_MODULES="bmm,tea,cis,wds"
[[ -n "$BMAD_TOOLS" ]] || BMAD_TOOLS="claude-code,codex"
[[ -n "$BMAD_CHANNEL" ]] || BMAD_CHANNEL="stable"
[[ -n "$COMMUNICATION_LANGUAGE" ]] || COMMUNICATION_LANGUAGE="English"
[[ -n "$DOCUMENT_OUTPUT_LANGUAGE" ]] || DOCUMENT_OUTPUT_LANGUAGE="English"
[[ -n "$OUTPUT_FOLDER" ]] || OUTPUT_FOLDER="_bmad-output"
SKIP_EXTERNAL_SKILLS=0
FORCE=0

usage() {
  printf '%s\n' \
    'Usage: scripts/install-bmad.sh [options]' \
    '' \
    'Install or update the complete BMAD workflow pack.' \
    '' \
    '  --target <dir>                 Project directory (default: current directory)' \
    '  --installer <pkg>              BMAD package (default: bmad-method@latest)' \
    '  --modules <ids>                BMAD modules (default: bmm,tea,cis,wds)' \
    '  --tools <ids>                  Agent tools (default: claude-code,codex)' \
    '  --channel <stable|next>        External BMAD module channel' \
    '  --user-name <name>             BMAD user name' \
    '  --communication-language <l>   Agent communication language' \
    '  --document-language <l>        BMAD document language' \
    '  --output-folder <path>         BMAD output folder' \
    '  --skip-external-skills         Skip Skills CLI dependencies' \
    '  --force                        Back up and replace modified pack-managed files' \
    '  -h, --help                     Show this help'
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --target|--directory) TARGET_DIR="$2"; shift 2 ;;
    --installer) BMAD_INSTALLER="$2"; shift 2 ;;
    --modules) BMAD_MODULES="$2"; shift 2 ;;
    --tools) BMAD_TOOLS="$2"; shift 2 ;;
    --channel) BMAD_CHANNEL="$2"; shift 2 ;;
    --user-name) USER_NAME="$2"; shift 2 ;;
    --communication-language) COMMUNICATION_LANGUAGE="$2"; shift 2 ;;
    --document-language|--document-output-language) DOCUMENT_OUTPUT_LANGUAGE="$2"; shift 2 ;;
    --output-folder) OUTPUT_FOLDER="$2"; shift 2 ;;
    --skip-external-skills) SKIP_EXTERNAL_SKILLS=1; shift ;;
    --force) FORCE=1; shift ;;
    -h|--help) usage; exit 0 ;;
    *) echo "Unknown option: $1" >&2; usage >&2; exit 2 ;;
  esac
done

TARGET_DIR="$(cd "$TARGET_DIR" && pwd)"
SCRIPT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PACK_TOOL="$SCRIPT_ROOT/scripts/bmad-workflow-pack.mjs"
SOURCE_PACK="$SCRIPT_ROOT/.boilerplate/bmad-workflow-pack"

if ! command -v node >/dev/null 2>&1; then
  echo "Node.js is required. Open the devcontainer or install Node >=22.20." >&2
  exit 20
fi

node -e '
const [major, minor] = process.versions.node.split(".").map(Number);
if (major < 22 || (major === 22 && minor < 20)) {
  console.error("The workflow pack requires Node >=22.20. Current Node is " + process.versions.node + ".");
  console.error("Open the Node 24 devcontainer, then rerun pnpm bmad:install.");
  process.exit(20);
}
' || exit 20

if ! command -v npx >/dev/null 2>&1; then
  echo "npx is required to install upstream BMAD and skills." >&2
  exit 20
fi

status() {
  node "$PACK_TOOL" status --target "$TARGET_DIR" --state "$1" --stage "$2" --message "$3" >/dev/null
}

status incomplete internal-assets "Applying internal workflow assets."
if [[ "$FORCE" -eq 1 ]]; then
  node "$PACK_TOOL" apply --source "$SOURCE_PACK" --target "$TARGET_DIR" --force
else
  node "$PACK_TOOL" apply --source "$SOURCE_PACK" --target "$TARGET_DIR"
fi
if [[ $? -ne 0 ]]; then
  status incomplete internal-assets "Internal workflow assets could not be applied."
  exit 1
fi

echo "Installing BMAD into $TARGET_DIR"
echo "Modules: $BMAD_MODULES"
echo "Tools: $BMAD_TOOLS"
set -- \
  --yes "$BMAD_INSTALLER" install \
  --directory "$TARGET_DIR" \
  --action update \
  --modules "$BMAD_MODULES" \
  --tools "$BMAD_TOOLS" \
  --yes \
  --channel "$BMAD_CHANNEL" \
  --communication-language "$COMMUNICATION_LANGUAGE" \
  --document-output-language "$DOCUMENT_OUTPUT_LANGUAGE" \
  --output-folder "$OUTPUT_FOLDER"
if [[ -n "$USER_NAME" ]]; then set -- "$@" --user-name "$USER_NAME"; fi

if ! NPM_CONFIG_ENGINE_STRICT=false npx "$@" </dev/null; then
  node "$PACK_TOOL" apply --source "$SOURCE_PACK" --target "$TARGET_DIR" --restore-after-upstream >/dev/null || true
  status incomplete bmad "Upstream BMAD installation failed. Internal assets remain available; rerun pnpm bmad:install."
  echo "BMAD installation is incomplete. Fix network or registry access and rerun pnpm bmad:install." >&2
  exit 1
fi

if [[ "$SKIP_EXTERNAL_SKILLS" -eq 0 ]]; then
  status incomplete external-skills "Installing declared upstream skills."
  install_skill() {
    local source="$1"
    local skill="$2"
    echo "Installing agent skill $skill from $source"
    (cd "$TARGET_DIR" && npx --yes skills add "$source" --skill "$skill" -a codex -a claude-code -y </dev/null)
  }
  if ! install_skill vercel-labs/skills find-skills ||
    ! install_skill github/awesome-copilot refactor ||
    ! install_skill vercel-labs/agent-skills vercel-composition-patterns ||
    ! install_skill vercel-labs/agent-skills vercel-react-best-practices ||
    ! install_skill vercel-labs/agent-skills web-design-guidelines; then
    node "$PACK_TOOL" apply --source "$SOURCE_PACK" --target "$TARGET_DIR" --restore-after-upstream >/dev/null || true
    status incomplete external-skills "Upstream skill installation failed; rerun pnpm bmad:install."
    echo "Skill installation is incomplete. Internal assets remain available." >&2
    exit 1
  fi

  node - "$TARGET_DIR/skills-lock.json" <<'NODE'
const fs = require('node:fs');
const lockPath = process.argv[2];
if (fs.existsSync(lockPath)) {
  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
  fs.writeFileSync(lockPath, `${JSON.stringify(lock, null, '\t')}\n`);
}
NODE
fi

status incomplete overlays "Reapplying internal overrides and help catalog."
if ! node "$PACK_TOOL" apply --source "$SOURCE_PACK" --target "$TARGET_DIR" --restore-after-upstream; then
  status incomplete overlays "Managed overlay reapplication failed."
  exit 1
fi
if ! node "$PACK_TOOL" merge-help --source "$SOURCE_PACK" --target "$TARGET_DIR"; then
  status incomplete help-overlay "BMAD help catalog merge failed."
  exit 1
fi

if [[ "$SKIP_EXTERNAL_SKILLS" -eq 1 ]]; then
  node "$PACK_TOOL" validate --target "$TARGET_DIR" || exit 1
else
  node "$PACK_TOOL" validate --target "$TARGET_DIR" --upstream || {
    status incomplete validation "Installation validation failed; rerun pnpm bmad:install."
    exit 1
  }
fi

status ready complete "BMAD workflow pack is ready. Use bmad-start-project for a new clone, bmad-update-project for an existing repository, or bmad-publish-work-item for normal delivery."
echo "BMAD workflow pack is ready."
echo "Start a new clone with bmad-start-project."
echo "Compare an existing repository with bmad-update-project."
echo "Start normal delivery with bmad-publish-work-item."
echo "Run bmad-workflow-setup only for onboarding or explicit workflow reconfiguration."
