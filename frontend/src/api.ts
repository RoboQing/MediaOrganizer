import type { ApiConfig, TreeResp, TmdbItem, LinkPlan } from "./types";

const API_BASE = "http://localhost:8000";

async function j<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const text = await res.text();
    throw new Error(text || `HTTP ${res.status}`);
  }
  return (await res.json()) as T;
}

export async function getConfig(): Promise<ApiConfig> {
  const res = await fetch(`${API_BASE}/api/config`);
  return j<ApiConfig>(res);
}

export async function getTree(path: string): Promise<TreeResp> {
  const u = new URL(`${API_BASE}/api/tree`);
  u.searchParams.set("path", path);
  const res = await fetch(u.toString());
  return j<TreeResp>(res);
}

export async function tmdbSearch(query: string): Promise<TmdbItem[]> {
  const res = await fetch(`${API_BASE}/api/tmdb/search`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  return j<TmdbItem[]>(res);
}

export type PlanReq = {
  mode: "tv" | "movie";
  selected_files: string[];
  output_root: string;
  title: string;
  year?: string;
  season?: number;
  start_episode?: number;
  quality?: string;
};

export async function buildPlan(req: PlanReq): Promise<LinkPlan[]> {
  const res = await fetch(`${API_BASE}/api/plan`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(req),
  });
  return j<LinkPlan[]>(res);
}

export async function applyPlan(plans: LinkPlan[]): Promise<{ ok: number; errors: string[] }> {
  const res = await fetch(`${API_BASE}/api/apply`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ plans }),
  });
  return j<{ ok: number; errors: string[] }>(res);
}