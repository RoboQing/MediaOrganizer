from __future__ import annotations
from pathlib import Path


def resolve_safe(p: Path) -> Path:
    # strict=False: allow paths that don't exist yet (dst)
    return p.resolve(strict=False)


def is_under_roots(p: Path, roots: list[Path]) -> bool:
    try:
        rp = resolve_safe(p)
        for r in roots:
            rr = resolve_safe(r)
            if rr == rp or rr in rp.parents:
                return True
        return False
    except Exception:
        return False


def safe_filename(name: str) -> str:
    bad = ['/', '\\', ':', '*', '?', '"', '<', '>', '|']
    for b in bad:
        name = name.replace(b, " ")
    return " ".join(name.split()).strip()