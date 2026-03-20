// ============================================================
// Tela Pagamento — Registro com DRE de Juros/Amortização
// ============================================================

const TelaPagamento = {
    _emprestimoId: null,
    _emprestimo: null,

    async render(id) {
        this._emprestimoId = id;
        const app = document.getElementById('app');

        app.innerHTML = `
        <div class="content-wrapper" style="max-width:800px;">
            <div class="page-header">
                <div class="skeleton skeleton-title" style="width:240px;height:40px;"></div>
            </div>
            <div class="card">
                <div class="card-body">
                    <div class="skeleton" style="height:300px;border-radius:8px;"></div>
                </div>
            </div>
        </div>`;

        try {
            const emprestimo = await Emprestimos.buscarPorId(id);
            if (!emprestimo) {
                App.showToast('Empréstimo não encontrado.', 'error');
                window.location.hash = '#/dashboard';
                return;
            }

            this._emprestimo = emprestimo;

            app.innerHTML = `
            <div class="content-wrapper" style="max-width:900px;">
                <div class="page-header">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <button class="btn btn-ghost btn-icon" onclick="window.history.back()" title="Voltar">
                            <i data-lucide="arrow-left"></i>
                        </button>
                        <h1 class="page-title">Registrar Recebimento</h1>
                    </div>
                </div>

                <div class="dashboard-grid" style="grid-template-columns:1fr 320px;gap:24px;align-items:start;">
                    
                    <!-- Coluna do Formulário -->
                    <div class="card">
                        <div class="card-body">
                            <!-- Resumo do Empréstimo Topo -->
                            <div style="padding:16px;background:var(--bg-card);border:1px solid var(--border-subtle);border-radius:var(--radius-md);margin-bottom:24px;">
                                <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Empréstimo de</div>
                                <div style="font-weight:600;font-size:16px;margin-bottom:8px;">${emprestimo.devedores?.nome || 'Desconhecido'}</div>
                                <div style="display:flex;gap:12px;font-size:13px;">
                                    <div><span style="color:var(--text-muted);">Principal:</span> ${formatarReais(emprestimo.valor_principal)}</div>
                                    <div><span style="color:var(--text-muted);">Taxa:</span> ${formatarPercentual(emprestimo.taxa_mensal)}</div>
                                </div>
                                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);">
                                    <span style="color:var(--text-secondary);font-size:13px;">Saldo Devedor Atual:</span>
                                    <span style="color:var(--danger);font-weight:700;margin-left:8px;">${formatarReais(emprestimo.saldo_devedor)}</span>
                                </div>
                            </div>

                            <form id="form-pagamento" onsubmit="TelaPagamento._handleSalvar(event)">
                                <div class="form-row">
                                    <div class="form-group">
                                        <label class="form-label">Valor Recebido (R$) <span class="required">*</span></label>
                                        <input type="number" id="pag-valor" class="form-input form-input-money"
                                            step="0.01" min="0.01" placeholder="0,00" required
                                            oninput="TelaPagamento._atualizarPreview()">
                                    </div>
                                    <div class="form-group">
                                        <label class="form-label">Data do Recebimento <span class="required">*</span></label>
                                        <input type="date" id="pag-data" class="form-input" value="${Datas.hojeISO()}" required>
                                    </div>
                                </div>

                                <div class="form-group">
                                    <label class="form-label">Descrição / Observação</label>
                                    <input type="text" id="pag-obs" class="form-input" placeholder="Ex: Parcela 01, Pagamento parcial, etc.">
                                </div>

                                <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:32px;">
                                    <button type="button" class="btn btn-ghost" onclick="window.history.back()">Cancelar</button>
                                    <button type="submit" class="btn btn-primary btn-lg" id="btn-salvar-pag">
                                        Confirmar Pagamento
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                    <!-- Coluna da Prévia -->
                    <div class="card" id="painel-previa" style="border-color:var(--green-500);opacity:0.5;transition:opacity var(--transition-normal);">
                        <div class="card-header" style="background:rgba(34, 197, 94, 0.05);border-bottom:1px solid rgba(34, 197, 94, 0.1);">
                            <h3 class="table-title">Impacto no Saldo</h3>
                        </div>
                        <div class="card-body" style="padding:16px;">
                            <p style="font-size:13px;color:var(--text-muted);margin-bottom:16px;">
                                Digite um valor ao lado para simular o abatimento do saldo devedor.
                            </p>

                            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-subtle);">
                                <span style="color:var(--text-secondary);">Juros Abatidos</span>
                                <span id="prev-juros" style="font-weight:600;">R$ 0,00</span>
                            </div>
                            
                            <div style="display:flex;justify-content:space-between;padding:12px 0;border-bottom:1px solid var(--border-subtle);">
                                <span style="color:var(--text-secondary);">Amortização Real</span>
                                <span id="prev-amort" style="color:var(--green-400);font-weight:600;">R$ 0,00</span>
                            </div>

                            <div style="display:flex;justify-content:space-between;padding:16px 0 4px 0;">
                                <span style="font-weight:500;">Novo Saldo Projetado</span>
                                <span id="prev-saldo" style="font-weight:700;font-size:18px;color:var(--danger);">R$ 0,00</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>`;

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error('Erro ao renderizar tela de pagamento:', err);
            App.showToast('Erro ao carregar dados.', 'error');
        }
    },

    /**
     * Atualiza a prévia de juros vs amortização em tempo real.
     */
    _atualizarPreview() {
        const valorRaw = document.getElementById('pag-valor').value;
        const valor = parseFloat(valorRaw);
        const painel = document.getElementById('painel-previa');

        if (!valor || valor <= 0 || !this._emprestimo) {
            painel.style.opacity = '0.5';
            document.getElementById('prev-juros').textContent = 'R$ 0,00';
            document.getElementById('prev-amort').textContent = 'R$ 0,00';
            document.getElementById('prev-saldo').textContent = 'R$ 0,00';
            return;
        }

        painel.style.opacity = '1';

        // Considera que o pagamento ocorre aprox um mês depois (para simulação rápida na UI)
        // O motor calculará exatamente na criação base no DB. 
        // Para UI, usaremos a decomposição livre aproximada a 30 dias se for Livre, ou parcela Price se for Price.
        let juros = 0;
        let amortizacao = 0;
        let saldoAtual = Number(this._emprestimo.saldo_devedor);

        if (this._emprestimo.modalidade === 'livre') {
            const decomp = calcularPagamentoLivre(saldoAtual, this._emprestimo.taxa_mensal, valor);
            juros = decomp.juros;
            amortizacao = decomp.amortizacao;
        } else {
            // Price: precisa encontrar os juros do mês exato, mas para simular assumimos Juros = Saldo * taxa e Amort = Resto
            const decomp = calcularParcelaPrice(saldoAtual, this._emprestimo.taxa_mensal, valor);
            juros = decomp.juros;
            amortizacao = decomp.amortizacao;
        }

        // Se a amortização for negativa, o saldo aumenta (pagamento não cobriu nem os juros)
        const novoSaldo = Math.max(0, saldoAtual - amortizacao);

        document.getElementById('prev-juros').textContent = formatarReais(juros);
        document.getElementById('prev-amort').textContent = formatarReais(amortizacao);
        document.getElementById('prev-saldo').textContent = formatarReais(novoSaldo);

        // Alerta visual se o pagamento for menor que os juros gerados
        const amortSpan = document.getElementById('prev-amort');
        if (amortizacao < 0) {
            amortSpan.style.color = 'var(--danger)';
            amortSpan.textContent = formatarReais(amortizacao) + ' (Acréscimo)';
        } else {
            amortSpan.style.color = 'var(--green-400)';
        }
    },

    async _handleSalvar(event) {
        event.preventDefault();

        const valor = parseFloat(document.getElementById('pag-valor').value);
        const data = document.getElementById('pag-data').value;
        const obs = document.getElementById('pag-obs').value.trim();

        if (valor <= 0) {
            App.showToast('O valor recebido deve ser maior que zero.', 'error');
            return;
        }

        const btn = document.getElementById('btn-salvar-pag');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Salvando...';

        const dados = {
            emprestimo_id: this._emprestimoId,
            valor_pago: valor,
            data_pagamento: data,
            observacoes: obs || null
        };

        try {
            const novo = await Pagamentos.registrar(dados);
            if (novo) {
                App.showToast('Pagamento registrado!', 'success');
                window.history.back();
            } else {
                throw new Error('Falha no banco de dados');
            }
        } catch (err) {
            console.error('Erro ao registrar:', err);
            App.showToast('Erro ao processar pagamento.', 'error');
            btn.disabled = false;
            btn.innerHTML = 'Confirmar Pagamento';
        }
    }
};

window.TelaPagamento = TelaPagamento;
