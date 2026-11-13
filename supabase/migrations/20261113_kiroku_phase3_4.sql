-- KIROKU Phase 3 + 4. Run AFTER 20261113_kiroku_phase2.sql.
-- Public profiles are OPT-IN. Reviews require moderator approval before appearing.
-- All client access remains behind Supabase Row Level Security.

alter table public.profiles add column if not exists handle text;
alter table public.profiles add column if not exists bio text not null default '';
alter table public.profiles add column if not exists is_public boolean not null default false;
alter table public.profiles add constraint profiles_bio_length check (char_length(bio) <= 280);
create unique index if not exists profiles_handle_unique on public.profiles (lower(handle)) where handle is not null;
alter table public.profiles add constraint profiles_handle_format check (handle is null or handle ~ '^[a-z0-9_]{3,24}$');

-- The Step 2 migration originally granted full-row updates. Revoke that grant.
revoke update on table public.profiles from authenticated;
grant update (display_name, handle, bio, is_public) on public.profiles to authenticated;

drop policy if exists kiroku_profiles_select on public.profiles;
create policy kiroku_profiles_select on public.profiles for select to authenticated
using (id = (select auth.uid()) or is_public = true);
create policy kiroku_profiles_public_read on public.profiles for select to anon
using (is_public = true);
grant select on public.profiles to anon;

create table if not exists public.follows (
  follower_id uuid not null references auth.users(id) on delete cascade,
  following_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows(following_id);
alter table public.follows enable row level security;
grant select on public.follows to anon, authenticated;
grant insert, delete on public.follows to authenticated;
create policy follows_read on public.follows for select to anon, authenticated
using (follower_id=(select auth.uid()) or (exists (select 1 from public.profiles p where p.id=follower_id and p.is_public)
  and exists (select 1 from public.profiles p where p.id=following_id and p.is_public)));
create policy follows_add on public.follows for insert to authenticated
with check (follower_id=(select auth.uid()) and exists (select 1 from public.profiles p where p.id=following_id and p.is_public));
create policy follows_delete on public.follows for delete to authenticated
using (follower_id=(select auth.uid()));

create table if not exists public.reviews (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  anime_id text not null check (anime_id ~ '^[0-9]{1,12}$'),
  anime_title text not null check (char_length(anime_title) between 1 and 300),
  anime_poster text check (anime_poster is null or char_length(anime_poster) <= 2000),
  score smallint not null check (score between 1 and 10),
  body text not null check (char_length(body) between 30 and 1600),
  has_spoilers boolean not null default false,
  status text not null default 'pending' check (status in ('pending','published','hidden')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, anime_id)
);
create index if not exists reviews_public_idx on public.reviews (status, created_at desc);
create index if not exists reviews_anime_idx on public.reviews (anime_id, status, created_at desc);
alter table public.reviews enable row level security;
grant select on public.reviews to anon, authenticated;
grant insert(user_id, anime_id, anime_title, anime_poster, score, body, has_spoilers) on public.reviews to authenticated;
grant update(score, body, has_spoilers) on public.reviews to authenticated;
grant delete on public.reviews to authenticated;
create policy reviews_read_public on public.reviews for select to anon
using (status = 'published' and exists (select 1 from public.profiles p where p.id=user_id and p.is_public));
create policy reviews_read_member on public.reviews for select to authenticated
using (user_id = (select auth.uid()) or (status = 'published' and exists (select 1 from public.profiles p where p.id=user_id and p.is_public)));
create policy reviews_insert on public.reviews for insert to authenticated
with check (user_id = (select auth.uid()) and status = 'pending' and exists
  (select 1 from public.profiles p where p.id = user_id and p.is_public));
create policy reviews_update_self on public.reviews for update to authenticated
using (user_id = (select auth.uid())) with check (user_id = (select auth.uid()));
create policy reviews_delete_self on public.reviews for delete to authenticated
using (user_id = (select auth.uid()));

-- Editing a published review always sends it back to moderation.
create or replace function public.kiroku_review_edit() returns trigger
language plpgsql set search_path = '' as $$
begin
  if new.body is distinct from old.body or new.score is distinct from old.score
       or new.has_spoilers is distinct from old.has_spoilers then
    new.status = 'pending';
  end if;
  new.updated_at = now();
  return new;
end;
$$;
drop trigger if exists kiroku_review_edit_trigger on public.reviews;
create trigger kiroku_review_edit_trigger before update on public.reviews
for each row execute function public.kiroku_review_edit();

create table if not exists public.review_likes (
  review_id uuid not null references public.reviews(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (review_id, user_id)
);
alter table public.review_likes enable row level security;
grant select on public.review_likes to anon, authenticated;
grant insert, delete on public.review_likes to authenticated;
create policy likes_read on public.review_likes for select to anon, authenticated
using (exists (select 1 from public.reviews r where r.id=review_id and r.status='published' and exists (select 1 from public.profiles p where p.id=r.user_id and p.is_public)));
create policy likes_add on public.review_likes for insert to authenticated
with check (user_id=(select auth.uid()) and exists (select 1 from public.reviews r where r.id=review_id and r.status='published' and exists (select 1 from public.profiles p where p.id=r.user_id and p.is_public)));
create policy likes_remove on public.review_likes for delete to authenticated
using (user_id=(select auth.uid()));

create table if not exists public.moderators (
  user_id uuid primary key references auth.users(id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.moderators enable row level security;
grant select on public.moderators to authenticated;
create policy moderator_read_self on public.moderators for select to authenticated
using (user_id=(select auth.uid()));

create table if not exists public.review_reports (
  review_id uuid not null references public.reviews(id) on delete cascade,
  reporter_id uuid not null references auth.users(id) on delete cascade,
  reason text not null check (reason in ('spoiler','harassment','spam','other')),
  created_at timestamptz not null default now(),
  primary key (review_id, reporter_id)
);
alter table public.review_reports enable row level security;
grant select, insert on public.review_reports to authenticated;
create policy reports_own_or_moderator on public.review_reports for select to authenticated
using (reporter_id=(select auth.uid()) or exists (select 1 from public.moderators m where m.user_id=(select auth.uid())));
create policy reports_add on public.review_reports for insert to authenticated
with check (reporter_id=(select auth.uid()) and exists
(select 1 from public.reviews r where r.id=review_id and r.status='published' and exists (select 1 from public.profiles p where p.id=r.user_id and p.is_public)));

-- Only database-approved moderators can change review visibility.
-- Grant moderator privileges by running in Supabase SQL Editor:
-- insert into public.moderators(user_id) values ('YOUR-USER-UUID') on conflict do nothing;
create or replace function public.kiroku_moderate_review(p_review uuid, p_status text)
returns void language plpgsql security definer set search_path='' as $$
begin
  if not exists(select 1 from public.moderators where user_id=auth.uid()) then
    raise exception 'Not authorized';
  end if;
  if p_status not in ('published','hidden','pending') then
    raise exception 'Invalid moderation status';
  end if;
  update public.reviews set status=p_status, updated_at=now() where id=p_review;
end;
$$;
revoke all on function public.kiroku_moderate_review(uuid, text) from public;
grant execute on function public.kiroku_moderate_review(uuid, text) to authenticated;

-- Moderation queue: only moderators can read all pending reviews.
create policy review_moderator_read on public.reviews for select to authenticated
using (exists (select 1 from public.moderators m where m.user_id=(select auth.uid())));

-- Reset editable columns if the migration is run after Phase 2, keeping ownership locked.
-- No service-role key or unprotected write API is required in the client.
