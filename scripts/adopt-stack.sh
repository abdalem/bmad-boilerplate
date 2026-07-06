#!/usr/bin/env bash
set -euo pipefail

BOILERPLATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR=""
FORCE=0
DRY_RUN=0
SKIP_BMAD=0
BMAD_TOOLS="${BMAD_TOOLS:-claude-code,codex}"
BMAD_MODULES="${BMAD_MODULES:-bmm}"

usage() {
  cat <<'USAGE'
Usage: scripts/adopt-stack.sh <target-repo-path> [options]

Adopt the boilerplate stack into an existing local repository.

Options:
  --force              Overwrite conflicting files after backing up originals.
  --dry-run            Show what would happen without writing files.
  --skip-bmad          Do not attempt BMAD installation now.
  --bmad-tools <ids>   Comma-separated BMAD tools. Defaults to claude-code,codex.
  --bmad-modules <ids> Comma-separated BMAD modules. Defaults to bmm.
  -h, --help           Show this help.

Conflict behavior:
  Existing different files are not overwritten by default. The generated version
  is written to .boilerplate/adoption/proposed/<path>. Use --force to overwrite.
USAGE
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --force)
      FORCE=1
      shift
      ;;
    --dry-run)
      DRY_RUN=1
      shift
      ;;
    --skip-bmad)
      SKIP_BMAD=1
      shift
      ;;
    --bmad-tools)
      BMAD_TOOLS="$2"
      shift 2
      ;;
    --bmad-modules)
      BMAD_MODULES="$2"
      shift 2
      ;;
    --)
      shift
      ;;
    -h|--help)
      usage
      exit 0
      ;;
    -*)
      echo "Unknown option: $1" >&2
      usage >&2
      exit 2
      ;;
    *)
      if [[ -n "${TARGET_DIR}" ]]; then
        echo "Only one target repo path is supported." >&2
        exit 2
      fi
      TARGET_DIR="$1"
      shift
      ;;
  esac
done

if [[ -z "${TARGET_DIR}" ]]; then
  usage >&2
  exit 2
fi

if [[ ! -d "${TARGET_DIR}" ]]; then
  echo "Target repo does not exist: ${TARGET_DIR}" >&2
  exit 1
fi

TARGET_DIR="$(cd "${TARGET_DIR}" && pwd)"
ADOPTION_DIR="${TARGET_DIR}/.boilerplate/adoption"
PROPOSED_DIR="${ADOPTION_DIR}/proposed"
BACKUP_DIR="${ADOPTION_DIR}/backups/$(date +%Y%m%d%H%M%S)"
REPORT="${ADOPTION_DIR}/report.md"
COPIED=()
PROPOSED=()
BACKED_UP=()
UNCHANGED=()

log() {
  printf '%s\n' "$*"
}

write_file() {
  local rel_path="$1"
  local source_path="$2"
  local target_path="${TARGET_DIR}/${rel_path}"
  local proposed_path="${PROPOSED_DIR}/${rel_path}"
  local backup_path="${BACKUP_DIR}/${rel_path}"

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    if [[ -f "${target_path}" ]]; then
      log "would inspect ${rel_path}"
    else
      log "would copy ${rel_path}"
    fi
    return
  fi

  mkdir -p "$(dirname "${target_path}")" "${PROPOSED_DIR}" "${ADOPTION_DIR}"

  if [[ -f "${target_path}" ]] && cmp -s "${source_path}" "${target_path}"; then
    UNCHANGED+=("${rel_path}")
    return
  fi

  if [[ ! -e "${target_path}" ]]; then
    cp "${source_path}" "${target_path}"
    COPIED+=("${rel_path}")
    return
  fi

  if [[ "${FORCE}" -eq 1 ]]; then
    mkdir -p "$(dirname "${backup_path}")"
    cp "${target_path}" "${backup_path}"
    cp "${source_path}" "${target_path}"
    BACKED_UP+=("${rel_path}")
    COPIED+=("${rel_path}")
    return
  fi

  mkdir -p "$(dirname "${proposed_path}")"
  cp "${source_path}" "${proposed_path}"
  PROPOSED+=("${rel_path}")
}

copy_tree() {
  local source_root="$1"
  local rel_root="$2"

  while IFS= read -r -d '' source_file; do
    local rel_path="${source_file#${source_root}/}"
    write_file "${rel_root}/${rel_path}" "${source_file}"
  done < <(find "${source_root}" -type f -print0)
}

copy_base_file() {
  local rel_path="$1"
  write_file "${rel_path}" "${BOILERPLATE_ROOT}/templates/base/${rel_path}"
}

ensure_package_script() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    log "would ensure package.json bmad scripts"
    return
  fi

  node - "${TARGET_DIR}" <<'NODE'
const fs = require('fs');
const path = require('path');

const target = process.argv[2];
const packagePath = path.join(target, 'package.json');
const fallbackName = path.basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, '-') || 'project';
const pkg = fs.existsSync(packagePath)
  ? JSON.parse(fs.readFileSync(packagePath, 'utf8'))
  : { name: fallbackName, private: true };

pkg.scripts ??= {};
pkg.scripts['bmad:install'] ??= 'scripts/install-bmad.sh';
pkg.scripts['bmad:status'] ??= 'test -d _bmad || test -d _bmad-core || test -d .bmad-core';
pkg.scripts['stack:adoption-report'] ??= 'cat .boilerplate/adoption/report.md';
pkg.packageManager ??= 'pnpm@10.26.0';
pkg.engines ??= {};
pkg.engines.node ??= '>=20';
pkg.engines.pnpm ??= '>=10';

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
NODE
  COPIED+=("package.json scripts")
}

write_stack_docs() {
  local tmp_dir
  tmp_dir="$(mktemp -d)"

  cat > "${tmp_dir}/AGENTS.md" <<'EOF'
# Agent Guidance

Use BMAD as the primary planning and delivery workflow.

Start with `bmad-help` to decide the next action. For existing repos, generate
project context before planning implementation work. Treat this repo's stack
docs as implementation guidance for Next.js, AdonisJS, Expo, Astro, deployment,
and devcontainer conventions.
EOF

  cat > "${tmp_dir}/CLAUDE.md" <<'EOF'
# Claude Code Guidance

Use BMAD as the primary project workflow. Start with `bmad-help`.

For existing repos, inspect generated BMAD project context before proposing
changes. Use `docs/stack/` for this repo's technical conventions.
EOF

  mkdir -p "${tmp_dir}/docs/stack"
  cat > "${tmp_dir}/docs/stack/README.md" <<'EOF'
# Stack Pack

This repo uses BMAD for product discovery, PRDs, architecture, stories, and
delivery guidance. The local stack pack owns the technical defaults:

- Devcontainer with Node, pnpm, Docker CLI, GitHub CLI, Infisical, and Terraform.
- Archetypes for Next.js web apps, AdonisJS APIs, Expo mobile apps, and Astro
  + React websites.
- Package-scoped deployment guidance for Cloudflare Pages, Vercel, Cloud Run,
  Railway, GitHub Pages, and AWS App Runner.

Run `bmad-help` to choose the next BMAD workflow.
EOF

  cat > "${tmp_dir}/docs/stack/existing-repo-adoption.md" <<'EOF'
# Existing Repo Adoption

This repo was adapted from the boilerplate stack pack.

Recommended order:

1. Review `.boilerplate/adoption/report.md`.
2. Review any generated files under `.boilerplate/adoption/proposed/`.
3. Open the repo in its own devcontainer.
4. Run `pnpm bmad:install` if BMAD was not installed during adoption.
5. Run `bmad-help`.
6. Generate BMAD project context before implementation work.

The devcontainer belongs to this repo. Do not work on this repo from a separate
boilerplate devcontainer.
EOF

  write_file "AGENTS.md" "${tmp_dir}/AGENTS.md"
  write_file "CLAUDE.md" "${tmp_dir}/CLAUDE.md"
  write_file "docs/stack/README.md" "${tmp_dir}/docs/stack/README.md"
  write_file "docs/stack/existing-repo-adoption.md" "${tmp_dir}/docs/stack/existing-repo-adoption.md"

  rm -rf "${tmp_dir}"
}

write_report() {
  if [[ "${DRY_RUN}" -eq 1 ]]; then
    return
  fi

  mkdir -p "${ADOPTION_DIR}"
  {
    echo "# Stack Adoption Report"
    echo
    echo "- Generated at: $(date -Is)"
    echo "- Target repo: ${TARGET_DIR}"
    echo "- Boilerplate source: ${BOILERPLATE_ROOT}"
    echo "- BMAD modules: ${BMAD_MODULES}"
    echo "- BMAD tools: ${BMAD_TOOLS}"
    echo
    echo "## Copied Or Updated"
    if [[ ${#COPIED[@]} -eq 0 ]]; then echo "- none"; else printf -- "- %s\n" "${COPIED[@]}"; fi
    echo
    echo "## Proposed Due To Conflicts"
    if [[ ${#PROPOSED[@]} -eq 0 ]]; then echo "- none"; else printf -- "- %s\n" "${PROPOSED[@]}"; fi
    echo
    echo "## Backed Up And Overwritten"
    if [[ ${#BACKED_UP[@]} -eq 0 ]]; then echo "- none"; else printf -- "- %s\n" "${BACKED_UP[@]}"; fi
    echo
    echo "## Unchanged"
    if [[ ${#UNCHANGED[@]} -eq 0 ]]; then echo "- none"; else printf -- "- %s\n" "${UNCHANGED[@]}"; fi
  } > "${REPORT}"
}

log "Adopting boilerplate stack into ${TARGET_DIR}"

copy_tree "${BOILERPLATE_ROOT}/templates/base/.devcontainer" ".devcontainer"
copy_tree "${BOILERPLATE_ROOT}/templates/base/.husky" ".husky"
copy_base_file ".dockerignore"
copy_base_file ".editorconfig"
copy_base_file ".gitignore"
copy_base_file ".infisical.json"
copy_base_file ".npmrc"
copy_base_file ".nvmrc"
copy_base_file "biome.json"
copy_base_file "tsconfig.base.json"
write_file "scripts/install-bmad.sh" "${BOILERPLATE_ROOT}/scripts/install-bmad.sh"
write_stack_docs
ensure_package_script
write_report

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log "Dry run complete."
  exit 0
fi

chmod +x "${TARGET_DIR}/scripts/install-bmad.sh" || true
chmod +x "${TARGET_DIR}/.devcontainer/"*.sh || true
chmod +x "${TARGET_DIR}/.husky/pre-commit" || true

if [[ "${SKIP_BMAD}" -eq 0 ]]; then
  if node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 20 || (major === 20 && minor >= 12) ? 0 : 1)' >/dev/null 2>&1; then
    "${TARGET_DIR}/scripts/install-bmad.sh" \
      --target "${TARGET_DIR}" \
      --modules "${BMAD_MODULES}" \
      --tools "${BMAD_TOOLS}" || {
        log "BMAD install failed. Run pnpm bmad:install inside the target devcontainer."
      }
  else
    log "Skipping immediate BMAD install because host Node is <20.12."
    log "Open the target repo devcontainer, then run: pnpm bmad:install"
  fi
fi

log "Adoption report: ${REPORT}"
