"use client";
import Link from "next/link";
import { ArrowRight, BarChart3, CheckCircle2, CirclePlay, Clapperboard, Clock, Trophy } from "lucide-react";
import { useLibrary } from "@/components/library-provider";
import { STATUS_OPTIONS } from "@/lib/types";

export default function StatsPage() {
  const { entries, ready, cloud } = useLibrary();
  const total = entries.length;
  const watchedEpisodes = entries.reduce((sum, item) => sum + item.progress, 0);
  const completed = entries.filter(item => item.status === "completed").length;
  const ongoing = entries.filter(item => item.status === "watching").length;
  const watched = entries.filter(item => item.progress > 0);
  const completion = total ? Math.round(completed / total * 100) : 0;
  const byStatus = STATUS_OPTIONS.map(option => ({ ...option, total: entries.filter(e => e.status === option.value).length }));
  const recent = [...entries].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt)).slice(0, 5);
  const year = new Date().getFullYear();
  const monthData = Array.from({length:12}, (_,i) => ({
    label: new Date(year, i, 1).toLocaleString("en", {month:"short"}),
    total: entries.filter(e => { const d = new Date(e.savedAt); return d.getFullYear()===year && d.getMonth()===i; }).length,
  }));
  const maxMonth = Math.max(...monthData.map(m=>m.total), 1);
  return <div className="shell sub-page stats-page">
    <div className="page-intro"><span className="section-kicker"><BarChart3 size={15}/> YOUR WATCHING YEAR</span><h1>THE STORIES<br/><em>YOU'VE KEPT.</em></h1><p>Every episode, every finish, every new beginning — your personal archive in numbers.</p></div>
    {!ready ? <p className="community-muted">Loading your anime archive...</p> : <>
      {!cloud && <div className="cloud-status"><span>BROWSER-ONLY STATS</span><Link href="/auth">Sign in to sync across devices <ArrowRight size={16}/></Link></div>}
      <div className="stats-kpis"><article><Clapperboard size={23}/><span>TOTAL TITLES</span><strong>{total}</strong><small>in your archive</small></article><article><CirclePlay size={23}/><span>EPISODES WATCHED</span><strong>{watchedEpisodes}</strong><small>recorded progress</small></article><article><CheckCircle2 size={23}/><span>COMPLETED</span><strong>{completed}</strong><small>{completion}% of saved titles</small></article><article><Clock size={23}/><span>CURRENTLY WATCHING</span><strong>{ongoing}</strong><small>{watched.length} started titles</small></article></div>
      <div className="stats-two-col"><section className="stats-panel"><div className="stats-panel-title"><Trophy size={22}/><h2>Your watching mix</h2></div><p>How your anime library is distributed.</p>{byStatus.map(s => <div className="stat-line" key={s.value}><div><span>{s.label}</span><strong>{s.total}</strong></div><div className="stat-track"><span style={{width:`${total ? s.total/total*100 : 0}%`}}/></div></div>)}</section>
      <section className="stats-panel"><div className="stats-panel-title"><BarChart3 size={22}/><h2>{year} archive activity</h2></div><p>New titles you saved to your library each month.</p><div className="stats-months" role="img" aria-label="Number of saved anime each month">{monthData.map(m => <div className="stats-month" key={m.label}><strong>{m.total}</strong><div className="stats-month-track"><span style={{height:`${m.total ? Math.max(8,m.total/maxMonth*100) : 0}%`}}/></div><small>{m.label}</small></div>)}</div></section></div>
      <div className="stats-panel stats-recent"><div className="stats-panel-title"><CirclePlay size={22}/><h2>Recently added</h2></div>{recent.length ? <div className="stats-recent-grid">{recent.map(item => <Link key={item.id} href={`/anime/${item.id}`}><div>{item.poster && <img src={item.poster} alt=""/>}</div><strong>{item.title}</strong><span>{item.progress} episodes · {item.status}</span></Link>)}</div> : <p>Your statistics start growing when you add anime to your collection. <Link href="/search">Discover some stories →</Link></p>}</div>
      <p className="discovery-disclaimer">Statistics reflect the episodes and list statuses you've recorded, not automatic viewing history or streaming time.</p>
    </>}
  </div>;
}
