-- Supabase SQL Editor에서 한 번 실행하세요.

create table if not exists public.board_posts (
  id uuid primary key default gen_random_uuid(),
  tool_id text not null,
  board text not null check (board in ('service', 'tutorial')),
  title text not null,
  body text not null default '',
  author text,
  created_at timestamptz not null default now()
);

create index if not exists board_posts_tool_id_idx on public.board_posts (tool_id);
create index if not exists board_posts_tool_board_created_idx on public.board_posts (tool_id, board, created_at desc);

alter table public.board_posts enable row level security;

-- 데모용: 누구나 읽기/쓰기/삭제 (운영 시 정책을 좁히세요)
drop policy if exists "board_posts_select_anon" on public.board_posts;
drop policy if exists "board_posts_insert_anon" on public.board_posts;
drop policy if exists "board_posts_delete_anon" on public.board_posts;

create policy "board_posts_select_anon" on public.board_posts for select using (true);
create policy "board_posts_insert_anon" on public.board_posts for insert with check (true);
create policy "board_posts_delete_anon" on public.board_posts for delete using (true);
