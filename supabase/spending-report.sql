-- 이미 사용 중인 데이터베이스에서 한 번만 실행한다. schema.sql 은 다시 실행하지 않는다.
-- 이번 달 줄일 카테고리와, 같은 집계의 경고 문장을 다시 부르지 않기 위한 칸이다.

alter table public.profiles add column if not exists cut_category_id text;
alter table public.profiles add column if not exists cut_amount bigint;
alter table public.profiles add column if not exists cut_month text;
alter table public.profiles add column if not exists report_hash text;
alter table public.profiles add column if not exists report_text text;

do $$
begin
  if not exists (select 1 from pg_constraint where conname = 'profiles_cut_amount_check') then
    alter table public.profiles
      add constraint profiles_cut_amount_check check (cut_amount is null or cut_amount > 0);
  end if;
  if not exists (select 1 from pg_constraint where conname = 'profiles_cut_month_check') then
    alter table public.profiles
      add constraint profiles_cut_month_check check (cut_month is null or cut_month ~ '^\d{4}-\d{2}$');
  end if;
end $$;
