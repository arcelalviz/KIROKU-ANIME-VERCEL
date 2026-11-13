import { getSupabaseBrowser } from "./supabase/client";

export type PublicProfile = { id: string; handle: string | null; display_name: string; bio: string; is_public: boolean };
export type Review = {
  id: string; user_id: string; anime_id: string; anime_title: string; anime_poster: string | null;
  score: number; body: string; has_spoilers: boolean; status: string; created_at: string;
  author?: PublicProfile; likes?: number; likedByMe?: boolean;
};

export async function getReviews(options: { animeId?: string; userId?: string; includeOwn?: string; sort?: "recent" | "top"; max?: number } = {}) {
  const supabase = getSupabaseBrowser();
  if (!supabase) return [] as Review[];
  let query = supabase.from("reviews")
    .select("id,user_id,anime_id,anime_title,anime_poster,score,body,has_spoilers,status,created_at")
    .order("created_at", { ascending: false }).limit(Math.min(50, options.max || 25));
  if (options.animeId) query = query.eq("anime_id", options.animeId);
  if (options.userId) query = query.eq("user_id", options.userId);
  if (options.includeOwn) query = query.or(`status.eq.published,user_id.eq.${options.includeOwn}`);
  else query = query.eq("status", "published");
  const { data, error } = await query;
  if (error) throw error;
  const reviews = (data || []) as Review[];
  if (!reviews.length) return reviews;
  const ids = Array.from(new Set(reviews.map(r => r.user_id)));
  const reviewIds = reviews.filter(r => r.status === "published").map(r => r.id);
  const [{ data: profiles }, likesResult] = await Promise.all([
    supabase.from("profiles").select("id,handle,display_name,bio,is_public").in("id", ids),
    reviewIds.length ? supabase.from("review_likes").select("review_id,user_id").in("review_id", reviewIds)
      : Promise.resolve({ data: [] as { review_id: string; user_id: string }[] }),
  ]);
  const map = new Map((profiles || []).map(p => [p.id, p as PublicProfile]));
  const me = (await supabase.auth.getUser()).data.user?.id;
  const likes = likesResult.data || [];
  return reviews.map(r => ({ ...r, author: map.get(r.user_id),
    likes: likes.filter(l => l.review_id === r.id).length,
    likedByMe: likes.some(l => l.review_id === r.id && l.user_id === me),
  }));
}
