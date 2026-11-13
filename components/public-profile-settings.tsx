"use client";
import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Globe2, LockKeyhole, Save, ShieldCheck } from "lucide-react";
import { useAuth } from "@/components/auth-provider";
import { getSupabaseBrowser } from "@/lib/supabase/client";

export function PublicProfileSettings() {
  const { user } = useAuth();
  const [handle,setHandle] = useState("");
  const [bio,setBio] = useState("");
  const [isPublic,setPublic] = useState(false);
  const [busy,setBusy] = useState(false);
  const [error,setError] = useState("");
  const [notice,setNotice] = useState("");
  const [moderator,setModerator] = useState(false);
  useEffect(()=>{
    if (!user) return;
    let active=true; const db=getSupabaseBrowser(); if(!db)return;
    void Promise.all([
      db.from("profiles").select("handle,bio,is_public").eq("id",user.id).single(),
      db.from("moderators").select("user_id").eq("user_id",user.id).maybeSingle(),
    ]).then(([p,m])=>{if (!active)return; if(p.data){setHandle(p.data.handle||"");setBio(p.data.bio||"");setPublic(Boolean(p.data.is_public));}setModerator(Boolean(m.data));});
    return()=>{active=false;};
  },[user]);
  async function save(event:FormEvent) {
    event.preventDefault(); if(!user)return;
    const proposed=handle.toLowerCase().trim();
    if (proposed && !/^[a-z0-9_]{3,24}$/.test(proposed)) {setError("Use 3–24 lowercase letters, numbers or underscores.");return;}
    if (isPublic && !proposed) {setError("Choose a public handle before making your profile visible.");return;}
    setBusy(true);setError("");setNotice("");
    const {error}=await getSupabaseBrowser()!.from("profiles").update({handle:proposed||null,bio:bio.trim(),is_public:isPublic}).eq("id",user.id);
    if(error)setError(error.code === "23505"?"That handle is already taken. Choose another one.":error.message);
    else setNotice("Profile visibility and public details saved.");
    setBusy(false);
  }
  return <section className="account-panel public-settings-panel"><div className="account-panel-heading"><Globe2 size={24}/><h2>Community identity</h2></div><p className="account-description">Your profile is private by default. Make it public only if you want others to see your handle, bio, reviews and follower count. Your watchlist and email always remain private.</p>
    <form className="auth-form" onSubmit={save}><label><span>PUBLIC HANDLE (OPTIONAL WHILE PRIVATE)</span><div><Globe2 size={18}/><input maxLength={24} value={handle} onChange={e=>setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g,""))} placeholder="kiroku_fan"/></div></label>
      <label><span>BIO · MAX 280 CHARACTERS</span><textarea maxLength={280} rows={4} value={bio} onChange={e=>setBio(e.target.value)} placeholder="A little about the anime stories you love..."/></label>
      <label className="profile-visibility"><input type="checkbox" checked={isPublic} onChange={e=>setPublic(e.target.checked)}/>{isPublic ? <Globe2 size={18}/> : <LockKeyhole size={18}/>}<span>{isPublic ? "My profile is public" : "Keep my profile private"}</span></label>
      <button type="submit" className="btn-primary" disabled={busy}><Save size={17}/>{busy?"Saving...":"Save community settings"}</button>
    </form>{error&&<p className="auth-alert" role="alert">{error}</p>}{notice&&<p className="auth-success" role="status">{notice}</p>}
    {isPublic&&handle&&<Link className="account-text-link" href={`/u/${handle}`}>View your public profile →</Link>}
    {moderator&&<Link className="account-text-link" href="/moderation"><ShieldCheck size={16}/> Open moderation desk →</Link>}
  </section>;
}
