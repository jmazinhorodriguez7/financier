// ============================================
// tela-pagamentos.js — Histórico de Pagamentos
// ============================================

const TelaPagamentos = {
    _pagamentos: [],

    async render() {
        const app = document.getElementById('conteudo-principal');
        app.innerHTML = this._renderSkeleton();

        try {
            this._pagamentos = await Pagamentos.listarTodos();
            app.innerHTML = this._renderTela();
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error('Erro ao carregar pagamentos:', err);
            App.showToast('Erro ao carregar o histórico de pagamentos.', 'error');
        }
    },

    _renderSkeleton() {
        return `
        <div class="content-wrapper">
            <div class="page-header" style="margin-bottom: 24px;">
                <div class="skeleton skeleton-title" style="width:250px; height:40px;"></div>
            </div>
            <div class="card">
                <div class="card-body">
                    ${Array(6).fill('<div class="skeleton skeleton-row"></div>').join('')}
                </div>
            </div>
        </div>`;
    },

    _renderTela() {
        return `
        <div class="content-wrapper">
            <div class="page-header" style="margin-bottom: 24px;">
                <h1 class="page-title">Histórico de Recebimentos</h1>
            </div>
            <div class="card">
                ${this._renderTabela()}
            </div>
        </div>`;
    },

    _renderTabela() {
        const lista = this._pagamentos;

        if (lista.length === 0) {
            return `
            <div class="table-empty" style="padding: 40px;">
                <div class="table-empty-icon">💸</div>
                <p class="table-empty-text">Nenhum pagamento registrado no momento.</p>
            </div>`;
        }

        const rows = lista.map(pg => {
            const nomeDevedor = pg.emprestimos?.devedores?.nome || 'Desconhecido';
            let badgeTipo = '';
            
            if (pg.tipo_pagamento === 'amortizacao') {
                badgeTipo = '<span class="badge-tipo badge-tipo-amort" title="Abateu diretamente do saldo">Amort.</span>';
            } else if (pg.tipo_pagamento === 'juros') {
                badgeTipo = '<span class="badge-tipo badge-tipo-juros" title="Pagou apenas os juros mensais">Juros</span>';
            } else if (pg.tipo_pagamento === 'normal' || !pg.tipo_pagamento) {
                badgeTipo = '<span class="badge-tipo badge-tipo-normal" title="Pagamento Misto">Normal</span>';
            }

            return `
            <tr class="clickable" onclick="window.location.hash='#/emprestimo/${pg.emprestimo_id}'">
                <td style="color:var(--text-secondary);">${formatarData(pg.data_pagamento)}</td>
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <span style="font-weight:500;">${nomeDevedor}</span>
                    </div>
                </td>
                <td class="cell-money" style="font-weight:600; color:var(--green-400);">+ ${formatarReais(pg.valor_pago)}</td>
                <td>${badgeTipo}</td>
                <td class="cell-money" style="color:var(--text-secondary);">${formatarReais(pg.valor_juros)}</td>
                <td class="cell-money" style="color:var(--text-secondary);">${formatarReais(pg.valor_amortizacao)}</td>
                <td class="cell-money" style="font-weight:600;">${formatarReais(pg.saldo_apos)}</td>
            </tr>`;
        }).join('');

        return `
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Data</th>
                        <th>Devedor</th>
                        <th class="col-right">Valor Recebido</th>
                        <th>Modalidade</th>
                        <th class="col-right">Juros Pagos</th>
                        <th class="col-right">Amortizado</th>
                        <th class="col-right">Saldo Restante</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    }
};

window.TelaPagamentos = TelaPagamentos;
