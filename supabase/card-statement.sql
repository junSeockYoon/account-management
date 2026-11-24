-- 신용카드 지출이 적어 둔 미결제 금액에 이미 들어 있는지 표시한다.
-- schema.sql 은 실행하지 않는다. 이미 있으면 아무것도 바꾸지 않는다.
alter table public.transactions
  add column if not exists included_in_unpaid boolean not null default true;
