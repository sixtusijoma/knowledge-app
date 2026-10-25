-- Counts bookmarks and chats by each entry's own item_date.
-- Bookmarks use the post date. Chats use the chat date.
-- security invoker keeps the items row level security policy in force.
-- Existing indexes on item_date, source, and topics cover the filters.
-- Empty days are omitted; the app switches between day, week, and month.

create or replace function public.activity_buckets(
  p_unit text,
  p_from date default null,
  p_to date default null,
  p_source text default null,
  p_topic text default null
)
returns table (
  bucket date,
  bookmarks bigint,
  chats bigint
)
language sql
stable
security invoker
set search_path = public
as $$
  select
    date_trunc(unit.unit, items.item_date::timestamp)::date as bucket,
    count(*) filter (where items.source = 'X Bookmark') as bookmarks,
    count(*) filter (where items.source = 'Grok Chat') as chats
  from public.items as items
  cross join (
    select case
      when p_unit in ('day', 'week', 'month') then p_unit
      else null
    end as unit
  ) as unit
  where unit.unit is not null
    and items.item_date is not null
    and (p_from is null or items.item_date >= p_from)
    and (p_to is null or items.item_date <= p_to)
    and (p_source is null or items.source = p_source)
    and (p_topic is null or items.topics && array[p_topic])
  group by 1
  order by 1;
$$;

revoke all on function public.activity_buckets(text, date, date, text, text) from public;
grant execute on function public.activity_buckets(text, date, date, text, text) to anon, authenticated, service_role;

notify pgrst, 'reload schema';
