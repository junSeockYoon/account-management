-- 달러 주식의 매입 당시 환율. 이미 컬럼이 있어도 다시 실행할 수 있다.

do $$
begin
  if not exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'stocks' and column_name = 'purchase_fx'
  ) then
    alter table public.stocks
      add column purchase_fx numeric(12, 4) check (purchase_fx is null or purchase_fx > 0);
  end if;
end $$;
