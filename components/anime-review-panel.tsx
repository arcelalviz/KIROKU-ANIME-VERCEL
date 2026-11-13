"use client";
import { useCallback, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { MessageCircle, PenLine, Send, Star } from "lucide-react";
import type { Anime } from "@/lib/types";
import { getReviews, type Review } from "@/lib/community";
import { ReviewCard } from "@/components/review-card";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function AnimeReviewPanel({ anime }: { anime: Anime }) {
  const { user, ready, configured } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [profilePublic, setProfilePublic] = useState(false);
  const [body, setBody] = useState("");
  const [score, setScore] = useState(8);
  const [spoilers, setSpoilers] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => {
    if (!configured || !ready) return;
    try { setReviews(await getReviews({ animeId: anime.id, includeOwn: user?.id, max: 35 })); }
    catch(e) { setError(e instanceof Error ? e.message : "Reviews unavailable"); }
  }, [anime.id, configured, ready, user?.id]);
  useEffect(() => { void load(); }, [load]);
  useEffect(() => { if (!user) { setProfilePublic(false); return; }
    getSupabaseBrowser()?.from("profiles").select("is_public").eq("id", user.id).single().then(({ data }) => setProfilePublic(Boolean(data?.is_public)));
  }, [user]);
  const own = reviews.find(r => r.user_id === user?.id);
  async function submit(e: FormEvent) {
    e.preventDefault(); if (!user) return;
    setBusy(true); setError(""); setNotice("");
    const supabase = getSupabaseBrowser()!;
    const fields = { score, body: body.trim(), has_spoilers: spoilers };
    const result = own ? await supabase.from("reviews").update(fields).eq("id", own.id).eq("user_id", user.id)
      : await supabase.from("reviews").insert({ ...fields, user_id: user.id, anime_id: anime.id, anime_title: anime.title, anime_poster: anime.poster });
    if (result.error) setError(result.error.message);
    else { setNotice("Review saved and submitted for moderator approval."); setBody(""); await load(); }
    setBusy(false);
  }
  return <section className="shell community-title-section" id="reviews"><div className="discovery-results-heading"><div><span className="section-kicker"><MessageCircle size={14}/> COMMUNITY VOICES</span><h2>What fans are saying</h2></div><Link href="/community">Explore community →</Link></div>
    {!configured ? <p className="community-muted">Connect Supabase to activate community reviews.</p> : <div className="review-layout"><div className="review-form-panel"><h3><PenLine size={19}/> Your review</h3>
      {!user ? <p>Share your thoughts with the community. <Link href="/auth">Sign in to write a review →</Link></p>
      : !profilePublic ? <p>Public reviews use an opt-in profile. <Link href="/account">Enable your public profile first →</Link></p>
      : <form onSubmit={submit}><label>YOUR RATING <select value={score} onChange={e => setScore(Number(e.target.value))}>{Array.from({ length: 10 }, (_, i) => i + 1).map(n => <option key={n} value={n}>{n}/10 stars</option>)}</select></label><label>YOUR THOUGHTS<textarea rows={6} maxLength={1600} minLength={30} required value={body} onChange={e => setBody(e.target.value)} placeholder={own ? "Rewrite your review (editing resubmits for approval)..." : "What stayed with you? Write at least 30 characters..."}/></label><label className="review-check"><input type="checkbox" checked={spoilers} onChange={e => setSpoilers(e.target.checked)}/> Contains spoilers</label><button className="btn-primary" disabled={busy || body.trim().length < 30} type="submit"><Send size={16}/> {busy ? "Submitting..." : own ? "Update review" : "Submit review"}</button><p>Reviews appear publicly after moderator approval. You can submit one review per anime.</p></form>}
      {error && <p className="auth-alert" role="alert">{error}</p>}{notice && <p className="auth-success" role="status">{notice}</p>}
    </div><div className="review-list">{reviews.length ? reviews.map(item => <ReviewCard item={item} showAnime={false} key={item.id}/>) : <div className="review-empty"><Star size={30}/><strong>No published reviews yet.</strong><span>Be the first to leave a thoughtful impression.</span></div>}</div></div>}
  </section>;
}
