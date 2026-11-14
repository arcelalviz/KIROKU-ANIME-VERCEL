import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Compass, AlertCircle } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { browseAnime, type BrowseParams } from "@/lib/kitsu";
import { DiscoveryFiltersForm } from "@/components/discovery-filters-form";

export const metadata: Metadata = { title: "Explore the anime catalog" };
type Params = Record<string, string | string[] | undefined>;
function param(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
// Load the anime feed at request time; do not bake a failed upstream response into the deployment.
export const dynamic = "force-dynamic";

export default async function SearchPage({ searchParams }: { searchParams: Promise<Params> }) {
  const params = await searchParams;
  const filters: BrowseParams = {
    q: param(params.q), genre: param(params.genre), type: param(params.type),
    season: param(params.season), year: param(params.year), status: param(params.status),
    sort: param(params.sort) || "popular", page: Number(param(params.page)) || 1,
  };
  const results = await browseAnime(filters);
  const pageLink = (page: number) => {
    const query = new URLSearchParams();
    Object.entries(filters).forEach(([key, value]) => { if (value && key !== "page") query.set(key, String(value)); });
    query.set("page", String(page));
    return `/search?${query.toString()}`;
  };
  return <div className="shell sub-page search-page discovery-page">
    <div className="page-intro"><span className="section-kicker">THE COMPLETE KITSU DISCOVERY FEED / PAGINATED</span><h1>FIND YOUR <em>NEXT WORLD.</em></h1><p>Explore titles page by page. Shape your search with genres, seasons, formats, and rankings.</p></div>
    <DiscoveryFiltersForm key={[filters.q, filters.genre, filters.type, filters.season, filters.year, filters.status, filters.sort].join("|")} filters={filters}/>
    <div className="discovery-results-heading"><div><span className="section-kicker"><Compass size={14}/> ANIME ARCHIVE</span><h2>{filters.q ? `Results for “${filters.q.slice(0, 80)}”` : "Explore the collection"}</h2></div><span>PAGE {results.page}{results.total !== null ? ` / ${Math.max(1, Math.ceil(results.total / 20))}` : ""}</span></div>
    {results.error ? <div className="discovery-notice" role="alert"><AlertCircle size={21}/><div><strong>The live catalog is temporarily unavailable.</strong><p>{results.error} — try again shortly.</p></div></div> : results.items.length ? <div className="anime-grid discovery-grid">{results.items.map(item => <AnimeCard key={item.id} anime={item}/>)}</div> : <div className="empty-state"><Compass size={32}/><h3>No titles found with these filters.</h3><p>Try clearing some filters or choosing a different anime title.</p><Link className="btn-primary" href="/search">Browse all anime <ArrowRight size={17}/></Link></div>}
    <nav className="discovery-pagination" aria-label="Anime search pages">
      {results.page > 1 ? <Link href={pageLink(results.page - 1)}>← Previous page</Link> : <span/>}
      <span>{results.items.length ? `Showing results on page ${results.page}` : `Page ${results.page}`} · Kitsu catalog</span>
      {results.hasNext && !results.error ? <Link href={pageLink(results.page + 1)}>Next page →</Link> : <span/>}
    </nav>
    <p className="discovery-disclaimer">Catalog entries and rankings are supplied by Kitsu. Discovery excludes adult-rated and unrated items; not every anime is available through this source. Categories, ratings, and cover art are third-party metadata.</p>
  </div>;
}
