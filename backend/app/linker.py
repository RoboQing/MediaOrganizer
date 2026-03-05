from __future__ import annotations
from dataclasses import dataclass
from pathlib import Path
import errno
import os
import shutil

from .security import safe_filename


@dataclass
class LinkPlan:
    src: Path
    dst: Path


def ensure_dir(p: Path) -> None:
    p.mkdir(parents=True, exist_ok=True)


def build_tv_plans(
    selected_files: list[Path],
    output_root: Path,
    show_name: str,
    year: str,
    season: int,
    start_episode: int,
) -> list[LinkPlan]:
    show = safe_filename(show_name)
    y = (year or "").strip()

    # TV：文件夹带年份（若有），文件名不带年份
    show_folder = f"{show} ({y})" if y else show
    season_dir = output_root / show_folder / f"Season {season}"
    ensure_dir(season_dir)

    files_sorted = sorted(selected_files, key=lambda p: p.name.lower())
    plans: list[LinkPlan] = []
    ep = start_episode

    for src in files_sorted:
        ext = src.suffix
        dst_name = f"{show} - S{season:02d}E{ep:02d} - 第{ep:02d}集{ext}"
        dst = season_dir / dst_name
        plans.append(LinkPlan(src=src, dst=dst))
        ep += 1

    return plans


def build_movie_plans(
    selected_files: list[Path],
    output_root: Path,
    title: str,
    year: str,
    quality: str,
) -> list[LinkPlan]:
    t = safe_filename(title)
    y = (year or "").strip()
    q = safe_filename(quality)

    folder = f"{t} ({y})" if y else t
    movie_dir = output_root / folder
    ensure_dir(movie_dir)

    files_sorted = sorted(selected_files, key=lambda p: p.name.lower())
    plans: list[LinkPlan] = []
    for i, src in enumerate(files_sorted, start=1):
        ext = src.suffix
        suffix = "" if len(files_sorted) == 1 else f" - Part{i}"
        base = f"{t} ({y})" if y else t
        dst_name = f"{base} - {q}{suffix}{ext}"
        dst = movie_dir / dst_name
        plans.append(LinkPlan(src=src, dst=dst))

    return plans


def execute_plans(plans: list[LinkPlan], cross_device_fallback: str) -> tuple[int, list[str]]:
    ok = 0
    errors: list[str] = []

    for plan in plans:
        src, dst = plan.src, plan.dst
        try:
            if not src.exists() or not src.is_file():
                raise FileNotFoundError(f"Source not found: {src}")
            if dst.exists():
                raise FileExistsError(f"Target exists: {dst}")

            ensure_dir(dst.parent)
            os.link(str(src), str(dst))
            ok += 1

        except OSError as e:
            if e.errno == errno.EXDEV:
                if cross_device_fallback == "error":
                    errors.append(f"EXDEV cross-device hardlink failed: {src} -> {dst}")
                    continue
                try:
                    if cross_device_fallback == "symlink":
                        os.symlink(str(src), str(dst))
                    elif cross_device_fallback == "copy":
                        shutil.copy2(str(src), str(dst))
                    else:
                        errors.append(f"Unknown fallback: {cross_device_fallback}")
                        continue
                    ok += 1
                except Exception as e2:
                    errors.append(f"Fallback {cross_device_fallback} failed: {src} -> {dst} ({e2})")
            else:
                errors.append(f"Link failed: {src} -> {dst} ({e})")
        except Exception as e:
            errors.append(f"Link failed: {src} -> {dst} ({e})")

    return ok, errors