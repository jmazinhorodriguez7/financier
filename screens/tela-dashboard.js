// ============================================
// tela-dashboard.js — Dashboard Principal (Gestão & Risco)
// ============================================

const TelaDashboard = {
    _dados: null,
    _ordenacao: { coluna: 'ultimo_pagamento', direcao: 'asc' },

    /**
     * Renderiza o dashboard completo
     */
    async render() {
        const app = document.getElementById('conteudo-principal');
        if (!app) return;
        app.innerHTML = this._renderSkeleton();

        try {
            // Emprestimos ativos enriquecidos para o fluxo e risco
            const { data: emprestimosFull, error: errEmp } = await window.FinancierDB
                .from('emprestimos')
                .select('*, devedores(nome, contato), pagamentos(*)')
                .eq('status', 'ativo')
                .order('created_at', { ascending: false });

            if (errEmp) throw errEmp;

            const [totalEmprestado, recebidoMes, ativos, pagRecentes] = await Promise.all([
                Emprestimos.calcularTotalEmprestado(),
                Pagamentos.totalRecebidoNoMes(),
                Emprestimos.contarAtivos(),
                Pagamentos.listarRecentes(5)
            ]);

            // Busca último pagamento de cada empréstimo para a tabela
            const emprestimosComUltimoPg = await this._enriquecerComUltimoPagamento(emprestimosFull);

            // Conta atrasados
            const emAtraso = this._contarAtrasados(emprestimosComUltimoPg);

            // Cálculo do Fluxo do Mês
            const fluxo = await this._calcularFluxoMes(emprestimosFull);

            // Cálculo de Gestão de Risco & Concentração de Carteira
            const risco = this._calcularRiscoConcentracao(emprestimosFull, totalEmprestado);

            this._dados = {
                emprestimos: emprestimosComUltimoPg,
                totalEmprestado,
                recebidoMes,
                ativos,
                emAtraso,
                pagRecentes,
                fluxo,
                risco
            };

            app.innerHTML = this._renderDashboard();
            if (window.lucide) window.lucide.createIcons();
            this._renderGraficoConcentracao();
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
     * Calcula Concentração de Carteira por Devedor e Rentabilidade Média Ponderada
     */
    _calcularRiscoConcentracao(emprestimos, totalEmprestado) {
        if (!totalEmprestado || totalEmprestado <= 0) {
            return { devedores: [], taxaMediaPonderada: 0, maiorConcentracao: null };
        }

        const mapaDevedor = {};
        let somaPonderadaTaxa = 0;

        emprestimos.forEach(emp => {
            const nome = emp.devedores?.nome || 'Desconhecido';
            const saldo = Number(emp.saldo_devedor || 0);
            const taxa = Number(emp.taxa_mensal || 0);

            if (!mapaDevedor[nome]) {
                mapaDevedor[nome] = { nome, saldoTotal: 0, percentual: 0 };
            }
            mapaDevedor[nome].saldoTotal += saldo;
            somaPonderadaTaxa += (saldo * taxa);
        });

        const lista = Object.values(mapaDevedor).map(d => {
            d.percentual = Math.round((d.saldoTotal / totalEmprestado) * 1000) / 10;
            return d;
        }).sort((a, b) => b.saldoTotal - a.saldoTotal);

        const taxaMediaPonderada = (somaPonderadaTaxa / totalEmprestado);
        const maiorConcentracao = lista[0] || null;

        return {
            devedores: lista,
            taxaMediaPonderada,
            maiorConcentracao
        };
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
        const risco = d.risco;

        return `
        <div class="content-wrapper">
            <!-- Header Rápido -->
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:20px; flex-wrap:wrap; gap:12px;">
                <div>
                    <h1 class="page-title" style="margin:0 0 4px 0;">Painel de Gestão & Rentabilidade</h1>
                    <span style="font-size:13px; color:var(--text-secondary);">Visão estratégica do capital alocado e rentabilidade da carteira.</span>
                </div>
                <div style="display:flex; gap:10px;">
                    <a href="#/previsao" class="btn btn-secondary" style="display:inline-flex; align-items:center; gap:8px;">
                        <i data-lucide="calendar" style="width:16px;height:16px;color:var(--primary);"></i> Previsão (Forecast)
                    </a>
                    <a href="#/novo-emprestimo" class="btn btn-primary" style="display:inline-flex; align-items:center; gap:8px;">
                        <i data-lucide="plus" style="width:16px;height:16px;"></i> Novo Empréstimo
                    </a>
                </div>
            </div>

            <!-- KPIs Estratégicos -->
            <div class="kpi-grid">
                ${this._renderKPI('Total em Carteira', formatarReais(d.totalEmprestado), 'dollar-sign', 'green')}
                ${this._renderKPI('Recebido no Mês', formatarReais(d.recebidoMes), 'trending-up', 'blue')}
                ${this._renderKPI('Rentabilidade Média', formatarPercentual(risco.taxaMediaPonderada) + '/mês', 'pie-chart', 'yellow')}
                ${this._renderKPI('Em Atraso', d.emAtraso.toString(), 'alert-triangle', 'red', d.emAtraso > 0)}
            </div>

            <!-- Painel de Fluxo do Mês -->
            ${this._renderPainelFluxo()}

            <!-- Seção de Risco & Concentração de Carteira -->
            ${this._renderPainelRisco()}

            <!-- Conteúdo principal: Tabela + Painel lateral -->
            <div class="dashboard-grid" style="margin-top:24px;">
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
     * Painel de Gestão de Risco e Concentração
     */
    _renderPainelRisco() {
        const risco = this._dados.risco;
        const maior = risco.maiorConcentracao;
        const alertaExposicao = maior && maior.percentual > 25
            ? `<div style="background:rgba(239, 68, 68, 0.1); border:1px solid rgba(239, 68, 68, 0.3); border-radius:6px; padding:10px 14px; display:flex; align-items:center; gap:10px; margin-top:14px;">
                 <i data-lucide="shield-alert" style="width:18px;height:18px;color:#ef4444;flex-shrink:0;"></i>
                 <span style="font-size:12px; color:#fca5a5;">
                   <b>Alerta de Concentração:</b> ${maior.nome} concentra <b>${maior.percentual}%</b> de todo o capital emprestado (${formatarReais(maior.saldoTotal)}).
                 </span>
               </div>`
            : '';

        return `
        <div class="card" style="padding: 20px; margin-top:20px;">
            <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; flex-wrap:wrap; gap:8px;">
                <div>
                    <h3 style="margin:0; font-size:15px; font-weight:700; display:flex; align-items:center; gap:8px;">
                        <i data-lucide="pie-chart" style="width:18px;height:18px;color:var(--primary);"></i>
                        Concentração de Carteira & Exposição de Risco
                    </h3>
                    <span style="font-size:12px; color:var(--text-secondary);">Distribuição do seu capital entre os devedores ativos</span>
                </div>
                <div style="font-size:13px; color:var(--text-secondary);">
                    Devedores com saldo: <b>${risco.devedores.length}</b>
                </div>
            </div>

            <div style="display:grid; grid-template-columns: 1fr 1fr; gap:24px; align-items:center;">
                <!-- Gráfico Donut -->
                <div style="height: 180px; position:relative;">
                    <canvas id="grafico-concentracao"></canvas>
                </div>

                <!-- Lista dos Maiores Devedores -->
                <div>
                    <div style="font-size:12px; font-weight:600; text-transform:uppercase; color:var(--text-secondary); margin-bottom:10px;">
                        Maiores Alocações
                    </div>
                    <div style="display:flex; flex-direction:column; gap:8px;">
                        ${risco.devedores.slice(0, 4).map(d => `
                            <div>
                                <div style="display:flex; justify-content:space-between; font-size:13px; font-weight:500; margin-bottom:2px;">
                                    <span>${d.nome}</span>
                                    <span>${d.percentual}% <span style="color:var(--text-secondary); font-size:11px;">(${formatarReais(d.saldoTotal)})</span></span>
                                </div>
                                <div style="width:100%; height:5px; background:var(--bg-secondary); border-radius:3px; overflow:hidden;">
                                    <div style="width:${d.percentual}%; height:100%; background:${d.percentual > 25 ? '#ef4444' : 'var(--primary)'};"></div>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                    ${alertaExposicao}
                </div>
            </div>
        </div>`;
    },

    _renderGraficoConcentracao() {
        const canvas = document.getElementById('grafico-concentracao');
        if (!canvas || !window.Chart) return;

        const risco = this._dados.risco;
        const labels = risco.devedores.map(d => d.nome);
        const data = risco.devedores.map(d => d.saldoTotal);

        const cores = [
            '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#06b6d4', '#64748b'
        ];

        new Chart(canvas, {
            type: 'doughnut',
            data: {
                labels,
                datasets: [{
                    data,
                    backgroundColor: cores.slice(0, labels.length),
                    borderWidth: 2,
                    borderColor: '#1e293b'
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'right',
                        labels: { boxWidth: 12, color: '#94a3b8', font: { size: 11 } }
                    },
                    tooltip: {
                        callbacks: {
                            label: (ctx) => ` ${ctx.label}: R$ ${ctx.raw.toLocaleString('pt-BR')}`
                        }
                    }
                },
                cutout: '70%'
            }
        });
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
     * Painel de Fluxo Mensal
     */
    _renderPainelFluxo() {
        const fluxo = this._dados.fluxo;
        const fmt = v => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL'
        }).format(v || 0);

        return `
        <div class="fluxo-mes-wrapper">
            <div class="fluxo-mes-header">
                <span class="fluxo-mes-titulo">Fluxo do Mês</span>
                <span class="fluxo-mes-periodo">
                    📅 ${fluxo.mes.charAt(0).toUpperCase() + fluxo.mes.slice(1)}
                </span>
            </div>

            <div class="fluxo-mes-grid">
                <!-- A Receber -->
                <div class="fluxo-card">
                    <span class="fluxo-label">Total a Receber</span>
                    <span class="fluxo-valor">${fmt(fluxo.totalAReceber)}</span>
                    <span class="fluxo-sub">
                        ${this._dados.ativos} parcela(s) esperada(s)
                    </span>
                </div>

                <!-- Já Recebido -->
                <div class="fluxo-card destaque-positivo">
                    <span class="fluxo-label">Já Recebido</span>
                    <span class="fluxo-valor positivo">${fmt(fluxo.totalRecebido)}</span>
                    <span class="fluxo-sub">
                        ${fluxo.qtdPgtosMes} pagamento(s) no mês
                    </span>
                </div>

                <!-- Diferença -->
                <div class="fluxo-card ${fluxo.diferenca > 0 ? 'destaque-pendente' : 'destaque-quitado'}">
                    <span class="fluxo-label">Ainda a Receber</span>
                    <span class="fluxo-valor ${fluxo.diferenca > 0 ? 'pendente' : 'zerado'}">
                        ${fmt(Math.max(0, fluxo.diferenca))}
                    </span>
                    <span class="fluxo-sub">
                        ${fluxo.diferenca <= 0
                            ? '✅ Todas as parcelas recebidas!'
                            : `${fluxo.percRecebido}% do mês recebido`}
                    </span>
                </div>
            </div>

            <!-- Barra de progresso do mês -->
            <div class="fluxo-progresso-wrapper">
                <div class="fluxo-progresso-info">
                    <span>Progresso do recebimento</span>
                    <span>${fluxo.percRecebido}%</span>
                </div>
                <div class="fluxo-barra-bg">
                    <div class="fluxo-barra-fill" style="width:${fluxo.percRecebido}%"></div>
                </div>
            </div>
        </div>`;
    },

    /**
     * Calcula o fluxo do mês atual
     */
    async _calcularFluxoMes(emprestimos) {
        const hoje = new Date();
        const mesAtual = hoje.getMonth();
        const anoAtual = hoje.getFullYear();

        let totalAReceber = 0;
        const ativos = emprestimos.filter(e => e.status === 'ativo');

        ativos.forEach(emp => {
            const pagamentos = (emp.pagamentos || []).sort(
                (a, b) => new Date(b.data_pagamento) - new Date(a.data_pagamento)
            );
            
            const taxa = Number(emp.taxa_mensal || 0);
            const saldo = Number(emp.saldo_devedor || 0);
            const juros = Math.round(saldo * taxa * 100) / 100;

            let valorParcela = 0;

            if (emp.modalidade === 'price' && emp.prazo_meses) {
                const n = Number(emp.prazo_meses);
                const pmt = (saldo * taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
                valorParcela = Math.round(pmt * 100) / 100;
            } else if (emp.modalidade === 'sac' && emp.prazo_meses) {
                const pgtosFeit = pagamentos.length;
                const prazoRest = Number(emp.prazo_meses) - pgtosFeit;
                const amort = prazoRest > 0 ? Math.round((saldo / prazoRest) * 100) / 100 : saldo;
                valorParcela = Math.round((amort + juros) * 100) / 100;
            } else {
                valorParcela = juros;
            }

            totalAReceber += valorParcela;
        });

        totalAReceber = Math.round(totalAReceber * 100) / 100;

        const todosPagamentos = emprestimos.flatMap(e => e.pagamentos || []);
        const pgtosMes = todosPagamentos.filter(p => {
            if (!p.data_pagamento) return false;
            const d = new Date(p.data_pagamento.includes('T') ? p.data_pagamento : p.data_pagamento + 'T00:00:00');
            return d.getMonth() === mesAtual && d.getFullYear() === anoAtual;
        });

        const totalRecebido = Math.round(
            pgtosMes.reduce((acc, p) => acc + Number(p.valor_pago || 0), 0) * 100
        ) / 100;

        const diferenca = Math.round((totalAReceber - totalRecebido) * 100) / 100;
        const percRecebido = totalAReceber > 0 
            ? Math.round((totalRecebido / totalAReceber) * 100) 
            : (totalRecebido > 0 ? 100 : 0);

        return {
            totalAReceber,
            totalRecebido,
            diferenca,
            percRecebido,
            qtdPgtosMes: pgtosMes.length,
            mes: hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
        };
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

        const app = document.getElementById('conteudo-principal');
        if (app) {
            app.innerHTML = this._renderDashboard();
            if (window.lucide) window.lucide.createIcons();
            this._renderGraficoConcentracao();
        }
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
