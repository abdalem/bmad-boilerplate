#!/usr/bin/env python3
"""Collect evidence for stable GitHub releases published after the documented cutoff."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
import tomllib
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Callable
from urllib.parse import quote


Version = tuple[int, int, int, int]
Runner = Callable[[list[str]], str]

TAG_PATTERN = re.compile(r"^v?(\d+)\.(\d+)\.(\d+)(?:\.(\d+))?$")
MAIN_HEADING_PATTERN = re.compile(
    r"^#\s+(v\d+\.\d+\.\d+(?:\.\d+)?)\s+-\s+\d{2}/\d{2}/\d{2}\s*$"
)
PATCH_HEADING_PATTERN = re.compile(r"^###\s+Patch\s+(\d+)\s+-\s+\d{2}/\d{2}/\d{2}\s*$")


class CommandError(RuntimeError):
    """Raised when an external command cannot provide usable data."""


def normalize_tag(tag: str) -> Version:
    """Normalize numeric tags with an optional v prefix to four parts."""
    match = TAG_PATTERN.fullmatch(tag.strip())
    if not match:
        raise ValueError(f"Unsupported release tag: {tag}")
    major, minor, patch, revision = match.groups()
    return int(major), int(minor), int(patch), int(revision or 0)


def parse_documented_versions(markdown: str) -> set[Version]:
    """Extract main versions and nested patches from the existing Markdown."""
    versions: set[Version] = set()
    current_parent: tuple[int, int, int] | None = None

    for line_number, line in enumerate(markdown.splitlines(), start=1):
        main_match = MAIN_HEADING_PATTERN.fullmatch(line)
        if main_match:
            version = normalize_tag(main_match.group(1))
            versions.add(version)
            current_parent = version[:3]
            continue

        patch_match = PATCH_HEADING_PATTERN.fullmatch(line)
        if patch_match:
            if current_parent is None:
                raise ValueError(
                    f"Patch heading has no parent release at line {line_number}"
                )
            versions.add((*current_parent, int(patch_match.group(1))))

    return versions


def parse_published_at(release: dict[str, Any]) -> datetime:
    """Parse a stable release publication time as an aware UTC datetime."""
    value = release.get("publishedAt")
    try:
        parsed = datetime.fromisoformat(value.replace("Z", "+00:00"))
    except (AttributeError, TypeError, ValueError) as error:
        tag = release.get("tagName", "<unknown>")
        raise ValueError(
            f"Stable release {tag} has missing or invalid publishedAt"
        ) from error
    if parsed.tzinfo is None:
        tag = release.get("tagName", "<unknown>")
        raise ValueError(
            f"Stable release {tag} has missing or invalid publishedAt"
        )
    return parsed.astimezone(timezone.utc)


def find_cutoff_release(
    releases: list[dict[str, Any]], cutoff: Version
) -> dict[str, Any]:
    """Find the unique stable GitHub release matching the document cutoff."""
    matches: list[dict[str, Any]] = []
    for release in releases:
        if release.get("isDraft") or release.get("isPrerelease"):
            continue
        tag = release.get("tagName")
        if not isinstance(tag, str):
            continue
        try:
            version = normalize_tag(tag)
        except ValueError:
            continue
        if version == cutoff:
            matches.append(release)

    if not matches:
        raise ValueError(
            "The latest documented version does not match a stable GitHub release"
        )
    if len(matches) > 1:
        tags = ", ".join(str(release.get("tagName")) for release in matches)
        raise ValueError(
            f"Multiple stable GitHub releases match the documented cutoff: {tags}"
        )
    return matches[0]


def select_missing_releases(
    releases: list[dict[str, Any]], documented: set[Version]
) -> list[dict[str, Any]]:
    """Select stable releases newer than the latest documented version."""
    if not documented:
        raise ValueError("No documented release found in the release notes")
    cutoff = max(documented)
    cutoff_release = find_cutoff_release(releases, cutoff)
    cutoff_published_at = parse_published_at(cutoff_release)
    candidates: dict[Version, dict[str, Any]] = {}

    for release in releases:
        if release.get("isDraft") or release.get("isPrerelease"):
            continue
        if parse_published_at(release) <= cutoff_published_at:
            continue

        tag = release.get("tagName")
        if not isinstance(tag, str):
            raise ValueError("A new stable GitHub release has no tagName")
        version = normalize_tag(tag)
        if version <= cutoff:
            continue
        if version in candidates:
            previous_tag = candidates[version]["tagName"]
            raise ValueError(
                "Duplicate normalized release version: "
                f"{previous_tag} and {tag}"
            )
        candidates[version] = release

    return [candidates[version] for version in sorted(candidates)]


def run(command: list[str]) -> str:
    """Run a command without a shell and return stdout."""
    try:
        result = subprocess.run(command, check=False, text=True, capture_output=True)
    except FileNotFoundError as error:
        raise CommandError(f"Required command is unavailable: {command[0]}") from error

    if result.returncode != 0:
        detail = result.stderr.strip().splitlines()
        suffix = f": {detail[-1]}" if detail else ""
        raise CommandError(f"Command failed ({command[0]}){suffix}")
    return result.stdout


def _load_json(raw: str, context: str) -> Any:
    try:
        return json.loads(raw)
    except json.JSONDecodeError as error:
        raise CommandError(f"Invalid JSON returned while {context}") from error


def ensure_github_authentication(runner: Runner = run) -> None:
    try:
        runner(["gh", "auth", "status"])
    except CommandError as error:
        raise CommandError(
            "GitHub CLI authentication required; run `gh auth login` or set `GH_TOKEN`"
        ) from error


def resolve_repository(repo: str | None, runner: Runner = run) -> str:
    if repo:
        if not re.fullmatch(r"[^/\s]+/[^/\s]+", repo):
            raise ValueError("Repository must use OWNER/REPO format")
        return repo
    resolved = runner(
        ["gh", "repo", "view", "--json", "nameWithOwner", "--jq", ".nameWithOwner"]
    ).strip()
    if not re.fullmatch(r"[^/\s]+/[^/\s]+", resolved):
        raise CommandError("Could not determine the GitHub repository")
    return resolved


def fetch_releases(repo: str, runner: Runner = run) -> list[dict[str, Any]]:
    raw = runner(
        [
            "gh",
            "release",
            "list",
            "--repo",
            repo,
            "--limit",
            "1000",
            "--json",
            "tagName,publishedAt,name,isDraft,isPrerelease",
        ]
    )
    payload = _load_json(raw, "listing GitHub releases")
    if not isinstance(payload, list):
        raise CommandError("GitHub release list did not return an array")
    return payload


def _as_pages(payload: Any, context: str) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        return [payload]
    if isinstance(payload, list) and all(isinstance(page, dict) for page in payload):
        return payload
    raise CommandError(f"Unexpected paginated JSON while {context}")


def _simplify_commit(item: dict[str, Any]) -> dict[str, Any]:
    commit_data = item.get("commit") or {}
    git_author = commit_data.get("author") or {}
    github_author = item.get("author") or {}
    return {
        "sha": item.get("sha"),
        "message": commit_data.get("message", ""),
        "author": github_author.get("login") or git_author.get("name"),
        "url": item.get("html_url"),
    }


def _simplify_file(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "path": item.get("filename"),
        "status": item.get("status"),
        "additions": item.get("additions", 0),
        "deletions": item.get("deletions", 0),
        "changes": item.get("changes", 0),
    }


def collect_comparison(
    repo: str, previous_tag: str, current_tag: str, runner: Runner = run
) -> dict[str, Any]:
    """Collect all paginated commits plus the available changed-file inventory."""
    base = quote(previous_tag, safe="")
    head = quote(current_tag, safe="")
    endpoint = f"repos/{repo}/compare/{base}...{head}?per_page=100"
    raw = runner(["gh", "api", "--paginate", "--slurp", endpoint])
    pages = _as_pages(_load_json(raw, "comparing release tags"), "comparing tags")
    if not pages:
        raise CommandError("GitHub comparison returned no pages")

    statuses = {page.get("status") for page in pages}
    if statuses != {"ahead"}:
        values = ", ".join(sorted(str(status) for status in statuses))
        raise ValueError(f"Ambiguous comparison status: {values}")

    commits_by_sha: dict[str, dict[str, Any]] = {}
    files_by_path: dict[str, dict[str, Any]] = {}
    for page in pages:
        for item in page.get("commits") or []:
            simplified = _simplify_commit(item)
            sha = simplified.get("sha")
            if isinstance(sha, str):
                commits_by_sha.setdefault(sha, simplified)
        for item in page.get("files") or []:
            simplified = _simplify_file(item)
            path = simplified.get("path")
            if isinstance(path, str):
                files_by_path.setdefault(path, simplified)

    total_commits = pages[0].get("total_commits")
    blocking_warnings: list[str] = []
    if not isinstance(total_commits, int) or total_commits != len(commits_by_sha):
        blocking_warnings.append(
            "Commit pagination is incomplete; verify the full range with git before drafting"
        )
    if len(files_by_path) >= 300:
        blocking_warnings.append(
            "GitHub's 300-file comparison limit may truncate the inventory; "
            "verify the full range with git before drafting"
        )

    return {
        "status": "ahead",
        "total_commits": total_commits,
        "commits": list(commits_by_sha.values()),
        "files": list(files_by_path.values()),
        "blocking_warnings": blocking_warnings,
    }


def _flatten_pull_request_pages(payload: Any) -> list[dict[str, Any]]:
    if isinstance(payload, dict):
        return [payload]
    if not isinstance(payload, list):
        raise CommandError("Unexpected paginated JSON while collecting pull requests")
    flattened: list[dict[str, Any]] = []
    for page in payload:
        if isinstance(page, dict):
            flattened.append(page)
        elif isinstance(page, list) and all(isinstance(item, dict) for item in page):
            flattened.extend(page)
        else:
            raise CommandError("Unexpected pull request page returned by GitHub")
    return flattened


def _simplify_pull_request(item: dict[str, Any]) -> dict[str, Any]:
    return {
        "number": item.get("number"),
        "title": item.get("title", ""),
        "body": item.get("body") or "",
        "labels": [
            label.get("name")
            for label in item.get("labels") or []
            if isinstance(label, dict) and label.get("name")
        ],
        "merged_at": item.get("merged_at"),
        "url": item.get("html_url"),
    }


def collect_pull_requests(
    repo: str, commits: list[dict[str, Any]], runner: Runner = run
) -> list[dict[str, Any]]:
    """Collect and deduplicate pull requests associated with every commit."""
    pull_requests: dict[int, dict[str, Any]] = {}
    for commit in commits:
        sha = commit.get("sha")
        if not isinstance(sha, str):
            raise ValueError("A compared commit has no SHA")
        endpoint = f"repos/{repo}/commits/{quote(sha, safe='')}/pulls?per_page=100"
        raw = runner(
            [
                "gh",
                "api",
                "--paginate",
                "--slurp",
                "-H",
                "Accept: application/vnd.github+json",
                endpoint,
            ]
        )
        payload = _load_json(raw, f"collecting pull requests for commit {sha}")
        for item in _flatten_pull_request_pages(payload):
            simplified = _simplify_pull_request(item)
            number = simplified.get("number")
            if isinstance(number, int):
                pull_requests.setdefault(number, simplified)
    return [pull_requests[number] for number in sorted(pull_requests)]


def collect_payload(
    document: Path, repo: str | None = None, runner: Runner = run
) -> dict[str, Any]:
    """Collect evidence without modifying the release-note document."""
    ensure_github_authentication(runner)
    repository = resolve_repository(repo, runner)
    markdown = document.read_text(encoding="utf-8")
    documented = parse_documented_versions(markdown)
    releases = fetch_releases(repository, runner)
    missing = select_missing_releases(releases, documented)
    cutoff = max(documented)
    cutoff_release = find_cutoff_release(releases, cutoff)
    previous_tag = cutoff_release["tagName"]
    evidence: list[dict[str, Any]] = []
    warnings: list[str] = []
    for release in missing:
        current_tag = release["tagName"]
        comparison = collect_comparison(
            repository, previous_tag, current_tag, runner
        )
        pull_requests = collect_pull_requests(
            repository, comparison["commits"], runner
        )
        release_warnings = comparison.pop("blocking_warnings")
        warnings.extend(f"{current_tag}: {warning}" for warning in release_warnings)
        evidence.append(
            {
                "tag": current_tag,
                "version": list(normalize_tag(current_tag)),
                "published_at": release.get("publishedAt"),
                "previous_tag": previous_tag,
                "comparison": comparison,
                "pull_requests": pull_requests,
                "blocking_warnings": release_warnings,
            }
        )
        previous_tag = current_tag

    return {
        "repository": repository,
        "document": str(document),
        "documented_versions": [list(version) for version in sorted(documented)],
        "missing_releases": evidence,
        "warnings": warnings,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--document", type=Path, help="Override the configured release notes path")
    parser.add_argument(
        "--policy",
        type=Path,
        default=Path("_bmad/custom/project-workflow.toml"),
        help="Project workflow policy",
    )
    parser.add_argument("--repo", help="GitHub repository in OWNER/REPO form")
    parser.add_argument("--output", type=Path, help="Write evidence JSON to this path")
    return parser


def main(argv: list[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if not args.policy.exists():
            print("Release notes are disabled: project workflow policy is missing.")
            return 0
        policy = tomllib.loads(args.policy.read_text(encoding="utf-8"))
        release_policy = policy.get("release_notes", {})
        if release_policy.get("enabled") is not True:
            print("Release notes are disabled by project workflow policy.")
            return 0
        configured_document = release_policy.get("path")
        if not args.document and not configured_document:
            raise ValueError("Enabled release notes require release_notes.path")
        document = args.document or Path(configured_document)
        if args.output and args.output.resolve() == document.resolve():
            raise ValueError("Output path must not overwrite the release document")
        payload = collect_payload(document, args.repo)
        rendered = json.dumps(payload, ensure_ascii=False, indent=2) + "\n"
        if args.output:
            args.output.write_text(rendered, encoding="utf-8")
        else:
            sys.stdout.write(rendered)
    except (CommandError, OSError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
