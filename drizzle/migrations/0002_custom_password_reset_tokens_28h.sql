create table if not exists public.password_reset_tokens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null,
  token_hash text not null unique,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_pwd_reset_user on public.password_reset_tokens(user_id);
create index if not exists idx_pwd_reset_expires on public.password_reset_tokens(expires_at);

GRANT ALL ON public.password_reset_tokens TO service_role;
GRANT SELECT, INSERT, UPDATE ON public.password_reset_tokens TO authenticated;
ALTER TABLE public.password_reset_tokens ENABLE ROW LEVEL SECURITY;

create or replace function public.get_auth_user_id_by_email(p_email text)
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select u.id from auth.users u where lower(u.email) = lower(p_email) limit 1
$$;

revoke all on function public.get_auth_user_id_by_email(text) from public, anon, authenticated;
grant execute on function public.get_auth_user_id_by_email(text) to service_role;