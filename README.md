# Media Organizer (FastAPI + React)

## Features
- Browse container filesystem (restricted roots, lazy loading)
- Multi-select files from table and add to selection
- TMDB search (optional via TMDB_API_KEY)
- Plan preview (src -> dst)
- Apply hardlinks (os.link) with configurable cross-device fallback

## Run
```bash
export TMDB_API_KEY="xxx"   # optional
docker compose up --build
# open http://localhost:5173