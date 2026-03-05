from __future__ import annotations
from pathlib import Path
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from .config import load_config, get_tmdb_api_key
from .security import is_under_roots, safe_filename
from .tmdb import TMDBClient
from .linker import build_tv_plans, build_movie_plans, execute_plans, LinkPlan


CONFIG_PATH = "/config/config.yaml"
CFG = load_config(CONFIG_PATH)

tmdb_key = get_tmdb_api_key()
TMDB = TMDBClient(tmdb_key, CFG.tmdb.base_url, CFG.tmdb.language) if tmdb_key else None

app = FastAPI(title="Media Organizer API")

# front-end dev server uses 5173; allow it
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class TreeResp(BaseModel):
    path: str
    dirs: list[str]
    files: list[str]


@app.get("/api/config")
def get_config():
    return {
        "browse_roots": [str(p) for p in CFG.browse_roots],
        "output_roots": [str(p) for p in CFG.output_roots],
        "default_movie_quality": CFG.default_movie_quality,
        "default_season": CFG.default_season,
        "tmdb_enabled": TMDB is not None,
    }


@app.get("/api/tree", response_model=TreeResp)
def tree(path: str):
    p = Path(path)
    if not is_under_roots(p, CFG.browse_roots):
        raise HTTPException(403, f"path not allowed: {path}")
    if not p.exists() or not p.is_dir():
        raise HTTPException(404, f"not a dir: {path}")

    dirs, files = [], []
    for child in p.iterdir():
        if child.is_dir():
            dirs.append(child.name)
        elif child.is_file():
            files.append(child.name)

    dirs.sort(key=str.lower)
    files.sort(key=str.lower)
    return TreeResp(path=str(p), dirs=dirs, files=files)


class TMDBSearchReq(BaseModel):
    query: str


@app.post("/api/tmdb/search")
def tmdb_search(req: TMDBSearchReq):
    if TMDB is None:
        raise HTTPException(400, "TMDB not enabled (TMDB_API_KEY not set)")
    q = req.query.strip()
    if not q:
        return []
    items = TMDB.search_multi(q)
    return [
        {"media_type": it.media_type, "tmdb_id": it.tmdb_id, "title": it.title, "year": it.year}
        for it in items
    ]


class PlanReq(BaseModel):
    mode: str  # "tv" | "movie"
    selected_files: list[str]
    output_root: str
    title: str
    year: str | None = ""
    season: int | None = None
    start_episode: int | None = 1
    quality: str | None = None


class LinkPlanOut(BaseModel):
    src: str
    dst: str


@app.post("/api/plan", response_model=list[LinkPlanOut])
def plan(req: PlanReq):
    out_root = Path(req.output_root)
    if str(out_root) not in {str(p) for p in CFG.output_roots}:
        raise HTTPException(400, "output_root not in config output_roots")

    title = safe_filename(req.title.strip())
    if not title:
        raise HTTPException(400, "title required")

    files: list[Path] = []
    for s in req.selected_files:
        p = Path(s)
        if not is_under_roots(p, CFG.browse_roots):
            raise HTTPException(403, f"file not allowed: {s}")
        if not p.exists() or not p.is_file():
            raise HTTPException(404, f"file not found: {s}")
        files.append(p)

    files.sort(key=lambda p: p.name.lower())

    plans: list[LinkPlan]
    if req.mode == "tv":
        season = int(req.season if req.season is not None else CFG.default_season)
        start_ep = int(req.start_episode or 1)
        year = (req.year or "").strip()
        plans = build_tv_plans(files, out_root, title, year, season, start_ep)
    elif req.mode == "movie":
        year = (req.year or "").strip()
        quality = (req.quality or CFG.default_movie_quality).strip()
        plans = build_movie_plans(files, out_root, title, year, quality)
    else:
        raise HTTPException(400, "mode must be tv or movie")

    return [LinkPlanOut(src=str(p.src), dst=str(p.dst)) for p in plans]


class ApplyReq(BaseModel):
    plans: list[LinkPlanOut]


@app.post("/api/apply")
def apply(req: ApplyReq):
    plans: list[LinkPlan] = []
    for p in req.plans:
        src = Path(p.src)
        dst = Path(p.dst)

        if not is_under_roots(src, CFG.browse_roots):
            raise HTTPException(403, f"src not allowed: {src}")
        if not is_under_roots(dst, CFG.output_roots):
            raise HTTPException(403, f"dst not allowed: {dst}")

        plans.append(LinkPlan(src=src, dst=dst))

    ok, errors = execute_plans(plans, CFG.cross_device_fallback)
    return {"ok": ok, "errors": errors}