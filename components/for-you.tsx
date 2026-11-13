"use client";
import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { Sparkles, ArrowUpRight } from "lucide-react";
import { AnimeRail } from "@/components/charts";
import { useLibrary } from "@/components/library-provider";
import type { Anime } from "@/lib/types";

export function ForYou() {
  const { entries, ready } = useLibrary();
  const [items, setItems] = useState<Anime[]>([]);
  const [loading, setLoading] = useState(false);
  const ids = useMemo(() => entries.slice(0,3).map(e=>e.id).join(","), [entries]);
  useEffect(() => {
    if (!ready || !ids) { setItems([]); return; }
    const controller = new AbortController(); setLoading(true);
    fetch(`/api/recommendations?ids=${encodeURIComponent(ids)}`, {signal:controller.signal})
      .then(async r => { if(!r.ok) throw new Error("Recommendations unavailable"); return r.json() as Promise<{items:Anime[]}>; })
      .then(data=>setItems(data.items.filter(a=>!entries.some(e=>e.id===a.id))))
      .catch(()=>setItems([])).finally(()=>setLoading(false));
    return()=>controller.abort();
  // For recommendations we only refresh when the selected title IDs change.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  },[ids,ready]);
  if (!ready || !entries.length) return <section className="for-you-intro site-container"><div><span className="section-kicker"><Sparkles size={14}/> THE DISCOVERY ENGINE</span><h2>YOUR NEXT <em>OBSESSION.</em></h2><p>Add anime to your library to unlock recommendations inspired by your saved titles.</p></div><Link className="btn-primary" href="/search">Explore anime <ArrowUpRight size={17}/></Link></section>;
  if (!items.length) return loading ? <div className="site-container for-you-loading">Finding stories that might suit your archive...</div> : null;
  return <AnimeRail id="for-you" index="04" kicker="INSPIRED BY TITLES YOU SAVED" title="PICKED FOR YOU" tagline="Genre-based suggestions from your library — exploratory picks, not a prediction of your taste." items={items}/>;
}
