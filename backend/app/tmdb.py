from __future__ import annotations
from dataclasses import dataclass
import requests


@dataclass
class TMDBItem:
    media_type: str  # "movie" | "tv"
    tmdb_id: int
    title: str
    year: str


class TMDBClient:
    def __init__(self, api_key: str, base_url: str, language: str = "zh-CN", timeout_sec: int = 10):
        self.api_key = api_key
        self.base_url = base_url.rstrip("/")
        self.language = language
        self.timeout_sec = timeout_sec

    def search_multi(self, query: str, page: int = 1) -> list[TMDBItem]:
        url = f"{self.base_url}/search/multi"
        r = requests.get(
            url,
            params={
                "api_key": self.api_key,
                "language": self.language,
                "query": query,
                "page": page,
                "include_adult": "false",
            },
            timeout=self.timeout_sec,
        )
        r.raise_for_status()
        data = r.json()

        out: list[TMDBItem] = []
        for x in data.get("results", []) or []:
            mt = x.get("media_type")
            if mt not in ("movie", "tv"):
                continue
            tmdb_id = x.get("id")
            if not isinstance(tmdb_id, int):
                continue

            if mt == "movie":
                title = (x.get("title") or x.get("original_title") or "").strip()
                date = x.get("release_date") or ""
            else:
                title = (x.get("name") or x.get("original_name") or "").strip()
                date = x.get("first_air_date") or ""

            year = date[:4] if len(date) >= 4 and date[:4].isdigit() else ""
            if title:
                out.append(TMDBItem(media_type=mt, tmdb_id=tmdb_id, title=title, year=year))

        return out[:50]