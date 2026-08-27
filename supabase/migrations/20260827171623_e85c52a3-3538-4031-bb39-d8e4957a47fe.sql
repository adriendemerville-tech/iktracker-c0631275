create or replace function public.get_public_user_count()
returns bigint
language sql
stable
security definer
set search_path = public
as $$
  select count(*) from auth.users;
$$;

grant execute on function public.get_public_user_count() to anon, authenticated, service_role;