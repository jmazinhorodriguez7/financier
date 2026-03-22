-- Atualizar constraint de modalidade
alter table emprestimos
  drop constraint if exists emprestimos_modalidade_check;

alter table emprestimos
  add constraint emprestimos_modalidade_check
  check (modalidade in ('livre','price','sac'));

-- Adicionar prazo_restante
alter table emprestimos
  add column if not exists prazo_restante integer;

-- Atualizar prazo_restante dos empréstimos existentes
update emprestimos e
set prazo_restante = e.prazo_meses - (
  select count(*) from pagamentos p
  where p.emprestimo_id = e.id
)
where e.prazo_meses is not null;

-- Tabela histórico de edições
create table if not exists historico_edicoes (
  id uuid default gen_random_uuid() primary key,
  user_id uuid references auth.users(id) on delete cascade,
  emprestimo_id uuid references emprestimos(id) 
    on delete cascade,
  campo_alterado text not null,
  valor_anterior text,
  valor_novo text,
  created_at timestamptz default now()
);

alter table historico_edicoes enable row level security;
create policy "dono_apenas" on historico_edicoes
  for all using (auth.uid() = user_id);
