-- profiles.role 이 user 여도 표시 아이디가 kakaovx 이면 전체 프로필 목록 조회 가능하게 (환경설정 페이지용)
-- 한 번 실행. 다른 아이디를 쓰려면 IN (...) 목록을 수정하세요.

drop policy if exists "profiles_select_display_elevated" on public.profiles;

create policy "profiles_select_display_elevated"
  on public.profiles for select
  using (
    exists (
      select 1 from public.profiles me
      where me.id = auth.uid()
        and lower(me.display_id) in ('kakaovx')
    )
  );
