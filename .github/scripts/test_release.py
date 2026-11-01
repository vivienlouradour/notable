"""Offline regression tests for versioning and irreversible publication decisions."""

import hashlib
from io import BytesIO
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
from urllib.error import HTTPError

from docker_release import Registry, check_plan, make_plan, verify_digests, verify_versions
from versions import check_versions, parse_version, release_version


COMMIT = "a" * 40
DIGEST = "sha256:" + "b" * 64
OTHER = "sha256:" + "c" * 64


class FakeRegistry:
    def __init__(self, component, tags=None):
        self.image = f"ghcr.io/example/notable-{component}"
        self.manifests = {f"sha-{COMMIT}": DIGEST, **(tags or {})}

    def digest(self, reference):
        return self.manifests.get(reference)

    def tags(self):
        return set(self.manifests)


class VersionTests(unittest.TestCase):
    def test_strict_release_tags(self):
        for tag in ("v0.0.0", "v1.20.300", "v1.2.3-rc.0", "v1.2.3-rc.10"):
            with self.subTest(tag=tag):
                self.assertEqual(release_version(tag), tag[1:])
        for tag in ("1.2.3", "v01.2.3", "v1.2", "v1.2.3-rc.01", "v1.2.3-beta.1",
                    "v1.2.3+build", "v1.2.3\n", "v1.2.3-rc.-1"):
            with self.subTest(tag=tag), self.assertRaises(ValueError):
                release_version(tag)

    def test_application_semver(self):
        self.assertEqual(parse_version("1.2.3-rc.1+build.123"), (1, 2, 3))
        for value in (None, 123, "1.2", "01.2.3", "1.2.3-01", "1.2.3-", "1.2.3\n"):
            with self.subTest(value=value), self.assertRaises(ValueError):
                parse_version(value)

    def test_version_files_patch_allowed_but_release_exact(self):
        with tempfile.TemporaryDirectory() as directory:
            root = Path(directory)
            (root / "sources/backend").mkdir(parents=True)
            (root / "sources/webapp").mkdir()
            props = root / "sources/backend/Directory.Build.props"
            package = root / "sources/webapp/package.json"
            props.write_text("<Project><PropertyGroup><Version>0.2.1</Version></PropertyGroup></Project>")
            package.write_text('{"version":"0.2.0"}')
            self.assertEqual(check_versions(root), ("0.2.1", "0.2.0"))
            with self.assertRaisesRegex(ValueError, "exactly"):
                check_versions(root, "v0.2.0")
            package.write_text('{"version":"0.3.0"}')
            with self.assertRaisesRegex(ValueError, "major.minor mismatch"):
                check_versions(root)
            props.write_text("<Project><PropertyGroup><Version>0.2.0-rc.1</Version></PropertyGroup></Project>")
            package.write_text('{"version":"0.2.0-rc.1"}')
            check_versions(root, "v0.2.0-rc.1")
            props.write_text("<Project />")
            with self.assertRaisesRegex(ValueError, "exactly one"):
                check_versions(root)


class PromotionTests(unittest.TestCase):
    def setUp(self):
        self.registries = [FakeRegistry("backend"), FakeRegistry("webapp")]

    def metadata(self, plan):
        tags = [plan["version"]] + (["latest"] if plan["latest"] else [])
        return [{"tags": [f"{registry.image}:{tag}" for tag in tags]} for registry in self.registries]

    def test_first_stable_updates_latest(self):
        self.assertTrue(make_plan("0.0.0", COMMIT, self.registries)["latest"])

    def test_rc_never_updates_latest(self):
        self.assertFalse(make_plan("9.0.0-rc.10", COMMIT, self.registries)["latest"])

    def test_newer_published_release_on_either_image_blocks_latest(self):
        self.registries[1].manifests.update({"0.10.0": OTHER, "latest": OTHER})
        self.assertFalse(make_plan("0.9.9", COMMIT, self.registries)["latest"])
        self.assertTrue(make_plan("0.11.0", COMMIT, self.registries)["latest"])

    def test_numeric_semver_handles_arbitrarily_large_versions(self):
        self.registries[0].manifests["999999999999999999999.0.0"] = OTHER
        self.assertFalse(make_plan("100.0.0", COMMIT, self.registries)["latest"])

    def test_missing_second_source_fails_preflight(self):
        self.registries[1].manifests.clear()
        with self.assertRaisesRegex(ValueError, "Source image missing"):
            make_plan("1.0.0", COMMIT, self.registries)

    def test_conflicting_version_fails_for_stable_and_rc(self):
        for version in ("1.0.0", "1.0.0-rc.1"):
            self.registries[1].manifests[version] = OTHER
            with self.subTest(version=version), self.assertRaisesRegex(ValueError, "Refusing to overwrite"):
                make_plan(version, COMMIT, self.registries)

    def test_unknown_latest_fails_closed(self):
        self.registries[0].manifests["latest"] = OTHER
        with self.assertRaisesRegex(ValueError, "does not match any published stable"):
            make_plan("1.0.0", COMMIT, self.registries)

    def test_registry_changes_between_plan_and_publish_abort(self):
        plan = make_plan("1.0.0", COMMIT, self.registries)
        self.registries[1].manifests["2.0.0"] = OTHER
        with self.assertRaisesRegex(ValueError, "Registry changed"):
            check_plan(plan, self.registries, self.metadata(plan))

    def test_source_rebuilt_between_plan_and_publish_aborts(self):
        plan = make_plan("1.0.0", COMMIT, self.registries)
        self.registries[0].manifests[f"sha-{COMMIT}"] = OTHER
        with self.assertRaisesRegex(ValueError, "Registry changed"):
            check_plan(plan, self.registries, self.metadata(plan))

    def test_unexpected_metadata_aborts_before_writes(self):
        plan = make_plan("1.0.0", COMMIT, self.registries)
        metadata = self.metadata(plan)
        metadata[1]["tags"].append(f"{self.registries[1].image}:dev")
        with self.assertRaisesRegex(ValueError, "Unexpected metadata"):
            check_plan(plan, self.registries, metadata)

    def test_partial_release_can_be_rechecked_and_verified(self):
        self.registries[0].manifests.update({"1.0.0": DIGEST, "latest": DIGEST})
        plan = make_plan("1.0.0", COMMIT, self.registries)
        targets = check_plan(plan, self.registries, self.metadata(plan))
        self.assertEqual(targets["webapp_version_tag"], f"{self.registries[1].image}:1.0.0")
        self.assertEqual(targets["webapp_latest_tag"], f"{self.registries[1].image}:latest")
        # Simulate the workflow publishing the missing version, then latest.
        self.registries[1].manifests["1.0.0"] = DIGEST
        verify_versions(plan, self.registries)
        self.registries[1].manifests["latest"] = DIGEST
        verify_digests(plan, self.registries, "latest")
        for registry in self.registries:
            self.assertEqual(registry.digest("1.0.0"), DIGEST)
            self.assertEqual(registry.digest("latest"), DIGEST)

    def test_old_release_publishes_version_only(self):
        for registry in self.registries:
            registry.manifests.update({"2.0.0": OTHER, "latest": OTHER})
        plan = make_plan("1.0.0", COMMIT, self.registries)
        targets = check_plan(plan, self.registries, self.metadata(plan))
        self.assertEqual(set(targets), {"backend_version_tag", "webapp_version_tag"})

    def test_missing_or_changed_version_blocks_latest(self):
        plan = make_plan("1.0.0", COMMIT, self.registries)
        self.registries[0].manifests["1.0.0"] = DIGEST
        for value in (None, OTHER):
            if value is not None:
                self.registries[1].manifests["1.0.0"] = value
            with self.subTest(value=value), self.assertRaisesRegex(ValueError, "Promotion changed or failed"):
                verify_versions(plan, self.registries)

    def test_newer_stable_after_version_promotion_blocks_latest(self):
        plan = make_plan("1.0.0", COMMIT, self.registries)
        for registry in self.registries:
            registry.manifests["1.0.0"] = DIGEST
        self.registries[1].manifests["2.0.0"] = OTHER
        with self.assertRaisesRegex(ValueError, "newer stable image appeared"):
            verify_versions(plan, self.registries)

    def test_wrong_latest_digest_is_detected(self):
        plan = make_plan("1.0.0", COMMIT, self.registries)
        self.registries[0].manifests["latest"] = DIGEST
        self.registries[1].manifests["latest"] = OTHER
        with self.assertRaisesRegex(ValueError, "Promotion changed or failed"):
            verify_digests(plan, self.registries, "latest")


class RegistryTests(unittest.TestCase):
    def setUp(self):
        self.registry = object.__new__(Registry)
        self.registry.image = "ghcr.io/example/notable-backend"
        self.registry.base = "https://ghcr.io/v2/example/notable-backend"
        self.registry.token = "test-token"

    def test_only_explicit_missing_manifest_counts_as_absent(self):
        url = self.registry.base + "/manifests/1.0.0"
        error = HTTPError(url, 404, "Not Found", {}, BytesIO(b'{"errors":[{"code":"MANIFEST_UNKNOWN"}]}'))
        with patch("docker_release.urlopen", side_effect=error):
            self.assertIsNone(self.registry.digest("1.0.0"))

    def test_auth_and_registry_errors_fail_closed(self):
        url = self.registry.base + "/manifests/1.0.0"
        for status in (401, 403, 429, 500):
            error = HTTPError(url, status, "Registry error", {}, BytesIO(b"{}"))
            with self.subTest(status=status), patch("docker_release.urlopen", side_effect=error):
                with self.assertRaisesRegex(RuntimeError, f"HTTP {status}"):
                    self.registry.digest("1.0.0")

    def test_unknown_404_is_not_treated_as_missing_image(self):
        url = self.registry.base + "/manifests/1.0.0"
        error = HTTPError(url, 404, "Not Found", {}, BytesIO(b'{"errors":[{"code":"DENIED"}]}'))
        with patch("docker_release.urlopen", side_effect=error):
            with self.assertRaisesRegex(RuntimeError, "HTTP 404"):
                self.registry.digest("1.0.0")

    def test_pagination_reads_all_published_tags(self):
        pages = [
            (b'{"tags":["dev","1.0.0"]}', {"Link": '</v2/example/notable-backend/tags/list?n=100&last=1.0.0>; rel="next"'}),
            (b'{"tags":["2.0.0"]}', {}),
        ]
        with patch.object(self.registry, "request", side_effect=pages) as request:
            self.assertEqual(self.registry.tags(), {"dev", "1.0.0", "2.0.0"})
        self.assertEqual(request.call_count, 2)

    def test_manifest_bytes_are_hashed_without_reserialization(self):
        for media in ("application/vnd.oci.image.index.v1+json", "application/vnd.oci.image.manifest.v1+json"):
            raw = json.dumps({"schemaVersion": 2, "mediaType": media}).encode()
            digest = "sha256:" + hashlib.sha256(raw).hexdigest()
            with self.subTest(media=media), patch.object(self.registry, "request", return_value=(raw, {"Docker-Content-Digest": digest})):
                self.assertEqual(self.registry.digest("1.0.0"), digest)

    def test_hash_mismatch_is_rejected(self):
        with patch.object(self.registry, "request", return_value=(b"{}", {"Docker-Content-Digest": OTHER})):
            with self.assertRaisesRegex(ValueError, "Manifest digest mismatch"):
                self.registry.digest("1.0.0")

    def test_pagination_cannot_forward_token_to_other_hosts(self):
        with self.assertRaisesRegex(ValueError, "Unexpected registry URL"):
            self.registry.request("https://example.com/v2/tags/list")


if __name__ == "__main__":
    unittest.main()
