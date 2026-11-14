import type { Anime } from "./types";

/** Kitsu JSON:API; public reads only. All external calls run on the Next.js server. */
// Try the currently used Kitsu host first, then its legacy hostname.
// Public anime browsing is intentionally independent of Supabase authentication.
const API_BASES = ["https://kitsu.app/api/edge", "https://kitsu.io/api/edge"] as const;

import { GENRES, SEASONS, SORT_OPTIONS, TYPE_OPTIONS, type BrowseParams } from "./anime-filters";
export { GENRES, SEASONS, SORT_OPTIONS, TYPE_OPTIONS } from "./anime-filters";
export type { BrowseParams } from "./anime-filters";

export type BrowseResult = { items: Anime[]; page: number; hasNext: boolean; total: number | null; error?: string };
type KitsuAnime = {
  id: string;
  attributes: {
    slug?: string; canonicalTitle?: string; titles?: { en?: string; en_jp?: string; ja_jp?: string };
    synopsis?: string; description?: string;
    posterImage?: { small?: string; medium?: string; large?: string; original?: string } | null;
    coverImage?: { large?: string; original?: string } | null;
    averageRating?: string | null; popularityRank?: number | null; ratingRank?: number | null;
    episodeCount?: number | null; status?: string; startDate?: string | null;
    subtype?: string; ageRating?: string | null; youtubeVideoId?: string | null;
  };
};
type ListResponse = { data?: KitsuAnime[]; links?: { next?: string | null }; meta?: { count?: number } };
type ItemResponse = { data?: KitsuAnime };

async function request<T>(path: string, query?: Record<string, string>, noStore = false): Promise<T> {
  const errors: string[] = [];
  for (const base of API_BASES) {
    const url = new URL(`${base}${path}`);
    Object.entries(query || {}).forEach(([key, value]) => {
      if (value) url.searchParams.set(key, value);
    });
    try {
      const res = await fetch(url.toString(), {
        headers: { Accept: "application/vnd.api+json" },
        ...(noStore ? { cache: "no-store" as const } : { next: { revalidate: 600 } }),
        signal: AbortSignal.timeout(8500),
      });
      if (!res.ok) {
        errors.push(`${url.hostname}: HTTP ${res.status}`);
        continue;
      }
      const response = (await res.json()) as T;
      return response;
    } catch (error) {
      const cause = error instanceof Error ? error.message : "Connection failed";
      errors.push(`${url.hostname}: ${cause}`);
    }
  }
  throw new Error(`Unable to reach Kitsu (${errors.join("; ")})`);
}

/** Safe public diagnostic for deployments with empty anime listings. */
export async function checkCatalogConnection() {
  try {
    const response = await request<ListResponse>("/anime", {
      "page[limit]": "2",
      "filter[ageRating]": "G,PG",
      sort: "popularityRank",
    }, true);
    if (!Array.isArray(response.data)) {
      return { ok: false, reason: "Unexpected catalog response format", sampleCount: 0 };
    }
    return { ok: response.data.length > 0, sampleCount: response.data.length,
      reason: response.data.length ? "Catalog responded successfully" : "Catalog returned zero records" };
  } catch (error) {
    return { ok: false, sampleCount: 0,
      reason: error instanceof Error ? error.message : "Catalog request failed" };
  }
}

function cleanText(text: string) { return text.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ").trim(); }
function normalize(input: KitsuAnime): Anime {
  const a = input.attributes || {};
  const raw = a.averageRating ? Number(a.averageRating) : NaN;
  return {
    id: input.id, slug: a.slug || input.id,
    title: a.canonicalTitle || a.titles?.en || a.titles?.en_jp || `Anime ${input.id}`,
    titleJapanese: a.titles?.ja_jp || null,
    synopsis: cleanText(a.synopsis || a.description || "No synopsis available yet."),
    poster: a.posterImage?.large || a.posterImage?.medium || a.posterImage?.original || null,
    cover: a.coverImage?.original || a.coverImage?.large || null,
    rating: Number.isFinite(raw) ? Math.round(raw * 10) / 10 : null,
    popularityRank: a.popularityRank ?? null, ratingRank: a.ratingRank ?? null,
    episodes: a.episodeCount ?? null, status: a.status || "unknown",
    startDate: a.startDate || null, subtype: a.subtype || "TV",
    ageRating: a.ageRating || null,
  };
}
// The public Kitsu API already excludes explicit content. This app also excludes
// 17+/adult-rated titles and excludes unrated entries from discovery for safety.
function suitable(item: Anime) { return ["G", "PG"].includes((item.ageRating || "").toUpperCase()); }
// Valid values documented by Kitsu are G, PG, R and R18.
// Use G and PG for public discovery; PG-13 is not a valid Kitsu filter.
const PUBLIC_RATINGS = "G,PG";

/** Actual server-side pagination, not a fixed 20-title search or fake entire catalog. */
export async function browseAnime(filters: BrowseParams = {}): Promise<BrowseResult> {
  const page = Math.min(10000, Math.max(1, Math.floor(Number(filters.page) || 1)));
  const genre = GENRES.find(g => g.value === filters.genre)?.value || "";
  const type = TYPE_OPTIONS.includes(filters.type as typeof TYPE_OPTIONS[number]) ? filters.type || "" : "";
  const season = SEASONS.includes(filters.season as typeof SEASONS[number]) ? filters.season || "" : "";
  const sort = SORT_OPTIONS.find(s => s.value === filters.sort)?.value || "popular";
  const status = ["", "current", "finished", "upcoming"].includes(filters.status || "") ? filters.status || "" : "";
  const year = /^\d{4}$/.test(filters.year || "") ? filters.year! : "";
  const q = (filters.q || "").trim().slice(0, 80);
  const query: Record<string, string> = {
    "page[limit]": "20", "page[offset]": String((page - 1) * 20),
    "filter[ageRating]": PUBLIC_RATINGS,
    sort: ({ popular: "popularityRank", rated: "ratingRank", newest: "-startDate", oldest: "startDate" } as Record<string, string>)[sort],
  };
  if (q) query["filter[text]"] = q;
  if (genre) query["filter[categories]"] = genre;
  if (type) query["filter[subtype]"] = type;
  if (status) query["filter[status]"] = status;
  if (season) query["filter[season]"] = season;
  if (year) query["filter[seasonYear]"] = year;
  try {
    const response = await request<ListResponse>("/anime", query);
    const items = (response.data || []).map(normalize).filter(suitable);
    const total = typeof response.meta?.count === "number" ? response.meta.count : null;
    return { items, page, total, hasNext: Boolean(response.links?.next) || (total !== null && page * 20 < total) };
  } catch (error) {
    console.error("KIROKU catalog browse:", error);
    return { items: [], page, total: null, hasNext: false, error: error instanceof Error ? error.message : "Catalog unavailable" };
  }
}

export async function getChart(mode: "popular" | "rated"): Promise<Anime[]> {
  const result = await browseAnime({ sort: mode });
  return result.items.slice(0, 10);
}
export async function getAiring(): Promise<Anime[]> {
  const result = await browseAnime({ status: "current", sort: "newest" });
  return result.items.slice(0, 12);
}
export async function searchAnime(q: string): Promise<Anime[]> { return (await browseAnime({ q })).items; }
export async function getAnime(id: string): Promise<Anime | null> {
  if (!/^\d{1,12}$/.test(id)) return null;
  try {
    const response = await request<ItemResponse>(`/anime/${id}`);
    if (!response.data) return null;
    const item = normalize(response.data);
    return suitable(item) ? item : null;
  } catch (error) { console.error("KIROKU catalog detail:", error); return null; }
}
export async function getRelatedAnime(anime: Anime): Promise<Anime[]> {
  // Related stories based on shared medium/era; labeled discovery rather than pretend recommendations.
  const result = await browseAnime({ type: anime.subtype, year: anime.startDate?.slice(0, 4), sort: "popular" });
  return result.items.filter(item => item.id !== anime.id).slice(0, 6);
}

export async function recommendationsFromLibrary(ids: string[]): Promise<Anime[]> {
  const safeIds = [...new Set(ids.filter(id => /^\d{1,12}$/.test(id)))].slice(0, 3);
  if (!safeIds.length) return [];
  let category = "";
  // A small number of category relationship reads determines a relevant genre.
  // We never scrape or bulk-copy external catalog data.
  for (const id of safeIds) {
    try {
      const response = await request<{data?: {attributes?:{slug?:string;title?:string}}[] }>(`/anime/${id}/categories`, {"page[limit]":"20"});
      const slugs = (response.data || []).map(x => x.attributes?.slug || x.attributes?.title?.toLowerCase().replace(/\s+/g,"-") || "");
      category = GENRES.find(g => g.value && slugs.includes(g.value))?.value || "";
      if (category) break;
    } catch { /* fall back to popularity-based discovery */ }
  }
  const results = await browseAnime({ genre: category, sort: "popular" });
  return results.items.filter(item => !safeIds.includes(item.id)).slice(0, 10);
}
