// ============================================================
// Tela Detalhe Empréstimo — Extrato, Tabela Price e Drawer de Pagamento
// ============================================================

const TelaDetalheEmprestimo = {
    _emprestimoId: null,
    _emprestimo: null,
    _tipoPagamento: 'normal',

    async render(id) {
        this._emprestimoId = id;
        const app = document.getElementById('conteudo-principal');
        
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
            const [emprestimo, pagamentos, reqHistorico] = await Promise.all([
                Emprestimos.buscarPorId(id),
                Pagamentos.listar(id),
                window.FinancierDB.from('historico_edicoes').select('*').eq('emprestimo_id', id).order('created_at', { ascending: false })
            ]);
            const historico = reqHistorico.data || [];

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
                    <div class="page-actions" style="display:flex;gap:12px;">
                        <button class="btn btn-secundario" id="btn-editar-emprestimo" onclick="TelaDetalheEmprestimo._abrirDrawerEdicao()" ${emprestimo.status === 'quitado' ? 'disabled' : ''}>
                            <i data-lucide="edit-2" style="width:18px;height:18px;"></i>
                            Editar
                        </button>
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
                                ${(emprestimo.modalidade === 'price' || emprestimo.modalidade === 'sac') ? `
                                <div>
                                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Prazo Original</div>
                                    <div style="font-size:16px;font-weight:600;">${emprestimo.prazo_meses} meses</div>
                                </div>
                                <div>
                                    <div style="font-size:13px;color:var(--text-secondary);margin-bottom:4px;">Prazo Restante</div>
                                    <div style="font-size:16px;font-weight:600;">${emprestimo.prazo_restante != null ? emprestimo.prazo_restante : (emprestimo.prazo_meses - pagamentos.length)} meses</div>
                                </div>` : ''}
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Saúde do Empréstimo + Projeção -->
                ${emprestimo.status === 'ativo' ? (() => {
                    const saude = Calculos.calcularSaudeEmprestimo(emprestimo, pagamentos);
                    const media = pagamentos.length > 0
                        ? pagamentos.reduce((s, p) => s + Number(p.valor_pago || 0), 0) / pagamentos.length
                        : 0;
                    const proj = Calculos.calcularProjecaoQuitacao(
                        Number(emprestimo.saldo_devedor),
                        Number(emprestimo.taxa_mensal),
                        media
                    );
                    return `
                    <div style="display:grid;grid-template-columns:auto 1fr;gap:16px;margin-bottom:24px;">
                        <div class="card" style="padding:20px;display:flex;align-items:center;gap:16px;min-width:200px;">
                            <div class="saude-circulo" style="border-color:${saude.cor};color:${saude.cor};">${saude.pontos}</div>
                            <div>
                                <div class="saude-label" style="color:${saude.cor};">${saude.label}</div>
                                <div style="font-size:12px;color:var(--text-muted);margin-top:2px;">Saúde do Empréstimo</div>
                            </div>
                        </div>
                        ${proj ? `
                        <div class="projecao-card" style="margin-top:0;">
                            ${proj.alerta
                                ? `<strong style="color:var(--warning);">⚠ ${proj.alerta}</strong>`
                                : `<strong>📅 Projeção de Quitação:</strong> ${proj.meses} meses (${proj.data})<br>
                                   <span style="font-size:12px;">Baseado na média de pagamentos de ${formatarReais(media)}/mês.</span>`
                            }
                        </div>
                        ` : ''}
                    </div>
                    `;
                })() : ''}

                <!-- Abas -->
                <div style="display:flex;gap:16px;border-bottom:1px solid var(--border-subtle);margin-bottom:24px;overflow-x:auto;">
                    <button class="tab-btn tab-btn-active" onclick="TelaDetalheEmprestimo._switchTab('pagamentos', this)" style="white-space:nowrap;">Extrato de Pagamentos</button>
                    ${emprestimo.modalidade === 'price' ? `
                    <button class="tab-btn" onclick="TelaDetalheEmprestimo._switchTab('price', this)" style="white-space:nowrap;">Tabela Teórica (Price)</button>
                    ` : ''}
                    ${emprestimo.modalidade === 'sac' ? `
                    <button class="tab-btn" onclick="TelaDetalheEmprestimo._switchTab('sac', this)" style="white-space:nowrap;">Tabela Teórica (SAC)</button>
                    ` : ''}
                    ${historico.length > 0 ? `
                    <button class="tab-btn" onclick="TelaDetalheEmprestimo._switchTab('historico', this)" style="white-space:nowrap;">Histórico de Alterações</button>
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
                                    ${pagamentos.map(p => {
                                        const tl = { normal: { txt: 'Normal', cor: '#64748b' }, amortizacao: { txt: 'Amort.', cor: '#3b82f6' }, juros: { txt: 'Juros', cor: '#f59e0b' } }[p.tipo_pagamento || 'normal'];
                                        const badgeTipo = `<span style="background:${tl.cor}22;color:${tl.cor};border:1px solid ${tl.cor}44;border-radius:10px;padding:2px 7px;font-size:10px;font-weight:600;margin-left:6px">${tl.txt}</span>`;
                                        return `
                                        <tr>
                                            <td>${formatarData(p.data_pagamento)}</td>
                                            <td class="cell-money" style="font-weight:600;color:var(--green-400);">${formatarReais(p.valor_pago)}${badgeTipo}</td>
                                            <td class="cell-money" style="color:var(--text-secondary);">${formatarReais(p.valor_juros || 0)}</td>
                                            <td class="cell-money" style="color:var(--text-secondary);">${formatarReais(p.valor_amortizacao || 0)}</td>
                                            <td class="cell-money">${formatarReais(p.saldo_apos || 0)}</td>
                                            <td style="color:var(--text-secondary);">${p.observacoes || '—'}</td>
                                        </tr>
                                        `;
                                    }).join('')}
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

                <!-- Tabela Price / SAC / Histórico -->
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

                ${emprestimo.modalidade === 'sac' ? `
                <div id="tab-sac" style="display:none;">
                    <div class="table-container">
                        <div class="table-header">
                            <h3 class="table-title">Simulação de Amortização (Tabela SAC)</h3>
                            <p style="font-size:13px;color:var(--text-muted);font-weight:400;">
                                Valores teóricos projetados. Podem divergir caso pagamentos sejam antecipados ou atrasados.
                            </p>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Mês</th>
                                        <th class="col-right">Saldo Anterior</th>
                                        <th class="col-right">Amortização</th>
                                        <th class="col-right">Juros</th>
                                        <th class="col-right">Parcela</th>
                                        <th class="col-right">Saldo Final</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${Calculos.gerarTabelaSAC(emprestimo.valor_principal, emprestimo.taxa_mensal, emprestimo.prazo_meses).map(row => `
                                    <tr>
                                        <td style="font-weight:500;">${row.mes}</td>
                                        <td class="cell-money">${formatarReais(row.saldoAnterior)}</td>
                                        <td class="cell-money" style="color:var(--green-400);">${formatarReais(row.amortizacao)}</td>
                                        <td class="cell-money" style="color:var(--danger);">${formatarReais(row.juros)}</td>
                                        <td class="cell-money" style="font-weight:600;">${formatarReais(row.parcela)}</td>
                                        <td class="cell-money">${formatarReais(row.novoSaldo)}</td>
                                    </tr>
                                    `).join('')}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                ` : ''}

                ${historico.length > 0 ? `
                <div id="tab-historico" style="display:none;">
                    <div class="table-container">
                        <div class="table-header">
                            <h3 class="table-title">Histórico de Alterações</h3>
                        </div>
                        <div style="overflow-x:auto;">
                            <table class="data-table">
                                <thead>
                                    <tr>
                                        <th>Data/Hora</th>
                                        <th>Campo Alterado</th>
                                        <th>Valor Anterior</th>
                                        <th>Valor Novo</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    ${historico.map(h => `
                                    <tr>
                                        <td style="color:var(--text-secondary);">${new Date(h.created_at).toLocaleString('pt-BR')}</td>
                                        <td style="font-weight:500;">${h.campo_alterado}</td>
                                        <td style="color:var(--danger);text-decoration:line-through;">${h.valor_anterior || '—'}</td>
                                        <td style="color:var(--green-400);">${h.valor_novo || '—'}</td>
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
                        <button type="button" class="drawer-close" onclick="TelaDetalheEmprestimo._fecharDrawer()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <form id="form-pagamento" onsubmit="TelaDetalheEmprestimo._handleSalvarPagamento(event)" style="display:flex;flex-direction:column;flex:1;min-height:0;">
                        <div class="drawer-body" style="pointer-events: all;">
                            
                            <!-- SELEÇÃO DO TIPO DE PAGAMENTO -->
                            <div class="form-group" style="margin-bottom:16px;">
                                <label class="form-label" style="margin-bottom:8px; display:block;">Tipo de Pagamento</label>
                                <div class="tipo-pgto-grid">
                                    <label class="tipo-pgto-card">
                                        <input type="radio" name="tipo-pagamento" value="normal" checked onchange="TelaDetalheEmprestimo._atualizarTipoPagamento('normal')">
                                        <div class="tipo-pgto-inner">
                                            <span class="tipo-pgto-icone">💳</span>
                                            <span class="tipo-pgto-nome">Normal</span>
                                            <span class="tipo-pgto-desc">Juros + Amortização</span>
                                        </div>
                                    </label>
                                    <label class="tipo-pgto-card">
                                        <input type="radio" name="tipo-pagamento" value="amortizacao" onchange="TelaDetalheEmprestimo._atualizarTipoPagamento('amortizacao')">
                                        <div class="tipo-pgto-inner">
                                            <span class="tipo-pgto-icone">📉</span>
                                            <span class="tipo-pgto-nome">Só Amortização</span>
                                            <span class="tipo-pgto-desc">Reduz saldo direto</span>
                                        </div>
                                    </label>
                                    <label class="tipo-pgto-card">
                                        <input type="radio" name="tipo-pagamento" value="juros" onchange="TelaDetalheEmprestimo._atualizarTipoPagamento('juros')">
                                        <div class="tipo-pgto-inner">
                                            <span class="tipo-pgto-icone">💰</span>
                                            <span class="tipo-pgto-nome">Só Juros</span>
                                            <span class="tipo-pgto-desc">Saldo não muda</span>
                                        </div>
                                    </label>
                                </div>
                                <div class="tipo-pgto-aviso" id="aviso-tipo-pgto">
                                    <span id="texto-aviso-tipo">Valor será decomposto em juros e amortização automaticamente.</span>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Valor Recebido (R$) <span class="required">*</span></label>
                                <input type="number" id="pag-valor" class="form-input form-input-money"
                                    step="0.01" min="0.01" placeholder="0,00" required autocomplete="off"
                                    style="pointer-events: all !important; position: relative; z-index: 10;"
                                    oninput="TelaDetalheEmprestimo._atualizarPreview()">
                                <span class="campo-hint" id="hint-valor-pgto"></span>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Data do Pagamento <span class="required">*</span></label>
                                <input type="date" id="pag-data" class="form-input" value="${Datas.hojeISO()}" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Observações</label>
                                <textarea id="pag-obs" class="form-textarea" placeholder="Opcional. Ex: Parcela 01, Abatimento, etc." rows="2"></textarea>
                            </div>

                            <!-- Preview atualizado para suportar os novos tipos -->
                            <div class="preview-impacto" id="painel-previa" style="opacity:0.5; transition:opacity 0.2s;">
                                <div class="preview-titulo">
                                    <span>Preview de Impacto</span>
                                    <span class="preview-tipo-badge" id="preview-tipo-badge">Normal</span>
                                </div>

                                <div class="preview-linha">
                                    <span>Saldo Atual</span>
                                    <span id="prev-saldo-atual">${formatarReais(emprestimo.saldo_devedor)}</span>
                                </div>
                                <div class="preview-linha">
                                    <span id="label-prev-juros">Juros do Período</span>
                                    <span id="prev-juros">R$ 0,00</span>
                                </div>
                                <div class="preview-linha destaque-amort">
                                    <span>Amortização</span>
                                    <span id="prev-amort">R$ 0,00</span>
                                </div>
                                <div class="preview-separador"></div>
                                <div class="preview-linha destaque-saldo">
                                    <span>Novo Saldo</span>
                                    <span id="prev-saldo">R$ 0,00</span>
                                </div>
                                <div class="preview-linha destaque-economia" id="linha-economia" style="display:none">
                                    <span>Economia em juros futuros</span>
                                    <span id="prev-economia">R$ 0,00</span>
                                </div>

                                <div class="preview-alerta" id="preview-alerta" style="display:none">
                                    <span id="preview-alerta-texto"></span>
                                </div>
                                <!-- Content containers for _atualizarPreview -->
                                <div id="alerta-amortizacao-negativa" style="display:none;"></div>
                                <div id="alerta-inteligente" style="display:none;"></div>
                                <div id="prev-parcela-ideal-container"></div>
                            </div>
                        </div>
                        
                        <div class="drawer-footer">
                            <button type="button" class="btn btn-ghost" onclick="TelaDetalheEmprestimo._fecharDrawer()">Cancelar</button>
                            <button type="submit" class="btn btn-primary" id="btn-salvar-pag">Confirmar Pagamento</button>
                        </div>
                    </form>
                </div>
            </div>

            <!-- Drawer de Edição -->
            <div class="drawer-overlay" id="drawer-edicao" onclick="TelaDetalheEmprestimo._fecharDrawerEdicao(event)">
                <div class="drawer-panel" onclick="event.stopPropagation()">
                    <div class="drawer-header">
                        <h2 class="drawer-title">Editar Empréstimo</h2>
                        <button class="drawer-close" onclick="TelaDetalheEmprestimo._fecharDrawerEdicao()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <form id="form-edicao" onsubmit="TelaDetalheEmprestimo._handleSalvarEdicao(event)" style="display:flex;flex-direction:column;flex:1;overflow:hidden;">
                        <div class="drawer-body">
                            <div class="alert alert-warning" style="margin-bottom:16px;">
                                <div class="alert-icon">⚠️</div>
                                <div class="alert-content">
                                    <div class="alert-title">Alterações afetam próximos cálculos.</div>
                                    <div class="alert-description">O histórico de pagamentos e saldo devedor atual não serão alterados iterativamente.</div>
                                </div>
                            </div>
                            
                            <div class="form-group">
                                <label class="form-label" style="color:var(--text-muted);">Devedor (Não Editável)</label>
                                <input type="text" class="form-input" value="${devedorNome}" disabled>
                            </div>

                            <div class="form-group">
                                <label class="form-label" style="color:var(--text-muted);">Valor Original (Não Editável)</label>
                                <input type="text" class="form-input form-input-money" value="${formatarReais(emprestimo.valor_principal)}" disabled>
                            </div>

                            <div class="form-group">
                                <label class="form-label" style="color:var(--text-muted);">Data de Início (Não Editável)</label>
                                <input type="date" class="form-input" value="${emprestimo.data_inicio}" disabled>
                            </div>

                            <hr style="border:0;border-top:1px dashed var(--border-subtle);margin:24px 0;">

                            <div class="form-group">
                                <label class="form-label">Taxa Mensal (%) <span class="required">*</span></label>
                                <input type="number" id="edit-taxa" class="form-input form-input-money"
                                    step="0.01" min="0.01" max="99.99" value="${Number((emprestimo.taxa_mensal * 100).toFixed(2))}" required>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Modalidade <span class="required">*</span></label>
                                <select id="edit-modalidade" class="form-select" required onchange="TelaDetalheEmprestimo._toggleEditPrazo()">
                                    <option value="livre" ${emprestimo.modalidade === 'livre' ? 'selected' : ''}>Livre (Juros Simples)</option>
                                    <option value="price" ${emprestimo.modalidade === 'price' ? 'selected' : ''}>Price (Parcela Fixa)</option>
                                    <option value="sac" ${emprestimo.modalidade === 'sac' ? 'selected' : ''}>SAC (Amortização Fixa)</option>
                                </select>
                            </div>

                            <div class="form-group" id="edit-grupo-prazo" style="display:${emprestimo.modalidade !== 'livre' ? 'block' : 'none'};">
                                <label class="form-label">Prazo em Meses <span class="required">*</span></label>
                                <input type="number" id="edit-prazo" class="form-input" min="1" value="${emprestimo.prazo_meses || ''}" ${emprestimo.modalidade !== 'livre' ? 'required' : ''}>
                                <div style="font-size:11px;color:var(--text-muted);margin-top:4px;">Atenção: O prazo restante será calculado descontando as parcelas já pagas do prazo total.</div>
                            </div>

                            <div class="form-group">
                                <label class="form-label">Observações</label>
                                <textarea id="edit-obs" class="form-textarea" rows="2">${emprestimo.observacoes || ''}</textarea>
                            </div>
                        </div>
                        
                        <div class="drawer-footer">
                            <button type="button" class="btn btn-ghost" onclick="TelaDetalheEmprestimo._fecharDrawerEdicao()">Cancelar</button>
                            <button type="submit" class="btn btn-primary" id="btn-salvar-edicao">Salvar Alterações</button>
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
        ['price', 'sac', 'historico'].forEach(t => {
            const el = document.getElementById(`tab-${t}`);
            if (el) el.style.display = tabId === t ? 'block' : 'none';
        });
    },

    // ============================================
    // DRAWER DE PAGAMENTO
    // ============================================

    _abrirDrawerPagamento() {
        const drawer = document.getElementById('drawer-pagamento');
        if(drawer) {
            this._tipoPagamento = 'normal';
            this._atualizarTipoPagamento('normal');
            
            // Resetar form visualmente
            document.getElementById('pag-valor').value = '';
            document.getElementById('pag-obs').value = '';
            document.getElementById('pag-data').value = Datas.hojeISO();
            const rNormal = document.querySelector('input[name="tipo-pagamento"][value="normal"]');
            if (rNormal) rNormal.checked = true;
            
            drawer.classList.add('drawer-open');
            setTimeout(() => document.getElementById('pag-valor')?.focus(), 300);
            this._atualizarPreview();
        }
    },

    _fecharDrawer(event) {
        if (event && !event.target.classList.contains('drawer-overlay')) return;
        const drawer = document.getElementById('drawer-pagamento');
        if(drawer) drawer.classList.remove('drawer-open');
    },

    _atualizarTipoPagamento(tipo) {
        this._tipoPagamento = tipo;
        
        const avisoEl = document.getElementById('aviso-tipo-pgto');
        const textoEl = document.getElementById('texto-aviso-tipo');
        const hintEl  = document.getElementById('hint-valor-pgto');
        const badgeEl = document.getElementById('preview-tipo-badge');

        const saldo = Number(this._emprestimo.saldo_devedor);
        const taxa = Number(this._emprestimo.taxa_mensal);
        const jurosDevidos = saldo * taxa;

        const configs = {
            normal: {
                aviso: 'O valor será decomposto em juros e amortização automaticamente.',
                cor: 'var(--border-subtle)',
                badge: 'Normal',
                hint: `Juros devidos: ${formatarReais(jurosDevidos)}`
            },
            amortizacao: {
                aviso: '💡 O valor vai integralmente para reduzir o saldo devedor. Os juros continuam pendentes.',
                cor: '#3b82f6',
                badge: 'Só Amortização',
                hint: `Redução bruta do saldo: ${formatarReais(saldo)}`
            },
            juros: {
                aviso: '💡 Apenas os juros do período serão quitados. O saldo devedor não se altera.',
                cor: '#f59e0b',
                badge: 'Só Juros',
                hint: `Juros devidos: ${formatarReais(jurosDevidos)}`
            }
        };

        const c = configs[tipo];
        if (textoEl && avisoEl && hintEl && badgeEl) {
            textoEl.textContent = c.aviso;
            avisoEl.style.borderLeftColor = c.cor;
            badgeEl.textContent = c.badge;
            hintEl.textContent = c.hint;
        }

        this._atualizarPreview();
    },

    _atualizarPreview() {
        if (!this._emprestimo) return;

        const valorInput = document.getElementById('pag-valor');
        if(!valorInput) return;

        const valor = parseFloat(valorInput.value);
        const painel = document.getElementById('painel-previa');
        const elAlerta = document.getElementById('preview-alerta');
        const elTxtAl  = document.getElementById('preview-alerta-texto');
        const elEconomia = document.getElementById('linha-economia');

        if (!valor || valor <= 0) {
            painel.style.opacity = '0.5';
            document.getElementById('prev-juros').textContent = '—';
            document.getElementById('prev-amort').textContent = '—';
            document.getElementById('prev-saldo').textContent = '—';
            if(elAlerta) elAlerta.style.display = 'none';
            if(elEconomia) elEconomia.style.display = 'none';
            return;
        }

        painel.style.opacity = '1';

        const tipo = this._tipoPagamento;
        const saldoAtual = Number(this._emprestimo.saldo_devedor);
        const taxa = Number(this._emprestimo.taxa_mensal);
        const jurosDevidos = saldoAtual * taxa;

        let juros = 0, amort = 0, novoSaldo = saldoAtual, economia = 0;
        let alertaTipo = null, alertaMsg = '';

        if (tipo === 'normal') {
            if (this._emprestimo.modalidade === 'livre') {
                const dec = Calculos.calcularPagamentoLivre(saldoAtual, taxa, valor);
                juros = dec.juros; amort = dec.amortizacao; novoSaldo = dec.novoSaldo;
            } else if (this._emprestimo.modalidade === 'price') {
                const dec = Calculos.calcularParcelaPrice(saldoAtual, taxa, valor);
                juros = dec.juros; amort = dec.amortizacao; novoSaldo = dec.novoSaldo;
            } else if (this._emprestimo.modalidade === 'sac') {
                const numP = document.querySelectorAll('#tab-pagamentos tbody tr').length || 0;
                const pR = this._emprestimo.prazo_restante !== null ? this._emprestimo.prazo_restante : (this._emprestimo.prazo_meses - numP);
                const dec = Calculos.calcularPagamentoSAC(saldoAtual, taxa, valor, Math.max(1, pR));
                juros = dec.juros; amort = dec.amortizacao; novoSaldo = dec.novoSaldo;
            }

            if (valor < jurosDevidos) {
                alertaTipo = 'critico';
                alertaMsg = `⚠️ Valor abaixo dos juros. O saldo vai crescer ${formatarReais(Math.abs(amort))} neste mês.`;
            } else if (amort === 0) {
                alertaTipo = 'atencao';
                alertaMsg = `ℹ️ Pagamento cobre exatamente os juros. Saldo permanece em ${formatarReais(novoSaldo)}.`;
            } else if (novoSaldo <= 0) {
                alertaTipo = 'sucesso';
                alertaMsg = `🎉 Este pagamento quita o empréstimo!`;
            } else {
                alertaTipo = 'info';
                alertaMsg = `✓ Saldo reduzirá ${formatarReais(amort)} neste mês.`;
            }
        } else if (tipo === 'amortizacao') {
            juros = 0;
            amort = valor;
            novoSaldo = Math.max(0, saldoAtual - amort);
            economia = amort * taxa;

            if (novoSaldo <= 0) {
                alertaTipo = 'sucesso';
                alertaMsg = `🎉 Amortização quita o saldo total!`;
            } else {
                alertaTipo = 'info';
                alertaMsg = `✓ Saldo reduz ${formatarReais(amort)} sem quitar juros pendentes.`;
            }
        } else if (tipo === 'juros') {
            juros = Math.min(valor, jurosDevidos);
            amort = 0;
            novoSaldo = saldoAtual;

            if (valor > jurosDevidos) {
                alertaTipo = 'atencao';
                alertaMsg = `ℹ️ Excedente de ${formatarReais(valor - jurosDevidos)} será ignorado. Use Normal.`;
            } else if (valor < jurosDevidos) {
                alertaTipo = 'atencao';
                alertaMsg = `ℹ️ Juros parcialmente pagos. Falta ${formatarReais(jurosDevidos - valor)}.`;
            } else {
                alertaTipo = 'info';
                alertaMsg = `✓ Juros do período quitados. Saldo não foi alterado.`;
            }
        }

        document.getElementById('prev-juros').textContent = formatarReais(juros);
        document.getElementById('prev-amort').textContent = formatarReais(amort);
        document.getElementById('prev-saldo').textContent = formatarReais(novoSaldo);

        const amortSpan = document.getElementById('prev-amort');
        amortSpan.style.color = amort < 0 ? 'var(--danger)' : 'var(--green-400)';

        if (alertaMsg && elAlerta && elTxtAl) {
            elAlerta.style.display = 'block';
            elTxtAl.innerHTML = alertaMsg;
            elAlerta.className = 'preview-alerta alerta-' + alertaTipo;
        } else if (elAlerta) {
            elAlerta.style.display = 'none';
        }

        if (elEconomia) {
            if (tipo === 'amortizacao') {
                elEconomia.style.display = 'flex';
                document.getElementById('prev-economia').textContent = formatarReais(economia);
            } else {
                elEconomia.style.display = 'none';
            }
        }
        
        // Disable old intelligent alert display since we merged them
        const alertaInt = document.getElementById('alerta-inteligente');
        if (alertaInt) alertaInt.style.display = 'none';
    },

    async _handleSalvarPagamento(event) {
        event.preventDefault();

        const valor = parseFloat(document.getElementById('pag-valor').value);
        const data = document.getElementById('pag-data').value;
        const obs = document.getElementById('pag-obs').value.trim();
        const tipoPagamento = this._tipoPagamento;

        if (valor <= 0) {
            App.showToast('Informe o valor recebido.', 'error');
            return;
        }
        
        if (!data) {
            App.showToast('Data inválida.', 'error');
            return;
        }

        const saldoAtual = Number(this._emprestimo.saldo_devedor);
        const taxa = Number(this._emprestimo.taxa_mensal);
        const jurosDevidos = saldoAtual * taxa;
        
        let valorJuros, valorAmort, saldoApos, obsPrefix = '';

        if (tipoPagamento === 'normal') {
            if (this._emprestimo.modalidade === 'livre') {
                const dec = Calculos.calcularPagamentoLivre(saldoAtual, taxa, valor);
                valorJuros = dec.juros; valorAmort = dec.amortizacao; saldoApos = dec.novoSaldo;
            } else if (this._emprestimo.modalidade === 'price') {
                const dec = Calculos.calcularParcelaPrice(saldoAtual, taxa, valor);
                valorJuros = dec.juros; valorAmort = dec.amortizacao; saldoApos = dec.novoSaldo;
            } else if (this._emprestimo.modalidade === 'sac') {
                const numP = document.querySelectorAll('#tab-pagamentos tbody tr').length || 0;
                const pR = this._emprestimo.prazo_restante !== null ? this._emprestimo.prazo_restante : (this._emprestimo.prazo_meses - numP);
                const dec = Calculos.calcularPagamentoSAC(saldoAtual, taxa, valor, Math.max(1, pR));
                valorJuros = dec.juros; valorAmort = dec.amortizacao; saldoApos = dec.novoSaldo;
            }
            obsPrefix = '[Normal]';
        } else if (tipoPagamento === 'amortizacao') {
            valorJuros = 0;
            valorAmort = valor;
            saldoApos = Math.max(0, saldoAtual - valor);
            obsPrefix = '[Somente Amortização]';
        } else if (tipoPagamento === 'juros') {
            valorJuros = Math.min(valor, jurosDevidos);
            valorAmort = 0;
            saldoApos = saldoAtual;
            obsPrefix = '[Somente Juros]';
        }

        const btn = document.getElementById('btn-salvar-pag');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Registrando...';

        const obsFinal = [obsPrefix, obs || ''].filter(Boolean).join(' - ');

        const dados = {
            emprestimo_id: this._emprestimoId,
            valor_pago: valor,
            data_pagamento: data,
            observacoes: obsFinal,
            tipo_pagamento: tipoPagamento,
            valor_juros: valorJuros,
            valor_amortizacao: valorAmort,
            saldo_apos: saldoApos
        };

        try {
            const novo = await Pagamentos.registrar(dados);
            if (novo) {
                App.showToast(`Pagamento de ${formatarReais(valor)} registrado com sucesso!`, 'success');
                this._fecharDrawer();
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
    },

    // ============================================
    // DRAWER DE EDIÇÃO
    // ============================================

    _abrirDrawerEdicao() {
        const drawer = document.getElementById('drawer-edicao');
        if(drawer) drawer.classList.add('drawer-open');
    },

    _fecharDrawerEdicao(event) {
        if (event && !event.target.classList.contains('drawer-overlay')) return;
        const drawer = document.getElementById('drawer-edicao');
        if(drawer) drawer.classList.remove('drawer-open');
    },

    _toggleEditPrazo() {
        const mod = document.getElementById('edit-modalidade').value;
        const divPrazo = document.getElementById('edit-grupo-prazo');
        const inputPrazo = document.getElementById('edit-prazo');
        if (mod !== 'livre') {
            divPrazo.style.display = 'block';
            inputPrazo.required = true;
        } else {
            divPrazo.style.display = 'none';
            inputPrazo.required = false;
        }
    },

    async _handleSalvarEdicao(event) {
        event.preventDefault();

        const taxaNova = parseFloat(document.getElementById('edit-taxa').value) / 100;
        const modalidadeNova = document.getElementById('edit-modalidade').value;
        const prazoNovo = (modalidadeNova !== 'livre') ? parseInt(document.getElementById('edit-prazo').value) : null;
        const obsNova = document.getElementById('edit-obs').value.trim();

        if (taxaNova <= 0) { App.showToast('Taxa deve ser maior que zero.', 'error'); return; }
        if (modalidadeNova !== 'livre' && (!prazoNovo || prazoNovo <= 0)) { App.showToast('Prazo obrigatório para modalidade Price e SAC.', 'error'); return; }

        const btn = document.getElementById('btn-salvar-edicao');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;margin-right:8px;"></span> Salvando...';

        try {
            const { data: pagamentos } = await window.FinancierDB.from('pagamentos').select('id').eq('emprestimo_id', this._emprestimoId);
            const parcelasPagas = pagamentos?.length || 0;
            const prazoRestanteNovo = prazoNovo ? Math.max(0, prazoNovo - parcelasPagas) : null;

            const dadosSalvar = {
                taxa_mensal: taxaNova,
                modalidade: modalidadeNova,
                prazo_meses: prazoNovo,
                prazo_restante: prazoRestanteNovo,
                observacoes: obsNova || null
            };

            await this._registrarHistoricoEdicao(this._emprestimo, dadosSalvar);

            const erroAtualizar = await Emprestimos.atualizar(this._emprestimoId, dadosSalvar);
            if (!erroAtualizar) throw new Error('Erro ao atualizar. Retorno vazio.');

            App.showToast('Empréstimo atualizado com sucesso!', 'success');
            if (window.registrarAcao) window.registrarAcao('EMPRESTIMO_EDITADO');
            this._fecharDrawerEdicao();
            this.render(this._emprestimoId);
        } catch (err) {
            console.error(err);
            App.showToast('Falha ao salvar edição.', 'error');
            btn.disabled = false;
            btn.innerHTML = 'Salvar Alterações';
        }
    },

    async _registrarHistoricoEdicao(emprestimoAntigo, dadosNovos) {
        try {
            const authResponse = await window.FinancierDB.auth.getUser();
            const user = authResponse.data?.user;
            if(!user) return;
            const registros = [];

            const verificarEAdicionar = (chave, formatarAntigo, formatarNovo) => {
                if (String(emprestimoAntigo[chave] || '') !== String(dadosNovos[chave] || '')) {
                    registros.push({
                        user_id: user.id,
                        emprestimo_id: emprestimoAntigo.id,
                        campo_alterado: chave,
                        valor_anterior: formatarAntigo ? formatarAntigo(emprestimoAntigo[chave]) : String(emprestimoAntigo[chave] || ''),
                        valor_novo: formatarNovo ? formatarNovo(dadosNovos[chave]) : String(dadosNovos[chave] || '')
                    });
                }
            };

            verificarEAdicionar('taxa_mensal', Formatadores.formatarPercentual, Formatadores.formatarPercentual);
            verificarEAdicionar('modalidade');
            verificarEAdicionar('prazo_meses');
            verificarEAdicionar('prazo_restante');
            verificarEAdicionar('observacoes');

            if (registros.length > 0) {
                await window.FinancierDB.from('historico_edicoes').insert(registros);
            }
        } catch (e) {
            console.error('Erro salvo histórico de edições', e);
        }
    }
};

// Listener global para fechar modais com ESC
document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
        const drawerPagamento = document.getElementById('drawer-pagamento');
        if (drawerPagamento && drawerPagamento.classList.contains('drawer-open')) {
            TelaDetalheEmprestimo._fecharDrawer();
        }
        const drawerEdicao = document.getElementById('drawer-edicao');
        if (drawerEdicao && drawerEdicao.classList.contains('drawer-open')) {
            TelaDetalheEmprestimo._fecharDrawerEdicao();
        }
    }
});

window.TelaDetalheEmprestimo = TelaDetalheEmprestimo;
