-- 이미 컬럼이 있어도 다시 실행할 수 있다.
-- 적금 금리와 청약 구분. 청약만 만기일을 비울 수 있다.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'savings' and column_name = 'product_kind'
  ) then
    alter table public.savings
      add column product_kind text not null default 'installment'
      check (product_kind in ('installment', 'housing'));
  end if;

  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'savings' and column_name = 'annual_rate'
  ) then
    alter table public.savings
      add column annual_rate numeric(5, 2) not null default 0
      check (annual_rate >= 0 and annual_rate <= 30);
  end if;

  if not exists (
    select 1 from pg_constraint
    where conname = 'savings_maturity'
  ) then
    alter table public.savings
      add constraint savings_maturity check (product_kind = 'housing' or maturity_on is not null);
  end if;
end $$;

alter table public.savings alter column maturity_on drop not null;
