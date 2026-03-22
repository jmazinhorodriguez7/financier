// ============================================================
// Tela Simulador — Calculadora financeira independente
// ============================================================

const TelaSimulador = {
    _graficoSaldo: null,

    render() {
        const app = document.getElementById('conteudo-principal');

        // Check for prefill from sessionStorage
        const prefill = JSON.parse(sessionStorage.getItem('_sim_prefill') || 'null');
        sessionStorage.removeItem('_sim_prefill');

        app.innerHTML = `
        <div class="content-wrapper tela-simulador">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Simulador de Empréstimos</h1>
                    <p class="page-subtitle">Simule cenários sem salvar. Nenhum dado é gravado.</p>
                </div>
            </div>

            <!-- Painel de Entrada -->
            <div class="simulador-painel">
                <div class="simulador-campos">
                    <div class="form-group">
                        <label class="form-label">Valor do Empréstimo <span class="required">*</span></label>
                        <input type="number" id="sim-campo-valor" class="form-input form-input-money"
                            step="0.01" min="0.01" placeholder="0,00"
                            value="${prefill?.pv || ''}"
                            oninput="TelaSimulador._atualizar()">
                    </div>
                    <div class="form-group">
                        <label class="form-label">Taxa de Juros ao Mês <span class="required">*</span></label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="number" id="sim-campo-taxa" class="form-input form-input-money"
                                step="0.01" min="0.01" max="99.99" placeholder="0,00"
                                value="${prefill?.taxa || ''}"
                                oninput="TelaSimulador._atualizar()" style="flex:1;">
                            <span style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">% a.m.</span>
                        </div>
                    </div>
                    <div class="form-group">
                        <label class="form-label">Prazo</label>
                        <div style="display:flex;align-items:center;gap:8px;">
                            <input type="number" id="sim-campo-prazo" class="form-input"
                                min="1" placeholder="12"
                                value="${prefill?.prazo || '12'}"
                                oninput="TelaSimulador._atualizar()" style="flex:1;">
                            <span style="color:var(--text-secondary);font-size:13px;white-space:nowrap;">meses</span>
                        </div>
                    </div>
                </div>

                <div class="campo-full" style="margin-top:20px;">
                    <label class="form-label">Modalidade</label>
                    <div class="radio-modalidades" style="margin-top:8px;">
                        <label class="radio-modalidade">
                            <input type="radio" name="sim-modalidade" value="livre" ${(!prefill || prefill.mod === 'livre') ? 'checked' : ''}
                                onchange="TelaSimulador._atualizar()">
                            <div class="radio-card">
                                <span class="radio-icone">📊</span>
                                <span class="radio-nome">Livre</span>
                                <span class="radio-desc">Parcela variável</span>
                            </div>
                        </label>
                        <label class="radio-modalidade">
                            <input type="radio" name="sim-modalidade" value="price" ${prefill?.mod === 'price' ? 'checked' : ''}
                                onchange="TelaSimulador._atualizar()">
                            <div class="radio-card">
                                <span class="radio-icone">📐</span>
                                <span class="radio-nome">Price</span>
                                <span class="radio-desc">Parcela fixa</span>
                            </div>
                        </label>
                        <label class="radio-modalidade">
                            <input type="radio" name="sim-modalidade" value="sac" ${prefill?.mod === 'sac' ? 'checked' : ''}
                                onchange="TelaSimulador._atualizar()">
                            <div class="radio-card">
                                <span class="radio-icone">📉</span>
                                <span class="radio-nome">SAC</span>
                                <span class="radio-desc">Parcela decrescente</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            <!-- Resultado Rápido -->
            <div class="simulador-resultado" id="simulador-resultado" style="display:none;">
                <div class="resultado-card destaque">
                    <span class="resultado-label">Parcela Inicial</span>
                    <span class="resultado-valor" id="sim-parcela-inicial">R$ 0,00</span>
                </div>
                <div class="resultado-card">
                    <span class="resultado-label">Total de Juros</span>
                    <span class="resultado-valor" id="sim-total-juros">R$ 0,00</span>
                </div>
                <div class="resultado-card">
                    <span class="resultado-label">Total a Pagar</span>
                    <span class="resultado-valor" id="sim-total-pago">R$ 0,00</span>
                </div>
                <div class="resultado-card">
                    <span class="resultado-label">Custo dos Juros</span>
                    <span class="resultado-valor" id="sim-ganho-juros" style="color:var(--danger);">R$ 0,00</span>
                </div>
            </div>

            <!-- Ações -->
            <div style="display:flex;gap:12px;flex-wrap:wrap;" id="sim-acoes" style="display:none;">
                <button class="btn btn-primary" id="btn-usar-simulacao"
                    onclick="TelaSimulador._usarComoEmprestimo()" style="display:none;">
                    <i data-lucide="arrow-right" style="width:16px;height:16px;"></i>
                    Usar esta simulação
                </button>
                <button class="btn btn-secondary" id="btn-gerar-proposta"
                    onclick="TelaSimulador._gerarProposta()" style="display:none;">
                    <i data-lucide="file-text" style="width:16px;height:16px;"></i>
                    Gerar Proposta (PDF)
                </button>
                <button class="btn btn-ghost" id="btn-compartilhar-whats"
                    onclick="TelaSimulador._compartilharWhatsApp()" style="display:none;">
                    <i data-lucide="share-2" style="width:16px;height:16px;"></i>
                    Enviar por WhatsApp
                </button>
            </div>

            <!-- Comparação de Modalidades -->
            <div id="comparacao-modalidades" class="comparacao-modalidades" style="display:none;">
                <h2 style="font-size:18px;font-weight:700;color:var(--text-primary);">Comparação de Modalidades</h2>

                <div class="comparacao-grid">
                    <!-- Card Livre -->
                    <div class="comparacao-card" id="card-livre">
                        <div class="comparacao-card-header livre">
                            <span class="comparacao-nome">📊 Livre</span>
                            <span class="comparacao-desc">Juros sobre saldo — parcela variável</span>
                        </div>
                        <div class="comparacao-card-body">
                            <div class="comp-item"><span>Parcela Inicial</span><span id="livre-p-inicial">—</span></div>
                            <div class="comp-item"><span>Parcela Final</span><span id="livre-p-final">—</span></div>
                            <div class="comp-item"><span>Total Juros</span><span id="livre-juros" class="negativo">—</span></div>
                            <div class="comp-item"><span>Total Pago</span><span id="livre-total">—</span></div>
                            <div class="comp-item"><span>Custo Extra</span><span id="livre-extra" class="negativo">—</span></div>
                            <div style="margin-top:8px;">
                                <div class="barra-label"><span>Principal</span><span>Juros</span></div>
                                <div class="barra-wrapper">
                                    <div class="barra-principal" id="livre-bp" style="width:80%;"></div>
                                    <div class="barra-juros" id="livre-bj" style="width:20%;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="comp-footer" id="livre-badge"></div>
                    </div>

                    <!-- Card Price -->
                    <div class="comparacao-card" id="card-price">
                        <div class="comparacao-card-header price">
                            <span class="comparacao-nome">📐 Price</span>
                            <span class="comparacao-desc">Parcela fixa — amortização crescente</span>
                        </div>
                        <div class="comparacao-card-body">
                            <div class="comp-item"><span>Parcela Fixa</span><span id="price-pmt">—</span></div>
                            <div class="comp-item"><span>Total Juros</span><span id="price-juros" class="negativo">—</span></div>
                            <div class="comp-item"><span>Total Pago</span><span id="price-total">—</span></div>
                            <div class="comp-item"><span>Custo Extra</span><span id="price-extra" class="negativo">—</span></div>
                            <div style="margin-top:8px;">
                                <div class="barra-label"><span>Principal</span><span>Juros</span></div>
                                <div class="barra-wrapper">
                                    <div class="barra-principal" id="price-bp" style="width:80%;"></div>
                                    <div class="barra-juros" id="price-bj" style="width:20%;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="comp-footer" id="price-badge"></div>
                    </div>

                    <!-- Card SAC -->
                    <div class="comparacao-card" id="card-sac">
                        <div class="comparacao-card-header sac">
                            <span class="comparacao-nome">📉 SAC</span>
                            <span class="comparacao-desc">Amortização fixa — parcela decrescente</span>
                        </div>
                        <div class="comparacao-card-body">
                            <div class="comp-item"><span>Parcela Inicial</span><span id="sac-p-inicial">—</span></div>
                            <div class="comp-item"><span>Parcela Final</span><span id="sac-p-final">—</span></div>
                            <div class="comp-item"><span>Total Juros</span><span id="sac-juros" class="negativo">—</span></div>
                            <div class="comp-item"><span>Total Pago</span><span id="sac-total">—</span></div>
                            <div class="comp-item"><span>Custo Extra</span><span id="sac-extra" class="negativo">—</span></div>
                            <div style="margin-top:8px;">
                                <div class="barra-label"><span>Principal</span><span>Juros</span></div>
                                <div class="barra-wrapper">
                                    <div class="barra-principal" id="sac-bp" style="width:80%;"></div>
                                    <div class="barra-juros" id="sac-bj" style="width:20%;"></div>
                                </div>
                            </div>
                        </div>
                        <div class="comp-footer" id="sac-badge"></div>
                    </div>
                </div>

                <!-- Gráfico de Evolução do Saldo -->
                <div class="comp-grafico-wrapper">
                    <h3 style="font-size:14px;font-weight:600;color:var(--text-primary);">Evolução do Saldo Devedor</h3>
                    <canvas id="grafico-saldo" height="240"></canvas>
                </div>

                <!-- Simulador de Antecipação -->
                <div class="comp-antecipacao">
                    <h3 style="font-size:14px;font-weight:600;color:var(--text-primary);">Simulador de Antecipação</h3>
                    <div class="antecipacao-controle">
                        <label>Antecipar</label>
                        <input type="number" id="campo-antecipacao" class="form-input" min="1" placeholder="0"
                            style="width:80px;height:36px;" oninput="TelaSimulador._atualizarAntecipacao()">
                        <span>parcelas</span>
                    </div>
                    <div class="antecipacao-resultado" id="antecipacao-resultado" style="display:none;">
                        <div class="comp-item"><span>Economia em Juros</span><span id="antic-economia" class="positivo">—</span></div>
                        <div class="comp-item"><span>Parcelas Restantes</span><span id="antic-restantes">—</span></div>
                        <div class="comp-item"><span>Novo Total</span><span id="antic-total">—</span></div>
                    </div>
                </div>

                <!-- Tabela Mês a Mês -->
                <div class="comp-tabela-wrapper">
                    <h3 style="font-size:14px;font-weight:600;color:var(--text-primary);">Tabela Comparativa Mês a Mês</h3>
                    <div style="overflow-x:auto;max-height:400px;overflow-y:auto;">
                        <table class="tabela-comparacao">
                            <thead>
                                <tr>
                                    <th style="text-align:left;">Mês</th>
                                    <th>Livre Parcela</th>
                                    <th>Livre Saldo</th>
                                    <th>Price Parcela</th>
                                    <th>Price Saldo</th>
                                    <th>SAC Parcela</th>
                                    <th>SAC Saldo</th>
                                </tr>
                            </thead>
                            <tbody id="tabela-comp-body"></tbody>
                        </table>
                    </div>
                </div>

                <!-- Resumo em Linguagem Natural -->
                <div class="comp-resumo-natural">
                    <p class="comp-resumo-texto" id="resumo-texto"></p>
                </div>
            </div>

            <!-- Cenários Salvos -->
            <div class="simulador-painel" style="margin-top:24px;">
                <h3 style="font-size:16px;font-weight:600;color:var(--text-primary);margin-bottom:16px;">Cenários Salvos</h3>
                <div class="cenarios-lista" id="cenarios-lista">
                    <span style="color:var(--text-muted);font-size:13px;">Nenhum cenário salvo ainda.</span>
                </div>
                <button class="btn btn-secondary btn-sm" onclick="TelaSimulador._salvarCenario()">
                    <i data-lucide="save" style="width:14px;height:14px;"></i>
                    Salvar este cenário
                </button>
            </div>
        </div>`;

        if (window.lucide) window.lucide.createIcons();
        this._carregarCenariosLocais();

        // If prefill data, trigger update
        if (prefill) {
            setTimeout(() => this._atualizar(), 100);
        }
    },

    // ============================================
    // CORE SIMULATION
    // ============================================

    _lastCalcData: null,

    _atualizar() {
        const pv = parseFloat(document.getElementById('sim-campo-valor')?.value);
        const taxaInput = parseFloat(document.getElementById('sim-campo-taxa')?.value);
        const prazoInput = parseInt(document.getElementById('sim-campo-prazo')?.value);
        const modalidade = document.querySelector('input[name="sim-modalidade"]:checked')?.value || 'livre';

        const resultado = document.getElementById('simulador-resultado');
        if (!pv || !taxaInput) {
            resultado.style.display = 'none';
            document.getElementById('comparacao-modalidades').style.display = 'none';
            return;
        }

        const taxa = taxaInput / 100;
        const prazo = prazoInput || 12;

        let parcelaInicial, totalJuros, totalPago;

        if (modalidade === 'price') {
            const pmt = Calculos.calcularPMT(pv, taxa, prazo);
            const tab = Calculos.gerarTabelaPrice(pv, taxa, prazo);
            parcelaInicial = pmt;
            totalJuros = Calculos.arredondar(tab.reduce((a, p) => a + p.juros, 0));
            totalPago = Calculos.arredondar(tab.reduce((a, p) => a + p.pmt, 0));
        } else if (modalidade === 'sac') {
            const tab = Calculos.gerarTabelaSAC(pv, taxa, prazo);
            parcelaInicial = tab[0].parcela;
            totalJuros = Calculos.arredondar(tab.reduce((a, p) => a + p.juros, 0));
            totalPago = Calculos.arredondar(tab.reduce((a, p) => a + p.parcela, 0));
        } else {
            const amortL = Calculos.arredondar(pv / prazo);
            parcelaInicial = Calculos.arredondar(pv * taxa + amortL);
            const tab = [];
            let s = pv;
            for (let m = 0; m < prazo; m++) {
                const j = Calculos.arredondar(s * taxa);
                tab.push({ juros: j, parcela: j + amortL });
                s = Calculos.arredondar(s - amortL);
            }
            totalJuros = Calculos.arredondar(tab.reduce((a, p) => a + p.juros, 0));
            totalPago = Calculos.arredondar(tab.reduce((a, p) => a + p.parcela, 0));
        }

        this._set('sim-parcela-inicial', formatarReais(parcelaInicial));
        this._set('sim-total-juros', formatarReais(totalJuros));
        this._set('sim-total-pago', formatarReais(totalPago));
        this._set('sim-ganho-juros', formatarReais(totalJuros));

        resultado.style.display = 'grid';

        // Show action buttons
        ['btn-usar-simulacao', 'btn-gerar-proposta', 'btn-compartilhar-whats'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.style.display = 'inline-flex';
        });

        // Store last calc data for proposal/share
        this._lastCalcData = { pv, taxa: taxaInput, prazo, modalidade, parcelaInicial, totalJuros, totalPago };

        // Update comparison
        this._atualizarComparacao(pv, taxa, prazo, modalidade);
    },

    // ============================================
    // COMPARISON SECTION
    // ============================================

    _atualizarComparacao(pv, taxa, prazo, modalidade) {
        const comparacao = document.getElementById('comparacao-modalidades');
        comparacao.style.display = 'flex';

        // Calculate Livre
        let saldoL = pv, tjL = 0, tpL = 0;
        const parcelasL = [];
        const amortL = Calculos.arredondar(pv / prazo);
        for (let m = 0; m < prazo; m++) {
            const juros = Calculos.arredondar(saldoL * taxa);
            const parcela = Calculos.arredondar(juros + amortL);
            tjL += juros; tpL += parcela;
            saldoL = Calculos.arredondar(Math.max(0, saldoL - amortL));
            parcelasL.push({ parcela, saldo: saldoL, juros });
        }
        tjL = Calculos.arredondar(tjL);
        tpL = Calculos.arredondar(tpL);

        // Calculate Price
        const tabP = Calculos.gerarTabelaPrice(pv, taxa, prazo);
        const tjP = Calculos.arredondar(tabP.reduce((a, p) => a + p.juros, 0));
        const tpP = Calculos.arredondar(tabP.reduce((a, p) => a + p.pmt, 0));
        const pmtP = tabP[0].pmt;

        // Calculate SAC
        const tabS = Calculos.gerarTabelaSAC(pv, taxa, prazo);
        const tjS = Calculos.arredondar(tabS.reduce((a, p) => a + p.juros, 0));
        const tpS = Calculos.arredondar(tabS.reduce((a, p) => a + p.parcela, 0));

        // Update cards
        this._set('livre-p-inicial', formatarReais(parcelasL[0].parcela));
        this._set('livre-p-final', formatarReais(parcelasL[prazo - 1].parcela));
        this._set('livre-juros', formatarReais(tjL));
        this._set('livre-total', formatarReais(tpL));
        this._set('livre-extra', formatarReais(tpL - pv));
        this._barra('livre', pv, tjL, tpL);

        this._set('price-pmt', formatarReais(pmtP));
        this._set('price-juros', formatarReais(tjP));
        this._set('price-total', formatarReais(tpP));
        this._set('price-extra', formatarReais(tpP - pv));
        this._barra('price', pv, tjP, tpP);

        this._set('sac-p-inicial', formatarReais(tabS[0].parcela));
        this._set('sac-p-final', formatarReais(tabS[prazo - 1].parcela));
        this._set('sac-juros', formatarReais(tjS));
        this._set('sac-total', formatarReais(tpS));
        this._set('sac-extra', formatarReais(tpS - pv));
        this._barra('sac', pv, tjS, tpS);

        // Badges
        const menorJuros = Math.min(tjL, tjP, tjS);
        this._badge('livre-badge', tjL === menorJuros ? ['badge-melhor', 'Menor custo total'] : ['badge-info', 'Parcela variável']);
        this._badge('price-badge', tjP === menorJuros ? ['badge-melhor', 'Menor custo total'] : ['badge-info', 'Parcela previsível']);
        this._badge('sac-badge', tjS === menorJuros ? ['badge-melhor', 'Menor custo total ✓'] : ['badge-neutro', 'Amortização constante']);

        // Highlight selected card
        ['livre', 'price', 'sac'].forEach(m => {
            document.getElementById('card-' + m)?.classList.toggle('selecionado', m === modalidade);
        });

        // Chart
        this._atualizarGrafico(prazo, parcelasL, tabP, tabS);

        // Store for antecipação
        this._tabelasCache = { parcelasL, tabP, tabS, pv, taxa, prazo, modalidade, pmtP };

        // Month-by-month table
        this._atualizarTabela(prazo, parcelasL, tabP, tabS, modalidade);

        // Natural language summary
        const taxaInput = parseFloat(document.getElementById('sim-campo-taxa')?.value);
        this._atualizarResumo(pv, taxaInput, prazo, tjL, tjP, tjS, tpL, tpP, tpS,
            tabS[0].parcela, tabS[prazo - 1].parcela, pmtP);
    },

    _atualizarGrafico(prazo, parcelasL, tabP, tabS) {
        const labels = Array.from({ length: prazo }, (_, i) => 'M' + (i + 1));
        const ctx = document.getElementById('grafico-saldo')?.getContext('2d');
        if (!ctx) return;
        if (this._graficoSaldo) this._graficoSaldo.destroy();
        this._graficoSaldo = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Livre', data: parcelasL.map(p => p.saldo),
                        borderColor: '#3b82f6', backgroundColor: 'rgba(59,130,246,0.08)',
                        tension: 0.3, pointRadius: prazo > 24 ? 0 : 3, fill: true
                    },
                    {
                        label: 'Price', data: tabP.map(p => p.novoSaldo),
                        borderColor: '#f59e0b', backgroundColor: 'rgba(245,158,11,0.08)',
                        tension: 0.3, pointRadius: prazo > 24 ? 0 : 3, fill: true
                    },
                    {
                        label: 'SAC', data: tabS.map(p => p.novoSaldo),
                        borderColor: '#22c55e', backgroundColor: 'rgba(34,197,94,0.08)',
                        tension: 0.3, pointRadius: prazo > 24 ? 0 : 3, fill: true
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { labels: { color: '#94a3b8', font: { size: 11 } } },
                    tooltip: { callbacks: { label: c => c.dataset.label + ': ' + formatarReais(c.parsed.y) } }
                },
                scales: {
                    x: { ticks: { color: '#94a3b8', font: { size: 10 } }, grid: { color: '#1e3a20' } },
                    y: {
                        ticks: {
                            color: '#94a3b8', font: { size: 10 },
                            callback: v => 'R$' + (v >= 1000 ? (v / 1000).toFixed(0) + 'k' : v.toFixed(0))
                        },
                        grid: { color: '#1e3a20' }
                    }
                }
            }
        });
    },

    _atualizarTabela(prazo, parcelasL, tabP, tabS, modalidade) {
        const tbody = document.getElementById('tabela-comp-body');
        if (!tbody) return;
        tbody.innerHTML = '';
        const clL = modalidade === 'livre' ? 'col-selecionada' : '';
        const clP = modalidade === 'price' ? 'col-selecionada' : '';
        const clS = modalidade === 'sac' ? 'col-selecionada' : '';
        for (let i = 0; i < prazo; i++) {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>Mês ${i + 1}</td>
                <td class="${clL}">${formatarReais(parcelasL[i].parcela)}</td>
                <td class="${clL}">${formatarReais(parcelasL[i].saldo)}</td>
                <td class="${clP}">${formatarReais(tabP[i].pmt)}</td>
                <td class="${clP}">${formatarReais(tabP[i].novoSaldo)}</td>
                <td class="${clS}">${formatarReais(tabS[i].parcela)}</td>
                <td class="${clS}">${formatarReais(tabS[i].novoSaldo)}</td>
            `;
            tbody.appendChild(tr);
        }
    },

    _atualizarResumo(pv, taxaInput, prazo, tjL, tjP, tjS, tpL, tpP, tpS, sacP1, sacPUlt, pmtP) {
        const melhor = tjS <= tjP && tjS <= tjL ? 'SAC' : tjP <= tjL ? 'Price' : 'Livre';
        const econSACvsPrice = Calculos.arredondar(tjP - tjS);
        const econSACvsLivre = Calculos.arredondar(tjL - tjS);
        const el = document.getElementById('resumo-texto');
        if (el) el.innerHTML = `
            Para um empréstimo de <strong>${formatarReais(pv)}</strong>
            a <strong>${taxaInput.toFixed(2).replace('.', ',')}% a.m.</strong>
            em <strong>${prazo} meses</strong>, a modalidade
            <strong>${melhor}</strong> gera o menor custo total.
            O SAC economiza <strong>${formatarReais(econSACvsPrice)}</strong> em juros comparado ao Price e
            <strong>${formatarReais(econSACvsLivre)}</strong> comparado ao Livre,
            porém exige parcela inicial de <strong>${formatarReais(sacP1)}</strong>
            caindo até <strong>${formatarReais(sacPUlt)}</strong> no último mês.
            O Price oferece parcela fixa de <strong>${formatarReais(pmtP)}</strong> todos os meses,
            facilitando o planejamento financeiro do devedor.
        `;
    },

    _atualizarAntecipacao() {
        const n = parseInt(document.getElementById('campo-antecipacao')?.value);
        const res = document.getElementById('antecipacao-resultado');
        if (!n || n <= 0 || !this._tabelasCache) {
            if (res) res.style.display = 'none';
            return;
        }
        const { parcelasL, tabP, tabS, modalidade, pv, taxa } = this._tabelasCache;
        const tabelaRef = modalidade === 'price' ? tabP
            : modalidade === 'sac' ? tabS
            : parcelasL.map((p, i) => ({
                parcela: p.parcela,
                juros: p.juros
            }));
        const resultado = Calculos.simularAntecipacao(tabelaRef, n);
        this._set('antic-economia', formatarReais(resultado.economiaJuros));
        this._set('antic-restantes', resultado.parcelasRestantes + ' parcelas');
        this._set('antic-total', formatarReais(resultado.novoTotal));
        if (res) res.style.display = 'flex';
    },

    // ============================================
    // SCENARIOS
    // ============================================

    _salvarCenario() {
        const pv = parseFloat(document.getElementById('sim-campo-valor')?.value);
        const taxa = document.getElementById('sim-campo-taxa')?.value;
        const prazo = document.getElementById('sim-campo-prazo')?.value;
        const mod = document.querySelector('input[name="sim-modalidade"]:checked')?.value || 'livre';
        if (!pv || !taxa) {
            App.showToast('Preencha valor e taxa para salvar.', 'info');
            return;
        }
        const cenarios = JSON.parse(localStorage.getItem('_sim_cenarios') || '[]');
        const novo = {
            id: Date.now(),
            nome: `${formatarReais(pv)} | ${taxa}% | ${prazo || '?'}m | ${mod}`,
            pv, taxa, prazo, mod,
            criadoEm: new Date().toLocaleDateString('pt-BR')
        };
        cenarios.unshift(novo);
        if (cenarios.length > 10) cenarios.pop();
        localStorage.setItem('_sim_cenarios', JSON.stringify(cenarios));
        App.showToast('Cenário salvo com sucesso.', 'success');
        this._renderizarCenariosLocais(cenarios);
    },

    _carregarCenariosLocais() {
        const cenarios = JSON.parse(localStorage.getItem('_sim_cenarios') || '[]');
        this._renderizarCenariosLocais(cenarios);
    },

    _renderizarCenariosLocais(cenarios) {
        const lista = document.getElementById('cenarios-lista');
        if (!lista) return;
        if (cenarios.length === 0) {
            lista.innerHTML = '<span style="color:var(--text-muted);font-size:13px;">Nenhum cenário salvo ainda.</span>';
            return;
        }
        lista.innerHTML = cenarios.map(c => `
            <div class="cenario-item" onclick="TelaSimulador._carregarCenario(${c.id})">
                <div>
                    <div class="cenario-item-nome">${c.nome}</div>
                    <div class="cenario-item-detalhe">Salvo em ${c.criadoEm}</div>
                </div>
                <button class="btn btn-ghost btn-sm btn-icon"
                    onclick="event.stopPropagation(); TelaSimulador._removerCenario(${c.id})"
                    title="Remover">✕</button>
            </div>
        `).join('');
    },

    _carregarCenario(id) {
        const cenarios = JSON.parse(localStorage.getItem('_sim_cenarios') || '[]');
        const c = cenarios.find(x => x.id === id);
        if (!c) return;
        document.getElementById('sim-campo-valor').value = c.pv;
        document.getElementById('sim-campo-taxa').value = c.taxa;
        document.getElementById('sim-campo-prazo').value = c.prazo;
        const radio = document.querySelector(`input[name="sim-modalidade"][value="${c.mod}"]`);
        if (radio) radio.checked = true;
        this._atualizar();
    },

    _removerCenario(id) {
        let cenarios = JSON.parse(localStorage.getItem('_sim_cenarios') || '[]');
        cenarios = cenarios.filter(c => c.id !== id);
        localStorage.setItem('_sim_cenarios', JSON.stringify(cenarios));
        this._renderizarCenariosLocais(cenarios);
    },

    // ============================================
    // ACTIONS
    // ============================================

    _usarComoEmprestimo() {
        const pv = document.getElementById('sim-campo-valor')?.value;
        const taxa = document.getElementById('sim-campo-taxa')?.value;
        const prazo = document.getElementById('sim-campo-prazo')?.value;
        const mod = document.querySelector('input[name="sim-modalidade"]:checked')?.value;
        sessionStorage.setItem('_sim_para_emprestimo', JSON.stringify({ pv, taxa, prazo, mod }));
        window.location.hash = '#/novo-emprestimo';
        App.showToast('Simulação carregada no formulário.', 'success');
    },

    async _gerarProposta() {
        if (!this._lastCalcData) {
            App.showToast('Preencha valor e taxa para gerar a proposta.', 'info');
            return;
        }
        const nomeDevedor = await PropostaEmprestimo.solicitarNomeDevedor();
        const btn = document.getElementById('btn-gerar-proposta');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:14px;height:14px;border-width:2px;"></span> Gerando...';

        try {
            const d = this._lastCalcData;
            const arquivo = PropostaEmprestimo.gerar({
                nomeDevedor,
                valor: d.pv,
                taxa: d.taxa,
                prazo: d.prazo,
                modalidade: d.modalidade
            });
            App.showToast(`Proposta gerada: ${arquivo}`, 'success');
        } catch (e) {
            App.showToast('Erro ao gerar proposta.', 'error');
            console.error(e);
        }

        btn.disabled = false;
        btn.innerHTML = '<i data-lucide="file-text" style="width:16px;height:16px;"></i> Gerar Proposta (PDF)';
        if (window.lucide) window.lucide.createIcons();
    },

    _compartilharWhatsApp() {
        if (!this._lastCalcData) return;
        const d = this._lastCalcData;
        PropostaEmprestimo.compartilharWhatsApp({
            nomeDevedor: '',
            valor: d.pv,
            taxa: d.taxa,
            prazo: d.prazo,
            modalidade: d.modalidade,
            parcelaInicial: d.parcelaInicial,
            totalPago: d.totalPago
        });
    },

    // ============================================
    // HELPERS
    // ============================================

    _set(id, valor) {
        const el = document.getElementById(id);
        if (el) el.textContent = valor;
    },

    _barra(mod, pv, juros, total) {
        const p = Math.round((pv / total) * 100);
        const bp = document.getElementById(mod + '-bp');
        const bj = document.getElementById(mod + '-bj');
        if (bp) bp.style.width = p + '%';
        if (bj) bj.style.width = (100 - p) + '%';
    },

    _badge(id, [classe, texto]) {
        const el = document.getElementById(id);
        if (el) el.innerHTML = `<span class="${classe}">${texto}</span>`;
    }
};

window.TelaSimulador = TelaSimulador;
