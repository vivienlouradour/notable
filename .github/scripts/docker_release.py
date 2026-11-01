"""Read-only GHCR release checks. Manifest publication lives in the workflow."""

import argparse
import base64
import hashlib
import json
import os
from pathlib import Path
import re
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode, urljoin
from urllib.request import Request, urlopen

from versions import RELEASE, STABLE, parse_version, write_outputs


ACCEPT = ", ".join([
    "application/vnd.oci.image.index.v1+json",
    "application/vnd.docker.distribution.manifest.list.v2+json",
    "application/vnd.oci.image.manifest.v1+json",
    "application/vnd.docker.distribution.manifest.v2+json",
])
COMPONENTS = ("backend", "webapp")


class Registry:
    def __init__(self, image):
        if not re.fullmatch(r"ghcr\.io/[a-z0-9._/-]+", image):
            raise ValueError(f"Invalid GHCR image: {image!r}")
        self.image = image
        self.base = f"https://ghcr.io/v2/{image.removeprefix('ghcr.io/')}"
        scope = f"repository:{image.removeprefix('ghcr.io/')}:pull"
        credentials = f"{os.environ['GITHUB_ACTOR']}:{os.environ['GHCR_TOKEN']}"
        authorization = base64.b64encode(credentials.encode()).decode()
        request = Request(
            "https://ghcr.io/token?" + urlencode({"service": "ghcr.io", "scope": scope}),
            headers={"Authorization": f"Basic {authorization}"},
        )
        with urlopen(request, timeout=60) as response:
            self.token = json.load(response)["token"]

    def request(self, url, missing_ok=False):
        # Do not forward bearer credentials to a host supplied by a pagination link.
        if not url.startswith(self.base + "/"):
            raise ValueError(f"Unexpected registry URL: {url}")
        request = Request(url, headers={"Authorization": f"Bearer {self.token}", "Accept": ACCEPT})
        try:
            with urlopen(request, timeout=60) as response:
                return response.read(), response.headers
        except HTTPError as error:
            if error.code == 404 and missing_ok:
                body = json.loads(error.read())
                codes = {item.get("code") for item in body.get("errors", [])}
                if codes and codes <= {"MANIFEST_UNKNOWN", "NAME_UNKNOWN"}:
                    return None
            raise RuntimeError(f"GHCR request failed for {url}: HTTP {error.code}") from None

    def digest(self, reference):
        result = self.request(f"{self.base}/manifests/{reference}", missing_ok=True)
        if result is None:
            return None
        body, headers = result
        digest = "sha256:" + hashlib.sha256(body).hexdigest()
        if headers.get("Docker-Content-Digest") != digest:
            raise ValueError(f"Manifest digest mismatch for {self.image}:{reference}")
        return digest

    def tags(self):
        tags = set()
        url = f"{self.base}/tags/list?n=100"
        visited = set()
        while url:
            if url in visited:
                raise ValueError(f"Registry pagination loop for {self.image}")
            visited.add(url)
            body, headers = self.request(url)
            tags.update(json.loads(body).get("tags") or [])
            link = headers.get("Link", "")
            match = re.search(r'<([^>]+)>;\s*rel="next"', link)
            if link and not match:
                raise ValueError(f"Unrecognized pagination link for {self.image}: {link}")
            url = urljoin(url, match[1]) if match else None
        return tags


def published_stable_versions(registry):
    versions = {}
    for tag in registry.tags():
        if STABLE.fullmatch(tag):
            digest = registry.digest(tag)
            if digest is None:
                raise ValueError(f"Published stable tag disappeared: {registry.image}:{tag}")
            versions[tag] = digest
    latest = registry.digest("latest")
    if latest is not None and latest not in versions.values():
        raise ValueError(
            f"{registry.image}:latest does not match any published stable tag; "
            "repair the registry before releasing."
        )
    return versions


def make_plan(version, commit, registries):
    if not RELEASE.fullmatch(version) or not re.fullmatch(r"[0-9a-f]{40}", commit):
        raise ValueError("Invalid release version or full source commit SHA.")
    images = []
    highest = (0, 0, 0)
    stable = STABLE.fullmatch(version) is not None
    for registry in registries:
        source = registry.digest(f"sha-{commit}")
        if source is None:
            raise ValueError(
                f"Source image missing: {registry.image}:sha-{commit}. "
                "Wait for Docker Build on main to succeed, then rerun this release."
            )
        existing = registry.digest(version)
        if existing is not None and existing != source:
            raise ValueError(
                f"Refusing to overwrite {registry.image}:{version}: "
                f"published digest {existing} differs from source {source}."
            )
        if stable:
            published = published_stable_versions(registry)
            highest = max([highest, *(parse_version(tag) for tag in published)])
        images.append({"image": registry.image, "digest": source})
    latest = stable and parse_version(version) >= highest
    print(f"Release {version}: latest={'yes' if latest else 'no'}; highest published stable={highest}")
    return {"version": version, "commit": commit, "latest": latest, "images": images}


def check_plan(plan, registries, metadata):
    # Repeat all preconditions immediately before any writes. A main build rerun
    # may have changed a sha tag since the plan was made; never silently use it.
    current = make_plan(plan["version"], plan["commit"], registries)
    if current != plan:
        raise ValueError("Registry changed since preflight; rerun the release to resolve a new plan.")
    expected_tags = [plan["version"]] + (["latest"] if plan["latest"] else [])
    outputs = {}
    for component, registry, item in zip(COMPONENTS, registries, metadata, strict=True):
        expected = {f"{registry.image}:{tag}" for tag in expected_tags}
        if set(item["tags"]) != expected:
            raise ValueError(f"Unexpected metadata-action tags for {registry.image}: {item['tags']}")
        outputs[f"{component}_version_tag"] = f"{registry.image}:{plan['version']}"
        if plan["latest"]:
            outputs[f"{component}_latest_tag"] = f"{registry.image}:latest"
    return outputs


def verify_digests(plan, registries, tag):
    for registry, image in zip(registries, plan["images"], strict=True):
        if registry.digest(tag) != image["digest"]:
            raise ValueError(f"Promotion changed or failed to publish the digest of {registry.image}:{tag}.")
        print(f"Verified: {registry.image}:{tag}@{image['digest']}")


def verify_versions(plan, registries):
    # Both version tags must match before the workflow can update either latest.
    verify_digests(plan, registries, plan["version"])
    if plan["latest"]:
        for registry in registries:
            published = published_stable_versions(registry)
            if any(parse_version(tag) > parse_version(plan["version"]) for tag in published):
                raise ValueError("A newer stable image appeared; refusing to change latest. Rerun release.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("operation", choices=("plan", "check", "verify-versions", "verify-latest"))
    parser.add_argument("plan_file", type=Path)
    args = parser.parse_args()
    repository = os.environ["GITHUB_REPOSITORY"].lower()
    registries = [Registry(f"ghcr.io/{repository}-{component}") for component in COMPONENTS]
    if args.operation == "plan":
        plan = make_plan(os.environ["RELEASE_VERSION"], os.environ["RELEASE_COMMIT"], registries)
        args.plan_file.write_text(json.dumps(plan), encoding="utf-8")
        write_outputs({
            **{component: registry.image for component, registry in zip(COMPONENTS, registries, strict=True)},
            **{f"{component}_source": f"{image['image']}@{image['digest']}"
               for component, image in zip(COMPONENTS, plan["images"], strict=True)},
            "latest": str(plan["latest"]).lower(),
        })
    else:
        plan = json.loads(args.plan_file.read_text(encoding="utf-8"))
        if args.operation == "check":
            metadata = [json.loads(os.environ[f"{component.upper()}_METADATA"]) for component in COMPONENTS]
            write_outputs(check_plan(plan, registries, metadata))
        elif args.operation == "verify-versions":
            verify_versions(plan, registries)
        else:
            if not plan["latest"]:
                raise ValueError("This release is not eligible to update latest.")
            verify_digests(plan, registries, "latest")


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, RuntimeError, URLError) as error:
        print(f"::error::{error}", file=sys.stderr)
        sys.exit(1)
