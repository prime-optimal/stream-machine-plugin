# /// script
# requires-python = ">=3.11"
# dependencies = ["commitizen==4.19.3"]
# ///

import argparse
import json
import re
import subprocess
import sys
from pathlib import Path

from commitizen import bump, changelog, config, defaults, factory, git
from commitizen.changelog_formats import get_changelog_format
from commitizen.tags import TagRules
from commitizen.version_increment import VersionIncrement
from commitizen.version_schemes import get_version_scheme


def git_output(*args):
    return subprocess.check_output(["git", *args], text=True).strip()


def release(mode):
    source = git_output("rev-parse", "HEAD")
    state_path = Path(".release-state.json")
    state = json.loads(state_path.read_text())
    boundary = state.get("releasedThrough")
    if state.get("schemaVersion") != 1 or not isinstance(boundary, str):
        raise ValueError("Invalid release state")
    if not re.fullmatch(r"[0-9a-f]{40}", boundary):
        raise ValueError("Release boundary must be a full commit SHA")
    subprocess.run(
        ["git", "merge-base", "--is-ancestor", boundary, source],
        check=True, capture_output=True,
    )
    cfg = config.read_cfg()
    if cfg.settings["name"] != "cz_conventional_commits":
        raise ValueError("Expected cz_conventional_commits")
    current = cfg.settings["version"]
    manifests = [Path("package.json"), Path("plugin.json")]
    for path in manifests:
        if json.loads(path.read_text())["version"] != current:
            raise ValueError(f"Version mismatch in {path}")
    runtime = Path("src/version.ts").read_text()
    if f'export const version = "{current}";' not in runtime:
        raise ValueError("Version mismatch in src/version.ts")

    cz = factory.committer_factory(cfg)
    commits = git.get_commits(start=boundary, end=source, args=["--topo-order"])
    increment = VersionIncrement.get_highest_by_messages(
        (commit.message for commit in cz.filter_commits_before_bump(commits)),
        cz.bump_pattern, cz.bump_map,
    )
    changed = increment != VersionIncrement.NONE
    version = str(get_version_scheme(cfg.settings)(current).bump(str(increment))) if changed else current
    result = dict(changed=changed, version=version, source=source, boundary=boundary)
    if mode == "preview" or not changed:
        return result

    path = Path("docs/CHANGELOG.md")
    fmt = get_changelog_format(cfg, str(path))
    fmt.tag_rules = TagRules(scheme=get_version_scheme(cfg.settings), tag_format="$version")
    tree = changelog.generate_tree_from_commits(
        cz.filter_commits_before_changelog(commits), [],
        cz.commit_parser, cz.changelog_pattern, version,
        change_type_map=cz.change_type_map,
        changelog_message_builder_hook=cz.changelog_message_builder_hook,
        changelog_release_hook=cz.changelog_release_hook,
    )
    releases = list(tree)
    for entry in releases:
        entry["date"] = git_output("show", "-s", "--format=%cs", source)
    ordered = changelog.generate_ordered_changelog_tree(releases, cz.change_type_order or defaults.CHANGE_TYPE_ORDER)
    rendered = changelog.render_changelog(
        ordered, cz.template_loader, fmt.template,
        incremental=True, **cz.template_extras,
    ).lstrip("\n")
    lines = path.read_text().splitlines(keepends=True) if path.exists() else []
    merged = "".join(changelog.incremental_build(rendered, lines, fmt.get_metadata(str(path))))
    if git_output("rev-parse", "HEAD") != source:
        raise ValueError("HEAD changed during release calculation")

    bump.update_version_in_files(
        current, version,
        ["package.json:\"version\"", "plugin.json:\"version\"", "src/version.ts:export const version"],
        check_consistency=True, encoding="utf-8",
    )
    cfg.set_key("version", version)
    path.write_text(merged)
    state_path.write_text(json.dumps(dict(schemaVersion=1, releasedThrough=source), indent=2) + "\n")
    return result


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("mode", choices=["preview", "prepare"])
    try:
        print(json.dumps(release(parser.parse_args().mode)))
    except (ValueError, KeyError, OSError, subprocess.CalledProcessError) as error:
        print(f"Release preparation failed: {error}", file=sys.stderr)
        sys.exit(1)
