/**
 * KIROKU V5.0.2 — presentation-only seed helper.
 * Run LOCALLY against your configured Supabase instance.
 * Uses public publishable key + the signed-in DEMO user's credentials; no service-role key.
 * Data is written only to the signed-in account under your existing RLS policies.
 * Never run with your personal account or seed unlabelled demo reviews as genuine.
 */
import { createClient } from "@supabase/supabase-js";
import { createInterface } from "node:readline/promises";
import { stdin, stdout } from "node:process";

const PERSONAS = {
  archive: { handle: "kiroku_demo_archive", display: "KIROKU Demo Archive", bio: "DEMO PROFILE — sample anime archive for the KIROKU presentation." },
  critic: { handle: "kiroku_demo_critic", display: "KIROKU Demo Critic", bio: "DEMO PROFILE — example reviews and ratings for class presentation." },
  explorer: { handle: "kiroku_demo_explorer", display: "KIROKU Demo Explorer", bio: "DEMO PROFILE — sample discovery and watchlist data for class presentation." },
};
const ageAllow = new Set(["G", "PG"]);
const reviewsText = [
  "[DEMO REVIEW — NOT A REAL USER OPINION] The pacing made this easy to follow, and the characters kept me interested throughout the episodes.",
  "[DEMO REVIEW — NOT A REAL USER OPINION] I enjoyed the atmosphere and the attention given to everyday moments. The artwork is memorable.",
  "[DEMO REVIEW — NOT A REAL USER OPINION] This series has a fun premise and a strong sense of momentum. A good recommendation for newcomers.",
  "[DEMO REVIEW — NOT A REAL USER OPINION] The themes are interesting and the direction feels thoughtful. Some episodes worked better for me than others.",
  "[DEMO REVIEW — NOT A REAL USER OPINION] A relaxing show to revisit. I especially liked the cast chemistry and the overall presentation.",
  "[DEMO REVIEW — NOT A REAL USER OPINION] The music and animation support the storytelling nicely. This is a sample review for testing moderation.",
];
const statuses = ["completed", "watching", "planned", "completed", "watching", "paused", "completed", "planned", "watching", "completed", "planned", "dropped", "watching", "completed", "planned", "paused", "completed", "watching"];
const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY?.trim() || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
if (!url || !key || url.includes("YOUR_PROJECT")) {
  console.error("Missing valid Supabase values. Create .env.local in the KIROKU project root and set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY.");
  process.exit(1);
}
const personaArg = process.argv.find(arg => arg.startsWith("--persona="))?.split("=")[1] || "archive";
const mode = process.argv.includes("--social") ? "social" : "seed";
if (!PERSONAS[personaArg]) {
  console.error("Invalid persona. Use --persona=archive, --persona=critic, or --persona=explorer.");
  process.exit(1);
}

async function prompt(question) {
  const rl = createInterface({ input: stdin, output: stdout });
  try { return (await rl.question(question)).trim(); }
  finally { rl.close(); }
}
async function hiddenPassword(question) {
  if (!stdin.isTTY || typeof stdin.setRawMode !== "function") {
    throw new Error("Run from an interactive terminal to enter the password safely.");
  }
  stdout.write(question);
  return new Promise((resolve, reject) => {
    let pwd = "";
    stdin.setRawMode(true);
    stdin.resume();
    const finish = (error) => {
      stdin.off("data", receive);
      stdin.setRawMode(false);
      stdout.write("\n");
      if (error) reject(error);
      else resolve(pwd);
    };
    const receive = (data) => {
      for (const c of data.toString("utf8")) {
        if (c === "\r" || c === "\n") return finish();
        if (c === "\u0003") return finish(new Error("Canceled"));
        if (c === "\u007f" || c === "\b") {
          if (pwd.length > 0) { pwd = pwd.slice(0, -1); stdout.write("\b \b"); }
        } else if (c >= " ") { pwd += c; stdout.write("*"); }
      }
    };
    stdin.on("data", receive);
  });
}

const apiBases = ["https://kitsu.app/api/edge", "https://kitsu.io/api/edge"];
async function getAnimePage(offset) {
  const query = new URLSearchParams({ "page[limit]": "20", "page[offset]": String(offset), "filter[ageRating]": "G,PG", sort: "popularityRank" });
  const failures = [];
  for (const base of apiBases) {
    try {
      const res = await fetch(`${base}/anime?${query}`, { headers: { Accept: "application/vnd.api+json" }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) { failures.push(`${base}: ${res.status}`); continue; }
      const payload = await res.json();
      if (!Array.isArray(payload?.data)) throw new Error("invalid response format");
      return payload.data;
    } catch (error) { failures.push(`${base}: ${error.message}`); }
  }
  throw new Error(`Anime catalog failed: ${failures.join("; ")}`);
}
async function getSampleAnime() {
  const found = new Map();
  for (const offset of [0, 20, 40, 60, 80]) {
    const data = await getAnimePage(offset);
    for (const anime of data) {
      const attr = anime.attributes || {};
      if (!ageAllow.has(String(attr.ageRating || "").toUpperCase())) continue;
      if (!/^\d{1,12}$/.test(String(anime.id))) continue;
      const title = attr.canonicalTitle || attr.titles?.en || attr.titles?.en_jp;
      if (!title || title.length > 300) continue;
      found.set(String(anime.id), {
        id: String(anime.id), title,
        poster: attr.posterImage?.large || attr.posterImage?.medium || attr.posterImage?.original || null,
        episodes: Number.isInteger(attr.episodeCount) && attr.episodeCount >= 0 && attr.episodeCount <= 9999 ? attr.episodeCount : null,
      });
      if (found.size >= 18) break;
    }
    if (found.size >= 18) break;
  }
  if (found.size < 8) throw new Error(`Only ${found.size} suitable anime returned by Kitsu; no changes were made. Retry when the API is healthy.`);
  return [...found.values()].slice(0, 18);
}
function sampleMonthIso(index, now) {
  const year = now.getFullYear();
  const monthIndex = Math.max(0, Math.min(now.getMonth(), Math.floor(index * (now.getMonth() + 1) / 18)));
  const day = Math.min(5 + (index % 18), monthIndex === now.getMonth() ? now.getDate() : 25);
  return new Date(Date.UTC(year, monthIndex, Math.max(1, day), 0, 0, 0)).toISOString();
}
function progressFor(status, episodes, idx) {
  const limit = episodes === null ? 9999 : episodes;
  if (status === "completed") return episodes === null ? 12 : episodes;
  if (status === "watching") return Math.min(limit, [2, 5, 7, 11, 15][idx % 5]);
  if (status === "paused") return Math.min(limit, 3);
  if (status === "dropped") return Math.min(limit, 1);
  return 0;
}
function buildRows(userId, titles, shift = 0) {
  const now = new Date();
  return titles.map((anime, idx) => {
    // Keep very long or zero-episode anime out of the completed category.
    let status = statuses[(idx + shift) % statuses.length];
    if (status === "completed" && (anime.episodes === 0 || (anime.episodes ?? 12) > 200)) status = "watching";
    return {
      user_id: userId, anime_id: anime.id, title: anime.title, poster: anime.poster,
      episodes: anime.episodes, status, progress: progressFor(status, anime.episodes, idx),
      saved_at: sampleMonthIso(idx, now),
    };
  });
}
const client = createClient(url, key, { auth: { autoRefreshToken: false, persistSession: false, detectSessionInUrl: false } });
let done = false;
try {
  console.log(`\nKIROKU DEMO SEED / ${mode.toUpperCase()} / ${personaArg}`);
  console.log("Only use dedicated presentation accounts. Reviews will be labeled DEMO; this does not create auth users or grant moderator access.");
  const confirm = await prompt("Type DEMO to continue: ");
  if (confirm !== "DEMO") { console.log("Canceled; no changes."); process.exit(0); }
  const email = await prompt("Existing VERIFIED demo account email: ");
  const password = await hiddenPassword("Demo account password (shows * while typing): ");
  const { data: login, error: loginError } = await client.auth.signInWithPassword({ email, password });
  if (loginError || !login.user) throw loginError || new Error("Login failed");
  const userId = login.user.id;
  const persona = PERSONAS[personaArg];
  console.log(`Authenticated demo user (${userId.slice(0, 8)}...).`);

  if (mode === "social") {
    const { data: profiles, error: profilesError } = await client.from("profiles").select("id,handle,is_public")
      .in("handle", Object.values(PERSONAS).map(p => p.handle)).eq("is_public", true);
    if (profilesError) throw profilesError;
    let follows = 0;
    for (const p of profiles || []) {
      if (p.id === userId) continue;
      const { error } = await client.from("follows").upsert({ follower_id: userId, following_id: p.id }, { onConflict: "follower_id,following_id", ignoreDuplicates: true });
      if (error) console.warn("Follow skipped:", error.message); else follows++;
    }
    const others = (profiles || []).filter(p => p.id !== userId).map(p => p.id);
    let likes = 0;
    if (others.length) {
      const { data: reviews, error: reviewError } = await client.from("reviews")
        .select("id,user_id,status").in("user_id", others).eq("status", "published").limit(12);
      if (reviewError) throw reviewError;
      for (const review of reviews || []) {
        const { error } = await client.from("review_likes").upsert({ review_id: review.id, user_id: userId }, { onConflict: "review_id,user_id", ignoreDuplicates: true });
        if (error) console.warn("Like skipped:", error.message); else likes++;
      }
    }
    console.log(`Social sample complete: up to ${follows} follows and ${likes} review likes. If there are no published reviews yet, approve a few in /moderation first.`);
  } else {
    // Collect catalog BEFORE any writes so API outages don't cause partial seed data.
    console.log("Fetching current anime IDs and posters from Kitsu...");
    const titles = await getSampleAnime();
    console.log(`Fetched ${titles.length} suitable anime records. First title: ${titles[0].title}`);
    const { error: profileError } = await client.from("profiles").update({
      display_name: persona.display, handle: persona.handle, bio: persona.bio, is_public: true,
    }).eq("id", userId);
    if (profileError) throw new Error(`Profile update failed: ${profileError.message}. Make sure the Phase 3/4 migration is installed and the handle isn't already used.`);
    // Insert-only: existing watchlist entries and recorded episode progress are never overwritten.
    const rows = buildRows(userId, titles, personaArg === "archive" ? 0 : personaArg === "critic" ? 3 : 6);
    const { error: watchlistError } = await client.from("watchlist_entries")
      .upsert(rows, { onConflict: "user_id,anime_id", ignoreDuplicates: true });
    if (watchlistError) throw new Error(`Watchlist insert failed: ${watchlistError.message}`);
    console.log(`Watchlist: checked ${rows.length} sample entries (existing entries unchanged).`);
    // Publish is intentionally NOT bypassed. Reviews start pending; demonstrate moderator approval in the real UI.
    const reviewRows = titles.slice(personaArg === "archive" ? 0 : personaArg === "critic" ? 3 : 6).slice(0, 6)
      .map((anime, idx) => ({ user_id: userId, anime_id: anime.id,
        anime_title: anime.title, anime_poster: anime.poster,
        score: [9, 8, 10, 7, 8, 9][idx], body: reviewsText[idx], has_spoilers: idx === 4 }));
    const { error: reviewsError } = await client.from("reviews")
      .upsert(reviewRows, { onConflict: "user_id,anime_id", ignoreDuplicates: true });
    if (reviewsError) throw new Error(`Review insert failed: ${reviewsError.message}`);
    console.log(`Reviews: checked ${reviewRows.length} sample pending reviews. Approve some using /moderation to populate /community.`);
    console.log(`Public demo profile: /u/${persona.handle}`);
  }
  done = true;
} catch (error) {
  console.error("\nDemo seed error:", error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  try { await client.auth.signOut(); } catch {}
  if (done) console.log("\nDone. Reload KIROKU in your browser and sign in as the seeded demo account.");
}
