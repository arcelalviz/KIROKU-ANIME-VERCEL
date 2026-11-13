"use client";
import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, MessagesSquare, HeartHandshake, ShieldCheck, RotateCcw } from "lucide-react";
import { ReviewCard } from "@/components/review-card";
import { getReviews, type Review } from "@/lib/community";
import { useAuth } from "@/components/auth-provider";

export default function CommunityPage() {
  const { user, configured } = useAuth();
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filter, setFilter] = useState<"latest" | "rated">("latest");
  const reload = useCallback(async () => {
    if (!configured) { setLoading(false); return; }
    setLoading(true); setError("");
    try { setReviews(await getReviews({ max: 40 })); } catch(e) { setError(e instanceof Error ? e.message : "Couldn't load community reviews"); }
    setLoading(false);
  }, [configured]);
  useEffect(() => { void reload(); }, [reload]);
  const visible = filter === "rated" ? [...reviews].sort((a,b) => b.score - a.score) : reviews;
  return <div className="shell sub-page community-page">
    <div className="page-intro"><span className="section-kicker"><MessagesSquare size={15}/> THE KIROKU COMMUNITY</span><h1>EVERY FAN HAS<br/><em>A STORY.</em></h1><p>Reactions, recommendations, and memorable moments from people who love anime. Reviews are checked before they appear.</p></div>
    <div className="community-feature-strip"><div><HeartHandshake size={25}/><strong>Discover together</strong><span>Explore perspectives from other fans.</span></div><div><ShieldCheck size={25}/><strong>Spoiler controls</strong><span>Read what you want, when you want.</span></div><div><MessagesSquare size={25}/><strong>Thoughtful reviews</strong><span>Community content requires approval.</span></div></div>
    <div className="discovery-results-heading community-feed-head"><div><span className="section-kicker">THE CONVERSATION</span><h2>From the community</h2></div><div className="community-feed-actions"><button className={filter === "latest" ? "active" : ""} onClick={() => setFilter("latest")}>Latest</button><button className={filter === "rated" ? "active" : ""} onClick={() => setFilter("rated")}>Highest rated</button><button type="button" title="Refresh" onClick={() => void reload()} aria-label="Refresh reviews"><RotateCcw size={17}/></button></div></div>
    {!configured ? <div className="review-empty">Community features will be available after configuring Supabase.</div> : loading ? <div className="review-empty">Loading community stories...</div> : error ? <div className="auth-alert" role="alert">{error} <button onClick={() => void reload()}>Try again</button></div> : visible.length ? <div className="community-feed-grid">{visible.map(item => <ReviewCard key={item.id} item={item}/>)}</div> : <div className="review-empty"><MessagesSquare size={32}/><strong>The community is just beginning.</strong><span>No moderator-approved reviews yet. Write a review on an anime detail page.</span></div>}
    <div className="community-prompt"><div><span className="section-kicker">ADD YOUR VOICE</span><h2>YOUR TAKE <em>MATTERS.</em></h2><p>Find an anime you love, open its page, and write your review. Public profiles are optional and must be enabled before posting.</p></div><Link href={user ? "/search" : "/auth"} className="btn-primary">{user ? "Find an anime to review" : "Create your account"} <ArrowUpRight size={17}/></Link></div>
  </div>;
}
