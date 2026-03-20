// ============================================
// tela-dashboard.js — Dashboard Principal
// ============================================

const TelaDashboard = {
    _dados: null,
    _ordenacao: { coluna: 'ultimo_pagamento', direcao: 'asc' },

    /**
     * Renderiza o dashboard completo
     */
    async render() {
        const app = document.getElementById('app');
        app.innerHTML = this._renderSkeleton();

        // Carrega dados em paralelo
        try {
            const [emprestimos, totalEmprestado, recebidoMes, ativos, pagRecentes] = await Promise.all([
                Emprestimos.listarAtivos(),
                Emprestimos.calcularTotalEmprestado(),
                Pagamentos.totalRecebidoNoMes(),
                Emprestimos.contarAtivos(),
                Pagamentos.listarRecentes(5)
            ]);

            // Busca último pagamento de cada empréstimo
            const emprestimosComUltimoPg = await this._enriquecerComUltimoPagamento(emprestimos);

            // Conta atrasados (sem pagamento há mais de 30 dias)
            const emAtraso = this._contarAtrasados(emprestimosComUltimoPg);

            this._dados = {
                emprestimos: emprestimosComUltimoPg,
                totalEmprestado,
                recebidoMes,
                ativos,
                emAtraso,
                pagRecentes
            };

            app.innerHTML = this._renderDashboard();
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error('Erro ao carregar dashboard:', err);
            app.innerHTML = `
                <div class="content-wrapper">
                    <div class="empty-state">
                        <div class="empty-state-icon">⚠️</div>
                        <h3 class="empty-state-title">Erro ao carregar</h3>
                        <p class="empty-state-text">Não foi possível carregar os dados. Tente novamente.</p>
                        <button class="btn btn-primary" onclick="TelaDashboard.render()">Tentar novamente</button>
                    </div>
                </div>`;
        }
    },

    /**
     * Enriquece empréstimos com data do último pagamento
     */
    async _enriquecerComUltimoPagamento(emprestimos) {
        const resultado = [];

        for (const emp of emprestimos) {
            try {
                const { data } = await window.FinancierDB
                    .from('pagamentos')
                    .select('data_pagamento')
                    .eq('emprestimo_id', emp.id)
                    .order('data_pagamento', { ascending: false })
                    .limit(1);

                emp.ultimo_pagamento = data && data.length > 0 ? data[0].data_pagamento : null;
            } catch {
                emp.ultimo_pagamento = null;
            }
            resultado.push(emp);
        }

        return resultado;
    },

    /**
     * Conta empréstimos sem pagamento há mais de 30 dias
     */
    _contarAtrasados(emprestimos) {
        const hoje = new Date();
        return emprestimos.filter(emp => {
            if (!emp.ultimo_pagamento) {
                // Se nunca pagou, verifica se início foi há mais de 30 dias
                const inicio = new Date(emp.data_inicio);
                return Datas.diasEntreDatas(inicio, hoje) > 30;
            }
            return Datas.diasEntreDatas(new Date(emp.ultimo_pagamento), hoje) > 30;
        }).length;
    },

    /**
     * Renderiza o dashboard completo
     */
    _renderDashboard() {
        const d = this._dados;

        return `
        <div class="content-wrapper">
            <!-- KPIs -->
            <div class="kpi-grid">
                ${this._renderKPI('Total em Carteira', formatarReais(d.totalEmprestado), 'dollar-sign', 'green')}
                ${this._renderKPI('Recebido no Mês', formatarReais(d.recebidoMes), 'trending-up', 'blue')}
                ${this._renderKPI('Ativos', d.ativos.toString(), 'file-text', 'yellow')}
                ${this._renderKPI('Em Atraso', d.emAtraso.toString(), 'alert-triangle', 'red', d.emAtraso > 0)}
            </div>

            <!-- Conteúdo principal: Tabela + Painel lateral -->
            <div class="dashboard-grid">
                <!-- Tabela de empréstimos -->
                <div class="dashboard-main">
                    ${this._renderTabelaEmprestimos()}
                </div>

                <!-- Painel lateral -->
                <div class="dashboard-side">
                    ${this._renderPainelRecentes()}
                    ${this._renderPainelAlertas()}
                </div>
            </div>
        </div>`;
    },

    /**
     * Renderiza um card KPI
     */
    _renderKPI(label, valor, icone, cor, destaque = false) {
        return `
        <div class="kpi-card ${destaque ? 'kpi-card--danger' : ''}">
            <div class="kpi-icon ${cor}">
                <i data-lucide="${icone}"></i>
            </div>
            <div class="kpi-label">${label}</div>
            <div class="kpi-value ${destaque ? 'text-negative' : ''}">${valor}</div>
        </div>`;
    },

    /**
     * Renderiza a tabela de empréstimos ativos
     */
    _renderTabelaEmprestimos() {
        const emprestimos = this._ordenarEmprestimos(this._dados.emprestimos);

        if (emprestimos.length === 0) {
            return `
            <div class="table-container">
                <div class="table-header">
                    <h3 class="table-title">Empréstimos Ativos</h3>
                    <a href="#/novo-emprestimo" class="btn btn-primary btn-sm">
                        <i data-lucide="plus" style="width:16px;height:16px;"></i> Novo
                    </a>
                </div>
                <div class="table-empty">
                    <div class="table-empty-icon">📋</div>
                    <p class="table-empty-text">Nenhum empréstimo ativo no momento</p>
                </div>
            </div>`;
        }

        const seta = (col) => {
            if (this._ordenacao.coluna !== col) return '';
            return this._ordenacao.direcao === 'asc' ? ' ↑' : ' ↓';
        };

        const rows = emprestimos.map(emp => {
            const nomeDevedor = emp.devedores?.nome || 'Desconhecido';
            const ultimoPg = emp.ultimo_pagamento ? formatarData(emp.ultimo_pagamento) : 'Nunca';
            const atrasado = this._isAtrasado(emp);
            const statusBadge = atrasado
                ? '<span class="badge badge-red">Atrasado</span>'
                : '<span class="badge badge-green">Ativo</span>';

            return `
            <tr class="clickable" onclick="window.location.hash='#/emprestimo/${emp.id}'">
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="sidebar__avatar" style="width:32px;height:32px;font-size:12px;">${Formatadores.obterInicial(nomeDevedor)}</div>
                        <span style="font-weight:500;">${nomeDevedor}</span>
                    </div>
                </td>
                <td class="cell-money">${formatarReais(emp.valor_principal)}</td>
                <td class="cell-money" style="font-weight:600;">${formatarReais(emp.saldo_devedor)}</td>
                <td>${formatarPercentual(emp.taxa_mensal)}</td>
                <td style="color:${atrasado ? 'var(--danger)' : 'var(--text-secondary)'};">${ultimoPg}</td>
                <td>${statusBadge}</td>
            </tr>`;
        }).join('');

        return `
        <div class="table-container">
            <div class="table-header">
                <h3 class="table-title">Empréstimos Ativos</h3>
                <a href="#/novo-emprestimo" class="btn btn-primary btn-sm">
                    <i data-lucide="plus" style="width:16px;height:16px;"></i> Novo Empréstimo
                </a>
            </div>
            <div style="overflow-x:auto;">
                <table class="data-table">
                    <thead>
                        <tr>
                            <th class="sortable" onclick="TelaDashboard.ordenar('devedor')">Devedor${seta('devedor')}</th>
                            <th class="sortable col-right" onclick="TelaDashboard.ordenar('valor_principal')">Valor Original${seta('valor_principal')}</th>
                            <th class="sortable col-right" onclick="TelaDashboard.ordenar('saldo_devedor')">Saldo Devedor${seta('saldo_devedor')}</th>
                            <th class="sortable" onclick="TelaDashboard.ordenar('taxa_mensal')">Taxa${seta('taxa_mensal')}</th>
                            <th class="sortable" onclick="TelaDashboard.ordenar('ultimo_pagamento')">Último Pgto${seta('ultimo_pagamento')}</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>${rows}</tbody>
                </table>
            </div>
        </div>`;
    },

    /**
     * Verifica se empréstimo está atrasado
     */
    _isAtrasado(emp) {
        const hoje = new Date();
        if (!emp.ultimo_pagamento) {
            return Datas.diasEntreDatas(new Date(emp.data_inicio), hoje) > 30;
        }
        return Datas.diasEntreDatas(new Date(emp.ultimo_pagamento), hoje) > 30;
    },

    /**
     * Renderiza o painel de pagamentos recentes
     */
    _renderPainelRecentes() {
        const pags = this._dados.pagRecentes;

        const items = pags.length === 0
            ? '<p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">Nenhum pagamento registrado</p>'
            : pags.map(pg => {
                const nome = pg.emprestimos?.devedores?.nome || 'Desconhecido';
                return `
                <div class="recent-item">
                    <div class="recent-avatar">${Formatadores.obterInicial(nome)}</div>
                    <div class="recent-info">
                        <div class="recent-name">${nome}</div>
                        <div class="recent-date">${formatarData(pg.data_pagamento)}</div>
                    </div>
                    <div class="recent-value text-money">${formatarReais(pg.valor_pago)}</div>
                </div>`;
            }).join('');

        return `
        <div class="card">
            <div class="card-header">
                <h4 style="font-size:15px;font-weight:600;">Últimos Pagamentos</h4>
            </div>
            <div class="card-body" style="padding:12px 16px;">
                ${items}
            </div>
        </div>`;
    },

    /**
     * Renderiza o painel de alertas urgentes
     */
    _renderPainelAlertas() {
        const atrasados = this._dados.emprestimos.filter(emp => this._isAtrasado(emp)).slice(0, 3);

        if (atrasados.length === 0) {
            return `
            <div class="card" style="margin-top:16px;">
                <div class="card-header">
                    <h4 style="font-size:15px;font-weight:600;">Alertas</h4>
                </div>
                <div class="card-body" style="display:flex;flex-direction:column;align-items:center;padding:24px 16px;">
                    <span style="font-size:32px;margin-bottom:8px;">✅</span>
                    <p style="color:var(--text-muted);font-size:13px;">Nenhum alerta no momento</p>
                </div>
            </div>`;
        }

        const alertItems = atrasados.map(emp => {
            const nome = emp.devedores?.nome || 'Desconhecido';
            const dias = emp.ultimo_pagamento
                ? Datas.diasEntreDatas(new Date(emp.ultimo_pagamento), new Date())
                : Datas.diasEntreDatas(new Date(emp.data_inicio), new Date());

            return `
            <div class="alert-card critical" style="cursor:pointer;" onclick="window.location.hash='#/emprestimo/${emp.id}'">
                <div class="alert-icon">
                    <i data-lucide="alert-triangle" style="width:18px;height:18px;"></i>
                </div>
                <div class="alert-content">
                    <div class="alert-title">${nome}</div>
                    <div class="alert-message">${dias} dias sem pagamento • Saldo: ${formatarReais(emp.saldo_devedor)}</div>
                </div>
            </div>`;
        }).join('');

        return `
        <div class="card" style="margin-top:16px;">
            <div class="card-header">
                <h4 style="font-size:15px;font-weight:600;">Alertas Urgentes</h4>
                <a href="#/avisos" style="font-size:13px;color:var(--green-400);">Ver todos</a>
            </div>
            <div class="card-body" style="padding:12px 16px;">
                ${alertItems}
            </div>
        </div>`;
    },

    /**
     * Skeleton loading
     */
    _renderSkeleton() {
        return `
        <div class="content-wrapper">
            <div class="kpi-grid">
                ${Array(4).fill('<div class="skeleton skeleton-card"></div>').join('')}
            </div>
            <div class="dashboard-grid">
                <div class="dashboard-main">
                    <div class="table-container">
                        <div class="table-header" style="padding:20px 24px;">
                            <div class="skeleton skeleton-title"></div>
                        </div>
                        ${Array(5).fill('<div class="skeleton skeleton-row"></div>').join('')}
                    </div>
                </div>
                <div class="dashboard-side">
                    <div class="card">
                        <div class="card-header">
                            <div class="skeleton skeleton-title" style="width:140px;"></div>
                        </div>
                        <div class="card-body">
                            ${Array(3).fill(`
                                <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px;">
                                    <div class="skeleton skeleton-avatar"></div>
                                    <div style="flex:1;">
                                        <div class="skeleton skeleton-text" style="width:80%;"></div>
                                        <div class="skeleton skeleton-text" style="width:50%;"></div>
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                </div>
            </div>
        </div>`;
    },

    /**
     * Ordena empréstimos por coluna
     */
    ordenar(coluna) {
        if (this._ordenacao.coluna === coluna) {
            this._ordenacao.direcao = this._ordenacao.direcao === 'asc' ? 'desc' : 'asc';
        } else {
            this._ordenacao.coluna = coluna;
            this._ordenacao.direcao = 'asc';
        }

        // Re-renderiza somente a tabela
        const app = document.getElementById('app');
        app.innerHTML = this._renderDashboard();
        if (window.lucide) window.lucide.createIcons();
    },

    /**
     * Aplica ordenação
     */
    _ordenarEmprestimos(emprestimos) {
        const col = this._ordenacao.coluna;
        const dir = this._ordenacao.direcao;
        const mult = dir === 'asc' ? 1 : -1;

        return [...emprestimos].sort((a, b) => {
            let va, vb;

            switch (col) {
                case 'devedor':
                    va = a.devedores?.nome || '';
                    vb = b.devedores?.nome || '';
                    return mult * va.localeCompare(vb, 'pt-BR');
                case 'valor_principal':
                case 'saldo_devedor':
                case 'taxa_mensal':
                    va = Number(a[col] || 0);
                    vb = Number(b[col] || 0);
                    return mult * (va - vb);
                case 'ultimo_pagamento':
                    va = a.ultimo_pagamento ? new Date(a.ultimo_pagamento).getTime() : 0;
                    vb = b.ultimo_pagamento ? new Date(b.ultimo_pagamento).getTime() : 0;
                    return mult * (va - vb);
                default:
                    return 0;
            }
        });
    }
};

window.TelaDashboard = TelaDashboard;
