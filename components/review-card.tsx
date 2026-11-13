"use client";
import { useState } from "react";
import Link from "next/link";
import { Heart, ShieldAlert, Star, Eye, EyeOff } from "lucide-react";
import type { Review } from "@/lib/community";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function ReviewCard({ item, showAnime = true }: { item: Review; showAnime?: boolean }) {
  const { user } = useAuth();
  const [liked, setLiked] = useState(Boolean(item.likedByMe));
  const [likes, setLikes] = useState(item.likes || 0);
  const [spoilerVisible, setSpoilerVisible] = useState(!item.has_spoilers);
  const [reporting, setReporting] = useState(false);
  const [notice, setNotice] = useState("");
  const author = item.author;
  async function toggleLike() {
    if (!user) { setNotice("Sign in to like reviews."); return; }
    const supabase = getSupabaseBrowser(); if (!supabase) return;
    const next = !liked; setLiked(next); setLikes(v => Math.max(0, v + (next ? 1 : -1)));
    const { error } = next
      ? await supabase.from("review_likes").insert({ review_id: item.id, user_id: user.id })
      : await supabase.from("review_likes").delete().eq("review_id", item.id).eq("user_id", user.id);
    if (error) { setLiked(!next); setLikes(v => Math.max(0, v + (next ? -1 : 1))); setNotice(error.message); }
  }
  async function report(reason: string) {
    if (!user) { setNotice("Sign in to report a review."); return; }
    setReporting(false);
    const { error } = await getSupabaseBrowser()!.from("review_reports").insert({ review_id: item.id, reporter_id: user.id, reason });
    setNotice(error ? (error.code === "23505" ? "You've already reported this review." : error.message) : "Report sent to moderators.");
  }
  return <article className="review-card">
    <div className="review-top"><div className="review-avatar" aria-hidden="true">{(author?.display_name || "K").charAt(0).toUpperCase()}</div><div className="review-author"><strong>{author?.handle ? <Link href={`/u/${encodeURIComponent(author.handle)}`}>{author.display_name}</Link> : "KIROKU member"}</strong><span>{new Date(item.created_at).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></div><span className="review-score"><Star size={15} fill="currentColor"/> {item.score}/10</span></div>
    {showAnime && <Link className="review-anime-link" href={`/anime/${item.anime_id}`}>{item.anime_title}</Link>}
    {item.status !== "published" && <span className="review-pending">AWAITING MODERATION — VISIBLE TO YOU ONLY</span>}
    {item.has_spoilers && !spoilerVisible ? <button className="spoiler-gate" type="button" onClick={() => setSpoilerVisible(true)}><Eye size={17}/> This review contains spoilers. Reveal review</button>
      : <><p className="review-body">{item.body}</p>{item.has_spoilers && <button className="review-quiet" type="button" onClick={() => setSpoilerVisible(false)}><EyeOff size={15}/> Hide spoilers</button>}</>}
    {item.status === "published" && <div className="review-actions"><button type="button" className={liked ? "liked" : ""} onClick={() => void toggleLike()}><Heart size={17} fill={liked ? "currentColor" : "none"}/> {likes} helpful</button>{user?.id !== item.user_id && <div className="review-report-wrap"><button type="button" onClick={() => setReporting(v => !v)}><ShieldAlert size={16}/> Report</button>{reporting && <div className="review-report-options" aria-label="Report reason">{(["spoiler", "harassment", "spam", "other"] as const).map(reason => <button key={reason} type="button" onClick={() => void report(reason)}>{reason}</button>)}</div>}</div>}</div>}
    {notice && <p className="review-notice" role="status">{notice}</p>}
  </article>;
}
