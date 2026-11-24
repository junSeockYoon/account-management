-- 이미 사용 중인 데이터베이스에서 한 번만 실행한다. schema.sql 은 다시 실행하지 않는다.

create table if not exists public.weekly_challenges (
  user_id uuid not null references auth.users (id) on delete cascade,
  week_start date not null,
  category_id text references public.categories (id),
  limit_amount bigint,
  status text not null,
  primary key (user_id, week_start),
  constraint weekly_challenge_monday check (extract(isodow from week_start) = 1),
  constraint weekly_challenge_status check (status in ('active', 'skipped')),
  constraint weekly_challenge_shape check (
    (status = 'skipped' and limit_amount is null)
    or (status = 'active' and category_id is not null and limit_amount between 1 and 100000000)
  )
);

alter table public.weekly_challenges enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public' and tablename = 'weekly_challenges' and policyname = '본인 주간 챌린지'
  ) then
    create policy "본인 주간 챌린지" on public.weekly_challenges
      for all to authenticated
      using (user_id = auth.uid())
      with check (user_id = auth.uid());
  end if;
end $$;
