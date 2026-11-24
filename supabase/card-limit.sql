-- 이번 달 카드 사용 한도만 추가한다. schema.sql 은 실행하지 않는다.
-- 이미 있으면 아무것도 바꾸지 않는다.
alter table public.profiles
  add column if not exists monthly_card_limit bigint;

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
