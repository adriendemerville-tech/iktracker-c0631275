create table if not exists public.maintenance_flags (
  key text primary key,
  enabled boolean not null default false,
  updated_at timestamptz not null default now()
);

grant select, insert, update, delete on public.maintenance_flags to authenticated;
grant all on public.maintenance_flags to service_role;

alter table public.maintenance_flags enable row level security;

create policy "Admins manage maintenance flags"
on public.maintenance_flags
for all
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

insert into public.maintenance_flags (key, enabled)
values ('backfill_blog_covers', true)
on conflict (key) do update set enabled = true, updated_at = now();