#!/usr/bin/env python3
"""Build portable What/How/Why manuals from a small JSON content model.

Adapted from the 3x Documentation Scheme; see tools/manual.LICENSE.
"""

from __future__ import annotations

import argparse
import copy
import html
import json
import re
import sys
import time
from pathlib import Path
from typing import Any, Iterable, Optional


ID_RE = re.compile(r"^[a-z0-9]+(?:-[a-z0-9]+)*$")
PLACEHOLDER_RE = re.compile(r"\{\{\s*([a-zA-Z0-9_.-]+)\s*\}\}")
TODO_RE = re.compile(r"\b(?:todo|tbd|fixme|lorem ipsum)\b", re.IGNORECASE)
HEX_RE = re.compile(r"^#[0-9a-fA-F]{6}$")


class ManualError(Exception):
    pass


def load_source(path: Path) -> dict[str, Any]:
    try:
        data = json.loads(path.read_text(encoding="utf-8"))
    except FileNotFoundError as exc:
        raise ManualError(f"source not found: {path}") from exc
    except json.JSONDecodeError as exc:
        raise ManualError(f"invalid JSON at {path}:{exc.lineno}:{exc.colno}: {exc.msg}") from exc
    if not isinstance(data, dict):
        raise ManualError("the manual root must be a JSON object")
    return data


def scalar(value: str) -> Any:
    try:
        parsed = json.loads(value)
    except json.JSONDecodeError:
        return value
    return parsed if not isinstance(parsed, (dict, list)) else value


def apply_override(data: dict[str, Any], expression: str) -> None:
    if "=" not in expression:
        raise ManualError(f"override must be PATH=VALUE: {expression!r}")
    dotted, raw = expression.split("=", 1)
    keys = [part for part in dotted.split(".") if part]
    if not keys:
        raise ManualError(f"override has no path: {expression!r}")
    node: Any = data
    for key in keys[:-1]:
        if not isinstance(node, dict) or key not in node:
            raise ManualError(f"override path does not exist: {dotted}")
        node = node[key]
    if not isinstance(node, dict) or keys[-1] not in node:
        raise ManualError(f"override path does not exist: {dotted}")
    node[keys[-1]] = scalar(raw)


def lookup(data: dict[str, Any], dotted: str) -> Any:
    node: Any = data
    for key in dotted.split("."):
        if not isinstance(node, dict) or key not in node:
            raise ManualError(f"unknown placeholder: {{{{{dotted}}}}}")
        node = node[key]
    if isinstance(node, (dict, list)):
        raise ManualError(f"placeholder must resolve to a scalar: {{{{{dotted}}}}}")
    return node


def expand_placeholders(value: Any, root: dict[str, Any]) -> Any:
    if isinstance(value, str):
        return PLACEHOLDER_RE.sub(lambda match: str(lookup(root, match.group(1))), value)
    if isinstance(value, list):
        return [expand_placeholders(item, root) for item in value]
    if isinstance(value, dict):
        return {key: expand_placeholders(item, root) for key, item in value.items()}
    return value


def dimension_text(value: Any) -> str:
    if isinstance(value, str):
        return value.strip()
    if isinstance(value, list):
        return " ".join(str(item).strip() for item in value)
    if isinstance(value, dict):
        lead = str(value.get("lead", "")).strip()
        points = " ".join(str(item).strip() for item in value.get("points", []))
        return f"{lead} {points}".strip()
    return ""


def validate(data: dict[str, Any]) -> tuple[list[str], list[str]]:
    errors: list[str] = []
    warnings: list[str] = []

    allowed_root = {"$schema", "project", "manual", "theme", "sections"}
    unknown_root = set(data) - allowed_root
    if unknown_root:
        errors.append(f"root: unknown field(s): {', '.join(sorted(unknown_root))}")

    project = data.get("project")
    if not isinstance(project, dict):
        errors.append("project: required object")
    else:
        for field in ("name", "version"):
            if not str(project.get(field, "")).strip():
                errors.append(f"project.{field}: required scalar")

    manual = data.get("manual")
    if not isinstance(manual, dict):
        errors.append("manual: required object")
    else:
        allowed_manual = {"title", "subtitle", "description", "badges", "footer"}
        if set(manual) - allowed_manual:
            errors.append(f"manual: unknown field(s): {', '.join(sorted(set(manual) - allowed_manual))}")
        if not str(manual.get("title", "")).strip():
            errors.append("manual.title: required string")
        if "badges" in manual and not isinstance(manual["badges"], list):
            errors.append("manual.badges: must be an array")

    theme = data.get("theme", {})
    if not isinstance(theme, dict):
        errors.append("theme: must be an object")
    else:
        allowed_theme = {"accent", "accent_secondary", "icon"}
        if set(theme) - allowed_theme:
            errors.append(f"theme: unknown field(s): {', '.join(sorted(set(theme) - allowed_theme))}")
        for field in ("accent", "accent_secondary"):
            if field in theme and not HEX_RE.match(str(theme[field])):
                errors.append(f"theme.{field}: expected a six-digit hex color")

    sections = data.get("sections")
    if not isinstance(sections, list) or not sections:
        errors.append("sections: at least one section is required")
        return errors, warnings

    seen: set[str] = set()
    references: list[tuple[str, str]] = []
    for section_index, section in enumerate(sections):
        location = f"sections[{section_index}]"
        if not isinstance(section, dict):
            errors.append(f"{location}: must be an object")
            continue
        allowed_section = {"id", "title", "description", "entries"}
        if set(section) - allowed_section:
            errors.append(f"{location}: unknown field(s): {', '.join(sorted(set(section) - allowed_section))}")
        section_id = section.get("id")
        if not isinstance(section_id, str) or not ID_RE.match(section_id):
            errors.append(f"{location}.id: use lowercase kebab-case")
        elif section_id in seen:
            errors.append(f"{location}.id: duplicate ID {section_id!r}")
        else:
            seen.add(section_id)
        if not str(section.get("title", "")).strip():
            errors.append(f"{location}.title: required string")
        entries = section.get("entries")
        if not isinstance(entries, list) or not entries:
            errors.append(f"{location}.entries: at least one entry is required")
            continue
        for entry_index, entry in enumerate(entries):
            entry_location = f"{location}.entries[{entry_index}]"
            if not isinstance(entry, dict):
                errors.append(f"{entry_location}: must be an object")
                continue
            allowed_entry = {"id", "title", "summary", "synopsis", "tags", "what", "how", "why", "evidence", "related"}
            if set(entry) - allowed_entry:
                errors.append(f"{entry_location}: unknown field(s): {', '.join(sorted(set(entry) - allowed_entry))}")
            entry_id = entry.get("id")
            if not isinstance(entry_id, str) or not ID_RE.match(entry_id):
                errors.append(f"{entry_location}.id: use lowercase kebab-case")
            elif entry_id in seen:
                errors.append(f"{entry_location}.id: duplicate ID {entry_id!r}")
            else:
                seen.add(entry_id)
            if not str(entry.get("title", "")).strip():
                errors.append(f"{entry_location}.title: required string")
            for dimension in ("what", "how", "why"):
                value = entry.get(dimension)
                valid_dimension = (
                    isinstance(value, str)
                    or (isinstance(value, list) and bool(value) and all(isinstance(item, str) and item.strip() for item in value))
                    or (
                        isinstance(value, dict)
                        and not (set(value) - {"lead", "points"})
                        and isinstance(value.get("lead", ""), str)
                        and (bool(str(value.get("lead", "")).strip()) or bool(value.get("points")))
                        and isinstance(value.get("points", []), list)
                        and all(isinstance(item, str) and item.strip() for item in value.get("points", []))
                    )
                )
                text = dimension_text(value)
                if not valid_dimension:
                    errors.append(f"{entry_location}.{dimension}: expected a string, string array, or lead/points object")
                if not text:
                    errors.append(f"{entry_location}.{dimension}: required content")
                elif TODO_RE.search(text):
                    errors.append(f"{entry_location}.{dimension}: contains placeholder text")
            tags = entry.get("tags", [])
            if not isinstance(tags, list) or not all(isinstance(item, str) for item in tags):
                errors.append(f"{entry_location}.tags: must be an array of strings")
            evidence = entry.get("evidence", [])
            if not evidence:
                warnings.append(f"{entry_location}: has no evidence")
            elif not isinstance(evidence, list):
                errors.append(f"{entry_location}.evidence: must be an array")
            else:
                for evidence_index, item in enumerate(evidence):
                    if isinstance(item, str) and item.strip():
                        continue
                    if isinstance(item, dict) and set(item) == {"label", "target"} and all(isinstance(item[key], str) and item[key].strip() for key in item):
                        continue
                    errors.append(f"{entry_location}.evidence[{evidence_index}]: expected a string or label/target object")
            related_items = entry.get("related", [])
            if not isinstance(related_items, list) or not all(isinstance(item, str) for item in related_items):
                errors.append(f"{entry_location}.related: must be an array of IDs")
                related_items = []
            for related in related_items:
                references.append((entry_location, related))

    for location, target in references:
        if target not in seen:
            warnings.append(f"{location}.related: unknown ID {target!r}")
    return errors, warnings


def inline(text: Any) -> str:
    """Render a deliberately small, HTML-escaped inline notation."""
    value = html.escape(str(text), quote=True)
    tokens: list[str] = []

    def stash(fragment: str) -> str:
        tokens.append(fragment)
        return f"\x00{len(tokens) - 1}\x00"

    value = re.sub(r"`([^`]+)`", lambda m: stash(f"<code>{m.group(1)}</code>"), value)

    def link(match: re.Match[str]) -> str:
        label, target = match.group(1), html.unescape(match.group(2))
        safe_link = re.match(
            r"^(?:https?://|mailto:|#[a-z0-9_-]+$|(?:\.\.?/)?[a-z0-9][a-z0-9._/-]*(?:#[a-z0-9_-]+)?$)",
            target,
            re.IGNORECASE,
        )
        if not safe_link:
            return match.group(0)
        safe_target = html.escape(target, quote=True)
        return stash(f'<a href="{safe_target}" rel="noreferrer">{label}</a>')

    value = re.sub(r"\[([^\]]+)\]\(([^)]+)\)", link, value)
    value = re.sub(r"\*\*([^*]+)\*\*", r"<strong>\1</strong>", value)
    value = re.sub(r"(?<!\*)\*([^*]+)\*(?!\*)", r"<em>\1</em>", value)
    for index, token in enumerate(tokens):
        value = value.replace(f"\x00{index}\x00", token)
    return value


def render_dimension(label: str, kind: str, value: Any) -> str:
    if isinstance(value, str):
        body = f"<p>{inline(value)}</p>"
    elif isinstance(value, list):
        items = "".join(f"<li>{inline(item)}</li>" for item in value)
        body = f"<ol>{items}</ol>"
    else:
        lead = value.get("lead", "") if isinstance(value, dict) else ""
        points = value.get("points", []) if isinstance(value, dict) else []
        lead_html = f"<p>{inline(lead)}</p>" if lead else ""
        points_html = "".join(f"<li>{inline(item)}</li>" for item in points)
        body = lead_html + (f"<ol>{points_html}</ol>" if points else "")
    return f'<section class="dimension {kind}"><h4>{label}</h4>{body}</section>'


def evidence_html(items: Iterable[Any]) -> str:
    rendered: list[str] = []
    for item in items:
        if isinstance(item, dict):
            label, target = item.get("label", "Evidence"), item.get("target", "")
        else:
            label = target = str(item)
        if re.match(r"^https?://", str(target), re.IGNORECASE):
            target_html = f'<a href="{html.escape(str(target), quote=True)}" rel="noreferrer">{inline(target)}</a>'
        else:
            target_html = f"<code>{html.escape(str(target))}</code>"
        rendered.append(f"<li><span>{inline(label)}</span> {target_html}</li>")
    if not rendered:
        return ""
    return '<details class="evidence"><summary>Evidence</summary><ul>' + "".join(rendered) + "</ul></details>"


def render_entry(entry: dict[str, Any], titles: dict[str, str]) -> str:
    entry_id = entry["id"]
    tags = entry.get("tags", [])
    badges = "".join(f'<span class="badge">{inline(tag)}</span>' for tag in tags)
    summary = f'<p class="entry-summary">{inline(entry["summary"])}</p>' if entry.get("summary") else ""
    synopsis = f'<pre><code>{html.escape(str(entry["synopsis"]))}</code></pre>' if entry.get("synopsis") else ""
    related = ""
    if entry.get("related"):
        links = " · ".join(
            f'<a href="#{html.escape(target, quote=True)}">{inline(titles.get(target, target))}</a>'
            for target in entry["related"]
        )
        related = f'<p class="related"><strong>Related:</strong> {links}</p>'
    evidence_text = " ".join(
        f'{item.get("label", "")} {item.get("target", "")}' if isinstance(item, dict) else str(item)
        for item in entry.get("evidence", [])
    )
    searchable = " ".join(
        [entry.get("title", ""), entry.get("summary", ""), *tags,
         dimension_text(entry.get("what")), dimension_text(entry.get("how")), dimension_text(entry.get("why")), evidence_text]
    ).lower()
    return f'''<article class="entry" id="{html.escape(entry_id, quote=True)}" data-search="{html.escape(searchable, quote=True)}">
      <div class="entry-heading"><h3>{inline(entry["title"])}</h3><a class="anchor" href="#{html.escape(entry_id, quote=True)}" aria-label="Link to this entry">#</a></div>
      <div class="badges">{badges}</div>{summary}{synopsis}
      <div class="triad">
        {render_dimension("What it does", "what", entry["what"])}
        {render_dimension("How it works", "how", entry["how"])}
        {render_dimension("Why it works this way", "why", entry["why"])}
      </div>
      {evidence_html(entry.get("evidence", []))}{related}
    </article>'''


STYLE = r"""
:root{--bg:#0d1117;--panel:#161b22;--panel2:#21262d;--border:#30363d;--text:#e6edf3;--muted:#8b949e;--accent:ACCENT;--accent2:ACCENT2;--what:#38bdf8;--how:#f59e0b;--why:#3fb950;color-scheme:dark}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:16px/1.65 system-ui,-apple-system,"Segoe UI",sans-serif;display:flex;min-height:100vh}a{color:var(--accent)}code,pre{font-family:ui-monospace,SFMono-Regular,Consolas,monospace}.sidebar{width:310px;height:100vh;position:sticky;top:0;overflow:auto;flex:none;padding:1.5rem;background:var(--panel);border-right:1px solid var(--border)}.brand{display:flex;gap:.7rem;align-items:center;margin-bottom:.25rem}.brand-icon{font-size:1.7rem;color:var(--accent)}.brand h1{font-size:1.1rem;margin:0}.version{font:12px ui-monospace,monospace;color:var(--accent)}.search{width:100%;margin:1.25rem 0;padding:.65rem .75rem;border:1px solid var(--border);border-radius:7px;background:var(--bg);color:var(--text)}nav h2{margin:1.3rem 0 .35rem;font-size:.72rem;text-transform:uppercase;letter-spacing:.08em;color:var(--muted)}nav ul{list-style:none;padding:0;margin:0}nav a{display:block;padding:.3rem .45rem;text-decoration:none;color:var(--muted);font-size:.87rem;border-radius:5px}nav a:hover{color:var(--accent);background:var(--panel2)}.content{width:min(100%,1040px);padding:3.5rem 3rem 6rem;margin:0 auto}.hero h1{font-size:clamp(2.1rem,5vw,3.25rem);line-height:1.1;margin:0 0 .7rem;background:linear-gradient(120deg,var(--text),var(--accent));background-clip:text;color:transparent}.subtitle{font-size:1.2rem;color:var(--muted);margin:.2rem 0}.description{max-width:72ch}.badges{display:flex;gap:.4rem;flex-wrap:wrap;margin:.8rem 0}.badge{border:1px solid color-mix(in srgb,var(--accent) 45%,var(--border));border-radius:999px;padding:.15rem .55rem;color:var(--muted);font:12px ui-monospace,monospace}.principle{margin:2rem 0;padding:1rem 1.2rem;border-left:4px solid var(--accent);background:color-mix(in srgb,var(--accent) 8%,var(--panel));border-radius:7px}.manual-section{margin-top:4rem}.section-heading{font-size:1.8rem;padding-bottom:.5rem;border-bottom:1px solid var(--border);scroll-margin-top:1rem}.section-description{color:var(--muted)}.entry{scroll-margin-top:1rem;margin:2rem 0;padding:1.5rem;background:var(--panel);border:1px solid var(--border);border-radius:10px}.entry-heading{display:flex;align-items:center;gap:.6rem}.entry h3{margin:0;color:var(--accent);font-size:1.35rem}.anchor{text-decoration:none;opacity:0}.entry:hover .anchor,.anchor:focus{opacity:1}.entry-summary{font-size:1.05rem}.triad{display:grid;gap:1rem;grid-template-columns:repeat(3,minmax(0,1fr));margin-top:1.2rem}.dimension{padding:1rem;background:var(--bg);border-top:3px solid;border-radius:6px}.dimension h4{margin:0 0 .65rem;font-size:.78rem;text-transform:uppercase;letter-spacing:.06em}.dimension p,.dimension ol{margin:.4rem 0}.dimension ol{padding-left:1.2rem}.dimension.what{border-color:var(--what)}.dimension.what h4{color:var(--what)}.dimension.how{border-color:var(--how)}.dimension.how h4{color:var(--how)}.dimension.why{border-color:var(--why)}.dimension.why h4{color:var(--why)}pre{overflow:auto;padding:.8rem;background:#090d13;border:1px solid var(--border);border-radius:6px;color:#7ee787}.evidence{margin-top:1rem;color:var(--muted)}.evidence summary{cursor:pointer;color:var(--text)}.evidence li span{color:var(--muted);margin-right:.4rem}.related{font-size:.9rem;color:var(--muted)}.empty{display:none;padding:2rem;border:1px dashed var(--border);color:var(--muted);text-align:center}.doc-footer{margin-top:5rem;padding-top:1.5rem;border-top:1px solid var(--border);color:var(--muted);font-size:.85rem}.hidden{display:none!important}body.no-results .empty{display:block}@media(max-width:900px){body{display:block}.sidebar{position:relative;width:100%;height:auto;border-right:0;border-bottom:1px solid var(--border)}nav{display:none}.content{padding:2rem 1.15rem}.triad{grid-template-columns:1fr}}@media print{body{display:block;background:#fff;color:#111}.sidebar,.search,.anchor{display:none}.content{width:100%;padding:0}.hero h1{color:#111}.entry{break-inside:avoid;background:#fff;border-color:#bbb}.dimension{background:#fff}.badges{color:#333}}
"""


SCRIPT = r"""
const input=document.querySelector('#manual-search');
const entries=[...document.querySelectorAll('.entry')];
const sections=[...document.querySelectorAll('.manual-section')];
input.addEventListener('input',()=>{const query=input.value.trim().toLowerCase();let visible=0;entries.forEach(entry=>{const match=!query||entry.dataset.search.includes(query);entry.classList.toggle('hidden',!match);if(match)visible++});sections.forEach(section=>section.classList.toggle('hidden',![...section.querySelectorAll('.entry')].some(entry=>!entry.classList.contains('hidden'))));document.body.classList.toggle('no-results',visible===0)});
"""


def build_html(data: dict[str, Any]) -> str:
    project, manual = data["project"], data["manual"]
    theme = data.get("theme", {})
    accent = theme.get("accent", "#38bdf8")
    accent2 = theme.get("accent_secondary", "#a855f7")
    icon = theme.get("icon", "◇")
    titles = {entry["id"]: entry["title"] for section in data["sections"] for entry in section["entries"]}
    nav = "".join(
        f'<section><h2><a href="#{html.escape(section["id"], quote=True)}">{inline(section["title"])}</a></h2><ul>'
        + "".join(f'<li><a href="#{html.escape(entry["id"], quote=True)}">{inline(entry["title"])}</a></li>' for entry in section["entries"])
        + "</ul></section>" for section in data["sections"]
    )
    sections = "".join(
        f'<section class="manual-section" id="{html.escape(section["id"], quote=True)}"><h2 class="section-heading">{inline(section["title"])}</h2>'
        + (f'<p class="section-description">{inline(section["description"])}</p>' if section.get("description") else "")
        + "".join(render_entry(entry, titles) for entry in section["entries"])
        + "</section>" for section in data["sections"]
    )
    badges = "".join(f'<span class="badge">{inline(badge)}</span>' for badge in manual.get("badges", []))
    subtitle = f'<p class="subtitle">{inline(manual["subtitle"])}</p>' if manual.get("subtitle") else ""
    description = f'<p class="description">{inline(manual["description"])}</p>' if manual.get("description") else ""
    footer = inline(manual.get("footer", f'{project["name"]} {project["version"]}'))
    style = STYLE.replace("ACCENT2", str(accent2)).replace("ACCENT", str(accent))
    return f'''<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="generator" content="3x Documentation Scheme"><title>{html.escape(str(manual["title"]))}</title><style>{style}</style></head>
<body><aside class="sidebar"><div class="brand"><span class="brand-icon" aria-hidden="true">{inline(icon)}</span><h1>{inline(project.get("short_name", project["name"]))}</h1></div>
<div class="version">{inline(project["version"])}</div><label for="manual-search" class="hidden">Search manual</label><input id="manual-search" class="search" type="search" placeholder="Search this manual…" autocomplete="off"><nav>{nav}</nav></aside>
<main class="content"><header class="hero"><h1>{inline(manual["title"])}</h1>{subtitle}{description}<div class="badges">{badges}</div>
<div class="principle"><strong>The 3x reading contract:</strong> every entry explains what it does, how it works, and why it works that way.</div></header>
<div class="empty">No entries match that search.</div>{sections}<footer class="doc-footer">{footer}</footer></main><script>{SCRIPT}</script></body></html>'''


def prepared(path: Path, overrides: list[str]) -> dict[str, Any]:
    data = load_source(path)
    for expression in overrides:
        apply_override(data, expression)
    # Resolve against a stable pre-expansion copy so replacements are deterministic.
    context = copy.deepcopy(data)
    return expand_placeholders(data, context)


def report(errors: list[str], warnings: list[str]) -> None:
    for warning in warnings:
        print(f"warning: {warning}", file=sys.stderr)
    for error in errors:
        print(f"error: {error}", file=sys.stderr)


def run_check(source: Path, overrides: list[str]) -> int:
    data = prepared(source, overrides)
    errors, warnings = validate(data)
    report(errors, warnings)
    if errors:
        print(f"check failed: {len(errors)} error(s), {len(warnings)} warning(s)", file=sys.stderr)
        return 1
    entries = sum(len(section["entries"]) for section in data["sections"])
    print(f"check passed: {len(data['sections'])} section(s), {entries} entry/entries, {len(warnings)} warning(s)")
    return 0


def run_build(source: Path, output: Path, overrides: list[str]) -> int:
    data = prepared(source, overrides)
    errors, warnings = validate(data)
    report(errors, warnings)
    if errors:
        print("build stopped because validation failed", file=sys.stderr)
        return 1
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(build_html(data), encoding="utf-8")
    print(f"built {output} ({output.stat().st_size:,} bytes, {len(warnings)} warning(s))")
    return 0


def starter(name: str) -> dict[str, Any]:
    slug = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "my-project"
    return {
        "$schema": "manual.schema.json",
        "project": {"name": name, "short_name": name, "version": "0.1.0", "repository": ""},
        "manual": {
            "title": "{{project.name}} Manual",
            "subtitle": "Behavior, internals, and design rationale",
            "description": "A living manual for {{project.name}}.",
            "badges": ["Release {{project.version}}"],
            "footer": "{{project.name}} {{project.version}}"
        },
        "theme": {"accent": "#38bdf8", "accent_secondary": "#a855f7", "icon": "◇"},
        "sections": [{
            "id": "foundations", "title": "Foundations", "description": "The essential product and architecture concepts.",
            "entries": [{
                "id": f"{slug}-overview", "title": f"{name} overview", "summary": "The shortest useful description of this subject.",
                "tags": ["overview"],
                "what": "TODO: Describe observable behavior, inputs, outputs, and guarantees.",
                "how": ["TODO: Describe the execution or data flow.", "Name important boundaries and failure behavior."],
                "why": "TODO: Explain the constraints, trade-offs, and rejected alternatives behind the design.",
                "evidence": [{"label": "Implementation", "target": "path/to/source"}], "related": []
            }]
        }]
    }


def run_init(output: Path, name: str, force: bool) -> int:
    if output.exists() and not force:
        raise ManualError(f"refusing to overwrite {output}; pass --force if that is intentional")
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_text(json.dumps(starter(name), indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"created {output}")
    return 0


def parser() -> argparse.ArgumentParser:
    result = argparse.ArgumentParser(description="Create portable What/How/Why project manuals")
    commands = result.add_subparsers(dest="command", required=True)
    init = commands.add_parser("init", help="create a starter manual source")
    init.add_argument("output", type=Path)
    init.add_argument("--name", default="My Project")
    init.add_argument("--force", action="store_true")
    for command, help_text in (("check", "validate a manual source"), ("build", "build a standalone HTML manual"), ("watch", "rebuild when the source changes")):
        item = commands.add_parser(command, help=help_text)
        item.add_argument("source", type=Path)
        item.add_argument("--set", action="append", default=[], metavar="PATH=VALUE", dest="overrides")
        if command != "check":
            item.add_argument("--output", type=Path, default=Path("manual.html"))
    return result


def main() -> int:
    args = parser().parse_args()
    try:
        if args.command == "init":
            return run_init(args.output, args.name, args.force)
        if args.command == "check":
            return run_check(args.source, args.overrides)
        if args.command == "build":
            return run_build(args.source, args.output, args.overrides)
        print(f"watching {args.source}; press Ctrl-C to stop")
        previous: Optional[int] = None
        while True:
            try:
                modified = args.source.stat().st_mtime_ns
                if modified != previous:
                    run_build(args.source, args.output, args.overrides)
                    previous = modified
                time.sleep(0.5)
            except FileNotFoundError:
                if previous is not None:
                    print(f"waiting for {args.source} to reappear", file=sys.stderr)
                    previous = None
                time.sleep(0.5)
    except KeyboardInterrupt:
        return 0
    except ManualError as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1


if __name__ == "__main__":
    raise SystemExit(main())
