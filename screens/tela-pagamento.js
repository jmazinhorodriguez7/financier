// ============================================================
// Tela Pagamento — Registro com tipos e DRE de Juros/Amortização
// ============================================================

const TelaPagamento = {
    _emprestimoId: null,
    _emprestimo: null,

    async render(id) {
        this._emprestimoId = id;
        const app = document.getElementById('conteudo-principal');

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
            const jurosEsperados = window.Calculos
                ? window.Calculos.arredondar(Number(emprestimo.saldo_devedor) * Number(emprestimo.taxa_mensal))
                : 0;

            app.innerHTML = `
            <div class="content-wrapper" style="max-width:960px;">
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
                                <div style="display:flex;gap:16px;font-size:13px;flex-wrap:wrap;">
                                    <div><span style="color:var(--text-muted);">Principal:</span> ${formatarReais(emprestimo.valor_principal)}</div>
                                    <div><span style="color:var(--text-muted);">Taxa:</span> ${formatarPercentual(emprestimo.taxa_mensal)}</div>
                                    <div><span style="color:var(--text-muted);">Modalidade:</span> ${emprestimo.modalidade?.toUpperCase() || '—'}</div>
                                </div>
                                <div style="margin-top:12px;padding-top:12px;border-top:1px solid var(--border-subtle);">
                                    <span style="color:var(--text-secondary);font-size:13px;">Saldo Devedor Atual:</span>
                                    <span style="color:var(--danger);font-weight:700;margin-left:8px;">${formatarReais(emprestimo.saldo_devedor)}</span>
                                    <span style="color:var(--text-muted);font-size:12px;margin-left:12px;">Juros do período: <strong style="color:var(--warning);">${formatarReais(jurosEsperados)}</strong></span>
                                </div>
                            </div>

                            <form id="form-pagamento" onsubmit="TelaPagamento._handleSalvar(event)">

                                <!-- Tipo de Pagamento -->
                                <div class="form-group" style="margin-bottom:20px;">
                                    <label class="form-label">Tipo de Pagamento</label>
                                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                                        <label style="flex:1;min-width:150px;cursor:pointer;">
                                            <input type="radio" name="tipo-pgto" id="tipo-normal" value="normal"
                                                checked onchange="TelaPagamento._onTipoChange()"
                                                style="display:none;">
                                            <div class="tipo-pgto-card selected" id="card-normal"
                                                style="padding:12px 16px;border-radius:10px;border:2px solid var(--green-500);background:rgba(34,197,94,0.08);text-align:center;transition:all 0.2s;">
                                                <div style="font-size:18px;margin-bottom:4px;">💰</div>
                                                <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Completo</div>
                                                <div style="font-size:11px;color:var(--text-muted);">Juros + Amortização</div>
                                            </div>
                                        </label>
                                        <label style="flex:1;min-width:150px;cursor:pointer;">
                                            <input type="radio" name="tipo-pgto" id="tipo-so-juros" value="so-juros"
                                                onchange="TelaPagamento._onTipoChange()"
                                                style="display:none;">
                                            <div class="tipo-pgto-card" id="card-so-juros"
                                                style="padding:12px 16px;border-radius:10px;border:2px solid var(--border-subtle);background:var(--bg-card);text-align:center;transition:all 0.2s;">
                                                <div style="font-size:18px;margin-bottom:4px;">📈</div>
                                                <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Só Juros</div>
                                                <div style="font-size:11px;color:var(--text-muted);">Não abate saldo</div>
                                            </div>
                                        </label>
                                        <label style="flex:1;min-width:150px;cursor:pointer;">
                                            <input type="radio" name="tipo-pgto" id="tipo-so-amort" value="so-amortizacao"
                                                onchange="TelaPagamento._onTipoChange()"
                                                style="display:none;">
                                            <div class="tipo-pgto-card" id="card-so-amort"
                                                style="padding:12px 16px;border-radius:10px;border:2px solid var(--border-subtle);background:var(--bg-card);text-align:center;transition:all 0.2s;">
                                                <div style="font-size:18px;margin-bottom:4px;">🔽</div>
                                                <div style="font-size:12px;font-weight:700;color:var(--text-primary);">Só Amortização</div>
                                                <div style="font-size:11px;color:var(--text-muted);">Sem juros</div>
                                            </div>
                                        </label>
                                    </div>
                                    <div id="aviso-tipo" style="margin-top:10px;font-size:12px;color:var(--text-muted);display:none;"></div>
                                </div>

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

                            <div id="prev-alerta" style="margin-top:12px;font-size:12px;padding:8px 12px;border-radius:8px;display:none;"></div>
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

    _getTipoPagamento() {
        const radio = document.querySelector('input[name="tipo-pgto"]:checked');
        return radio ? radio.value : 'normal';
    },

    _onTipoChange() {
        const tipo = this._getTipoPagamento();
        const cards = {
            'normal': 'card-normal',
            'so-juros': 'card-so-juros',
            'so-amortizacao': 'card-so-amort'
        };

        // Reset visuais
        Object.values(cards).forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.style.borderColor = 'var(--border-subtle)';
                el.style.background = 'var(--bg-card)';
            }
        });

        // Highlight selecionado
        const ativo = document.getElementById(cards[tipo]);
        if (ativo) {
            ativo.style.borderColor = 'var(--green-500)';
            ativo.style.background = 'rgba(34,197,94,0.08)';
        }

        // Avisos descritivos
        const aviso = document.getElementById('aviso-tipo');
        const mensagens = {
            'so-juros': '⚠️ O saldo devedor não será reduzido. Apenas os juros do período serão registrados.',
            'so-amortizacao': 'ℹ️ O valor será integralmente usado para amortizar o saldo, sem considerar juros.'
        };
        if (aviso) {
            aviso.style.display = mensagens[tipo] ? 'block' : 'none';
            aviso.textContent = mensagens[tipo] || '';
        }

        this._atualizarPreview();
    },

    /**
     * Atualiza a prévia de juros vs amortização em tempo real.
     */
    _atualizarPreview() {
        const valorRaw = document.getElementById('pag-valor')?.value;
        const valor = parseFloat(valorRaw);
        const painel = document.getElementById('painel-previa');

        if (!valor || valor <= 0 || !this._emprestimo) {
            if (painel) painel.style.opacity = '0.5';
            document.getElementById('prev-juros').textContent = 'R$ 0,00';
            document.getElementById('prev-amort').textContent = 'R$ 0,00';
            document.getElementById('prev-saldo').textContent = 'R$ 0,00';
            const alertaEl = document.getElementById('prev-alerta');
            if (alertaEl) alertaEl.style.display = 'none';
            return;
        }

        if (painel) painel.style.opacity = '1';

        const tipo = this._getTipoPagamento();
        const saldoAtual = Number(this._emprestimo.saldo_devedor);
        const taxa = Number(this._emprestimo.taxa_mensal);
        const jurosEsperado = window.Calculos ? window.Calculos.arredondar(saldoAtual * taxa) : saldoAtual * taxa;

        let juros = 0, amortizacao = 0, novoSaldo = saldoAtual;

        if (tipo === 'so-juros') {
            juros = Math.min(valor, jurosEsperado);
            amortizacao = 0;
            novoSaldo = saldoAtual;
        } else if (tipo === 'so-amortizacao') {
            juros = 0;
            amortizacao = Math.min(valor, saldoAtual);
            novoSaldo = Math.max(0, saldoAtual - amortizacao);
        } else {
            // Normal: Calculos decides
            if (window.Calculos) {
                let decomp;
                if (this._emprestimo.modalidade === 'livre') {
                    decomp = window.Calculos.calcularPagamentoLivre(saldoAtual, taxa, valor);
                } else {
                    decomp = window.Calculos.calcularParcelaPrice(saldoAtual, taxa, valor);
                }
                juros = decomp.juros;
                amortizacao = decomp.amortizacao;
                novoSaldo = Math.max(0, saldoAtual - amortizacao);
            }
        }

        document.getElementById('prev-juros').textContent = formatarReais(juros);
        document.getElementById('prev-amort').textContent = formatarReais(amortizacao);
        document.getElementById('prev-saldo').textContent = formatarReais(novoSaldo);

        const amortSpan = document.getElementById('prev-amort');
        if (amortizacao < 0) {
            amortSpan.style.color = 'var(--danger)';
            amortSpan.textContent = formatarReais(amortizacao) + ' (Acréscimo)';
        } else {
            amortSpan.style.color = 'var(--green-400)';
        }

        // Alerta visual
        const alertaEl = document.getElementById('prev-alerta');
        if (alertaEl) {
            if (tipo === 'normal' && valor < jurosEsperado) {
                alertaEl.style.display = 'block';
                alertaEl.style.background = 'rgba(239,68,68,0.1)';
                alertaEl.style.color = '#ef4444';
                alertaEl.textContent = '⚠️ Valor abaixo dos juros — o saldo crescerá!';
            } else {
                alertaEl.style.display = 'none';
            }
        }
    },

    async _handleSalvar(event) {
        event.preventDefault();

        const valor = parseFloat(document.getElementById('pag-valor').value);
        const data = document.getElementById('pag-data').value;
        const obs = document.getElementById('pag-obs').value.trim();
        const tipo = this._getTipoPagamento();

        if (valor <= 0) {
            App.showToast('O valor recebido deve ser maior que zero.', 'error');
            return;
        }

        const saldoAtual = Number(this._emprestimo.saldo_devedor);
        const taxa = Number(this._emprestimo.taxa_mensal);
        const jurosEsperado = window.Calculos 
            ? window.Calculos.arredondar(saldoAtual * taxa)
            : saldoAtual * taxa;

        // Montar dados específicos por tipo
        let dadosExtras = {};
        if (tipo === 'so-juros') {
            dadosExtras = {
                valor_juros: Math.min(valor, jurosEsperado),
                valor_amortizacao: 0,
                saldo_apos: saldoAtual
            };
        } else if (tipo === 'so-amortizacao') {
            dadosExtras = {
                valor_juros: 0,
                valor_amortizacao: Math.min(valor, saldoAtual),
                saldo_apos: Math.max(0, saldoAtual - Math.min(valor, saldoAtual))
            };
        }

        const btn = document.getElementById('btn-salvar-pag');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Salvando...';

        const dados = {
            emprestimo_id: this._emprestimoId,
            valor_pago: valor,
            data_pagamento: data,
            tipo_pagamento: tipo,
            observacoes: obs || null,
            ...dadosExtras
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
