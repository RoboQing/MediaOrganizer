from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import os
import yaml


@dataclass
class TMDBConfig:
    base_url: str
    language: str


@dataclass
class AppConfig:
    browse_roots: list[Path]
    output_roots: list[Path]
    default_movie_quality: str
    default_season: int
    cross_device_fallback: str  # error|symlink|copy
    tmdb: TMDBConfig


def load_config(config_path: str) -> AppConfig:
    p = Path(config_path)
    if not p.exists():
        raise FileNotFoundError(f"Config not found: {config_path}")

    raw = yaml.safe_load(p.read_text(encoding="utf-8")) or {}
    tmdb_raw = raw.get("tmdb", {}) or {}

    browse_roots = [Path(x) for x in (raw.get("browse_roots") or ["/data"])]
    output_roots = [Path(x) for x in (raw.get("output_roots") or ["/out"])]

    cfg = AppConfig(
        browse_roots=browse_roots,
        output_roots=output_roots,
        default_movie_quality=str(raw.get("default_movie_quality", "1080p")),
        default_season=int(raw.get("default_season", 1)),
        cross_device_fallback=str(raw.get("cross_device_fallback", "error")),
        tmdb=TMDBConfig(
            base_url=str(tmdb_raw.get("base_url", "https://api.themoviedb.org/3")),
            language=str(tmdb_raw.get("language", "zh-CN")),
        ),
    )

    if cfg.cross_device_fallback not in ("error", "symlink", "copy"):
        raise ValueError("cross_device_fallback must be one of: error|symlink|copy")

    if not cfg.browse_roots:
        raise ValueError("browse_roots is empty")
    if not cfg.output_roots:
        raise ValueError("output_roots is empty")

    return cfg


def get_tmdb_api_key() -> str | None:
    return os.environ.get("TMDB_API_KEY")