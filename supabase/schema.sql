-- Rode uma vez no Supabase: painel do projeto → SQL Editor → New query → cole e clique em Run.

create table if not exists public.pedidos (
  numero     bigserial primary key,
  codigo     text unique,
  criado_em  timestamptz not null default now(),
  dados      jsonb not null
);

create index if not exists pedidos_codigo_idx on public.pedidos (codigo);

-- Segurança: ninguém acessa a tabela pelo navegador. Só o servidor do site, com a chave service_role.
alter table public.pedidos enable row level security;
