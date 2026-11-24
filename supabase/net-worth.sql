-- 월별 순자산 기록. schema.sql 은 실행하지 않는다.
-- 이미 있으면 아무것도 바꾸지 않는다.
create table if not exists public.net_worth_months (
  user_id uuid not null references auth.users (id) on delete cascade,
  month_on date not null,
  cash bigint not null,
  safe_amount bigint not null,
  investment bigint not null,
  liabilities bigint not null,
  net_worth bigint not null,
  primary key (user_id, month_on),
  constraint net_worth_month_start check (extract(day from month_on) = 1)
);

alter table public.net_worth_months enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'net_worth_months' and policyname = '본인 순자산'
  ) then
    create policy "본인 순자산" on public.net_worth_months
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;
