# Media Organizer (FastAPI + React)

A lightweight media organization tool designed to help manage and organize video files inside containers.  
It provides filesystem browsing, metadata search, and automated linking/renaming workflows.

## Features

- Browse container filesystem (restricted roots, lazy loading)
- Multi-select files from table and add to selection
- TMDB search (optional via `TMDB_API_KEY`)
- Plan preview (`src -> dst`)
- Apply hardlinks (`os.link`) with configurable cross-device fallback

## Roadmap

- ☑ Change backend user id
- ☐ File metadata history
- ☐ Richer file naming formats
- ☐ Multiple file operation modes (hardlink / move / copy / symlink)

## Run

```bash
export TMDB_API_KEY="xxx"   # optional
docker compose up --build
