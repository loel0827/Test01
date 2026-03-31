-- kakaovx 계정을 먼저 대시보드에서 만든 뒤 실행하세요.
-- Authentication → Users → Add user
--   Email: kakaovx@shortcut.internal
--   Password: kakaovx1!
--   User Metadata (Raw): { "display_id": "kakaovx" }
--
-- 그 다음 아래 한 줄 실행:

update public.profiles
set role = 'admin'
where lower(display_id) = 'kakaovx';
