# Skill: Supabase — Banco de Dados e Autenticação

## Schema Completo do Banco

```sql
-- Tabela de devedores
create table devedores (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  nome text not null,
  contato text,
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de empréstimos
create table emprestimos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  devedor_id uuid references devedores(id) on delete cascade,
  valor_principal numeric(12,2) not null,
  taxa_mensal numeric(6,4) not null,
  data_inicio date not null,
  prazo_meses integer,
  modalidade text check (modalidade in ('livre','price')) default 'livre',
  saldo_devedor numeric(12,2) not null,
  status text check (status in ('ativo','quitado','renegociado')) 
    default 'ativo',
  observacoes text,
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

-- Tabela de pagamentos
create table pagamentos (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  emprestimo_id uuid references emprestimos(id) on delete cascade,
  data_pagamento date not null,
  valor_pago numeric(12,2) not null,
  valor_juros numeric(12,2) not null,
  valor_amortizacao numeric(12,2) not null,
  saldo_apos numeric(12,2) not null,
  observacoes text,
  created_at timestamptz default now()
);

-- Tabela de alertas
create table alertas (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  emprestimo_id uuid references emprestimos(id) on delete cascade,
  tipo text check (tipo in ('vencido','proximo','quitado','info')),
  mensagem text not null,
  lido boolean default false,
  created_at timestamptz default now()
);
```

## Row Level Security — Obrigatório
```sql
alter table devedores enable row level security;
alter table emprestimos enable row level security;
alter table pagamentos enable row level security;
alter table alertas enable row level security;

create policy "usuario_ve_proprios_dados" on devedores
  for all using (auth.uid() = user_id);

create policy "usuario_ve_proprios_dados" on emprestimos
  for all using (auth.uid() = user_id);

create policy "usuario_ve_proprios_dados" on pagamentos
  for all using (auth.uid() = user_id);

create policy "usuario_ve_proprios_dados" on alertas
  for all using (auth.uid() = user_id);
```

## Padrão de Consultas
- Sempre filtrar por user_id além do id do registro
- Usar select específico de colunas, nunca select *
- Ordenar listas por created_at desc por padrão
- Usar .single() apenas quando resultado garantido