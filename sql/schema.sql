-- Schema para o projeto Financier

-- Extensão para UUIDs (se necessário)
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Devedores
CREATE TABLE IF NOT EXISTS public.devedores (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    nome TEXT NOT NULL,
    email TEXT,
    telefone TEXT,
    cpf TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.devedores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem ver seus próprios devedores" ON public.devedores FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios devedores" ON public.devedores FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios devedores" ON public.devedores FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios devedores" ON public.devedores FOR DELETE USING (auth.uid() = user_id);

-- Emprestimos
CREATE TABLE IF NOT EXISTS public.emprestimos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    devedor_id UUID REFERENCES public.devedores(id) ON DELETE CASCADE NOT NULL,
    valor_principal NUMERIC NOT NULL,
    taxa_juros NUMERIC NOT NULL,
    data_emprestimo DATE NOT NULL,
    tipo_juros TEXT DEFAULT 'simples',
    status TEXT DEFAULT 'ativo',
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.emprestimos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem ver seus próprios empréstimos" ON public.emprestimos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios empréstimos" ON public.emprestimos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios empréstimos" ON public.emprestimos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios empréstimos" ON public.emprestimos FOR DELETE USING (auth.uid() = user_id);

-- Pagamentos
CREATE TABLE IF NOT EXISTS public.pagamentos (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    emprestimo_id UUID REFERENCES public.emprestimos(id) ON DELETE CASCADE NOT NULL,
    valor_pago NUMERIC NOT NULL,
    data_pagamento DATE NOT NULL,
    comprovante_url TEXT,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.pagamentos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem ver seus próprios pagamentos" ON public.pagamentos FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios pagamentos" ON public.pagamentos FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios pagamentos" ON public.pagamentos FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios pagamentos" ON public.pagamentos FOR DELETE USING (auth.uid() = user_id);

-- Alertas
CREATE TABLE IF NOT EXISTS public.alertas (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    emprestimo_id UUID REFERENCES public.emprestimos(id) ON DELETE CASCADE NOT NULL,
    mensagem TEXT NOT NULL,
    data_alerta DATE NOT NULL,
    lido BOOLEAN DEFAULT false,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.alertas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários podem ver seus próprios alertas" ON public.alertas FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem inserir seus próprios alertas" ON public.alertas FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem atualizar seus próprios alertas" ON public.alertas FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus próprios alertas" ON public.alertas FOR DELETE USING (auth.uid() = user_id);
