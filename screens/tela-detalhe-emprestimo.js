// ============================================================
// Tela Detalhe Empréstimo — Extrato, Tabela Price e Drawer de Pagamento
// ============================================================

const TelaDetalheEmprestimo = {
    _emprestimoId: null,
    _emprestimo: null,

    async render(id) {
        this._emprestimoId = id;
        const app = document.getElementById('app');
        
        app.innerHTML = `
        <div class="content-wrapper">
            <div class="kpi-grid" style="grid-template-columns:1fr;">
                <div class="skeleton skeleton-card" style="height:140px;"></div>
            </div>
            <div class="table-container" style="margin-top:24px;">
                ${Array(5).fill('<div class="skeleton skeleton-row"></div>').join('')}
            </div>
        </div>`;

        try {
            const [emprestimo, pagamentos] = await Promise.all([
                Emprestimos.buscarPorId(id),
                Pagamentos.listar(id)
            ]);

            if (!emprestimo) {
                App.showToast('Empréstimo não encontrado.', 'error');
                window.location.hash = '#/dashboard';
                return;
            }

            this._emprestimo = emprestimo;
            const devedorNome = emprestimo.devedores?.nome || 'Desconhecido';
            const statusClass = emprestimo.status === 'ativo' ? 'badge-green' : emprestimo.status === 'quitado' ? 'badge-gray' : 'badge-yellow';
            const statusText = emprestimo.status === 'ativo' ? 'Ativo' : emprestimo.status === 'quitado' ? 'Quitado' : 'Renegociado';

            // Totais
            const totalPago = pagamentos.reduce((s, p) => s + Number(p.valor_pago || 0), 0);
            const totalJuros = pagamentos.reduce((s, p) => s + Number(p.valor_juros || 0), 0);
            const totalAmort = pagamentos.reduce((s, p) => s + Number(p.valor_amortizacao || 0), 0);

            app.innerHTML = `
            <div class="content-wrapper">
                <!-- Header -->
                <div class="page-header">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <button class="btn btn-ghost btn-icon" onclick="window.history.back()" title="Voltar">
                            <i data-lucide="arrow-left"></i>
                        </button>
                        <div>
                            <h1 class="page-title" style="margin-bottom:0;">Empréstimo — ${devedorNome}</h1>
                        </div>
                    </div>
                    <div class="page-actions">
                        <button class="btn btn-primary" onclick="TelaDetalheEmprestimo._abrirDrawerPagamento()" ${emprestimo.status === 'quitado' ? 'disabled' : ''}>
                            <i data-lucide="dollar-sign" style="width:18px;height:18px;"></i>
                            Registrar Pagamento
                        </button>
                    </div>
                </div>

                <!-- Card Resumo -->
                <div class="card" style="margin-bottom:24px;border-left:4px solid var(--green-500);">
                    <div class="card-body" style="padding:24px;">
                        <div style="display:flex;justify-content:space-between;align-items:flex-start;flex-wrap:wrap;gap:24px;">
                            <div>
                                <div style="display:flex;align-items:center;gap:12px;margin-bottom:8px;">
                                    <span class="badge ${statusClass}">${statusText}</span>
                                    <span class="badge badge-gray" style="text-transform:uppercase;">${emprestimo.modalidade}</span>
                                </div>
                                <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Saldo Devedor Atual</div>
                                <div style="font-size:40px;font-weight:700;font-family:var(--font-mono);color:var(--green-400);line-height:1.2;">
                                    ${formatarReais(emprestimo.saldo_devedor)}
                                </div>
                            </div>
                            
                            <div style="display:flex;gap:32px;flex-wrap:wrap;">
                                <div>
                                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Valor Original</div>
                                    <div style="font-size:16px;font-weight:600;">${formatarReais(emprestimo.valor_principal)}</div>
                                </div>
                                <div>
                                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Taxa Mensal</div>
                                    <div style="font-size:16px;font-weight:600;">${formatarPercentual(emprestimo.taxa_mensal)}</div>
                                </div>
                                <div>
                                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Data Início</div>
                                    <div style="font-size:16px;font-weight:600;">${formatarData(emprestimo.data_inicio)}</div>
                                </div>
                                ${emprestimo.modalidade === 'price' ? `
                                <div>
                                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Prazo</div>
                                    <div style="font-size:16px;font-weight:600;">${emprestimo.prazo_meses} meses</div>
                                </div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Abas -->
                <div style="display:flex;gap:16px;border-bottom:1px solid var(--border-subtle);margin-bottom:24px;">
                    <button class="tab-btn tab-btn-active" onclick="TelaDetalheEmprestimo._switchTab('pagamentos', this)">Extrato de Pagamentos</button>
                    ${emprestimo.modalidade === 'price' ? `
                    <button class="tab-btn" onclick="TelaDetalheEmprestimo._switchTab('price', this)">Tabela Teórica (Price)</button>
                    ` : ''}
                </div>

                <!-- Tabela de Pagamentos -->
                <div id="tab-pagamentos">
                    ${pagamentos.length > 0 ? `
                    <div class="table-container">
                        <div style="overflow-x:auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Data</th>
                                        <th class="col-right">Valor Pago</th>
                                        <th class="col-right">Juros</th>
                                        <th class="col-right">Amortização</th>
                                        <th class="col-right">Saldo Após</th>
                                        <th>Observação</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${pagamentos.map(p => `
                                    <tr>
                                        <td>${formatarData(p.data_pagamento)}</td>
                                        <td class="cell-money" style="font-weight:600;color:var(--green-400);">${formatarReais(p.valor_pago)}</td>
                                        <td class="cell-money" style="color:var(--text-secondary);">${formatarReais(p.valor_juros || 0)}</td>
                                        <td class="cell-money" style="color:var(--text-secondary);">${formatarReais(p.valor_amortizacao || 0)}</td>
                                        <td class="cell-money">${formatarReais(p.saldo_apos || 0)}</td>
                                        <td style="color:var(--text-secondary);">${p.observacoes || '—'}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                                <tfoot>
                                    <tr style="background:var(--bg-surface);font-weight:600;">
                                        <td>TOTAIS</td>
                                        <td class="cell-money" style="color:var(--green-400);">${formatarReais(totalPago)}</td>
                                        <td class="cell-money">${formatarReais(totalJuros)}</td>
                                        <td class="cell-money">${formatarReais(totalAmort)}</td>
                                        <td colspan="2"></td>
                                    </tr>
                                </tfoot>
                            </table>
                        </div>
                    </div>
                    ` : `
                    <div class="table-container">
                        <div class="table-empty">
                            <div class="table-empty-icon">💸</div>
                            <p class="table-empty-text">Nenhum pagamento registrado para este empréstimo.</p>
                            <button class="btn btn-primary btn-sm" style="margin-top:16px;" onclick="TelaDetalheEmprestimo._abrirDrawerPagamento()">
                                Registrar Primeiro Pagamento
                            </button>
                        </div>
                    </div>
                    `}
                </div>

                <!-- Tabela Price -->
                ${emprestimo.modalidade === 'price' ? `
                <div id="tab-price" style="display:none;">
                    <div class="table-container">
                        <div class="table-header">
                            <h3 class="table-title">Simulação de Amortização (Tabela Price)</h3>
                            <p style="font-size:13px;color:var(--text-muted);font-weight:400;">
                                Valores teóricos projetados. Podem divergir caso pagamentos sejam antecipados ou atrasados.
                            </p>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Mês</th>
                                        <th class="col-right">Parcela</th>
                                        <th class="col-right">Juros</th>
                                        <th class="col-right">Amortização</th>
                                        <th class="col-right">Saldo Devedor</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Calculos.gerarTabelaPrice(emprestimo.valor_principal, emprestimo.taxa_mensal, emprestimo.prazo_meses).map(row => `
                                    <tr>
                                        <td style="font-weight:500;">${row.mes}</td>
                                        <td class="cell-money" style="font-weight:600;">${formatarReais(row.parcela)}</td>
                                        <td class="cell-money" style="color:var(--danger);">${formatarReais(row.juros)}</td>
                                        <td class="cell-money" style="color:var(--green-400);">${formatarReais(row.amortizacao)}</td>
                                        <td class="cell-money">${formatarReais(row.saldoDevedor)}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                ` : ''}
            </div>

            <!-- Drawer de Pagamento -->
            <div class="drawer-overlay" id="drawer-pagamento" onclick="TelaDetalheEmprestimo._fecharDrawer(event)">
                <div class="drawer-panel" onclick="event.stopPropagation()">
                    <div class="drawer-header">
                        <h2 class="drawer-title">Registrar Pagamento</h2>
                        <button class="drawer-close" onclick="TelaDetalheEmprestimo._fecharDrawer()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <form id="form-pagamento" onsubmit="TelaDetalheEmprestimo._handleSalvarPagamento(event)" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
                        <div class="drawer-body">
                            
                            <div class="form-group">
                                <label class="form-label">Valor Recebido (R$) <span class="required">*</span></label>
                                <input type="number" id="pag-valor" class="form-input form-input-money"
                                    step="0.01" min="0.01" placeholder="0,00" required
                                    oninput="TelaDetalheEmprestimo._atualizarPreview()">
                            </div>

                            <div class="form-group">
                                <label class="form-label">Data do Pagamento <span class="required">*</span></label>
                                <input type="date" id="pag-data" class="form-input" value="${Datas.hojeISO()}" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Observações</label>
                                <textarea id="pag-obs" class="form-textarea" placeholder="Opcional. Ex: Parcela 01, Abatimento, etc." rows="2"></textarea>
                            </div>

                            <!-- Preview em tempo real -->
                            <div id="painel-previa" style="margin-top:24px;background:rgba(34, 197, 94, 0.05);border:1px solid rgba(34, 197, 94, 0.2);border-radius:var(--radius-md);padding:16px;opacity:0.5;transition:opacity 0.2s;">
                                <h4 style="font-size:14px;font-weight:600;margin-bottom:12px;color:var(--text-primary);">Preview de Impacto</h4>
                                
                                <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
                                    <span style="color:var(--text-secondary);">Saldo Atual:</span>
                                    <span>${formatarReais(emprestimo.saldo_devedor)}</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;margin-bottom:8px;font-size:13px;">
                                    <span style="color:var(--text-secondary);">Juros Abatidos:</span>
                                    <span id="prev-juros" style="font-weight:500;">R$ 0,00</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;margin-bottom:12px;font-size:13px;padding-bottom:12px;border-bottom:1px solid rgba(255,255,255,0.05);">
                                    <span style="color:var(--text-secondary);">Amortização Real:</span>
                                    <span id="prev-amort" style="color:var(--green-400);font-weight:600;">R$ 0,00</span>
                                </div>
                                <div style="display:flex;justify-content:space-between;font-size:15px;font-weight:600;">
                                    <span>Novo Saldo Estimado:</span>
                                    <span id="prev-saldo" style="color:var(--danger);">R$ 0,00</span>
                                </div>

                                <!-- Alerta amortização negativa -->
                                <div id="alerta-amortizacao-negativa" class="alert alert-warning" style="display:none;margin-top:16px;padding:12px;">
                                    <div class="alert-icon">⚠️</div>
                                    <div class="alert-content">
                                        <div class="alert-title">Pagamento cobre apenas parte dos juros.</div>
                                        <div class="alert-description">O saldo devedor irá <strong>aumentar</strong> após este pagamento.</div>
                                    </div>
                                </div>
                            </div>
                        </div>
                        
                        <div class="drawer-footer">
                            <button type="button" class="btn btn-ghost" onclick="TelaDetalheEmprestimo._fecharDrawer()">Cancelar</button>
                            <button type="submit" class="btn btn-primary" id="btn-salvar-pag">Confirmar Pagamento</button>
                        </div>
                    </form>
                </div>
            </div>`;

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error('Erro ao carregar detalhe empréstimo:', err);
            App.showToast('Erro ao carregar dados do empréstimo.', 'error');
        }
    },

    _switchTab(tabId, btn) {
        const buttons = btn.parentElement.querySelectorAll('.tab-btn');
        buttons.forEach(b => b.classList.remove('tab-btn-active'));
        btn.classList.add('tab-btn-active');

        document.getElementById('tab-pagamentos').style.display = tabId === 'pagamentos' ? 'block' : 'none';
        const tabPrice = document.getElementById('tab-price');
        if (tabPrice) {
            tabPrice.style.display = tabId === 'price' ? 'block' : 'none';
        }
    },

    // ============================================
    // DRAWER DE PAGAMENTO
    // ============================================

    _abrirDrawerPagamento() {
        const drawer = document.getElementById('drawer-pagamento');
        if(drawer) {
            drawer.classList.add('drawer-open');
            setTimeout(() => document.getElementById('pag-valor')?.focus(), 300);
            this._atualizarPreview(); // Inicializa o estado do preview vazio
        }
    },

    _fecharDrawer(event) {
        // Se foi um clique no overlay
        if (event && !event.target.classList.contains('drawer-overlay')) return;
        
        const drawer = document.getElementById('drawer-pagamento');
        if(drawer) drawer.classList.remove('drawer-open');
    },

    _atualizarPreview() {
        if (!this._emprestimo) return;

        const valorInput = document.getElementById('pag-valor');
        if(!valorInput) return;

        const valor = parseFloat(valorInput.value);
        const painel = document.getElementById('painel-previa');
        const alerta = document.getElementById('alerta-amortizacao-negativa');

        if (!valor || valor <= 0) {
            painel.style.opacity = '0.5';
            document.getElementById('prev-juros').textContent = 'R$ 0,00';
            document.getElementById('prev-amort').textContent = 'R$ 0,00';
            document.getElementById('prev-saldo').textContent = 'R$ 0,00';
            alerta.style.display = 'none';
            return;
        }

        painel.style.opacity = '1';

        let juros = 0;
        let amortizacao = 0;
        let saldoAtual = Number(this._emprestimo.saldo_devedor);

        if (this._emprestimo.modalidade === 'livre') {
            const decomp = calcularPagamentoLivre(saldoAtual, this._emprestimo.taxa_mensal, valor);
            juros = decomp.juros;
            amortizacao = decomp.amortizacao;
        } else {
            const decomp = calcularParcelaPrice(saldoAtual, this._emprestimo.taxa_mensal, valor);
            juros = decomp.juros;
            amortizacao = decomp.amortizacao;
        }

        const novoSaldo = Math.max(0, saldoAtual - amortizacao); // Saldo pode aumentar se amort < 0

        document.getElementById('prev-juros').textContent = formatarReais(juros);
        document.getElementById('prev-amort').textContent = formatarReais(amortizacao);
        document.getElementById('prev-saldo').textContent = formatarReais(novoSaldo);

        // Styling da amortização e exibição de alerta
        const amortSpan = document.getElementById('prev-amort');
        if (amortizacao < 0) {
            amortSpan.style.color = 'var(--danger)';
            alerta.style.display = 'flex';
        } else {
            amortSpan.style.color = 'var(--green-400)';
            alerta.style.display = 'none';
        }
    },

    async _handleSalvarPagamento(event) {
        event.preventDefault();

        const valor = parseFloat(document.getElementById('pag-valor').value);
        const data = document.getElementById('pag-data').value;
        const obs = document.getElementById('pag-obs').value.trim();

        if (valor <= 0) {
            App.showToast('Informe o valor recebido.', 'error');
            return;
        }
        
        if (!data) {
            App.showToast('Data inválida.', 'error');
            return;
        }

        const btn = document.getElementById('btn-salvar-pag');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Registrando...';

        const dados = {
            emprestimo_id: this._emprestimoId,
            valor_pago: valor,
            data_pagamento: data,
            observacoes: obs || null
        };

        try {
            const novo = await Pagamentos.registrar(dados);
            if (novo) {
                App.showToast(`Pagamento de ${formatarReais(valor)} registrado com sucesso!`, 'success');
                this._fecharDrawer();
                // Recarrega a tela para atualizar saldo/tabelas
                this.render(this._emprestimoId); 
            } else {
                throw new Error('Retorno vazio do banco de dados');
            }
        } catch (err) {
            console.error('Erro ao registrar:', err);
            App.showToast('Erro ao salvar. Tente novamente.', 'error');
            btn.disabled = false;
            btn.innerHTML = 'Confirmar Pagamento';
        }
    }
};

window.TelaDetalheEmprestimo = TelaDetalheEmprestimo;
