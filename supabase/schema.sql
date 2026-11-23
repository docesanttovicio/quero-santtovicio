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

-- Projetos novos do Supabase não dão acesso automático: libera para o servidor do site.
grant select, insert, update, delete on public.pedidos to service_role;
grant usage, select on sequence public.pedidos_numero_seq to service_role;

-- Configurações editadas pelo painel (cardápio e taxas).
create table if not exists public.config (
  id            text primary key,
  dados         jsonb not null,
  atualizado_em timestamptz not null default now()
);
alter table public.config enable row level security;
grant select, insert, update, delete on public.config to service_role;

-- Acessos da loja (aba "Acessos" do painel). Anônimo: só um código aleatório por aparelho.
create table if not exists public.acessos (
  id          bigserial primary key,
  em          timestamptz not null default now(),
  visitante   text not null,
  tipo        text not null,   -- visita | produto | sacola | dados
  produto     text,
  origem      text,
  dispositivo text
);
create index if not exists acessos_em_idx on public.acessos (em);
alter table public.acessos enable row level security;
grant select, insert, delete on public.acessos to service_role;
grant usage, select on sequence public.acessos_id_seq to service_role;
