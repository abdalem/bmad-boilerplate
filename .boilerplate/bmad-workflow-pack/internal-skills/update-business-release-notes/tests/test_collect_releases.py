import json
import sys
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch


SCRIPT_DIR = Path(__file__).resolve().parents[1] / "scripts"
sys.path.insert(0, str(SCRIPT_DIR))

import collect_releases as collector  # noqa: E402


class NormalizeTagTests(unittest.TestCase):
    def test_normalizes_document_and_github_tags(self):
        self.assertEqual(collector.normalize_tag("v26.6.6"), (26, 6, 6, 0))
        self.assertEqual(collector.normalize_tag("v26.6.6.0"), (26, 6, 6, 0))
        self.assertEqual(collector.normalize_tag("v26.6.3.1"), (26, 6, 3, 1))
        self.assertEqual(collector.normalize_tag("23.10.1.2"), (23, 10, 1, 2))

    def test_rejects_unsupported_tag(self):
        with self.assertRaisesRegex(ValueError, "Unsupported release tag"):
            collector.normalize_tag("release-26.6")


class ParseDocumentTests(unittest.TestCase):
    def test_parses_main_release_and_nested_patch(self):
        markdown = """# v26.6.6 - 25/06/26
- Fix.

# v26.6.3 - 16/06/26
- Improvement.
### Patch 1 - 17/06/26
- Fix.
"""

        self.assertEqual(
            collector.parse_documented_versions(markdown),
            {(26, 6, 6, 0), (26, 6, 3, 0), (26, 6, 3, 1)},
        )

    def test_rejects_patch_without_parent(self):
        with self.assertRaisesRegex(ValueError, "Patch heading has no parent release"):
            collector.parse_documented_versions("### Patch 1 - 17/06/26\n")


class ReleaseSelectionTests(unittest.TestCase):
    def setUp(self):
        self.documented = {(26, 6, 5, 0), (26, 6, 6, 0)}
        self.cutoff_date = "2026-06-25T12:00:00Z"
        self.new_date = "2026-07-01T12:00:00Z"
        self.cutoff_release = release(
            "v26.6.6.0", published_at=self.cutoff_date
        )

    def test_selects_only_stable_releases_after_document_cutoff(self):
        releases = [
            release("v26.6.4.0", published_at="2026-06-18T12:00:00Z"),
            self.cutoff_release,
            release("v26.7.3.0", prerelease=True, published_at=self.new_date),
            release("v26.7.2.0", draft=True, published_at=self.new_date),
            release("v26.7.1.1", published_at="2026-07-02T12:00:00Z"),
            release("v26.7.1.0", published_at=self.new_date),
        ]

        selected = collector.select_missing_releases(releases, self.documented)

        self.assertEqual(
            [item["tagName"] for item in selected],
            ["v26.7.1.0", "v26.7.1.1"],
        )

    def test_rejects_normalized_duplicate_stable_tags(self):
        releases = [
            self.cutoff_release,
            release("v26.7.1", published_at=self.new_date),
            release("v26.7.1.0", published_at="2026-07-02T12:00:00Z"),
        ]

        with self.assertRaisesRegex(ValueError, "Duplicate normalized release version"):
            collector.select_missing_releases(releases, self.documented)

    def test_requires_documented_release(self):
        with self.assertRaisesRegex(ValueError, "No documented release"):
            collector.select_missing_releases([release("v26.7.1.0")], set())

    def test_ignores_unsupported_tags_at_or_before_cutoff(self):
        releases = [
            release("legacy-production", published_at="2023-10-01T12:00:00Z"),
            release("same-time-legacy", published_at=self.cutoff_date),
            self.cutoff_release,
            release("v26.7.1.0", published_at=self.new_date),
        ]

        selected = collector.select_missing_releases(releases, self.documented)

        self.assertEqual([item["tagName"] for item in selected], ["v26.7.1.0"])

    def test_rejects_unsupported_tag_published_after_cutoff(self):
        releases = [
            self.cutoff_release,
            release("future-production", published_at=self.new_date),
        ]

        with self.assertRaisesRegex(ValueError, "Unsupported release tag"):
            collector.select_missing_releases(releases, self.documented)

    def test_requires_unique_cutoff_release(self):
        with self.assertRaisesRegex(ValueError, "does not match a stable GitHub release"):
            collector.select_missing_releases(
                [release("v26.7.1.0", published_at=self.new_date)], self.documented
            )

        duplicates = [
            release("v26.6.6", published_at=self.cutoff_date),
            self.cutoff_release,
        ]
        with self.assertRaisesRegex(ValueError, "Multiple stable GitHub releases match"):
            collector.select_missing_releases(duplicates, self.documented)

    def test_rejects_missing_or_malformed_published_at(self):
        missing_date = release("v26.6.6.0", published_at=None)
        with self.assertRaisesRegex(ValueError, "missing or invalid publishedAt"):
            collector.select_missing_releases([missing_date], self.documented)

        releases = [
            self.cutoff_release,
            release("v26.7.1.0", published_at="not-a-date"),
        ]
        with self.assertRaisesRegex(ValueError, "missing or invalid publishedAt"):
            collector.select_missing_releases(releases, self.documented)


class GithubCollectionTests(unittest.TestCase):
    def test_collect_compare_merges_pages_and_warns_at_file_limit(self):
        first_page = {
            "status": "ahead",
            "total_commits": 2,
            "commits": [commit("a1", "First")],
            "files": [changed_file(f"file-{index}") for index in range(300)],
        }
        second_page = {
            "status": "ahead",
            "total_commits": 2,
            "commits": [commit("b2", "Second")],
        }
        runner = FakeRunner([json.dumps([first_page, second_page])])

        evidence = collector.collect_comparison("owner/repo", "v1.0.0", "v1.1.0", runner)

        self.assertEqual([item["sha"] for item in evidence["commits"]], ["a1", "b2"])
        self.assertTrue(evidence["blocking_warnings"])
        self.assertIn("300-file", evidence["blocking_warnings"][0])

    def test_collect_compare_rejects_ambiguous_status(self):
        page = {
            "status": "diverged",
            "total_commits": 1,
            "commits": [commit("a1", "First")],
            "files": [],
        }
        runner = FakeRunner([json.dumps([page])])

        with self.assertRaisesRegex(ValueError, "Ambiguous comparison status"):
            collector.collect_comparison("owner/repo", "v1.0.0", "v1.1.0", runner)

    def test_collect_pull_requests_flattens_pages_and_deduplicates(self):
        first = pull_request(12, "First")
        second = pull_request(13, "Second")
        runner = FakeRunner(
            [json.dumps([[first], [first, second]]), json.dumps([[second]])]
        )

        result = collector.collect_pull_requests(
            "owner/repo", [{"sha": "a1"}, {"sha": "b2"}], runner
        )

        self.assertEqual([item["number"] for item in result], [12, 13])

    def test_propagates_github_command_failure(self):
        def failing_runner(command):
            raise collector.CommandError("GitHub API request failed")

        with self.assertRaisesRegex(collector.CommandError, "GitHub API request failed"):
            collector.collect_comparison(
                "owner/repo", "v1.0.0", "v1.1.0", failing_runner
            )


class CliOutputTests(unittest.TestCase):
    def test_writes_json_output_without_touching_release_document(self):
        payload = {
            "repository": "owner/repo",
            "document": "releases.md",
            "documented_versions": [[26, 6, 6, 0]],
            "missing_releases": [],
            "warnings": [],
        }
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            document = root / "releases.md"
            output = root / "evidence.json"
            policy = root / "project-workflow.toml"
            original = "# v26.6.6 - 25/06/26\n- Fix.\n"
            document.write_text(original, encoding="utf-8")
            policy.write_text(
                '[release_notes]\nenabled = true\npath = "releases.md"\nlanguage = "English"\n',
                encoding="utf-8",
            )

            with patch.object(collector, "collect_payload", return_value=payload):
                exit_code = collector.main(
                    [
                        "--document",
                        str(document),
                        "--policy",
                        str(policy),
                        "--repo",
                        "owner/repo",
                        "--output",
                        str(output),
                    ]
                )

            self.assertEqual(exit_code, 0)
            self.assertEqual(document.read_text(encoding="utf-8"), original)
            self.assertEqual(json.loads(output.read_text(encoding="utf-8")), payload)

    def test_disabled_policy_exits_without_collecting_or_writing(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            policy = root / "project-workflow.toml"
            output = root / "evidence.json"
            policy.write_text(
                '[release_notes]\nenabled = false\npath = ""\nlanguage = "English"\n',
                encoding="utf-8",
            )

            with patch.object(collector, "collect_payload") as collect:
                exit_code = collector.main(
                    ["--policy", str(policy), "--output", str(output)]
                )

            self.assertEqual(exit_code, 0)
            collect.assert_not_called()
            self.assertFalse(output.exists())


class FakeRunner:
    def __init__(self, responses):
        self.responses = iter(responses)
        self.commands = []

    def __call__(self, command):
        self.commands.append(command)
        return next(self.responses)


def release(
    tag,
    *,
    draft=False,
    prerelease=False,
    published_at="2026-07-01T12:00:00Z",
):
    return {
        "tagName": tag,
        "publishedAt": published_at,
        "name": tag,
        "isDraft": draft,
        "isPrerelease": prerelease,
    }


def commit(sha, message):
    return {
        "sha": sha,
        "commit": {
            "message": message,
            "author": {"name": "Author", "email": "author@example.com"},
        },
        "author": {"login": "author"},
        "html_url": f"https://github.test/commit/{sha}",
    }


def changed_file(filename):
    return {
        "filename": filename,
        "status": "modified",
        "additions": 1,
        "deletions": 1,
        "changes": 2,
    }


def pull_request(number, title):
    return {
        "number": number,
        "title": title,
        "body": "Details",
        "labels": [{"name": "feature"}],
        "html_url": f"https://github.test/pull/{number}",
        "merged_at": "2026-07-01T12:00:00Z",
    }


if __name__ == "__main__":
    unittest.main()
