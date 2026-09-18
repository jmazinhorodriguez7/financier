// ============================================================
// tela-previsao.js — Previsão de Fluxo de Caixa (Forecast)
// ============================================================

const TelaPrevisao = {
    _emprestimos: [],
    _previsoes: [],
    _periodoDias: 30, // 7 | 15 | 30 | 60 | 90

    async render() {
        const app = document.getElementById('conteudo-principal');
        if (!app) return;
        app.innerHTML = this._renderSkeleton();

        try {
            this._emprestimos = await Emprestimos.listarTodos();
            this._calcularPrevisoes();
            app.innerHTML = this._renderTela();
            if (window.lucide) window.lucide.createIcons();
            this._renderGraficoPrevisao();
        } catch (err) {
            console.error('Erro ao calcular previsão:', err);
            if (window.App?.showToast) {
                App.showToast('Erro ao carregar a tela de previsão.', 'error');
            }
        }
    },

    _renderSkeleton() {
        return `
        <div class="content-wrapper">
            <div class="page-header" style="margin-bottom: 24px;">
                <div class="skeleton skeleton-title" style="width:280px; height:38px;"></div>
            </div>
            <div class="card-grid" style="grid-template-columns: repeat(3, 1fr); margin-bottom:20px;">
                <div class="skeleton" style="height:100px; border-radius:8px;"></div>
                <div class="skeleton" style="height:100px; border-radius:8px;"></div>
                <div class="skeleton" style="height:100px; border-radius:8px;"></div>
            </div>
            <div class="card" style="height:300px; padding:24px;"></div>
        </div>`;
    },

    /**
     * Calcula as projeções futuras para cada empréstimo ativo
     */
    _calcularPrevisoes() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        const dataLimite = new Date(hoje);
        dataLimite.setDate(dataLimite.getDate() + this._periodoDias);

        const listaEventos = [];
        const ativos = this._emprestimos.filter(e => e.status === 'ativo' && Number(e.saldo_devedor || 0) > 0.05);

        ativos.forEach(emp => {
            const nome = emp.devedores?.nome || 'Devedor';
            const saldo = Number(emp.saldo_devedor || 0);
            const taxa = Number(emp.taxa_mensal || 0);
            const pagamentos = emp.pagamentos || [];

            // Último pagamento
            const pgsOrdenados = [...pagamentos].sort((a, b) => new Date(b.data_pagamento) - new Date(a.data_pagamento));
            const ultimoPg = pgsOrdenados[0]?.data_pagamento || null;

            // Determinar data base
            const baseData = ultimoPg ? new Date(ultimoPg + 'T12:00:00') : new Date(emp.data_inicio + 'T12:00:00');
            
            // Simular vencimentos futuros até o limite selecionado (30, 60, 90 dias)
            let dataCursor = new Date(baseData);
            let saldoSimulado = saldo;
            let parcelasCalculadas = 0;
            const maxIteracoes = 12; // no máximo 12 meses para frente

            while (parcelasCalculadas < maxIteracoes) {
                parcelasCalculadas++;
                dataCursor.setMonth(dataCursor.getMonth() + 1);
                
                if (emp.dia_vencimento) {
                    const diaFixo = Math.min(emp.dia_vencimento, 28);
                    dataCursor.setDate(diaFixo);
                }

                // Se passou da data limite, interrompe projeção desse contrato
                if (dataCursor > dataLimite) break;

                const dataEvento = new Date(dataCursor);
                const diffDias = Math.ceil((dataEvento.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));

                let valorJuros = 0;
                let valorAmort = 0;
                let valorTotal = 0;

                if (emp.modalidade === 'price') {
                    const pmt = window.Calculos.calcularPMT(Number(emp.valor_principal), taxa, emp.prazo_meses);
                    const decomposto = window.Calculos.calcularParcelaPrice(saldoSimulado, taxa, pmt);
                    valorJuros = decomposto.juros;
                    valorAmort = decomposto.amortizacao;
                    valorTotal = pmt;
                    saldoSimulado = decomposto.novoSaldo;
                } else if (emp.modalidade === 'sac') {
                    const prazoRestante = emp.prazo_restante || emp.prazo_meses || 12;
                    const sac = window.Calculos.calcularParcelaSAC(saldoSimulado, taxa, prazoRestante);
                    valorJuros = sac.juros;
                    valorAmort = sac.amortizacao;
                    valorTotal = sac.parcela;
                    saldoSimulado = sac.novoSaldo;
                } else {
                    // Livre: cliente paga juros e mantém o saldo
                    valorJuros = Math.round(saldoSimulado * taxa * 100) / 100;
                    valorAmort = 0;
                    valorTotal = valorJuros;
                }

                listaEventos.push({
                    emprestimoId: emp.id,
                    devedorNome: nome,
                    modalidade: emp.modalidade || 'livre',
                    dataPrevista: dataEvento,
                    dataStr: dataEvento.toISOString().split('T')[0],
                    diasRestantes: diffDias,
                    jurosEsperado: valorJuros,
                    amortizacaoEsperada: valorAmort,
                    totalEsperado: valorTotal,
                    saldoAtual: saldo
                });

                if (saldoSimulado <= 0.05) break;
            }
        });

        // Ordena eventos cronologicamente
        this._previsoes = listaEventos.sort((a, b) => a.dataPrevista - b.dataPrevista);
    },

    _renderTela() {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        // Métricas rápidas
        const proximos7Dias = this._previsoes.filter(p => p.diasRestantes >= 0 && p.diasRestantes <= 7);
        const atrasados = this._previsoes.filter(p => p.diasRestantes < 0);
        
        const totalPrevistoPeriodo = this._previsoes.reduce((acc, p) => acc + p.totalEsperado, 0);
        const totalJurosPeriodo = this._previsoes.reduce((acc, p) => acc + p.jurosEsperado, 0);
        const totalAmortPeriodo = this._previsoes.reduce((acc, p) => acc + p.amortizacaoEsperada, 0);
        const total7Dias = proximos7Dias.reduce((acc, p) => acc + p.totalEsperado, 0);

        return `
        <div class="content-wrapper">
            <!-- Header Superior -->
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 20px; flex-wrap:wrap; gap:16px;">
                <div>
                    <h1 class="page-title" style="margin-bottom:4px;">Previsão de Fluxo de Caixa (Forecast)</h1>
                    <p style="color:var(--text-secondary); font-size:14px; margin:0;">
                        Projeção exata de entradas esperadas por dia, semana e mês da sua carteira.
                    </p>
                </div>
                <!-- Seletor de Horizonte -->
                <div style="display:flex; gap:8px; align-items:center;">
                    <span style="font-size:13px; color:var(--text-secondary); font-weight:500;">Horizonte:</span>
                    <button class="filter-pill ${this._periodoDias === 15 ? 'active' : ''}" onclick="TelaPrevisao.setPeriodo(15)">15 Dias</button>
                    <button class="filter-pill ${this._periodoDias === 30 ? 'active' : ''}" onclick="TelaPrevisao.setPeriodo(30)">30 Dias</button>
                    <button class="filter-pill ${this._periodoDias === 60 ? 'active' : ''}" onclick="TelaPrevisao.setPeriodo(60)">60 Dias</button>
                    <button class="filter-pill ${this._periodoDias === 90 ? 'active' : ''}" onclick="TelaPrevisao.setPeriodo(90)">90 Dias</button>
                </div>
            </div>

            <!-- Cards Resumo de Previsão -->
            <div class="card-grid" style="display:grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap:16px; margin-bottom:20px;">
                <!-- Total Previsto -->
                <div class="card" style="padding: 20px; position:relative; overflow:hidden;">
                    <div style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:8px;">
                        Entradas Previstas (${this._periodoDias}d)
                    </div>
                    <div style="font-size:24px; font-weight:800; color:var(--primary); font-family:monospace;">
                        ${formatarReais(totalPrevistoPeriodo)}
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:6px;">
                        Juros: <b style="color:#10b981;">${formatarReais(totalJurosPeriodo)}</b> | Amort: <b>${formatarReais(totalAmortPeriodo)}</b>
                    </div>
                </div>

                <!-- Próximos 7 dias -->
                <div class="card" style="padding: 20px;">
                    <div style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:8px;">
                        Previsto Próximos 7 Dias
                    </div>
                    <div style="font-size:24px; font-weight:800; color:var(--text-primary); font-family:monospace;">
                        ${formatarReais(total7Dias)}
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:6px;">
                        ${proximos7Dias.length} vencimento(s) programado(s)
                    </div>
                </div>

                <!-- Lucro Líquido Previsto (Apenas Juros) -->
                <div class="card" style="padding: 20px;">
                    <div style="font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.5px; color:var(--text-secondary); margin-bottom:8px;">
                        Lucro Esperado (Juros)
                    </div>
                    <div style="font-size:24px; font-weight:800; color:#10b981; font-family:monospace;">
                        + ${formatarReais(totalJurosPeriodo)}
                    </div>
                    <div style="font-size:12px; color:var(--text-secondary); margin-top:6px;">
                        Rentabilidade projetada para o período
                    </div>
                </div>
            </div>

            <!-- Gráfico de Linha do Fluxo Projetado -->
            <div class="card" style="padding: 20px; margin-bottom: 24px;">
                <h3 style="margin: 0 0 16px 0; font-size:15px; font-weight:700;">Curva de Entradas Previstas por Data</h3>
                <div style="height: 240px; position:relative;">
                    <canvas id="grafico-previsao"></canvas>
                </div>
            </div>

            <!-- Timeline de Vencimentos Futuros -->
            <div class="card" style="padding:0; overflow:hidden;">
                <div style="padding:16px 20px; border-bottom:1px solid var(--border); display:flex; justify-content:space-between; align-items:center;">
                    <h3 style="margin:0; font-size:15px; font-weight:700;">Linha do Tempo dos Vencimentos</h3>
                    <span style="font-size:12px; color:var(--text-secondary);">${this._previsoes.length} evento(s) no horizonte</span>
                </div>
                ${this._renderTabelaEventos()}
            </div>
        </div>
        `;
    },

    _renderTabelaEventos() {
        if (this._previsoes.length === 0) {
            return `
            <div style="padding: 40px; text-align:center;">
                <p style="color:var(--text-secondary); margin:0;">Nenhum vencimento previsto para o horizonte de ${this._periodoDias} dias.</p>
            </div>`;
        }

        const rows = this._previsoes.map(ev => {
            let badgeDias = '';
            if (ev.diasRestantes < 0) {
                badgeDias = `<span class="badge badge-danger" style="font-size:11px;">🚨 Vencido há ${Math.abs(ev.diasRestantes)}d</span>`;
            } else if (ev.diasRestantes === 0) {
                badgeDias = `<span class="badge badge-warning" style="font-size:11px; font-weight:700;">📅 Vence Hoje</span>`;
            } else if (ev.diasRestantes <= 7) {
                badgeDias = `<span class="badge badge-warning" style="font-size:11px;">⏰ Em ${ev.diasRestantes}d</span>`;
            } else {
                badgeDias = `<span class="badge badge-green" style="font-size:11px;">Em ${ev.diasRestantes}d</span>`;
            }

            return `
            <tr class="clickable" onclick="window.location.hash='#/emprestimo/${ev.emprestimoId}'">
                <td style="font-weight:600; color:var(--text-primary);">
                    ${formatarData(ev.dataPrevista)}
                </td>
                <td>
                    <div style="font-weight:600; color:var(--text-primary);">${ev.devedorNome}</div>
                    <div style="font-size:11px; color:var(--text-secondary); text-transform:capitalize;">Modalidade: ${ev.modalidade}</div>
                </td>
                <td>${badgeDias}</td>
                <td class="col-right" style="color:#10b981; font-family:monospace; font-weight:600;">
                    ${formatarReais(ev.jurosEsperado)}
                </td>
                <td class="col-right" style="color:var(--text-secondary); font-family:monospace;">
                    ${formatarReais(ev.amortizacaoEsperada)}
                </td>
                <td class="col-right" style="font-weight:700; color:var(--text-primary); font-family:monospace;">
                    ${formatarReais(ev.totalEsperado)}
                </td>
                <td style="text-align:right;">
                    <a href="#/pagamento/${ev.emprestimoId}" class="btn btn-sm btn-secondary" onclick="event.stopPropagation();" style="padding:4px 8px; font-size:12px;">
                        Dar Baixa
                    </a>
                </td>
            </tr>`;
        }).join('');

        return `
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Data Prevista</th>
                        <th>Devedor</th>
                        <th>Prazo</th>
                        <th class="col-right">Juros Previstos</th>
                        <th class="col-right">Amortização</th>
                        <th class="col-right">Total Esperado</th>
                        <th style="text-align:right;">Ação</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    },

    _renderGraficoPrevisao() {
        const canvas = document.getElementById('grafico-previsao');
        if (!canvas || !window.Chart) return;

        // Agrupa valores por data (dia)
        const mapaDias = {};
        this._previsoes.forEach(p => {
            const dataFmt = new Date(p.dataPrevista).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' });
            if (!mapaDias[dataFmt]) mapaDias[dataFmt] = { juros: 0, total: 0 };
            mapaDias[dataFmt].juros += p.jurosEsperado;
            mapaDias[dataFmt].total += p.totalEsperado;
        });

        const labels = Object.keys(mapaDias);
        const dataJuros = labels.map(l => mapaDias[l].juros);
        const dataTotal = labels.map(l => mapaDias[l].total);

        new Chart(canvas, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Juros (Lucro)',
                        data: dataJuros,
                        backgroundColor: '#10b981',
                        borderRadius: 4
                    },
                    {
                        label: 'Total Esperado',
                        data: dataTotal,
                        backgroundColor: 'rgba(59, 130, 246, 0.4)',
                        borderRadius: 4
                    }
                ]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                plugins: {
                    legend: {
                        position: 'top',
                        labels: { color: '#94a3b8', font: { size: 12 } }
                    }
                },
                scales: {
                    x: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: { color: '#94a3b8' }
                    },
                    y: {
                        grid: { color: 'rgba(255,255,255,0.05)' },
                        ticks: {
                            color: '#94a3b8',
                            callback: v => 'R$ ' + v.toLocaleString('pt-BR')
                        }
                    }
                }
            }
        });
    },

    setPeriodo(dias) {
        this._periodoDias = dias;
        this._calcularPrevisoes();
        const app = document.getElementById('conteudo-principal');
        if (app) {
            app.innerHTML = this._renderTela();
            if (window.lucide) window.lucide.createIcons();
            this._renderGraficoPrevisao();
        }
    }
};

window.TelaPrevisao = TelaPrevisao;
