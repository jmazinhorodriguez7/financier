// ============================================
// tela-emprestimos.js — Lista de Empréstimos
// ============================================

const TelaEmprestimos = {
    _emprestimos: [],
    _ordenacao: { coluna: 'data_inicio', direcao: 'desc' },

    async render() {
        const app = document.getElementById('conteudo-principal');
        app.innerHTML = this._renderSkeleton();

        try {
            this._emprestimos = await Emprestimos.listarTodos();
            app.innerHTML = this._renderTela();
            if (window.lucide) window.lucide.createIcons();
        } catch (err) {
            console.error('Erro ao carregar empréstimos:', err);
            App.showToast('Erro ao carregar a lista de empréstimos.', 'error');
        }
    },

    _renderSkeleton() {
        return `
        <div class="content-wrapper">
            <div class="page-header" style="margin-bottom: 24px;">
                <div class="skeleton skeleton-title" style="width:200px; height:40px;"></div>
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
            <div class="page-header" style="display:flex; justify-content:space-between; align-items:center; margin-bottom: 24px;">
                <h1 class="page-title">Todos os Empréstimos</h1>
                <a href="#/novo-emprestimo" class="btn btn-primary">
                    <i data-lucide="plus" style="width:16px;height:16px;"></i> Novo Empréstimo
                </a>
            </div>
            <div class="card">
                ${this._renderTabela()}
            </div>
        </div>`;
    },

    _renderTabela() {
        const lista = this._ordenarDados(this._emprestimos);

        if (lista.length === 0) {
            return `
            <div class="table-empty" style="padding: 40px;">
                <div class="table-empty-icon">📁</div>
                <p class="table-empty-text">Nenhum empréstimo cadastrado.</p>
            </div>`;
        }

        const seta = (col) => {
            if (this._ordenacao.coluna !== col) return '';
            return this._ordenacao.direcao === 'asc' ? ' ↑' : ' ↓';
        };

        const rows = lista.map(emp => {
            const nomeDevedor = emp.devedores?.nome || 'Desconhecido';
            const badge = emp.status === 'ativo'
                ? '<span class="badge badge-green">Ativo</span>'
                : '<span class="badge badge-gray">Quitado</span>';

            return `
            <tr class="clickable" onclick="window.location.hash='#/emprestimo/${emp.id}'">
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="sidebar__avatar" style="width:32px;height:32px;font-size:12px;">${Formatadores.obterInicial(nomeDevedor)}</div>
                        <span style="font-weight:500;">${nomeDevedor}</span>
                    </div>
                </td>
                <td style="color:var(--text-secondary);">${formatarData(emp.data_inicio)}</td>
                <td class="cell-money">${formatarReais(emp.valor_principal)}</td>
                <td class="cell-money" style="font-weight:600;">${formatarReais(emp.saldo_devedor)}</td>
                <td>${formatarPercentual(emp.taxa_mensal)}</td>
                <td>${badge}</td>
            </tr>`;
        }).join('');

        return `
        <div style="overflow-x:auto;">
            <table class="data-table">
                <thead>
                    <tr>
                        <th class="sortable" onclick="TelaEmprestimos.ordenar('devedor')">Devedor${seta('devedor')}</th>
                        <th class="sortable" onclick="TelaEmprestimos.ordenar('data_inicio')">Início${seta('data_inicio')}</th>
                        <th class="sortable col-right" onclick="TelaEmprestimos.ordenar('valor_principal')">Valor Original${seta('valor_principal')}</th>
                        <th class="sortable col-right" onclick="TelaEmprestimos.ordenar('saldo_devedor')">Saldo Atual${seta('saldo_devedor')}</th>
                        <th class="sortable" onclick="TelaEmprestimos.ordenar('taxa_mensal')">Taxa${seta('taxa_mensal')}</th>
                        <th class="sortable" onclick="TelaEmprestimos.ordenar('status')">Status${seta('status')}</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    },

    ordenar(coluna) {
        if (this._ordenacao.coluna === coluna) {
            this._ordenacao.direcao = this._ordenacao.direcao === 'asc' ? 'desc' : 'asc';
        } else {
            this._ordenacao.coluna = coluna;
            this._ordenacao.direcao = 'asc';
        }
        const app = document.getElementById('conteudo-principal');
        app.innerHTML = this._renderTela();
        if (window.lucide) window.lucide.createIcons();
    },

    _ordenarDados(lista) {
        const col = this._ordenacao.coluna;
        const dir = this._ordenacao.direcao;
        const mult = dir === 'asc' ? 1 : -1;

        return [...lista].sort((a, b) => {
            let va, vb;
            switch (col) {
                case 'devedor':
                    va = a.devedores?.nome || '';
                    vb = b.devedores?.nome || '';
                    return mult * va.localeCompare(vb, 'pt-BR');
                case 'data_inicio':
                    va = new Date(a.data_inicio || 0).getTime();
                    vb = new Date(b.data_inicio || 0).getTime();
                    return mult * (va - vb);
                case 'valor_principal':
                case 'saldo_devedor':
                case 'taxa_mensal':
                    va = Number(a[col] || 0);
                    vb = Number(b[col] || 0);
                    return mult * (va - vb);
                case 'status':
                    va = a.status || '';
                    vb = b.status || '';
                    return mult * va.localeCompare(vb, 'pt-BR');
                default:
                    return 0;
            }
        });
    }
};

window.TelaEmprestimos = TelaEmprestimos;
