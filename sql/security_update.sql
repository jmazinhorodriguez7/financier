-- Tabela de configuração e controle de sessão
create table if not exists config_usuario (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) 
    on delete cascade unique,
  session_token text,
  ultimo_acesso timestamptz default now(),
  created_at timestamptz default now()
);

-- Tabela de log de acessos (auditoria pessoal)
create table if not exists log_acesso (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) 
    on delete cascade,
  acao text not null,
  ip_hash text,
  user_agent_hash text,
  created_at timestamptz default now()
);

-- RLS em todas as tabelas novas
alter table config_usuario enable row level security;
alter table log_acesso enable row level security;

create policy "dono_apenas" on config_usuario
  for all using (auth.uid() = user_id);

create policy "dono_apenas" on log_acesso
  for all using (auth.uid() = user_id);

-- Verificar e recriar policies mais restritivas
do $$
declare
  tabelas text[] := array[
    'devedores','emprestimos','pagamentos','alertas'
  ];
  t text;
begin
  foreach t in array tabelas loop
    execute format(
      'alter table %I enable row level security', t
    );
  end loop;
end $$;

-- Policy que bloqueia tudo exceto o dono para DEVEDORES
drop policy if exists "somente_dono_select" on devedores;
create policy "somente_dono_select" on devedores for select using (auth.uid() = user_id);
drop policy if exists "somente_dono_insert" on devedores;
create policy "somente_dono_insert" on devedores for insert with check (auth.uid() = user_id);
drop policy if exists "somente_dono_update" on devedores;
create policy "somente_dono_update" on devedores for update using (auth.uid() = user_id);
drop policy if exists "somente_dono_delete" on devedores;
create policy "somente_dono_delete" on devedores for delete using (auth.uid() = user_id);

-- Policy que bloqueia tudo exceto o dono para EMPRESTIMOS
drop policy if exists "somente_dono_select" on emprestimos;
create policy "somente_dono_select" on emprestimos for select using (auth.uid() = user_id);
drop policy if exists "somente_dono_insert" on emprestimos;
create policy "somente_dono_insert" on emprestimos for insert with check (auth.uid() = user_id);
drop policy if exists "somente_dono_update" on emprestimos;
create policy "somente_dono_update" on emprestimos for update using (auth.uid() = user_id);
drop policy if exists "somente_dono_delete" on emprestimos;
create policy "somente_dono_delete" on emprestimos for delete using (auth.uid() = user_id);

-- Policy que bloqueia tudo exceto o dono para PAGAMENTOS
drop policy if exists "somente_dono_select" on pagamentos;
create policy "somente_dono_select" on pagamentos for select using (auth.uid() = user_id);
drop policy if exists "somente_dono_insert" on pagamentos;
create policy "somente_dono_insert" on pagamentos for insert with check (auth.uid() = user_id);
drop policy if exists "somente_dono_update" on pagamentos;
create policy "somente_dono_update" on pagamentos for update using (auth.uid() = user_id);
drop policy if exists "somente_dono_delete" on pagamentos;
create policy "somente_dono_delete" on pagamentos for delete using (auth.uid() = user_id);

-- Policy que bloqueia tudo exceto o dono para ALERTAS
drop policy if exists "somente_dono_select" on alertas;
create policy "somente_dono_select" on alertas for select using (auth.uid() = user_id);
drop policy if exists "somente_dono_insert" on alertas;
create policy "somente_dono_insert" on alertas for insert with check (auth.uid() = user_id);
drop policy if exists "somente_dono_update" on alertas;
create policy "somente_dono_update" on alertas for update using (auth.uid() = user_id);
drop policy if exists "somente_dono_delete" on alertas;
create policy "somente_dono_delete" on alertas for delete using (auth.uid() = user_id);

-- Remover acesso anônimo de todas as tabelas
revoke all on devedores from anon;
revoke all on emprestimos from anon;
revoke all on pagamentos from anon;
revoke all on alertas from anon;
revoke all on config_usuario from anon;
revoke all on log_acesso from anon;

-- Manter apenas acesso autenticado
grant select, insert, update, delete on devedores to authenticated;
grant select, insert, update, delete on emprestimos to authenticated;
grant select, insert, update, delete on pagamentos to authenticated;
grant select, insert, update, delete on alertas to authenticated;
grant select, insert, update, delete on config_usuario to authenticated;
grant select, insert on log_acesso to authenticated;
