create or replace function public.get_public_trip_stats()
returns table(trip_count bigint, total_distance numeric)
language sql
stable
security definer
set search_path = public
as $$
  select
    count(*)::bigint as trip_count,
    coalesce(sum(distance), 0)::numeric as total_distance
  from public.trips
  where deleted_at is null and status = 'validated';
$$;

grant execute on function public.get_public_trip_stats() to anon, authenticated, service_role;