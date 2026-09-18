// ============================================================
// tela-emprestimos.js — Gestão & Inteligência de Empréstimos
// ============================================================

const TelaEmprestimos = {
    _emprestimos: [],
    _filtroAtual: 'todos', // 'todos' | 'atrasados' | 'semana' | 'livre' | 'parcelado' | 'quitados'
    _busca: '',
    _ordenacao: { coluna: 'situacao_dias', direcao: 'desc' },

    async render() {
        const app = document.getElementById('conteudo-principal');
        if (!app) return;
        app.innerHTML = this._renderSkeleton();

        try {
            this._emprestimos = await Emprestimos.listarTodos();
            this._calcularMetricasEnriquecidas();
            app.innerHTML = this._renderTela();
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error('Erro ao carregar empréstimos:', err);
            if (window.App?.showToast) {
                App.showToast('Erro ao carregar a lista de empréstimos.', 'error');
            }
        }
    },

    /**
     * Enriquece empréstimos com datas de vencimento, dias de atraso,
     * lucro total recebido e percentual amortizado
     */
    _calcularMetricasEnriquecidas() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        this._emprestimos.forEach(emp => {
            const principal = Number(emp.valor_principal || 0);
            const saldo = Number(emp.saldo_devedor || 0);
            const pagamentos = emp.pagamentos || [];

            // Lucro recebido (soma dos juros) e amortização total
            const lucroTotal = pagamentos.reduce((acc, p) => acc + Number(p.valor_juros || 0), 0);
            const amortizadoTotal = pagamentos.reduce((acc, p) => acc + Number(p.valor_amortizacao || 0), 0);
            const percentualAmortizado = principal > 0 ? Math.min(100, Math.max(0, (amortizadoTotal / principal) * 100)) : 0;

            // Data do último pagamento
            const pagamentosOrdenados = [...pagamentos].sort((a, b) => new Date(b.data_pagamento) - new Date(a.data_pagamento));
            const ultimoPagamento = pagamentosOrdenados[0]?.data_pagamento || null;

            // Próximo vencimento previsto
            let proximoVencimento = null;
            let diasParaVencer = 0;
            let situacaoStatus = 'em_dia'; // 'atrasado' | 'hoje' | 'semana' | 'em_dia' | 'quitado'

            if (emp.status === 'quitado' || saldo <= 0.05) {
                situacaoStatus = 'quitado';
            } else {
                const baseData = ultimoPagamento ? new Date(ultimoPagamento + 'T12:00:00') : new Date(emp.data_inicio + 'T12:00:00');
                const prox = new Date(baseData);
                prox.setMonth(prox.getMonth() + 1);

                // Se houver dia_vencimento fixo, ajusta o dia
                if (emp.dia_vencimento) {
                    const diaFixo = Math.min(emp.dia_vencimento, 28);
                    prox.setDate(diaFixo);
                }

                proximoVencimento = prox;
                const diffTime = prox.getTime() - hoje.getTime();
                diasParaVencer = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

                if (diasParaVencer < 0) {
                    situacaoStatus = 'atrasado';
                } else if (diasParaVencer === 0) {
                    situacaoStatus = 'hoje';
                } else if (diasParaVencer <= 7) {
                    situacaoStatus = 'semana';
                } else {
                    situacaoStatus = 'em_dia';
                }
            }

            emp._enriquecido = {
                lucroTotal,
                amortizadoTotal,
                percentualAmortizado,
                ultimoPagamento,
                proximoVencimento,
                diasParaVencer,
                situacaoStatus,
                jurosMesEsperado: Math.round((saldo * Number(emp.taxa_mensal || 0)) * 100) / 100
            };
        });
    },

    _renderSkeleton() {
        return `
        <div class="content-wrapper">
            <div class="page-header" style="margin-bottom: 24px;">
                <div class="skeleton skeleton-title" style="width:260px; height:38px;"></div>
            </div>
            <div class="card" style="padding: 24px;">
                <div class="skeleton" style="height:48px; margin-bottom: 16px; border-radius:8px;"></div>
                ${Array(5).fill('<div class="skeleton skeleton-row" style="margin-bottom:12px;height:52px;"></div>').join('')}
            </div>
        </div>`;
    },

    _renderTela() {
        const totalAtivos = this._emprestimos.filter(e => e.status === 'ativo').length;
        const totalAtrasados = this._emprestimos.filter(e => e.status === 'ativo' && e._enriquecido.situacaoStatus === 'atrasado').length;
        const totalSemana = this._emprestimos.filter(e => e.status === 'ativo' && (e._enriquecido.situacaoStatus === 'semana' || e._enriquecido.situacaoStatus === 'hoje')).length;

        return `
        <div class="content-wrapper">
            <!-- Header Superior -->
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; flex-wrap: wrap; gap:16px;">
                <div>
                    <h1 class="page-title" style="margin-bottom:4px;">Gestão de Empréstimos</h1>
                    <p style="color:var(--text-secondary); font-size:14px; margin:0;">
                        Controle operacional, prazos de retorno, lucro apurado e ações de baixa rápida.
                    </p>
                </div>
                <div style="display:flex; gap:12px; align-items:center;">
                    <a href="#/previsao" class="btn btn-secondary" style="display:inline-flex; align-items:center; gap:8px;">
                        <i data-lucide="trending-up" style="width:16px;height:16px;color:var(--primary);"></i> Previsão de Caixa
                    </a>
                    <a href="#/novo-emprestimo" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:8px;">
                        <i data-lucide="plus" style="width:16px;height:16px;"></i> Novo Empréstimo
                    </a>
                </div>
            </div>

            <!-- Barra de Filtros Rápidos (Pills) + Campo de Busca -->
            <div class="card" style="margin-bottom: 20px; padding: 16px 20px;">
                <div style="display:flex; justify-content:space-between; align-items:center; flex-wrap:wrap; gap:14px;">
                    <!-- Pills -->
                    <div style="display:flex; gap:8px; flex-wrap:wrap; align-items:center;">
                        <button class="filter-pill ${this._filtroAtual === 'todos' ? 'active' : ''}" onclick="TelaEmprestimos.setFiltro('todos')">
                            Todos (${this._emprestimos.length})
                        </button>
                        <button class="filter-pill danger ${this._filtroAtual === 'atrasados' ? 'active' : ''}" onclick="TelaEmprestimos.setFiltro('atrasados')">
                            🚨 Atrasados (${totalAtrasados})
                        </button>
                        <button class="filter-pill warning ${this._filtroAtual === 'semana' ? 'active' : ''}" onclick="TelaEmprestimos.setFiltro('semana')">
                            ⏰ Vencem em 7 dias (${totalSemana})
                        </button>
                        <button class="filter-pill ${this._filtroAtual === 'livre' ? 'active' : ''}" onclick="TelaEmprestimos.setFiltro('livre')">
                            Livre (Juros)
                        </button>
                        <button class="filter-pill ${this._filtroAtual === 'parcelado' ? 'active' : ''}" onclick="TelaEmprestimos.setFiltro('parcelado')">
                            Parcelados (Price/SAC)
                        </button>
                        <button class="filter-pill ${this._filtroAtual === 'quitados' ? 'active' : ''}" onclick="TelaEmprestimos.setFiltro('quitados')">
                            Quitados
                        </button>
                    </div>

                    <!-- Busca -->
                    <div style="position:relative; min-width:240px;">
                        <input type="text" 
                               id="busca-emprestimos"
                               class="input-padrao" 
                               placeholder="Buscar devedor..." 
                               value="${this._busca}" 
                               oninput="TelaEmprestimos.setBusca(this.value)"
                               style="padding-left:34px; padding-top:8px; padding-bottom:8px; font-size:13px; width:100%;">
                        <i data-lucide="search" style="width:16px;height:16px;position:absolute;left:10px;top:50%;transform:translateY(-50%);color:var(--text-secondary);"></i>
                    </div>
                </div>
            </div>

            <!-- Tabela Principal -->
            <div class="card" style="padding:0; overflow:hidden;">
                ${this._renderTabela()}
            </div>
        </div>

        <!-- Modal de Baixa Rápida de Juros -->
        <div id="modal-baixa-rapida" class="modal-overlay hidden" style="z-index: 9999;">
            <div class="modal-content" style="max-width: 440px;">
                <div class="modal-header">
                    <h3 class="modal-title" style="display:flex;align-items:center;gap:8px;">
                        ⚡ Baixa Rápida de Juros
                    </h3>
                    <button class="modal-close" onclick="TelaEmprestimos.fecharModalBaixa()">&times;</button>
                </div>
                <div class="modal-body" id="modal-baixa-corpo" style="padding: 20px;">
                    <!-- Injetado dinamicamente -->
                </div>
            </div>
        </div>
        `;
    },

    _renderTabela() {
        const filtrados = this._aplicarFiltrosEBusca();
        const ordenados = this._ordenarDados(filtrados);

        if (ordenados.length === 0) {
            return `
            <div class="table-empty" style="padding: 60px 20px; text-align:center;">
                <div style="font-size:36px; margin-bottom:12px;">🔍</div>
                <h3 style="margin:0 0 6px 0; font-size:16px; font-weight:600;">Nenhum empréstimo encontrado</h3>
                <p style="color:var(--text-secondary); font-size:14px; margin:0;">
                    Tente ajustar o filtro selecionado ou o termo digitado na busca.
                </p>
            </div>`;
        }

        const seta = (col) => {
            if (this._ordenacao.coluna !== col) return '';
            return this._ordenacao.direcao === 'asc' ? ' ↑' : ' ↓';
        };

        const rows = ordenados.map(emp => {
            const nomeDevedor = emp.devedores?.nome || 'Desconhecido';
            const enr = emp._enriquecido;

            // Badge de Vencimento / Saúde
            let badgeSaude = '';
            if (emp.status === 'quitado') {
                badgeSaude = '<span class="badge badge-gray" style="font-size:11px;">🏆 Quitado</span>';
            } else if (enr.situacaoStatus === 'atrasado') {
                const diasAtraso = Math.abs(enr.diasParaVencer);
                badgeSaude = `<span class="badge badge-danger" style="font-size:11px;font-weight:600;" title="Venceu em ${formatarData(enr.proximoVencimento)}">🚨 Atrasado (${diasAtraso}d)</span>`;
            } else if (enr.situacaoStatus === 'hoje') {
                badgeSaude = '<span class="badge badge-warning" style="font-size:11px;font-weight:700;">📅 Vence Hoje</span>';
            } else if (enr.situacaoStatus === 'semana') {
                badgeSaude = `<span class="badge badge-warning" style="font-size:11px;" title="Vence em ${formatarData(enr.proximoVencimento)}">⏰ Vence em ${enr.diasParaVencer}d</span>`;
            } else {
                badgeSaude = `<span class="badge badge-green" style="font-size:11px;" title="Vence em ${formatarData(enr.proximoVencimento)}">🟢 Em dia (${enr.diasParaVencer}d)</span>`;
            }

            // Tag da Modalidade
            const modalidadeNome = emp.modalidade === 'price' ? 'Price' : emp.modalidade === 'sac' ? 'SAC' : 'Livre';
            const modalidadeBadge = `<span style="font-size:11px; padding:2px 6px; border-radius:4px; background:var(--bg-secondary); color:var(--text-secondary);">${modalidadeNome}</span>`;

            // Botão de Ação Rápida de Baixa
            const podeBaixaRapida = emp.status === 'ativo';
            const btnBaixa = podeBaixaRapida
                ? `<button class="btn btn-sm btn-secondary" 
                           onclick="event.stopPropagation(); TelaEmprestimos.abrirModalBaixa('${emp.id}')"
                           title="Registrar recebimento de juros rapidamente"
                           style="padding: 4px 8px; font-size:12px; display:inline-flex; align-items:center; gap:4px;">
                       ⚡ Baixa
                   </button>`
                : '';

            return `
            <tr class="clickable" onclick="window.location.hash='#/emprestimo/${emp.id}'" style="cursor:pointer;">
                <!-- Devedor & Modalidade -->
                <td>
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="sidebar__avatar" style="width:34px; height:34px; font-size:12px; font-weight:600;">
                            ${Formatadores.obterInicial(nomeDevedor)}
                        </div>
                        <div>
                            <div style="font-weight:600; font-size:14px; color:var(--text-primary); display:flex; align-items:center; gap:6px;">
                                ${nomeDevedor}
                                ${modalidadeBadge}
                            </div>
                            <div style="font-size:12px; color:var(--text-secondary); margin-top:2px;">
                                Início: ${formatarData(emp.data_inicio)}
                            </div>
                        </div>
                    </div>
                </td>

                <!-- Situação & Vencimento -->
                <td>
                    <div>${badgeSaude}</div>
                    ${enr.proximoVencimento ? `<div style="font-size:11px; color:var(--text-secondary); margin-top:4px;">Prev: ${formatarData(enr.proximoVencimento)}</div>` : ''}
                </td>

                <!-- Saldo Atual & Capital Original -->
                <td class="col-right">
                    <div style="font-weight:700; font-size:14px; color:var(--text-primary); font-family:monospace;">
                        ${formatarReais(emp.saldo_devedor)}
                    </div>
                    <div style="font-size:11px; color:var(--text-secondary);">
                        de ${formatarReais(emp.valor_principal)}
                    </div>
                </td>

                <!-- Retorno do Capital (Progresso) -->
                <td style="min-width:140px;">
                    <div style="display:flex; justify-content:space-between; font-size:11px; margin-bottom:4px; font-weight:500;">
                        <span>Amortizado:</span>
                        <span>${enr.percentualAmortizado.toFixed(1)}%</span>
                    </div>
                    <div style="width:100%; height:6px; background:var(--bg-secondary); border-radius:3px; overflow:hidden;">
                        <div style="width:${enr.percentualAmortizado}%; height:100%; background:var(--primary); border-radius:3px;"></div>
                    </div>
                </td>

                <!-- Lucro Real Obtido (Juros) -->
                <td class="col-right">
                    <div style="font-weight:600; font-size:13px; color:#10b981; font-family:monospace;">
                        + ${formatarReais(enr.lucroTotal)}
                    </div>
                    <div style="font-size:11px; color:var(--text-secondary);">
                        Taxa: ${formatarPercentual(emp.taxa_mensal)}/mês
                    </div>
                </td>

                <!-- Ações -->
                <td style="text-align:right;" onclick="event.stopPropagation();">
                    <div style="display:flex; gap:6px; justify-content:flex-end; align-items:center;">
                        ${btnBaixa}
                        <a href="#/emprestimo/${emp.id}" class="btn btn-sm btn-ghost" title="Ver detalhes completos" style="padding:4px 6px;">
                            <i data-lucide="chevron-right" style="width:16px;height:16px;"></i>
                        </a>
                    </div>
                </td>
            </tr>`;
        }).join('');

        return `
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="sortable" onclick="TelaEmprestimos.ordenar('devedor')">Devedor${seta('devedor')}</th>
                        <th class="sortable" onclick="TelaEmprestimos.ordenar('situacao_dias')">Status / Vencimento${seta('situacao_dias')}</th>
                        <th class="sortable col-right" onclick="TelaEmprestimos.ordenar('saldo_devedor')">Saldo Devedor${seta('saldo_devedor')}</th>
                        <th class="sortable" onclick="TelaEmprestimos.ordenar('progresso')">Retorno Capital${seta('progresso')}</th>
                        <th class="sortable col-right" onclick="TelaEmprestimos.ordenar('lucro')">Lucro (Juros Pagos)${seta('lucro')}</th>
                        <th style="text-align:right;">Ações</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    },

    _aplicarFiltrosEBusca() {
        let lista = [...this._emprestimos];

        // Filtro rápido
        if (this._filtroAtual === 'atrasados') {
            lista = lista.filter(e => e.status === 'ativo' && e._enriquecido.situacaoStatus === 'atrasado');
        } else if (this._filtroAtual === 'semana') {
            lista = lista.filter(e => e.status === 'ativo' && (e._enriquecido.situacaoStatus === 'semana' || e._enriquecido.situacaoStatus === 'hoje'));
        } else if (this._filtroAtual === 'livre') {
            lista = lista.filter(e => (e.modalidade || 'livre') === 'livre');
        } else if (this._filtroAtual === 'parcelado') {
            lista = lista.filter(e => e.modalidade === 'price' || e.modalidade === 'sac');
        } else if (this._filtroAtual === 'quitados') {
            lista = lista.filter(e => e.status === 'quitado');
        }

        // Busca por texto
        if (this._busca.trim()) {
            const termo = this._busca.toLowerCase();
            lista = lista.filter(e => (e.devedores?.nome || '').toLowerCase().includes(termo));
        }

        return lista;
    },

    _ordenarDados(lista) {
        const col = this._ordenacao.coluna;
        const dir = this._ordenacao.direcao;
        const mult = dir === 'asc' ? 1 : -1;

        return [...lista].sort((a, b) => {
            let va, vb;
            switch (col) {
                case 'devedor':
                    va = a.devedores?.nome || '';
                    vb = b.devedores?.nome || '';
                    return mult * va.localeCompare(vb, 'pt-BR');
                case 'situacao_dias':
                    // Empréstimos quitados sempre no final
                    if (a.status === 'quitado') return 1;
                    if (b.status === 'quitado') return -1;
                    va = a._enriquecido.diasParaVencer;
                    vb = b._enriquecido.diasParaVencer;
                    return mult * (va - vb);
                case 'saldo_devedor':
                    va = Number(a.saldo_devedor || 0);
                    vb = Number(b.saldo_devedor || 0);
                    return mult * (va - vb);
                case 'progresso':
                    va = a._enriquecido.percentualAmortizado;
                    vb = b._enriquecido.percentualAmortizado;
                    return mult * (va - vb);
                case 'lucro':
                    va = a._enriquecido.lucroTotal;
                    vb = b._enriquecido.lucroTotal;
                    return mult * (va - vb);
                default:
                    return 0;
            }
        });
    },

    setFiltro(filtro) {
        this._filtroAtual = filtro;
        const app = document.getElementById('conteudo-principal');
        if (app) {
            app.innerHTML = this._renderTela();
            if (window.lucide) window.lucide.createIcons();
        }
    },

    setBusca(termo) {
        this._busca = termo;
        const tabelaContainer = document.querySelector('.card:last-of-type');
        if (tabelaContainer) {
            tabelaContainer.innerHTML = this._renderTabela();
            if (window.lucide) window.lucide.createIcons();
        }
    },

    ordenar(coluna) {
        if (this._ordenacao.coluna === coluna) {
            this._ordenacao.direcao = this._ordenacao.direcao === 'asc' ? 'desc' : 'asc';
        } else {
            this._ordenacao.coluna = coluna;
            this._ordenacao.direcao = 'asc';
        }
        const tabelaContainer = document.querySelector('.card:last-of-type');
        if (tabelaContainer) {
            tabelaContainer.innerHTML = this._renderTabela();
            if (window.lucide) window.lucide.createIcons();
        }
    },

    // ============================================
    // MODAL DE BAIXA RÁPIDA DE JUROS
    // ============================================
    abrirModalBaixa(emprestimoId) {
        const emp = this._emprestimos.find(e => e.id === emprestimoId);
        if (!emp) return;

        const nome = emp.devedores?.nome || 'Devedor';
        const saldo = Number(emp.saldo_devedor || 0);
        const taxa = Number(emp.taxa_mensal || 0);
        const jurosSugerido = Math.round(saldo * taxa * 100) / 100;
        const hojeStr = new Date().toISOString().split('T')[0];

        const corpo = document.getElementById('modal-baixa-corpo');
        if (!corpo) return;

        corpo.innerHTML = `
            <div style="margin-bottom:16px;">
                <div style="font-size:14px; color:var(--text-secondary);">Devedor</div>
                <div style="font-weight:700; font-size:16px; color:var(--text-primary);">${nome}</div>
            </div>

            <div style="display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:16px;">
                <div style="background:var(--bg-secondary); padding:10px; border-radius:6px;">
                    <span style="font-size:11px; color:var(--text-secondary);">Saldo Atual</span>
                    <div style="font-weight:600; font-size:14px; font-family:monospace;">${formatarReais(saldo)}</div>
                </div>
                <div style="background:var(--bg-secondary); padding:10px; border-radius:6px;">
                    <span style="font-size:11px; color:var(--text-secondary);">Juros Mensal (${formatarPercentual(taxa)})</span>
                    <div style="font-weight:600; font-size:14px; color:#10b981; font-family:monospace;">${formatarReais(jurosSugerido)}</div>
                </div>
            </div>

            <form id="form-baixa-rapida" onsubmit="TelaEmprestimos.confirmarBaixaRapida(event, '${emp.id}', ${saldo}, ${taxa})">
                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label" style="font-size:12px;">Data do Pagamento</label>
                    <input type="date" id="baixa-data" class="input-padrao" value="${hojeStr}" required>
                </div>

                <div class="form-group" style="margin-bottom:12px;">
                    <label class="form-label" style="font-size:12px;">Valor Recebido (R$)</label>
                    <input type="number" step="0.01" min="0.01" id="baixa-valor" class="input-padrao" value="${jurosSugerido}" required style="font-size:16px; font-weight:700;">
                    <span style="font-size:11px; color:var(--text-secondary); margin-top:4px; display:block;">
                        💡 O valor sugerido quita exatamente os juros deste mês, mantendo o saldo principal intacto.
                    </span>
                </div>

                <div class="form-group" style="margin-bottom:20px;">
                    <label class="form-label" style="font-size:12px;">Observações (opcional)</label>
                    <input type="text" id="baixa-obs" class="input-padrao" placeholder="Ex: Pix recebido / Juros do mês">
                </div>

                <div style="display:flex; justify-content:flex-end; gap:10px;">
                    <button type="button" class="btn btn-secondary" onclick="TelaEmprestimos.fecharModalBaixa()">Cancelar</button>
                    <button type="submit" id="btn-salvar-baixa" class="btn btn-primary">Confirmar Recebimento</button>
                </div>
            </form>
        `;

        const modal = document.getElementById('modal-baixa-rapida');
        if (modal) modal.classList.remove('hidden');
    },

    fecharModalBaixa() {
        const modal = document.getElementById('modal-baixa-rapida');
        if (modal) modal.classList.add('hidden');
    },

    async confirmarBaixaRapida(event, emprestimoId, saldo, taxa) {
        event.preventDefault();
        const btn = document.getElementById('btn-salvar-baixa');
        if (btn) {
            btn.disabled = true;
            btn.textContent = 'Gravando...';
        }

        try {
            const dataPag = document.getElementById('baixa-data').value;
            const valorPago = Number(document.getElementById('baixa-valor').value);
            const obs = document.getElementById('baixa-obs').value.trim() || 'Baixa rápida de juros';

            const juros = Math.min(valorPago, Math.round(saldo * taxa * 100) / 100);
            const amort = Math.max(0, Math.round((valorPago - juros) * 100) / 100);
            const novoSaldo = Math.max(0, Math.round((saldo - amort) * 100) / 100);

            const payload = {
                emprestimo_id: emprestimoId,
                data_pagamento: dataPag,
                valor_pago: valorPago,
                valor_juros: juros,
                valor_amortizacao: amort,
                saldo_apos: novoSaldo,
                tipo_pagamento: amort > 0 ? 'amortizacao' : 'juros',
                observacoes: obs
            };

            const resultado = await Pagamentos.registrar(payload);
            if (!resultado) throw new Error('Falha ao registrar pagamento no banco.');

            if (window.App?.showToast) {
                App.showToast('Recebimento registrado com sucesso!', 'success');
            }

            this.fecharModalBaixa();
            await this.render();
        } catch (err) {
            console.error('Erro na baixa rápida:', err);
            alert('Não foi possível registrar o pagamento: ' + err.message);
            if (btn) {
                btn.disabled = false;
                btn.textContent = 'Confirmar Recebimento';
            }
        }
    }
};

window.TelaEmprestimos = TelaEmprestimos;
