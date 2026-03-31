-- Supabase SQL Editor에서 board_posts.sql 다음에 실행하세요.
-- Auth → Providers 에서 Email 활성화, "Confirm email" 은 데모면 끄는 것을 권장합니다.

-- ---------------------------------------------------------------------------
-- 프로필 (표시 아이디, 역할)
-- ---------------------------------------------------------------------------
create table if not exists public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_id text not null,
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now()
);

create unique index if not exists profiles_display_id_lower_idx on public.profiles (lower(display_id));

alter table public.profiles enable row level security;

drop policy if exists "profiles_select_own_or_admin" on public.profiles;
create policy "profiles_select_own_or_admin" on public.profiles
  for select using (
    auth.uid() = id
    or exists (
      select 1 from public.profiles me
      where me.id = auth.uid() and me.role = 'admin'
    )
  );

-- ---------------------------------------------------------------------------
-- 도구 목록·즐겨찾기·활성 도구 (계정별)
-- ---------------------------------------------------------------------------
create table if not exists public.user_app_state (
  user_id uuid primary key references auth.users (id) on delete cascade,
  categories jsonb not null default '[]'::jsonb,
  favorites jsonb not null default '[]'::jsonb,
  active_tool_id text,
  updated_at timestamptz not null default now()
);

alter table public.user_app_state enable row level security;

drop policy if exists "user_app_state_own_all" on public.user_app_state;
create policy "user_app_state_own_all" on public.user_app_state
  for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- ---------------------------------------------------------------------------
-- 가입 시 프로필 + 빈 앱 상태 생성 (role 은 항상 user, 관리자는 SQL로만 승격)
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  disp text;
begin
  disp := coalesce(
    nullif(trim(new.raw_user_meta_data ->> 'display_id'), ''),
    split_part(lower(new.email), '@', 1)
  );
  insert into public.profiles (id, display_id, role)
  values (new.id, disp, 'user');
  insert into public.user_app_state (user_id, categories, favorites, active_tool_id)
  values (new.id, '[]'::jsonb, '[]'::jsonb, null)
  on conflict (user_id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();
