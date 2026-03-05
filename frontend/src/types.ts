export type ApiConfig = {
  browse_roots: string[];
  output_roots: string[];
  default_movie_quality: string;
  default_season: number;
  tmdb_enabled: boolean;
};

export type TreeResp = {
  path: string;
  dirs: string[];
  files: string[];
};

export type TmdbItem = {
  media_type: "movie" | "tv";
  tmdb_id: number;
  title: string;
  year: string;
};

export type LinkPlan = {
  src: string;
  dst: string;
};