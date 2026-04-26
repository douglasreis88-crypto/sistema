-- 1) Enum de tipo de entidade
do $$
begin
  if not exists (select 1 from pg_type where typname = 'entity_type') then
    create type public.entity_type as enum ('prefeitura', 'camara', 'descentralizado');
  end if;
end$$;

-- 2) Tabela de permissões por usuário
create table if not exists public.user_permissions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique,
  entidades public.entity_type[] not null default '{}',
  municipios_por_entidade jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.user_permissions enable row level security;

-- Policies
drop policy if exists "Users can view own permissions" on public.user_permissions;
create policy "Users can view own permissions"
  on public.user_permissions for select
  to authenticated
  using (auth.uid() = user_id or public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can insert permissions" on public.user_permissions;
create policy "Admins can insert permissions"
  on public.user_permissions for insert
  to authenticated
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can update permissions" on public.user_permissions;
create policy "Admins can update permissions"
  on public.user_permissions for update
  to authenticated
  using (public.has_role(auth.uid(), 'admin'))
  with check (public.has_role(auth.uid(), 'admin'));

drop policy if exists "Admins can delete permissions" on public.user_permissions;
create policy "Admins can delete permissions"
  on public.user_permissions for delete
  to authenticated
  using (public.has_role(auth.uid(), 'admin'));

-- Trigger updated_at
drop trigger if exists trg_user_permissions_updated_at on public.user_permissions;
create trigger trg_user_permissions_updated_at
  before update on public.user_permissions
  for each row execute function public.update_updated_at_column();

-- 3) Atualizar handle_new_user para garantir admin fixo
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count int;
  v_role public.app_role;
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data ->> 'full_name', ''),
    new.email
  );

  if lower(coalesce(new.email, '')) = 'douglasreis88@gmail.com' then
    v_role := 'admin';
  else
    select count(*) into v_count from public.user_roles;
    if v_count = 0 then
      v_role := 'admin';
    else
      v_role := 'user';
    end if;
  end if;

  insert into public.user_roles (user_id, role) values (new.id, v_role);
  return new;
end;
$$;

-- 4) Promover douglasreis88 a admin se já existir
insert into public.user_roles (user_id, role)
select u.id, 'admin'::public.app_role
from auth.users u
where lower(u.email) = 'douglasreis88@gmail.com'
  and not exists (
    select 1 from public.user_roles r where r.user_id = u.id and r.role = 'admin'
  );

-- 5) Garantir trigger on auth.users (caso ainda não exista)
do $$
begin
  if not exists (
    select 1 from pg_trigger where tgname = 'on_auth_user_created'
  ) then
    create trigger on_auth_user_created
      after insert on auth.users
      for each row execute function public.handle_new_user();
  end if;
end$$;