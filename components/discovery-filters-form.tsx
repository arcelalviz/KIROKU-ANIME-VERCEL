"use client";

import { useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Search, ArrowRight, SlidersHorizontal } from "lucide-react";
import { GENRES, SEASONS, SORT_OPTIONS, TYPE_OPTIONS, type BrowseParams } from "@/lib/anime-filters";

/** Client-side filter navigation avoids a full browser reload when exploring. */
export function DiscoveryFiltersForm({ filters }: { filters: BrowseParams }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const params = new URLSearchParams();
    for (const name of ["q", "genre", "type", "season", "year", "status", "sort"]) {
      const value = String(data.get(name) || "").trim();
      if (value && !(name === "sort" && value === "popular")) params.set(name, value);
    }
    startTransition(() => router.push(`/search${params.size ? `?${params.toString()}` : ""}`));
  }
  return <>
    <form className={`discovery-form ${pending ? "discovery-pending" : ""}`} action="/search" method="GET" onSubmit={handleSubmit} aria-busy={pending}>
      <label className="discovery-search-field"><Search size={23}/><input type="search" name="q" maxLength={80} defaultValue={filters.q} placeholder="Search any anime title..." aria-label="Anime title"/><span>ENTER TO SEARCH</span></label>
      <div className="discovery-filters">
        <label><span>GENRE</span><select name="genre" defaultValue={filters.genre}>{GENRES.map(g => <option key={g.value} value={g.value}>{g.label}</option>)}</select></label>
        <label><span>FORMAT</span><select name="type" defaultValue={TYPE_OPTIONS.includes(filters.type as typeof TYPE_OPTIONS[number]) ? filters.type : ""}>{TYPE_OPTIONS.map(t => <option key={t} value={t}>{t || "All formats"}</option>)}</select></label>
        <label><span>SEASON</span><select name="season" defaultValue={filters.season}><option value="">All seasons</option>{SEASONS.filter(Boolean).map(s => <option key={s} value={s}>{s[0].toUpperCase() + s.slice(1)}</option>)}</select></label>
        <label><span>YEAR</span><input name="year" inputMode="numeric" pattern="[12][0-9]{3}" maxLength={4} placeholder="Any year" defaultValue={filters.year}/></label>
        <label><span>RELEASE</span><select name="status" defaultValue={filters.status}><option value="">All statuses</option><option value="current">Airing</option><option value="finished">Finished</option><option value="upcoming">Upcoming</option></select></label>
        <label><span>SORT BY</span><select name="sort" defaultValue={filters.sort}>{SORT_OPTIONS.map(s => <option key={s.value} value={s.value}>{s.label}</option>)}</select></label>
        <button type="submit" className="discovery-submit" disabled={pending}><SlidersHorizontal size={18}/> {pending ? "Finding anime…" : "Apply filters"} <ArrowRight size={17}/></button>
        <Link href="/search" className="discovery-reset">Clear</Link>
      </div>
      <span className="sr-only" role="status">{pending ? "Loading filtered anime results" : ""}</span>
    </form>
  </>;
}
