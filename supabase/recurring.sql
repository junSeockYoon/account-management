-- 매달 반복되는 고정 지출. schema.sql 은 실행하지 않는다.
-- 이미 있으면 아무것도 바꾸지 않는다.
create table if not exists public.recurring_expenses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  amount bigint not null check (amount > 0),
  charge_day smallint not null check (charge_day between 1 and 31),
  category_id text not null references public.categories (id) on delete restrict,
  payment_method public.payment_method not null,
  card_id uuid,
  account_id uuid,
  memo text not null default '',
  created_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, card_id) references public.cards (user_id, id) on delete restrict,
  foreign key (user_id, account_id) references public.accounts (user_id, id) on delete restrict,
  constraint recurring_payment check (
    (payment_method = 'card' and card_id is not null and account_id is null)
    or (payment_method in ('account', 'cash') and account_id is not null and card_id is null)
  )
);

alter table public.transactions
  add column if not exists recurring_id uuid;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'transactions_recurring_fk'
  ) then
    alter table public.transactions
      add constraint transactions_recurring_fk
      foreign key (recurring_id) references public.recurring_expenses (id) on delete set null;
  end if;
end $$;

create unique index if not exists transactions_recurring_month_idx
  on public.transactions (recurring_id, ((date_trunc('month', occurred_on::timestamp))::date))
  where recurring_id is not null;

alter table public.recurring_expenses enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'recurring_expenses' and policyname = '본인 고정지출'
  ) then
    create policy "본인 고정지출" on public.recurring_expenses
    for all to authenticated
    using (user_id = auth.uid())
    with check (user_id = auth.uid());
  end if;
end $$;
