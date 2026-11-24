-- 이번 달 카드 한도와 결제 기준일만 추가한다. schema.sql 은 실행하지 않는다.
-- 이미 있으면 아무것도 바꾸지 않는다.
alter table public.profiles
  add column if not exists monthly_card_limit bigint;

alter table public.profiles
  add column if not exists card_cycle_day smallint;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_monthly_card_limit_check'
  ) then
    alter table public.profiles
      add constraint profiles_monthly_card_limit_check
      check (monthly_card_limit is null or monthly_card_limit > 0);
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'profiles_card_cycle_day_check'
  ) then
    alter table public.profiles
      add constraint profiles_card_cycle_day_check
      check (card_cycle_day is null or card_cycle_day between 1 and 31);
  end if;
end $$;
