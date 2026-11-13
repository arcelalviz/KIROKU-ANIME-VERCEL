"use client";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, HeartHandshake, UserRound } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";
import { getReviews, type PublicProfile, type Review } from "@/lib/community";
import { ReviewCard } from "@/components/review-card";

export default function PublicProfilePage() {
  const handle = String(useParams().handle || "");
  const { user, configured } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [reviews, setReviews] = useState<Review[]>([]);
  const [following, setFollowing] = useState(false);
  const [followers, setFollowers] = useState(0);
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    if (!configured) { setLoading(false); return; }
    let active = true;
    (async () => {
      try {
        const db = getSupabaseBrowser()!;
        const { data, error: profileError } = await db.from("profiles").select("id,display_name,handle,bio,is_public").eq("handle", handle).eq("is_public", true).maybeSingle();
        if (profileError) throw profileError;
        if (!data || !active) return;
        setProfile(data as PublicProfile);
        const [found, followRows] = await Promise.all([getReviews({userId:data.id, max:40}), db.from("follows").select("follower_id").eq("following_id", data.id)]);
        if (active) { setReviews(found); setFollowers((followRows.data || []).length); setFollowing(Boolean((followRows.data || []).find(f => f.follower_id === user?.id))); }
      } catch(e) { if (active) setError(e instanceof Error ? e.message : "Profile unavailable"); }
      finally { if (active) setLoading(false); }
    })();
    return () => { active=false; };
  }, [configured,handle,user?.id]);
  async function toggleFollow() {
    if (!user || !profile) return;
    setBusy(true); setError("");
    const db = getSupabaseBrowser()!;
    const result = following ? await db.from("follows").delete().eq("follower_id", user.id).eq("following_id", profile.id)
      : await db.from("follows").insert({follower_id:user.id,following_id:profile.id});
    if (result.error) setError(result.error.message);
    else { setFollowing(!following); setFollowers(n=>Math.max(0,n+(following?-1:1))); }
    setBusy(false);
  }
  return <div className="shell sub-page profile-page"><Link href="/community" className="back-link"><ArrowLeft size={16}/> BACK TO COMMUNITY</Link>
    {loading ? <p>Loading profile...</p> : !profile ? <div className="empty-state"><UserRound size={34}/><h2>This profile isn't public.</h2><p>The member may be private or this handle doesn't exist.</p></div> : <><div className="public-profile-header"><div className="profile-avatar-big">{profile.display_name.charAt(0).toUpperCase()}</div><div><span className="section-kicker">MEMBER OF THE KIROKU ARCHIVE</span><h1>{profile.display_name}</h1><span className="public-handle">@{profile.handle}</span><p>{profile.bio || "Keeping the stories worth remembering."}</p><small>{followers} followers · {reviews.length} published reviews shown</small></div>{user && user.id !== profile.id && <button type="button" className="btn-primary" disabled={busy} onClick={()=>void toggleFollow()}><HeartHandshake size={18}/>{following ? "Following" : "Follow"}</button>}{!user && <Link href="/auth" className="btn-primary">Sign in to follow</Link>}</div>
    <div className="discovery-results-heading"><div><span className="section-kicker">SHARED IMPRESSIONS</span><h2>Anime reviews</h2></div></div><div className="community-feed-grid">{reviews.length ? reviews.map(r => <ReviewCard item={r} key={r.id}/>) : <p className="community-muted">No published reviews yet.</p>}</div></>}
    {error && <p className="auth-alert" role="alert">{error}</p>}
  </div>;
}
