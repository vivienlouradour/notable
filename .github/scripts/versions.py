"""Version checks using only Python's standard library, available on hosted runners."""

import argparse
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import xml.etree.ElementTree as ET


ROOT = Path(__file__).resolve().parents[2]
NUMBER = r"(?:0|[1-9][0-9]*)"
CORE = rf"({NUMBER})\.({NUMBER})\.({NUMBER})"
IDENTIFIER = rf"(?:{NUMBER}|[0-9]*[A-Za-z-][0-9A-Za-z-]*)"
SEMVER = re.compile(
    rf"{CORE}(?:-({IDENTIFIER}(?:\.{IDENTIFIER})*))?"
    r"(?:\+[0-9A-Za-z-]+(?:\.[0-9A-Za-z-]+)*)?"
)
RELEASE = re.compile(rf"{CORE}(?:-rc\.({NUMBER}))?")
STABLE = re.compile(CORE)


def parse_version(value):
    if not isinstance(value, str) or not SEMVER.fullmatch(value):
        raise ValueError(f"Invalid SemVer application version: {value!r}")
    return tuple(int(part) for part in SEMVER.fullmatch(value).groups()[:3])


def release_version(tag):
    if not tag.startswith("v") or not RELEASE.fullmatch(tag[1:]):
        raise ValueError(
            f"Invalid release tag {tag!r}: expected vX.Y.Z or vX.Y.Z-rc.N "
            "without leading zeros, build metadata or other prereleases."
        )
    return tag[1:]


def check_versions(root=ROOT, tag=None):
    props = ET.parse(root / "sources/backend/Directory.Build.props")
    versions = props.findall("./PropertyGroup/Version")
    if len(versions) != 1 or not versions[0].text:
        raise ValueError("Directory.Build.props must contain exactly one non-empty Version.")
    backend = versions[0].text.strip()
    frontend = json.loads((root / "sources/webapp/package.json").read_text(encoding="utf-8")).get("version")
    cores = []
    for source, value in (("Directory.Build.props", backend), ("package.json", frontend)):
        try:
            cores.append(parse_version(value))
        except ValueError as error:
            raise ValueError(f"{source}: {error}") from None
    backend_core, frontend_core = cores
    if backend_core[:2] != frontend_core[:2]:
        raise ValueError(
            f"major.minor mismatch: backend={backend}, frontend={frontend}. "
            "Both must share major.minor (patch versions may differ in PRs)."
        )
    if tag is not None:
        expected = release_version(tag)
        if backend != expected or frontend != expected:
            raise ValueError(
                f"Release {tag} requires backend and frontend versions exactly {expected}; "
                f"found backend={backend}, frontend={frontend}. Update them manually before building main."
            )
    return backend, frontend


def write_outputs(values):
    if os.environ.get("GITHUB_OUTPUT"):
        with open(os.environ["GITHUB_OUTPUT"], "a", encoding="utf-8") as output:
            for key, value in values.items():
                output.write(f"{key}={value}\n")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--release")
    args = parser.parse_args()
    backend, frontend = check_versions(tag=args.release)
    print(f"Application versions OK: backend={backend}, frontend={frontend}")
    if args.release:
        commit = subprocess.check_output(["git", "rev-parse", "HEAD^{commit}"], text=True).strip()
        result = subprocess.run(["git", "merge-base", "--is-ancestor", commit, "origin/main"])
        if result.returncode != 0:
            raise ValueError(f"Release commit {commit} must belong to the history of origin/main.")
        write_outputs({"version": release_version(args.release), "commit": commit})


if __name__ == "__main__":
    try:
        main()
    except (ValueError, KeyError, OSError, ET.ParseError, subprocess.CalledProcessError) as error:
        print(f"::error::{error}", file=sys.stderr)
        sys.exit(1)
