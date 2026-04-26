-- ============ ENUM de papéis ============
create type public.app_role as enum ('admin', 'user');

-- ============ Tabela profiles ============
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null default '',
  email text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

-- ============ Tabela user_roles ============
create table public.user_roles (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.app_role not null,
  created_at timestamptz not null default now(),
  unique (user_id, role)
);

alter table public.user_roles enable row level security;

-- ============ Função security definer (evita recursão em RLS) ============
create or replace function public.has_role(_user_id uuid, _role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.user_roles
    where user_id = _user_id and role = _role
  )
$$;

-- ============ updated_at trigger ============
create or replace function public.update_updated_at_column()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger update_profiles_updated_at
before update on public.profiles
for each row execute function public.update_updated_at_column();

-- ============ Trigger: ao criar usuário, cria profile e papel ============
-- Primeiro usuário cadastrado vira ADMIN; demais viram USER.
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

  select count(*) into v_count from public.user_roles;
  if v_count = 0 then
    v_role := 'admin';
  else
    v_role := 'user';
  end if;

  insert into public.user_roles (user_id, role) values (new.id, v_role);
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function public.handle_new_user();

-- ============ RLS: profiles ============
-- Qualquer usuário autenticado pode ver perfis (necessário para a tela de gerenciar usuários)
create policy "Authenticated users can view profiles"
on public.profiles for select
to authenticated
using (true);

-- Usuário pode atualizar seu próprio perfil
create policy "Users can update own profile"
on public.profiles for update
to authenticated
using (auth.uid() = id)
with check (auth.uid() = id);

-- Admins podem atualizar qualquer perfil
create policy "Admins can update any profile"
on public.profiles for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

-- Admins podem excluir perfis
create policy "Admins can delete profiles"
on public.profiles for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- ============ RLS: user_roles ============
-- Usuário pode ver seus próprios papéis
create policy "Users can view own roles"
on public.user_roles for select
to authenticated
using (auth.uid() = user_id);

-- Admins podem ver todos os papéis
create policy "Admins can view all roles"
on public.user_roles for select
to authenticated
using (public.has_role(auth.uid(), 'admin'));

-- Apenas admins podem inserir/atualizar/excluir papéis
create policy "Admins can insert roles"
on public.user_roles for insert
to authenticated
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can update roles"
on public.user_roles for update
to authenticated
using (public.has_role(auth.uid(), 'admin'))
with check (public.has_role(auth.uid(), 'admin'));

create policy "Admins can delete roles"
on public.user_roles for delete
to authenticated
using (public.has_role(auth.uid(), 'admin'));