import type { Metadata } from "next";
import Link from "next/link";
import { Search, ArrowRight, SlidersHorizontal, Compass, AlertCircle } from "lucide-react";
import { AnimeCard } from "@/components/anime-card";
import { browseAnime, GENRES, SEASONS, SORT_OPTIONS, TYPE_OPTIONS, type BrowseParams } from "@/lib/kitsu";

export const metadata: Metadata = { title: "Explore the anime catalog" };
type Params = Record<string, string | string[] | undefined>;
function param(value: string | string[] | undefined) { return typeof value === "string" ? value : ""; }
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
    <form className="discovery-form" action="/search" method="GET">
      <label className="discovery-search-field"><Search size={23}/><input type="search" name="q" maxLength={80} defaultValue={filters.q} placeholder="Search any anime title..." aria-label="Anime title"/><span>ENTER TO SEARCH</span></label>
      <div className="discovery-filters">
        <label><span>GENRE</span><select name="genre" defaultValue={filters.genre}>{GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
        <label><span>FORMAT</span><select name="type" defaultValue={TYPE_OPTIONS.includes(filters.type as typeof TYPE_OPTIONS[number]) ? filters.type : ""}>{TYPE_OPTIONS.map(t => <option key={t} value={t}>{t || "All formats"}</option>)}</select></label>
        <label><span>SEASON</span><select name="season" defaultValue={filters.season}><option value="">All seasons</option>{SEASONS.filter(Boolean).map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
        <label><span>YEAR</span><input name="year" inputMode="numeric" pattern="[12][0-9]{3}" maxLength={4} placeholder="Any year" defaultValue={filters.year}/></label>
        <label><span>RELEASE</span><select name="status" defaultValue={filters.status}><option value="">All statuses</option><option value="current">Airing</option><option value="finished">Finished</option><option value="upcoming">Upcoming</option></select></label>
        <label><span>SORT BY</span><select name="sort" defaultValue={filters.sort}>{SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        <button type="submit" className="discovery-submit"><SlidersHorizontal size={18}/> Apply filters <ArrowRight size={17}/></button>
        <Link href="/search" className="discovery-reset">Clear</Link>
      </div>
    </form>
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
