#!/usr/bin/env python3
"""Pin pyproject.toml's PyPI-facing dependency specs to the exact versions pixi
resolved in pixi.lock, so `pip install fileglancer` gets versions that match
the pixi/conda environment.

For each dependency, every (pixi environment, platform) combination that
actually installs it (see TARGETS/target_environments below) is checked. If
they all agree on one version, a plain `==version` pin is written. If they
disagree -- e.g. a compiled test-only package built differently for one
platform/Python-version combo -- the dependency is split into multiple PEP
508 entries qualified with `python_version`/`sys_platform`/`platform_machine`
markers, one per distinct version, so both `pip install` and pixi stay
satisfiable everywhere pixi.lock covers.

Because these pins become part of the editable `fileglancer` package's own
metadata, pixi feeds them back into its own solve on every `pixi update` --
an exact pin can't move, and can even make `pixi update` fail outright if a
conda-resolved version has since diverged from it. Run with `--unpin` first
to restore semver ranges (from the matching [tool.pixi.*] table, or from
[tool.sync-pypi-versions.ranges] for PyPI-only packages with no such table),
run `pixi update`, then run again without `--unpin` to re-pin to the new
pixi.lock:

    pixi run unpin-pypi-versions && pixi update && pixi run sync-pypi-versions

Run directly (`python scripts/sync_pyproject_versions.py [--unpin]`) or via
`pixi run sync-pypi-versions` / `pixi run unpin-pypi-versions`.
"""

import argparse
import re
import sys
import tomllib
from pathlib import Path

import yaml

ROOT = Path(__file__).resolve().parent.parent
PIXI_LOCK = ROOT / "pixi.lock"
PYPROJECT = ROOT / "pyproject.toml"

# pixi platform tag -> (sys_platform, platform_machine) PEP 508 marker values.
PLATFORM_MARKERS = {
    "linux-64": ("linux", "x86_64"),
    "linux-aarch64": ("linux", "aarch64"),
    "osx-64": ("darwin", "x86_64"),
    "osx-arm64": ("darwin", "arm64"),
    "win-64": ("win32", "AMD64"),
}

# pyproject.toml (table, array key) -> the pixi feature name that must be
# active for an environment to install it, or "__all__" for the base
# (non-extra) [project.dependencies], which every environment installs.
TARGETS = {
    ("project", "dependencies"): "__all__",
    ("project.optional-dependencies", "test"): "test",
    ("project.optional-dependencies", "release"): "release",
    ("dependency-groups", "release"): "release",
}

# pyproject.toml (table, array key) -> the [tool.pixi(.feature.<name>)?.dependencies]
# table (as a dotted-path tuple) whose ranges --unpin should restore from.
MIRROR_TABLE_FOR_TARGET = {
    ("project", "dependencies"): ("tool", "pixi", "dependencies"),
    ("project.optional-dependencies", "test"): ("tool", "pixi", "feature", "test", "dependencies"),
    ("project.optional-dependencies", "release"): ("tool", "pixi", "feature", "release", "dependencies"),
    ("dependency-groups", "release"): ("tool", "pixi", "feature", "release", "dependencies"),
}
# Fallback source of ranges for PyPI-only packages with no [tool.pixi.*] mirror.
EXTRA_RANGES_TABLE = ("tool", "sync-pypi-versions", "ranges")

HEADER_RE = re.compile(r"^\[(?P<table>[^\]]+)\]\s*$")
ARRAY_START_RE = re.compile(r"^(?P<key>[A-Za-z_][A-Za-z0-9_-]*)\s*=\s*\[\s*$")
ARRAY_END_RE = re.compile(r"^\s*\]\s*$")
# A whole array on one line, e.g. `release = ["build>=1.3.0,<2"]`.
ARRAY_INLINE_RE = re.compile(r"^(?P<key>[A-Za-z_][A-Za-z0-9_-]*)\s*=\s*\[(?P<body>[^\[\]]*)\]\s*$")
DEP_LINE_RE = re.compile(
    r'^(?P<indent>\s*)"(?P<name>[A-Za-z0-9][A-Za-z0-9._-]*)'
    r"(?P<extras>\[[^\]]*\])?"
    r"\s*(?P<spec>[<>=!~;].*)?\"(?P<comma>,?)\s*$"
)
# A single dependency string anywhere inside an inline array body.
DEP_ITEM_RE = re.compile(
    r'"(?P<name>[A-Za-z0-9][A-Za-z0-9._-]*)'
    r"(?P<extras>\[[^\]]*\])?"
    r'\s*(?P<spec>[<>=!~;][^"]*)?"'
)


def normalize(name):
    """PEP 503 normalization, used as the lookup key for name matching."""
    return re.sub(r"[-_.]+", "-", name).lower()


def parse_conda_filename(url):
    filename = url.rsplit("/", 1)[-1]
    for ext in (".conda", ".tar.bz2"):
        if filename.endswith(ext):
            filename = filename[: -len(ext)]
            break
    name, version, _build = filename.rsplit("-", 2)
    return name, version


def parse_purl_name(purl):
    # e.g. "pkg:pypi/psycopg2-binary?source=hash-mapping" -> "psycopg2-binary"
    return purl.split("pkg:pypi/", 1)[-1].split("?", 1)[0]


def build_catalog(lock):
    """Map every package URL in pixi.lock to its top-level catalog record."""
    catalog = {}
    for pkg in lock["packages"]:
        url = pkg.get("conda") or pkg.get("pypi")
        if url:
            catalog[url] = pkg
    return catalog


def build_version_map(catalog, refs):
    """Normalized PyPI package name -> exact version, for one (env, platform) package list."""
    versions = {}

    def register(name, version):
        versions.setdefault(normalize(name), version)

    for ref in refs:
        if "pypi" in ref:
            url = ref["pypi"]
            if url in (".", "./"):
                continue  # the fileglancer package itself, installed editable
            pkg = catalog.get(url)
            if pkg and "name" in pkg:
                register(pkg["name"], pkg["version"])
        elif "conda" in ref:
            url = ref["conda"]
            filename_name, version = parse_conda_filename(url)
            pkg = catalog.get(url, {})
            for purl in pkg.get("purls") or []:
                register(parse_purl_name(purl), version)
            register(filename_name, version)

    return versions


def get_python_version(refs):
    """major.minor Python version pixi resolved for one (env, platform) package list."""
    for ref in refs:
        if "conda" in ref:
            name, version = parse_conda_filename(ref["conda"])
            if name == "python":
                major, minor, *_ = version.split(".")
                return f"{major}.{minor}"
    raise SystemExit("sync_pyproject_versions: could not find a python package for one environment/platform")


def load_environment_features(pyproject_text):
    """pixi environment name -> set of active feature names, from [tool.pixi.environments]."""
    raw = tomllib.loads(pyproject_text)["tool"]["pixi"]["environments"]
    features = {}
    for env_name, spec in raw.items():
        if isinstance(spec, list):
            features[env_name] = set(spec)
        elif isinstance(spec, dict):
            features[env_name] = set(spec.get("features", []))
        else:
            features[env_name] = set()
    return features


class Context:
    def __init__(self, lock, pyproject_text):
        catalog = build_catalog(lock)
        self.all_envs = list(lock["environments"].keys())
        self.env_platforms = {}
        self.version_maps = {}  # (env, platform) -> {normalized_name: version}
        self.py_versions = {}  # (env, platform) -> "major.minor"

        for env in self.all_envs:
            platforms = list(lock["environments"][env]["packages"].keys())
            self.env_platforms[env] = platforms
            for platform in platforms:
                refs = lock["environments"][env]["packages"][platform]
                self.version_maps[(env, platform)] = build_version_map(catalog, refs)
                self.py_versions[(env, platform)] = get_python_version(refs)

        self.env_features = load_environment_features(pyproject_text)

    def target_environments(self, table, key):
        feature = TARGETS[(table, key)]
        if feature == "__all__":
            return set(self.all_envs)
        return {env for env, feats in self.env_features.items() if feature in feats}


def marker_for_platform(platform):
    try:
        return PLATFORM_MARKERS[platform]
    except KeyError:
        raise SystemExit(
            f"sync_pyproject_versions: no marker mapping for pixi platform {platform!r}; "
            f"add one to PLATFORM_MARKERS"
        )


def compute_pins(ctx, name, table, key):
    """Return [(marker_or_None, version), ...] -- one entry unless some
    (python_version, platform) combination resolves this package differently."""
    relevant_envs = ctx.target_environments(table, key)
    if not relevant_envs:
        raise SystemExit(
            f"sync_pyproject_versions: no pixi environment activates [{table}] {key} "
            f"-- cannot determine a locked version for {name!r}"
        )

    contexts = {}  # (python_version, platform) -> version
    for env in relevant_envs:
        for platform in ctx.env_platforms[env]:
            version = ctx.version_maps[(env, platform)].get(normalize(name))
            if version is None:
                raise SystemExit(
                    f"sync_pyproject_versions: no locked version found for {name!r} "
                    f"in pixi.lock environment {env!r} platform {platform!r} "
                    f"(pyproject.toml [{table}] {key})"
                )
            py_version = ctx.py_versions[(env, platform)]
            ctx_key = (py_version, platform)
            if ctx_key in contexts and contexts[ctx_key] != version:
                raise SystemExit(
                    f"sync_pyproject_versions: {name!r} resolves to different versions for "
                    f"the same (python_version={py_version}, platform={platform}) context "
                    f"across environments {sorted(relevant_envs)} -- cannot express this "
                    f"with python_version/platform markers; resolve manually."
                )
            contexts[ctx_key] = version

    distinct_versions = set(contexts.values())
    if len(distinct_versions) == 1:
        return [(None, next(iter(distinct_versions)))]

    groups = {}
    for ctx_key, version in contexts.items():
        groups.setdefault(version, set()).add(ctx_key)

    # The largest group becomes the "default" line, expressed by excluding the
    # other (minority) groups' combos -- far more compact than enumerating
    # every combo in the default group individually.
    groups_sorted = sorted(groups.items(), key=lambda kv: (-len(kv[1]), kv[0]))
    default_version, _default_combos = groups_sorted[0]
    minority_groups = groups_sorted[1:]

    def combo_clause(py_version, platform, negate):
        sys_platform, platform_machine = marker_for_platform(platform)
        op, joiner = ("!=", " or ") if negate else ("==", " and ")
        return (
            f"(python_version {op} '{py_version}'{joiner}"
            f"sys_platform {op} '{sys_platform}'{joiner}"
            f"platform_machine {op} '{platform_machine}')"
        )

    pins = []
    excluded_combos = []
    for version, combos in minority_groups:
        clauses = [combo_clause(py_version, platform, negate=False) for py_version, platform in sorted(combos)]
        marker = clauses[0] if len(clauses) == 1 else "(" + " or ".join(clauses) + ")"
        pins.append((marker, version))
        excluded_combos.extend(combos)

    exclude_clauses = [combo_clause(py_version, platform, negate=True) for py_version, platform in sorted(excluded_combos)]
    default_marker = " and ".join(exclude_clauses)
    pins.insert(0, (default_marker, default_version))

    return pins


def format_pin(name, extras, marker, version):
    spec = f"=={version}"
    if marker:
        return f'"{name}{extras} {spec} ; {marker}"'
    return f'"{name}{extras} {spec}"'


def render_pins(ctx, name, extras, table, key, changes, old_spec_display):
    pins = compute_pins(ctx, name, table, key)
    parts = [format_pin(name, extras, marker, version) for marker, version in pins]
    new_text = ", ".join(parts)
    summary = " | ".join(p.strip('"') for p in parts)
    if summary != old_spec_display:
        changes.append((f"[{table}] {key}", name, old_spec_display, summary))
    return new_text


def get_nested_table(data, path):
    node = data
    for part in path:
        if not isinstance(node, dict) or part not in node:
            return {}
        node = node[part]
    return node if isinstance(node, dict) else {}


def range_spec_from_value(value):
    """[tool.pixi(.feature.*)?.dependencies] entries are usually a plain
    range string, but pixi also allows `{ version = "...", ... }`."""
    if isinstance(value, str):
        return value
    if isinstance(value, dict):
        return value.get("version")
    return None


class RangesContext:
    """Where --unpin restores each dependency's semver range from."""

    def __init__(self, pyproject_text):
        data = tomllib.loads(pyproject_text)

        self.mirror_ranges = {}  # dotted-path tuple -> {normalized_name: range_spec}
        for path in set(MIRROR_TABLE_FOR_TARGET.values()):
            table = get_nested_table(data, path)
            self.mirror_ranges[path] = {
                normalize(name): range_spec_from_value(value)
                for name, value in table.items()
                if range_spec_from_value(value)
            }

        extra_table = get_nested_table(data, EXTRA_RANGES_TABLE)
        self.extra_ranges = {normalize(name): value for name, value in extra_table.items() if isinstance(value, str)}

    def range_for(self, name, table, key):
        """The range to restore `name` to, or None for "no constraint"."""
        normalized = normalize(name)
        mirror_path = MIRROR_TABLE_FOR_TARGET[(table, key)]
        range_spec = self.mirror_ranges.get(mirror_path, {}).get(normalized)
        if range_spec is None:
            range_spec = self.extra_ranges.get(normalized)
        return range_spec


def render_unpin(ranges_ctx, name, extras, table, key, changes, old_spec_display):
    range_spec = ranges_ctx.range_for(name, table, key)
    if range_spec:
        new_text = f'"{name}{extras} {range_spec}"'
        new_display = f"{name}{extras} {range_spec}"
    else:
        new_text = f'"{name}{extras}"'
        new_display = "(unpinned)"

    if new_display != old_spec_display:
        changes.append((f"[{table}] {key}", name, old_spec_display, new_display))
    return new_text


def sync_pyproject(text, render_fn):
    lines = text.splitlines(keepends=True)
    out = []
    current_table = None
    changes = []
    i, n = 0, len(lines)

    while i < n:
        line = lines[i]
        stripped = line.rstrip("\n")

        header_match = HEADER_RE.match(stripped)
        if header_match:
            current_table = header_match.group("table")
            out.append(line)
            i += 1
            continue

        array_match = ARRAY_START_RE.match(stripped)
        is_target = bool(array_match) and (current_table, array_match.group("key")) in TARGETS

        if array_match and is_target:
            key = array_match.group("key")
            out.append(line)
            i += 1
            seen_names = set()
            while i < n and not ARRAY_END_RE.match(lines[i].rstrip("\n")):
                item_line = lines[i]
                dep_match = DEP_LINE_RE.match(item_line.rstrip("\n"))
                if not dep_match:
                    out.append(item_line)
                    i += 1
                    continue

                name = dep_match.group("name")
                name_key = normalize(name)
                if name_key in seen_names:
                    # a leftover line from a previous run's marker split of this
                    # same package (see render_pins/render_unpin) -- drop it, already handled.
                    i += 1
                    continue
                seen_names.add(name_key)

                extras = dep_match.group("extras") or ""
                old_spec_display = (dep_match.group("spec") or "").strip() or "(unpinned)"
                new_text = render_fn(name, extras, current_table, key, changes, old_spec_display)

                items = new_text.split(", ")
                indent = dep_match.group("indent")
                trailing_comma = dep_match.group("comma")
                for idx, item in enumerate(items):
                    comma = "," if idx < len(items) - 1 else trailing_comma
                    out.append(f"{indent}{item}{comma}\n")
                i += 1
            if i < n:
                out.append(lines[i])  # closing "]"
                i += 1
            continue

        inline_match = ARRAY_INLINE_RE.match(stripped) if not array_match else None
        inline_is_target = bool(inline_match) and (current_table, inline_match.group("key")) in TARGETS

        if inline_match and inline_is_target:
            key = inline_match.group("key")
            seen_names = set()
            parts = []
            for dep_match in DEP_ITEM_RE.finditer(inline_match.group("body")):
                name = dep_match.group("name")
                name_key = normalize(name)
                if name_key in seen_names:
                    # a leftover item from a previous run's marker split of this
                    # same package (see render_pins/render_unpin) -- drop it, already handled.
                    continue
                seen_names.add(name_key)

                extras = dep_match.group("extras") or ""
                old_spec_display = (dep_match.group("spec") or "").strip() or "(unpinned)"
                parts.append(render_fn(name, extras, current_table, key, changes, old_spec_display))

            out.append(f"{key} = [{', '.join(parts)}]\n")
            i += 1
            continue

        out.append(line)
        i += 1

    return "".join(out), changes


def main():
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument(
        "--unpin",
        action="store_true",
        help="Restore semver ranges instead of writing exact pins. Run this "
        "before `pixi update`; run again without --unpin afterward to re-pin.",
    )
    mode.add_argument(
        "--check",
        action="store_true",
        help="Don't write anything -- exit non-zero if pyproject.toml doesn't "
        "already match pixi.lock's exact versions. Used by the pypi-build "
        "hatch hook to catch a forgotten `sync-pypi-versions` before publishing.",
    )
    args = parser.parse_args()

    original = PYPROJECT.read_text()

    if args.unpin:
        ranges_ctx = RangesContext(original)
        render_fn = lambda name, extras, table, key, changes, old: render_unpin(  # noqa: E731
            ranges_ctx, name, extras, table, key, changes, old
        )
        nothing_to_do_message = "pyproject.toml already uses semver ranges; nothing to do."
        verb = "Restored"
    else:
        lock = yaml.safe_load(PIXI_LOCK.read_text())
        ctx = Context(lock, original)
        render_fn = lambda name, extras, table, key, changes, old: render_pins(  # noqa: E731
            ctx, name, extras, table, key, changes, old
        )
        nothing_to_do_message = "pyproject.toml already matches pixi.lock; nothing to do."
        verb = "Updated"

    updated, changes = sync_pyproject(original, render_fn)

    # Compare final text, not just the internal `changes` log: a name that was
    # already split across multiple marker-qualified lines by a previous run
    # is recomputed (and looks "changed" per-line) even when nothing actually
    # needs to change.
    if updated == original:
        print(nothing_to_do_message)
        return

    if args.check:
        print("pyproject.toml does not match pixi.lock. Run `pixi run sync-pypi-versions` and commit the result:", file=sys.stderr)
        for section, name, old, new in changes:
            print(f"  {section}: {name}: {old} -> {new}", file=sys.stderr)
        return 1

    PYPROJECT.write_text(updated)
    print(f"{verb} {len(changes)} dependency spec(s) in pyproject.toml:")
    for section, name, old, new in changes:
        print(f"  {section}: {name} {old} -> {new}")


if __name__ == "__main__":
    sys.exit(main())
