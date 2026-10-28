"""Safely update Colaus branding in the frontend and backend text sources."""

from __future__ import annotations

import os
import re
import sys
from pathlib import Path


TEXT_EXTENSIONS = {
    ".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".mts", ".cts",
    ".html", ".css", ".json", ".md", ".yml", ".yaml", ".txt", ".example",
}
SKIP_DIRS = {".git", "node_modules", "dist", "build", "coverage", ".next"}
FRONTEND_URL = "https://tejassai.vercel.app"
FRONTEND_URL_REPLACEMENT = "https://colaus.vercel.app"

# These values are tied to existing infrastructure, user storage, or image assets.
# Keep them stable while changing the visible product name.
PRESERVE_PATTERNS = [
    r"https://github\.com/nitiish877/tejas(?:\.git)?",
    r"\bcd tejas\b",
    r"https://tejas-backed\.vercel\.app",
    r"https://tejasbacked-production-[^\s\"'`]+",
    r"support@tejasai\.app",
    r"tejas-logo-transparent\.png",
    r"/workspace/tejas-project",
    r"tejas_[A-Za-z0-9_]+",
]


def replace_brand(match: re.Match[str]) -> str:
    original = match.group(0)
    if original.isupper():
        return "COLAUS"
    if original.islower():
        return "colaus"
    return "Colaus"


def update_text(content: str) -> str:
    protected: list[str] = []

    def hold(match: re.Match[str]) -> str:
        token = f"__COLAUS_PRESERVE_{len(protected)}__"
        protected.append(match.group(0))
        return token

    for pattern in PRESERVE_PATTERNS:
        content = re.sub(pattern, hold, content, flags=re.IGNORECASE)

    content = content.replace(FRONTEND_URL, FRONTEND_URL_REPLACEMENT)
    content = re.sub(r"\btejas\b", replace_brand, content, flags=re.IGNORECASE)

    for index, original in enumerate(protected):
        content = content.replace(f"__COLAUS_PRESERVE_{index}__", original)
    return content


def process_root(root: Path) -> int:
    changed = 0
    for current, dirs, filenames in os.walk(root):
        dirs[:] = [name for name in dirs if name not in SKIP_DIRS]
        for filename in filenames:
            path = Path(current) / filename
            if path.name == Path(__file__).name or path.suffix.lower() not in TEXT_EXTENSIONS:
                continue
            try:
                original = path.read_text(encoding="utf-8")
            except (UnicodeDecodeError, OSError):
                continue
            updated = update_text(original)
            if updated != original:
                path.write_text(updated, encoding="utf-8", newline="")
                changed += 1
                print(f"Updated: {path}")
    return changed


if __name__ == "__main__":
    roots = [Path(arg).resolve() for arg in sys.argv[1:]] or [Path.cwd()]
    total = sum(process_root(root) for root in roots)
    print(f"Done. Text files changed: {total}")
