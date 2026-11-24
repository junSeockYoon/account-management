-- 자산관리 스키마. 빈 데이터베이스에서 한 번만 실행한다.
-- 이미 만들어 둔 데이터베이스에서 다시 실행하면 account_kind already exists 로 멈춘다.
-- 그 오류는 첫 줄에서 나므로 이번 실행은 반영되지 않는다. schema.sql 을 다시 붙이지 않는다.
-- 계좌·카드·거래는 auth.users 한 명 소유다.
-- 서비스 롤 키로 접속하면 RLS를 통과한다. 브라우저 키는 본인 행만 본다.
-- 금액은 원화 bigint. 주식 가격·달러 환율만 numeric.

create type public.account_kind as enum ('checking', 'parking', 'brokerage');
create type public.card_type as enum ('credit', 'debit');
create type public.tx_type as enum ('income', 'expense', 'transfer');
create type public.expense_class as enum ('fixed', 'variable');
create type public.payment_method as enum ('card', 'account', 'cash');
create type public.category_group as enum ('expense', 'income', 'transfer');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null default '나',
  as_of date not null default current_date,
  usd_rate numeric(12, 4) not null default 1380.5 check (usd_rate > 0),
  monthly_card_limit bigint check (monthly_card_limit is null or monthly_card_limit > 0),
  card_cycle_day smallint check (card_cycle_day is null or card_cycle_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.categories (
  id text primary key,
  name text not null,
  "group" public.category_group not null,
  color text not null,
  sort_order integer not null
);

create table public.accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_name text not null,
  name text not null,
  kind public.account_kind not null default 'checking',
  balance bigint not null default 0,
  currency text not null default 'KRW' check (currency = 'KRW'),
  account_number text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id)
);

create table public.deposits (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_name text not null,
  product_name text not null,
  principal bigint not null check (principal >= 0),
  annual_rate numeric(5, 2) not null check (annual_rate >= 0 and annual_rate <= 30),
  opened_on date,
  maturity_on date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.savings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  bank_name text not null,
  product_name text not null,
  product_kind text not null default 'installment' check (product_kind in ('installment', 'housing')),
  accumulated bigint not null default 0 check (accumulated >= 0),
  monthly_amount bigint not null check (monthly_amount >= 0),
  annual_rate numeric(5, 2) not null default 0 check (annual_rate >= 0 and annual_rate <= 30),
  auto_transfer_day smallint not null check (auto_transfer_day between 1 and 31),
  auto_transfer_account_id uuid not null,
  opened_on date,
  maturity_on date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, auto_transfer_account_id) references public.accounts (user_id, id) on delete restrict,
  constraint savings_maturity check (product_kind = 'housing' or maturity_on is not null)
);

create table public.stocks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  name text not null,
  ticker text not null,
  market text not null,
  quantity numeric(18, 4) not null check (quantity > 0),
  average_price numeric(18, 4) not null check (average_price >= 0),
  current_price numeric(18, 4) not null check (current_price >= 0),
  current_value numeric(18, 4) not null check (current_value >= 0),
  currency text not null check (currency in ('KRW', 'USD')),
  purchase_fx numeric(12, 4) check (purchase_fx is null or purchase_fx > 0),
  price_updated_on date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  issuer text not null,
  name text not null,
  type public.card_type not null,
  last_four text not null check (last_four ~ '^[0-9]{4}$'),
  linked_account_id uuid,
  unpaid_amount bigint not null default 0 check (unpaid_amount >= 0),
  performance_threshold bigint not null default 0 check (performance_threshold >= 0),
  payment_day smallint check (payment_day between 1 and 31),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, id),
  foreign key (user_id, linked_account_id) references public.accounts (user_id, id) on delete restrict,
  constraint cards_link_matches_type check (
    (type = 'credit' and linked_account_id is null)
    or (type = 'debit' and linked_account_id is not null and unpaid_amount = 0)
  )
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  occurred_on date not null,
  type public.tx_type not null,
  amount bigint not null check (amount > 0),
  payment_method public.payment_method not null,
  card_id uuid,
  account_id uuid,
  to_account_id uuid,
  to_savings_id uuid,
  category_id text not null references public.categories (id) on delete restrict,
  expense_class public.expense_class,
  memo text not null default '',
  -- 시드 원장은 false. 화면에서 새로 저장한 거래만 true로 잔액·미결제를 움직인다.
  balance_applied boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint transactions_shape check (
    (
      type = 'expense'
      and expense_class is not null
      and to_account_id is null
      and to_savings_id is null
      and (
        (payment_method = 'card' and card_id is not null and account_id is null)
        or (payment_method in ('account', 'cash') and account_id is not null and card_id is null)
      )
    )
    or (
      type = 'income'
      and expense_class is null
      and payment_method in ('account', 'cash')
      and account_id is not null
      and card_id is null
      and to_account_id is null
      and to_savings_id is null
    )
    or (
      type = 'transfer'
      and expense_class is null
      and payment_method = 'account'
      and account_id is not null
      and card_id is null
      and (
        (to_account_id is not null and to_savings_id is null and to_account_id <> account_id)
        or (to_account_id is null and to_savings_id is not null)
      )
    )
  ),
  foreign key (user_id, card_id) references public.cards (user_id, id) on delete restrict,
  foreign key (user_id, account_id) references public.accounts (user_id, id) on delete restrict,
  foreign key (user_id, to_account_id) references public.accounts (user_id, id) on delete restrict,
  foreign key (user_id, to_savings_id) references public.savings (user_id, id) on delete restrict
);

create index transactions_user_date_idx on public.transactions (user_id, occurred_on desc);
create index transactions_card_idx on public.transactions (card_id);
create index transactions_account_idx on public.transactions (account_id);
create index savings_auto_transfer_idx on public.savings (auto_transfer_account_id);
create index cards_linked_account_idx on public.cards (linked_account_id);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_updated before update on public.profiles
for each row execute function public.set_updated_at();
create trigger accounts_updated before update on public.accounts
for each row execute function public.set_updated_at();
create trigger deposits_updated before update on public.deposits
for each row execute function public.set_updated_at();
create trigger savings_updated before update on public.savings
for each row execute function public.set_updated_at();
create trigger stocks_updated before update on public.stocks
for each row execute function public.set_updated_at();
create trigger cards_updated before update on public.cards
for each row execute function public.set_updated_at();
create trigger transactions_updated before update on public.transactions
for each row execute function public.set_updated_at();

create or replace function public.transactions_match_category()
returns trigger
language plpgsql
as $$
declare
  category_group text;
begin
  select "group"::text into category_group from public.categories where id = new.category_id;
  if category_group is distinct from new.type::text then
    raise exception '카테고리 유형이 거래 유형과 다릅니다';
  end if;
  return new;
end;
$$;

create trigger transactions_category before insert or update on public.transactions
for each row execute function public.transactions_match_category();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, display_name)
  values (new.id, coalesce(new.raw_user_meta_data ->> 'name', '나'));
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

alter table public.profiles enable row level security;
alter table public.categories enable row level security;
alter table public.accounts enable row level security;
alter table public.deposits enable row level security;
alter table public.savings enable row level security;
alter table public.stocks enable row level security;
alter table public.cards enable row level security;
alter table public.transactions enable row level security;

create policy "본인 프로필" on public.profiles
for all to authenticated
using (id = auth.uid())
with check (id = auth.uid());

create policy "카테고리 조회" on public.categories
for select to authenticated
using (true);

create policy "본인 계좌" on public.accounts
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "본인 예금" on public.deposits
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "본인 적금" on public.savings
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "본인 주식" on public.stocks
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "본인 카드" on public.cards
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

create policy "본인 거래" on public.transactions
for all to authenticated
using (user_id = auth.uid())
with check (user_id = auth.uid());

insert into public.categories (id, name, "group", color, sort_order) values
  ('food', '식비', 'expense', '#4F46E5', 1),
  ('cafe', '카페/간식', 'expense', '#8B5CF6', 2),
  ('transport', '교통', 'expense', '#0EA5E9', 3),
  ('living', '생활/마트', 'expense', '#14B8A6', 4),
  ('shopping', '쇼핑', 'expense', '#F59E0B', 5),
  ('leisure', '문화/여가', 'expense', '#EC4899', 6),
  ('date', '데이트', 'expense', '#DB2777', 7),
  ('travel', '여행', 'expense', '#F97316', 8),
  ('medical', '의료/건강', 'expense', '#10B981', 9),
  ('telecom', '통신', 'expense', '#6366F1', 10),
  ('housing', '주거/관리비', 'expense', '#64748B', 11),
  ('subscription', '구독', 'expense', '#A855F7', 12),
  ('insurance', '보험', 'expense', '#475569', 13),
  ('ceremony', '경조사', 'expense', '#E11D48', 14),
  ('education', '교육', 'expense', '#2563EB', 15),
  ('salary', '급여', 'income', '#059669', 16),
  ('interest', '이자', 'income', '#0D9488', 17),
  ('other-income', '기타수입', 'income', '#34D399', 18),
  ('transfer', '이체', 'transfer', '#94A3B8', 19);
