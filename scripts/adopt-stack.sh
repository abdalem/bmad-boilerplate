#!/usr/bin/env bash
set -euo pipefail

BOILERPLATE_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TARGET_DIR=""
FORCE=0
DRY_RUN=0
SKIP_BMAD=0
BMAD_TOOLS="${BMAD_TOOLS:-claude-code,codex}"
BMAD_MODULES="${BMAD_MODULES:-bmm,tea,cis,wds}"
INTERNAL_SKILLS="bmad-start-project, bmad-update-project, bmad-workflow-setup, bmad-publish-work-item, bmad-close-work-item, bmad-review-verification-gap, update-business-release-notes"
PACK_RESULT='{}'

usage() {
  cat <<'USAGE'
Usage: scripts/adopt-stack.sh <target-repo-path> [options]

Adopt the boilerplate stack into an existing local repository.

Options:
  --force              Overwrite conflicting files after backing up originals.
  --dry-run            Show what would happen without writing files.
  --skip-bmad          Do not attempt BMAD installation now.
  --bmad-tools <ids>   Comma-separated BMAD tools. Defaults to claude-code,codex.
  --bmad-modules <ids> Comma-separated BMAD modules. Defaults to bmm,tea,cis,wds.
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

# Render before comparing files, including in dry runs. Keep the staging tree
# outside the target so an invalid identity cannot partially adopt a project.
RENDER_DIR="$(mktemp -d /tmp/boilerplate-adoption.XXXXXXXX)"
trap 'rm -rf -- "$RENDER_DIR"' EXIT
node - "${TARGET_DIR}" "${BOILERPLATE_ROOT}/templates/base" "${RENDER_DIR}" <<'NODE'
const fs = require('node:fs');
const path = require('node:path');
const [target, source, rendered] = process.argv.slice(2);
const manifestPath = path.join(target, '.boilerplate/project-manifest.json');
const identity = fs.existsSync(manifestPath)
  ? JSON.parse(fs.readFileSync(manifestPath, 'utf8'))
  : {
      projectName: path.basename(target),
      projectSlug: path.basename(target).toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, ''),
    };
if (typeof identity.projectName !== 'string' || !identity.projectName.trim() ||
    typeof identity.projectSlug !== 'string' ||
    !/^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/.test(identity.projectSlug) ||
    identity.projectSlug.length > 63) {
  throw new Error('Invalid project identity; set projectName and a DNS-safe projectSlug in .boilerplate/project-manifest.json.');
}
function renderTree(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const input = path.join(from, entry.name);
    const output = path.join(to, entry.name);
    if (entry.isDirectory()) renderTree(input, output);
    else {
      const name = entry.name.endsWith('.json')
        ? JSON.stringify(identity.projectName).slice(1, -1) : identity.projectName;
      const content = fs.readFileSync(input, 'utf8')
        .replaceAll('__PROJECT_NAME__', () => name)
        .replaceAll('__PROJECT_SLUG__', () => identity.projectSlug);
      fs.writeFileSync(output, content, { mode: fs.statSync(input).mode });
    }
  }
}
renderTree(source, rendered);
// An absent MCP adapter must not point into an unverified retained workspace.
// JSONC/custom configurations stay for manual reconciliation, without guessing.
const existingConfig = path.join(target, '.devcontainer/devcontainer.json');
if (fs.lstatSync(existingConfig, { throwIfNoEntry: false })) {
  let matches = false;
  try {
    matches = JSON.parse(fs.readFileSync(existingConfig, 'utf8')).workspaceFolder === `/workspaces/${identity.projectSlug}`;
  } catch {}
  if (!matches) fs.writeFileSync(path.join(rendered, '.propose-new-mcp'), '');
}
NODE

log() {
  printf '%s\n' "$*"
}

summarize_pack_result() {
  PACK_RESULT_JSON="${PACK_RESULT}" node - <<'NODE'
const result = JSON.parse(process.env.PACK_RESULT_JSON || '{}');
for (const key of ['copied', 'updated', 'unchanged', 'removed', 'proposed', 'retirementProposed', 'backedUp']) {
  console.log(`- Pack ${key}: ${(result[key] || []).length}`);
}
if ((result.proposed || []).length > 0) {
  for (const path of result.proposed) console.log(`- Pack proposed conflict: ${path}`);
}
if ((result.retirementProposed || []).length > 0) {
  for (const path of result.retirementProposed) console.log(`- Pack retirement conflict: ${path}`);
}
NODE
}

write_file() {
  local rel_path="$1"
  local source_path="$2"
  local target_path="${TARGET_DIR}/${rel_path}"
  local proposed_path="${PROPOSED_DIR}/${rel_path}"
  local backup_path="${BACKUP_DIR}/${rel_path}"

  if [[ "${FORCE}" -eq 0 && -f "${RENDER_DIR}/.propose-new-mcp" &&
        ! -e "${target_path}" && ! -L "${target_path}" &&
        ( "${rel_path}" == '.mcp.json' || "${rel_path}" == '.codex/config.toml' ) ]]; then
    PROPOSED+=("${rel_path}")
    if [[ "${DRY_RUN}" -eq 1 ]]; then
      log "would propose ${rel_path} (retained workspace is unverified)"
    else
      mkdir -p "$(dirname "${proposed_path}")"
      cp "${source_path}" "${proposed_path}"
      log "proposed ${rel_path} (reconcile the retained devcontainer workspace first)"
    fi
    return
  fi

  if [[ "${DRY_RUN}" -eq 1 ]]; then
    if [[ -f "${target_path}" ]] && cmp -s "${source_path}" "${target_path}"; then
      UNCHANGED+=("${rel_path}")
      log "unchanged ${rel_path}"
    elif [[ -e "${target_path}" || -L "${target_path}" ]]; then
      PROPOSED+=("${rel_path}")
      log "would propose ${rel_path}"
    else
      COPIED+=("${rel_path}")
      log "would copy ${rel_path}"
    fi
    return
  fi

  mkdir -p "$(dirname "${target_path}")" "${PROPOSED_DIR}" "${ADOPTION_DIR}"

  if [[ -f "${target_path}" ]] && cmp -s "${source_path}" "${target_path}"; then
    UNCHANGED+=("${rel_path}")
    return
  fi

  if [[ ! -e "${target_path}" && ! -L "${target_path}" ]]; then
    cp "${source_path}" "${target_path}"
    make_new_script_executable "${rel_path}" "${target_path}"
    COPIED+=("${rel_path}")
    return
  fi

  if [[ "${FORCE}" -eq 1 ]]; then
    mkdir -p "$(dirname "${backup_path}")"
    cp -p "${target_path}" "${backup_path}"
    cp "${source_path}" "${target_path}"
    make_new_script_executable "${rel_path}" "${target_path}"
    BACKED_UP+=("${rel_path}")
    COPIED+=("${rel_path}")
    return
  fi

  mkdir -p "$(dirname "${proposed_path}")"
  cp "${source_path}" "${proposed_path}"
  make_new_script_executable "${rel_path}" "${proposed_path}"
  PROPOSED+=("${rel_path}")
}

make_new_script_executable() {
  case "$1" in
    *.sh|.husky/*|scripts/bmad-workflow-pack.mjs) chmod +x "$2" ;;
  esac
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
  write_file "${rel_path}" "${RENDER_DIR}/${rel_path}"
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
pkg.scripts['bmad:install'] = 'scripts/install-bmad.sh';
pkg.scripts['bmad:install:stable'] = 'scripts/install-bmad.sh';
pkg.scripts['bmad:install:latest'] = 'BMAD_INSTALLER=bmad-method@latest scripts/install-bmad.sh';
pkg.scripts['bmad:install:preview'] = 'BMAD_INSTALLER=bmad-method@next BMAD_CHANNEL=next scripts/install-bmad.sh';
pkg.scripts['bmad:status'] ??= 'test -d _bmad || test -d _bmad-core || test -d .bmad-core';
pkg.scripts['bmad:validate'] ??= 'node scripts/bmad-workflow-pack.mjs validate --target . --upstream';
pkg.scripts['stack:adoption-report'] ??= 'cat .boilerplate/adoption/report.md';
pkg.packageManager ??= 'pnpm@10.26.0';
pkg.engines ??= {};
pkg.engines.node = '>=22.20';
pkg.engines.pnpm ??= '>=10';

fs.writeFileSync(packagePath, `${JSON.stringify(pkg, null, 2)}\n`);
NODE
  COPIED+=("package.json scripts")
}

write_stack_docs() {
  copy_base_file "AGENTS.md"
  copy_base_file "CLAUDE.md"
  copy_base_file "docs/stack/README.md"
  copy_base_file "docs/stack/existing-repo-adoption.md"
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
    echo "- External skills: find-skills, refactor, vercel-composition-patterns, vercel-react-best-practices, web-design-guidelines"
    echo "- Internal skills: ${INTERNAL_SKILLS}"
    if [[ -f "${TARGET_DIR}/_bmad/custom/project-workflow.toml" ]]; then
      echo "- Project policy: configured"
    else
      echo "- Project policy: missing; bmad-publish-work-item will run minimal inline setup"
    fi
    summarize_pack_result
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

copy_tree "${RENDER_DIR}/.devcontainer" ".devcontainer"
copy_tree "${RENDER_DIR}/.codex" ".codex"
copy_tree "${RENDER_DIR}/.husky" ".husky"
copy_base_file ".mcp.json"
copy_base_file ".dockerignore"
copy_base_file ".editorconfig"
copy_base_file ".gitignore"
copy_base_file ".infisical.json"
copy_base_file ".npmrc"
copy_base_file ".nvmrc"
copy_base_file "biome.json"
copy_base_file "tsconfig.base.json"
write_file "scripts/install-bmad.sh" "${BOILERPLATE_ROOT}/scripts/install-bmad.sh"
write_file "scripts/bmad-workflow-pack.mjs" "${BOILERPLATE_ROOT}/scripts/bmad-workflow-pack.mjs"
write_stack_docs
ensure_package_script

pack_args=(
  apply
  --source "${BOILERPLATE_ROOT}/.boilerplate/bmad-workflow-pack"
  --target "${TARGET_DIR}"
)
if [[ "${DRY_RUN}" -eq 1 ]]; then
  pack_args+=(--dry-run)
elif [[ "${FORCE}" -eq 1 ]]; then
  pack_args+=(--force)
fi
PACK_RESULT="$(node "${BOILERPLATE_ROOT}/scripts/bmad-workflow-pack.mjs" "${pack_args[@]}")"
if [[ "${DRY_RUN}" -eq 1 ]]; then
  log "BMAD modules: ${BMAD_MODULES}"
  log "BMAD tools: ${BMAD_TOOLS}"
  log "External skills: find-skills, refactor, vercel-composition-patterns, vercel-react-best-practices, web-design-guidelines"
  log "Internal skills: ${INTERNAL_SKILLS}"
  log "Generic custom overrides: $(find "${BOILERPLATE_ROOT}/.boilerplate/bmad-workflow-pack/bmad-custom" -type f | wc -l)"
  log "Workflow documentation files: $(find "${BOILERPLATE_ROOT}/.boilerplate/bmad-workflow-pack/docs" -type f | wc -l)"
  if [[ -f "${TARGET_DIR}/_bmad/custom/project-workflow.toml" ]]; then
    log "Project policy: configured"
  else
    log "Project policy: missing; bmad-publish-work-item will run minimal inline setup"
  fi
  if [[ ${#PROPOSED[@]} -eq 0 ]]; then
    log "Technical conflicts: none"
  else
    printf 'Technical proposed conflict: %s\n' "${PROPOSED[@]}"
  fi
  log "BMAD workflow pack operations:"
  summarize_pack_result
fi
write_report

if [[ "${DRY_RUN}" -eq 1 ]]; then
  log "Dry run complete."
  exit 0
fi

if [[ "${SKIP_BMAD}" -eq 0 ]]; then
  if node -e 'const [major, minor] = process.versions.node.split(".").map(Number); process.exit(major > 22 || (major === 22 && minor >= 20) ? 0 : 1)' >/dev/null 2>&1; then
    "${TARGET_DIR}/scripts/install-bmad.sh" \
      --target "${TARGET_DIR}" \
      --modules "${BMAD_MODULES}" \
      --tools "${BMAD_TOOLS}" || {
        log "BMAD install failed. Run pnpm bmad:install inside the target devcontainer."
      }
  else
    log "Skipping immediate BMAD install because host Node is <22.20."
    log "Open the target repo devcontainer, then run: pnpm bmad:install"
  fi
fi

log "Adoption report: ${REPORT}"
