// ============================================================
// Tela Perfil Devedor — Header + Empréstimos + Pagamentos
// ============================================================

const TelaPerfilDevedor = {
    _devedorId: null,
    _devedor: null,

    async render(id) {
        this._devedorId = id;
        const app = document.getElementById('conteudo-principal');
        app.innerHTML = `
        <div class="content-wrapper">
            <div class="kpi-grid" style="grid-template-columns:1fr;">
                <div class="skeleton skeleton-card" style="height:120px;"></div>
            </div>
            <div class="table-container">
                ${Array(4).fill('<div class="skeleton skeleton-row"></div>').join('')}
            </div>
        </div>`;

        try {
            const [devedor, emprestimos] = await Promise.all([
                Devedores.buscarPorId(id),
                Emprestimos.listarPorDevedor(id)
            ]);

            if (!devedor) {
                App.showToast('Devedor não encontrado.', 'error');
                window.location.hash = '#/devedores';
                return;
            }

            this._devedor = devedor;

            const ativos = emprestimos.filter(e => e.status === 'ativo');
            const totalDevido = ativos.reduce((s, e) => s + Number(e.saldo_devedor || 0), 0);

            // Busca últimos 5 pagamentos
            let pagRecentes = [];
            try {
                const { data } = await window.FinancierDB
                    .from('pagamentos')
                    .select('*, emprestimos!inner(devedor_id)')
                    .eq('emprestimos.devedor_id', id)
                    .order('data_pagamento', { ascending: false })
                    .limit(5);
                pagRecentes = data || [];
            } catch { /* silently fail */ }

            app.innerHTML = `
            <div class="content-wrapper">
                <!-- Header com voltar -->
                <div class="page-header">
                    <div style="display:flex;align-items:center;gap:12px;">
                        <button class="btn btn-ghost btn-icon" onclick="window.location.hash='#/devedores'" title="Voltar">
                            <i data-lucide="arrow-left"></i>
                        </button>
                        <div>
                            <h1 class="page-title" style="margin-bottom:0;">${devedor.nome}</h1>
                            <p class="page-subtitle">${devedor.contato || 'Sem contato cadastrado'}</p>
                        </div>
                    </div>
                    <div class="page-actions">
                        <button class="btn btn-primary" onclick="window.location.hash='#/novo-emprestimo/${id}'">
                            <i data-lucide="plus" style="width:18px;height:18px;"></i>
                            Novo Empréstimo
                        </button>
                        <button class="btn btn-danger btn-sm" onclick="TelaPerfilDevedor._handleExcluir()" title="Excluir devedor">
                            <i data-lucide="trash-2" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </div>

                <!-- Resumo KPI -->
                <div class="kpi-grid" style="grid-template-columns:repeat(3,1fr);margin-bottom:32px;">
                    <div class="kpi-card">
                        <div class="kpi-label">Total Devido</div>
                        <div class="kpi-value" style="color:var(--green-400);">${formatarReais(totalDevido)}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Empréstimos Ativos</div>
                        <div class="kpi-value">${ativos.length}</div>
                    </div>
                    <div class="kpi-card">
                        <div class="kpi-label">Total de Empréstimos</div>
                        <div class="kpi-value">${emprestimos.length}</div>
                    </div>
                </div>

                <!-- Tabela de Empréstimos -->
                <div class="table-container" style="margin-bottom:24px;">
                    <div class="table-header">
                        <h3 class="table-title">Empréstimos</h3>
                    </div>
                    ${emprestimos.length > 0 ? `
                    <div style="overflow-x:auto;">
                        <table class="data-table">
                            <thead>
                                <tr>
                                    <th>Valor Original</th>
                                    <th>Taxa</th>
                                    <th>Data Início</th>
                                    <th class="col-right">Saldo Devedor</th>
                                    <th>Status</th>
                                    <th style="width:80px;">Ações</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${emprestimos.map(emp => {
                                    const statusClass = emp.status === 'ativo' ? 'badge-green' : emp.status === 'quitado' ? 'badge-gray' : 'badge-yellow';
                                    const statusText = emp.status === 'ativo' ? 'Ativo' : emp.status === 'quitado' ? 'Quitado' : 'Renegociado';
                                    return `
                                    <tr class="clickable" onclick="window.location.hash='#/emprestimo/${emp.id}'">
                                        <td class="cell-money" style="font-weight:500;">${formatarReais(emp.valor_principal)}</td>
                                        <td>${formatarPercentual(emp.taxa_mensal)}</td>
                                        <td>${formatarData(emp.data_inicio)}</td>
                                        <td class="cell-money" style="font-weight:600;">${formatarReais(emp.saldo_devedor)}</td>
                                        <td><span class="badge ${statusClass}">${statusText}</span></td>
                                        <td onclick="event.stopPropagation()">
                                            <button class="btn btn-ghost btn-sm btn-icon" onclick="window.location.hash='#/emprestimo/${emp.id}'" title="Ver detalhes">
                                                <i data-lucide="eye" style="width:16px;height:16px;"></i>
                                            </button>
                                        </td>
                                    </tr>`;
                                }).join('')}
                            </tbody>
                        </table>
                    </div>
                    ` : `
                    <div class="table-empty">
                        <div class="table-empty-icon">📋</div>
                        <p class="table-empty-text">Nenhum empréstimo registrado</p>
                    </div>
                    `}
                </div>

                <!-- Pagamentos Recentes -->
                <div class="card">
                    <div class="card-header">
                        <h4 style="font-size:15px;font-weight:600;">Pagamentos Recentes</h4>
                    </div>
                    <div class="card-body" style="padding:12px 16px;">
                        ${pagRecentes.length > 0 ? pagRecentes.map(pg => `
                        <div class="recent-item">
                            <div class="recent-info">
                                <div class="recent-name">${formatarData(pg.data_pagamento)}</div>
                                <div class="recent-date">${pg.observacoes || 'Pagamento'}</div>
                            </div>
                            <div class="recent-value text-money">${formatarReais(pg.valor_pago)}</div>
                        </div>
                        `).join('') : `
                        <p style="color:var(--text-muted);font-size:13px;text-align:center;padding:24px 0;">Nenhum pagamento registrado</p>
                        `}
                    </div>
                </div>
            </div>`;

            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error('Erro ao carregar perfil devedor:', err);
            App.showToast('Erro ao carregar dados do devedor.', 'error');
        }
    },

    async _handleExcluir() {
        if (!confirm('Tem certeza que deseja excluir este devedor?\nEmpréstimos vinculados também serão excluídos.')) return;

        const sucesso = await Devedores.excluir(this._devedorId);
        if (sucesso) {
            App.showToast('Devedor excluído.', 'success');
            window.location.hash = '#/devedores';
        } else {
            App.showToast('Erro ao excluir. O devedor pode ter empréstimos vinculados.', 'error');
        }
    }
};

window.TelaPerfilDevedor = TelaPerfilDevedor;
