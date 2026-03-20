// ============================================
// alertas.js — Sistema Dinâmico de Avisos
// ============================================

const Alertas = {
    // Chave no localStorage para rastrear os lidos:
    // { "vencido_uuid": true, "recebido_uuid": true, ... }
    _STORAGE_KEY: 'financier_avisos_lidos',

    _getLidos() {
        return JSON.parse(localStorage.getItem(this._STORAGE_KEY) || '{}');
    },

    /**
     * Gera dinamicamente o array de alertas com base nos dados do banco
     * @returns {Promise<Array>} Array de alertas estruturados
     */
    async gerarAlertas() {
        try {
            const userId = Auth.getUsuarioId();
            if (!userId) return [];

            // Buscar dados brutos
            // Precisamos dos empréstimos ativos, quitados recentemente, e pagamentos recentes
            const { data: emprestimos, error: errEmp } = await window.FinancierDB
                .from('emprestimos')
                .select('*, devedores (nome)')
                .eq('user_id', userId);

            if (errEmp) throw errEmp;

            const { data: pagamentos, error: errPag } = await window.FinancierDB
                .from('pagamentos')
                .select('*, emprestimos (devedores (nome))')
                .eq('user_id', userId)
                .order('data_pagamento', { ascending: false })
                .limit(50); // Últimos 50 pagamentos para checar 'recebidos'

            if (errPag) throw errPag;

            const alertas = [];
            const hojeIso = Datas.hojeISO();

            // Mapeando empréstimos para buscar seus últimos pagamentos
            for (const emp of emprestimos) {
                const devedorNome = emp.devedores?.nome || 'Desconhecido';
                const pagsDoEmp = pagamentos.filter(p => p.emprestimo_id === emp.id);
                const ultimoPag = pagsDoEmp.length > 0 ? pagsDoEmp[0] : null;

                // Referência de data: ultimo pagamento ou a data de inicio do empréstimo
                const dataReferencia = ultimoPag ? ultimoPag.data_pagamento : emp.data_inicio;
                const diasPassados = window.Datas.diasEntreDatas(dataReferencia, hojeIso);
                
                // 1. Regra VENCIDO (vermelho)
                if (emp.status === 'ativo' && diasPassados > 30) {
                    alertas.push({
                        id: `vencido_${emp.id}_${Datas.mesAtualAno(hojeIso)}`,
                        tipo: 'vencido', // vermelho
                        icone: 'alert-triangle',
                        devedor: devedorNome,
                        emprestimo_id: emp.id,
                        mensagem: `Pagamento atrasado ${diasPassados - 30} dias — Saldo: ${window.formatarReais(emp.saldo_devedor)}`,
                        data: hojeIso, // Alerta vivo até ser resolvido
                        prioridade: 1
                    });
                }
                
                // 2. Regra PRÓXIMO (amarelo)
                else if (emp.status === 'ativo' && diasPassados >= 25 && diasPassados <= 30) {
                    const diasParaVencer = 30 - diasPassados;
                    alertas.push({
                        id: `proximo_${emp.id}_${Datas.mesAtualAno(hojeIso)}`,
                        tipo: 'proximo', // amarelo
                        icone: 'calendar-clock',
                        devedor: devedorNome,
                        emprestimo_id: emp.id,
                        mensagem: diasParaVencer === 0 
                            ? `O vencimento de ${devedorNome} é hoje!` 
                            : `Vencimento em ${diasParaVencer} dias — ${devedorNome}`,
                        data: hojeIso,
                        prioridade: 2
                    });
                }

                // 4. Regra QUITADO (azul)
                // Vamos mostrar quitados que foram finalizados nos últimos 7 dias
                if (emp.status === 'quitado' && diasPassados <= 7) {
                    alertas.push({
                        id: `quitado_${emp.id}`, // Id único por empréstimo
                        tipo: 'quitado', // azul/info
                        icone: 'check-circle',
                        devedor: devedorNome,
                        emprestimo_id: emp.id,
                        mensagem: `${devedorNome} quitou o empréstimo originário de ${window.formatarReais(emp.valor_principal)}`,
                        data: dataReferencia,
                        prioridade: 4
                    });
                }
            }

            // 3. Regra RECEBIDO (verde)
            for (const pag of pagamentos) {
                const diasPagPassados = window.Datas.diasEntreDatas(pag.data_pagamento, hojeIso);
                if (diasPagPassados <= 3) {
                    const devedorNome = pag.emprestimos?.devedores?.nome || 'Desconhecido';
                    alertas.push({
                        id: `recebido_${pag.id}`,
                        tipo: 'recebido', // verde
                        icone: 'dollar-sign',
                        devedor: devedorNome,
                        emprestimo_id: pag.emprestimo_id,
                        mensagem: `Pagamento de ${window.formatarReais(pag.valor_pago)} recebido de ${devedorNome}`,
                        data: pag.data_pagamento,
                        prioridade: 3
                    });
                }
            }

            // Marca lidos e ordena
            const lidos = this._getLidos();
            alertas.forEach(a => a.lido = !!lidos[a.id]);

            // Ordenação: Vermelhos (1) > Amarelos (2) > Verdes (3) > Azuis (4)
            // Desempate: mais antigos primeiro (para vencidos) e mais recentes para os outros
            alertas.sort((a, b) => {
                if (a.prioridade !== b.prioridade) return a.prioridade - b.prioridade;
                // Mesma prioridade, ordena por data
                if (a.tipo === 'vencido') {
                    // Mais antigos primeiro = mais atrasado = alerta mais antigo? 
                    // Como a data é sempre hoje no alerta vencido, o dias atrasados é o que conta,
                    // mas podemos ignorar ordens avançadas aqui e usar a lógica padrão de string date.
                    return new Date(a.data) - new Date(b.data);
                } else {
                    // Para recebidos e quitados, mais recentes primeiro
                    return new Date(b.data) - new Date(a.data); 
                }
            });

            return alertas;

        } catch (err) {
            console.error('Erro ao gerar alertas:', err);
            return [];
        }
    },

    async getNaoLidosCount() {
        const alertas = await this.gerarAlertas();
        return alertas.filter(a => !a.lido).length;
    },

    marcarComoLido(alertId) {
        const lidos = this._getLidos();
        lidos[alertId] = true;
        localStorage.setItem(this._STORAGE_KEY, JSON.stringify(lidos));
        this.atualizarBadge();
    },

    async marcarTodosComoLido() {
        const alertas = await this.gerarAlertas();
        const lidos = this._getLidos();
        alertas.forEach(a => { lidos[a.id] = true; });
        localStorage.setItem(this._STORAGE_KEY, JSON.stringify(lidos));
        this.atualizarBadge();
    },

    async atualizarBadge() {
        const count = await this.getNaoLidosCount();
        const badge = document.getElementById('sidebar-avisos-badge');
        if (badge) {
            if (count > 0) {
                badge.textContent = count > 99 ? '99+' : count;
                badge.style.display = 'inline-block';
            } else {
                badge.style.display = 'none';
            }
        }
    }
};

window.Alertas = Alertas;
