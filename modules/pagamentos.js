// ============================================================
// Pagamentos Module — Supabase CRUD
// ============================================================

const Pagamentos = {
    /**
     * Lista todos os pagamentos de um empréstimo
     */
    async listar(emprestimoId) {
        try {
            const { data, error } = await window.FinancierDB
                .from('pagamentos')
                .select('*')
                .eq('emprestimo_id', emprestimoId)
                .order('data_pagamento', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao listar pagamentos:', err);
            return [];
        }
    },

    /**
     * Lista últimos N pagamentos (todos os empréstimos)
     */
    async listarRecentes(limite = 5) {
        try {
            const { data, error } = await window.FinancierDB
                .from('pagamentos')
                .select('*, emprestimos(devedor_id, devedores(nome))')
                .order('data_pagamento', { ascending: false })
                .limit(limite);

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao listar pagamentos recentes:', err);
            return [];
        }
    },

    /**
     * Registra um novo pagamento com cálculo de juros/amortização
     */
    async registrar(dados) {
        try {
            const { data: { user } } = await window.FinancierDB.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            // Busca empréstimo
            const emprestimo = await Emprestimos.buscarPorId(dados.emprestimo_id);
            if (!emprestimo) throw new Error('Empréstimo não encontrado');

            // Calcula decomposição
            const taxa = Number(emprestimo.taxa_mensal);
            const saldo = Number(emprestimo.saldo_devedor);
            const valorPago = Number(dados.valor_pago);

            let result = {};
            
            // Se os valores já vieram calculados do frontend e o tipo foi informado, utiliza-os
            if (dados.tipo_pagamento && typeof dados.valor_juros !== 'undefined') {
                result.juros = Number(dados.valor_juros);
                result.amortizacao = Number(dados.valor_amortizacao);
                result.novoSaldo = Number(dados.saldo_apos);
                result.quitado = result.novoSaldo <= 0.01;
            } else {
                // Comportamento original: calcula
                if (emprestimo.modalidade === 'price') {
                    const pmt = window.Calculos.calcularPMT(Number(emprestimo.valor_principal), taxa, emprestimo.prazo_meses);
                    result = window.Calculos.calcularParcelaPrice(saldo, taxa, pmt);
                } else if (emprestimo.modalidade === 'sac') {
                    result = window.Calculos.calcularPagamentoSAC(saldo, taxa, valorPago, emprestimo.prazo_restante || emprestimo.prazo_meses);
                } else {
                    result = window.Calculos.calcularPagamentoLivre(saldo, taxa, valorPago);
                }
            }

            // Insere pagamento
            const pagamentoData = {
                user_id: user.id,
                emprestimo_id: dados.emprestimo_id,
                data_pagamento: dados.data_pagamento,
                valor_pago: valorPago,
                valor_juros: result.juros,
                valor_amortizacao: result.amortizacao,
                saldo_apos: result.novoSaldo,
                tipo_pagamento: dados.tipo_pagamento || 'normal',
                observacoes: dados.observacoes || null
            };

            const { data: novoPagamento, error: errPag } = await window.FinancierDB
                .from('pagamentos')
                .insert([pagamentoData])
                .select()
                .single();

            if (errPag) throw errPag;

            // Atualiza saldo e status do empréstimo
            const novoStatus = result.quitado ? 'quitado' : 'ativo';
            await Emprestimos.atualizar(emprestimo.id, {
                saldo_devedor: result.novoSaldo,
                status: novoStatus
            });

            if (window.registrarAcao) window.registrarAcao('PAGAMENTO_REGISTRADO');
            return novoPagamento;
        } catch (err) {
            console.error('Erro ao registrar pagamento:', err);
            return null;
        }
    },

    /**
     * Calcula total recebido no mês atual
     */
    async totalRecebidoNoMes() {
        try {
            const hoje = new Date();
            const primeiroDia = new Date(hoje.getFullYear(), hoje.getMonth(), 1)
                .toISOString().split('T')[0];

            const { data, error } = await window.FinancierDB
                .from('pagamentos')
                .select('valor_pago')
                .gte('data_pagamento', primeiroDia);

            if (error) throw error;
            return (data || []).reduce((acc, curr) => acc + Number(curr.valor_pago || 0), 0);
        } catch (err) {
            console.error('Erro ao calcular total recebido no mês:', err);
            return 0;
        }
    },

    /**
     * Lista todos os pagamentos ordenados pela data e id (para tela de pagamentos)
     */
    async listarTodos() {
        try {
            const { data, error } = await window.FinancierDB
                .from('pagamentos')
                .select('*, emprestimos(devedor_id, valor_principal, devedores(nome))')
                .order('data_pagamento', { ascending: false })
                .order('id', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao listar todos os pagamentos:', err);
            return [];
        }
    }
};

window.Pagamentos = Pagamentos;
