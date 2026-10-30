create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists push_subscriptions_user_id_idx
  on public.push_subscriptions(user_id);

alter table public.push_subscriptions enable row level security;

create policy "Users manage their push subscriptions"
  on public.push_subscriptions for all to authenticated
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

grant select, insert, update, delete on public.push_subscriptions to authenticated;

create table if not exists public.push_deliveries (
  subscription_id uuid not null references public.push_subscriptions(id) on delete cascade,
  task_id text not null,
  occurrence_date date not null,
  reminder_type text not null check (reminder_type in ('day', 'before_time')),
  claimed_at timestamptz not null default now(),
  primary key (subscription_id, task_id, occurrence_date, reminder_type)
);

alter table public.push_deliveries enable row level security;
revoke all on public.push_deliveries from anon, authenticated;
grant all on public.push_deliveries to service_role;

create or replace function public.get_push_config()
returns jsonb
language sql
security definer
set search_path = pg_catalog
as $$
  select pg_catalog.jsonb_build_object(
    'vapid_public', (select decrypted_secret from vault.decrypted_secrets where name = 'mana_diena_vapid_public' limit 1),
    'vapid_private', (select decrypted_secret from vault.decrypted_secrets where name = 'mana_diena_vapid_private' limit 1),
    'cron_token', (select decrypted_secret from vault.decrypted_secrets where name = 'mana_diena_cron_token' limit 1)
  );
$$;

revoke all on function public.get_push_config() from public, anon, authenticated;
grant execute on function public.get_push_config() to service_role;
