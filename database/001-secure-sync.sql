-- LiftPlan v2: new tables; existing LiftPlan and MealPlan rows are untouched.
-- Apply through the Supabase SQL editor after reviewing the deployment checklist.
begin;
create table if not exists public.liftplan_v2_records (
 user_id uuid not null references auth.users(id) on delete cascade,
 id text not null check (length(id) between 1 and 200),
 kind text not null check (kind in ('profile','settings','workout')),
 profile_id text,
 payload jsonb not null default '{}'::jsonb,
 revision bigint not null default 1 check(revision>0),
 mutation_id uuid not null,
 deleted boolean not null default false,
 updated_at timestamptz not null default now(),
 primary key(user_id,id)
);
alter table public.liftplan_v2_records enable row level security;
revoke all on public.liftplan_v2_records from anon;
revoke all on public.liftplan_v2_records from authenticated;
grant select,insert,update on public.liftplan_v2_records to authenticated;
drop policy if exists household_owner on public.liftplan_v2_records;
create policy household_owner on public.liftplan_v2_records to authenticated
 using (user_id=(select auth.uid())) with check (user_id=(select auth.uid()));

create or replace function public.save_liftplan_v2_record(
 p_id text, p_kind text, p_profile_id text, p_payload jsonb,
 p_base_revision bigint, p_mutation_id uuid, p_deleted boolean default false
) returns setof public.liftplan_v2_records
language plpgsql security invoker set search_path='' as $$
declare existing public.liftplan_v2_records; caller uuid:=auth.uid();
begin
 if caller is null then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_payload is null or octet_length(p_payload::text)>500000 then raise exception 'Invalid record size' using errcode='22023'; end if;
 -- Serialize writes to the same user/record, including its first insertion.
 perform pg_advisory_xact_lock(hashtextextended(caller::text||':'||p_id,0));
 select * into existing from public.liftplan_v2_records where user_id=caller and id=p_id for update;
 if found then
  if existing.mutation_id=p_mutation_id then return next existing;return;end if;
  if existing.revision<>p_base_revision then raise exception 'Record changed on another device' using errcode='40001';end if;
  update public.liftplan_v2_records set kind=p_kind,profile_id=p_profile_id,payload=p_payload,
   revision=revision+1,mutation_id=p_mutation_id,deleted=p_deleted,updated_at=now()
   where user_id=caller and id=p_id returning * into existing;
 else
  if p_base_revision<>0 then raise exception 'Record changed on another device' using errcode='40001';end if;
  insert into public.liftplan_v2_records(user_id,id,kind,profile_id,payload,mutation_id,deleted)
   values(caller,p_id,p_kind,p_profile_id,p_payload,p_mutation_id,p_deleted) returning * into existing;
 end if;
 return next existing;
end;$$;
revoke all on function public.save_liftplan_v2_record(text,text,text,jsonb,bigint,uuid,boolean) from public,anon;
grant execute on function public.save_liftplan_v2_record(text,text,text,jsonb,bigint,uuid,boolean) to authenticated;
commit;
