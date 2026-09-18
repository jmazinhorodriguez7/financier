-- ============================================================
-- Financier — Atualização de Gestão, Previsão e Integridade
-- ============================================================

-- 1. Adiciona coluna opcional dia_vencimento em emprestimos (se não existir)
ALTER TABLE public.emprestimos
  ADD COLUMN IF NOT EXISTS dia_vencimento INTEGER CHECK (dia_vencimento BETWEEN 1 AND 31);

-- Se dia_vencimento for nulo, define com base no dia de data_inicio
UPDATE public.emprestimos
SET dia_vencimento = EXTRACT(DAY FROM data_inicio)::integer
WHERE dia_vencimento IS NULL AND data_inicio IS NOT NULL;

-- 2. Função e Trigger para manter consistência automática de saldo, prazo_restante e status
CREATE OR REPLACE FUNCTION public.fn_sincronizar_saldo_emprestimo()
RETURNS TRIGGER AS $$
DECLARE
    v_emp_id UUID;
    v_ultimo_saldo NUMERIC;
    v_total_pagamentos INTEGER;
    v_modalidade TEXT;
    v_prazo_meses INTEGER;
    v_principal NUMERIC;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_emp_id := OLD.emprestimo_id;
    ELSE
        v_emp_id := NEW.emprestimo_id;
    END IF;

    -- Busca detalhes do empréstimo
    SELECT modalidade, prazo_meses, valor_principal
    INTO v_modalidade, v_prazo_meses, v_principal
    FROM public.emprestimos
    WHERE id = v_emp_id;

    IF NOT FOUND THEN
        RETURN NULL;
    END IF;

    -- Busca o saldo_apos do pagamento mais recente ordenado pela data_pagamento e created_at
    SELECT saldo_apos INTO v_ultimo_saldo
    FROM public.pagamentos
    WHERE emprestimo_id = v_emp_id
    ORDER BY data_pagamento DESC, created_at DESC
    LIMIT 1;

    -- Se não houver nenhum pagamento restante, o saldo volta ao principal original
    IF v_ultimo_saldo IS NULL THEN
        v_ultimo_saldo := v_principal;
    END IF;

    -- Conta total de pagamentos para atualizar prazo_restante
    SELECT COUNT(*) INTO v_total_pagamentos
    FROM public.pagamentos
    WHERE emprestimo_id = v_emp_id;

    -- Atualiza empréstimo de forma atômica
    UPDATE public.emprestimos
    SET 
        saldo_devedor = ROUND(v_ultimo_saldo, 2),
        prazo_restante = CASE 
            WHEN v_prazo_meses IS NOT NULL THEN GREATEST(0, v_prazo_meses - v_total_pagamentos)
            ELSE prazo_restante 
        END,
        status = CASE 
            WHEN ROUND(v_ultimo_saldo, 2) <= 0.05 THEN 'quitado'
            ELSE 'ativo'
        END,
        updated_at = NOW()
    WHERE id = v_emp_id;

    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Remove trigger se já existir para recriar
DROP TRIGGER IF EXISTS trg_atualizar_saldo_apos_pagamento ON public.pagamentos;

CREATE TRIGGER trg_atualizar_saldo_apos_pagamento
AFTER INSERT OR UPDATE OR DELETE ON public.pagamentos
FOR EACH ROW
EXECUTE FUNCTION public.fn_sincronizar_saldo_emprestimo();
