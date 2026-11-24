-- 지출 카테고리 "데이트"만 추가한다. schema.sql 은 실행하지 않는다.
-- 이미 있으면 아무것도 바꾸지 않는다.

do $$
begin
  if not exists (select 1 from public.categories where id = 'date') then
    update public.categories
    set sort_order = sort_order + 1
    where sort_order >= 7;

    insert into public.categories (id, name, "group", color, sort_order)
    values ('date', '데이트', 'expense', '#DB2777', 7);
  end if;
end $$;
