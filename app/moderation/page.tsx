"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle, EyeOff, ShieldCheck, RotateCcw } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import type { Review } from "@/lib/community";

export default function ModerationPage() {
  const { user, ready } = useAuth();
  const [allowed, setAllowed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [queue, setQueue] = useState<Review[]>([]);
  const [reports, setReports] = useState<{ review_id: string; reporter_id: string; reason: string; created_at: string }[]>([]);
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const load = useCallback(async () => {
    if (!ready) return;
    const supabase = getSupabaseBrowser();
    if (!user || !supabase) { setLoading(false); return; }
    setLoading(true); setError("");
    const { data: moderator } = await supabase.from("moderators").select("user_id").eq("user_id", user.id).maybeSingle();
    if (!moderator) { setAllowed(false); setLoading(false); return; }
    setAllowed(true);
    const [reviews, reportData] = await Promise.all([
      supabase.from("reviews").select("id,user_id,anime_id,anime_title,anime_poster,score,body,has_spoilers,status,created_at").eq("status", "pending").order("created_at", {ascending:true}).limit(100),
      supabase.from("review_reports").select("review_id,reporter_id,reason,created_at").order("created_at",{ascending:false}).limit(100),
    ]);
    if (reviews.error) setError(reviews.error.message);
    if (reportData.error) setError(reportData.error.message);
    setQueue((reviews.data || []) as Review[]);
    setReports(reportData.data || []);
    setLoading(false);
  }, [ready, user]);
  useEffect(() => { void load(); }, [load]);
  async function moderate(id: string, status: "published" | "hidden") {
    const supabase = getSupabaseBrowser(); if (!supabase) return;
    setBusy(id); setError("");
    const { error } = await supabase.rpc("kiroku_moderate_review", { p_review: id, p_status: status });
    if (error) setError(error.message); else await load();
    setBusy("");
  }
  return <div className="shell sub-page moderation-page"><div className="page-intro"><span className="section-kicker"><ShieldCheck size={17}/> SAFETY AND QUALITY</span><h1>MODERATION <em>DESK.</em></h1><p>Community reviews are checked before publication. Only database-approved moderators can publish or hide content.</p></div>
    {loading ? <p className="community-muted">Checking permissions...</p> : !allowed ? <div className="empty-state"><ShieldCheck size={30}/><h2>Moderator access only</h2><p>Ask the project owner to grant this account moderator access through the Supabase SQL Editor.</p><Link href="/community" className="btn-primary">Back to community</Link></div> : <>
      <div className="cloud-status"><span>{queue.length} REVIEWS AWAITING APPROVAL</span><button type="button" onClick={() => void load()}><RotateCcw size={16}/> Refresh queue</button></div>
      <div className="moderation-list">{queue.length ? queue.map(item => <article className="moderation-card" key={item.id}><div><span className="section-kicker">{item.anime_title} · SCORE {item.score}/10</span><p>{item.has_spoilers && <strong>SPOILERS MARKED · </strong>}{item.body}</p><small>Submitted {new Date(item.created_at).toLocaleDateString()}</small></div><div className="moderation-actions"><button disabled={busy === item.id} onClick={() => void moderate(item.id, "published")}><CheckCircle size={17}/> Approve</button><button disabled={busy === item.id} onClick={() => void moderate(item.id, "hidden")}><EyeOff size={17}/> Hide</button></div></article>) : <div className="review-empty">No pending reviews right now.</div>}</div>
      <h2 className="mod-report-heading">Community reports</h2>{reports.length ? <div className="moderation-reports">{reports.map(r => <div key={`${r.review_id}:${r.reporter_id}`}><span>{r.reason.toUpperCase()} · {new Date(r.created_at).toLocaleDateString()}</span><code>Review ID: {r.review_id}</code><Link href="/community">Review community feed →</Link><button onClick={() => void moderate(r.review_id, "hidden")}>Hide reported review</button></div>)}</div> : <p className="community-muted">No community reports submitted.</p>}
    </>}{error && <p className="auth-alert" role="alert">{error}</p>}
  </div>;
}
