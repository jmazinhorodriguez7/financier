// ============================================================
// Tela Devedores — Lista + Busca + Novo Devedor
// ============================================================

const TelaDevedores = {
    _devedores: [],
    _filtro: '',

    async render() {
        const app = document.getElementById('conteudo-principal');
        app.innerHTML = this._renderSkeleton();

        try {
            const devedores = await Devedores.listar();

            // Enriquece com dados de empréstimos
            for (const d of devedores) {
                try {
                    const emps = await Emprestimos.listarPorDevedor(d.id);
                    const ativos = emps.filter(e => e.status === 'ativo');
                    d._empAtivos = ativos.length;
                    d._totalDevido = ativos.reduce((s, e) => s + Number(e.saldo_devedor || 0), 0);
                } catch {
                    d._empAtivos = 0;
                    d._totalDevido = 0;
                }
            }

            this._devedores = devedores;
            this._renderConteudo();
        } catch (err) {
            console.error('Erro ao carregar devedores:', err);
            app.innerHTML = `
                <div class="content-wrapper">
                    <div class="table-empty" style="padding:80px 24px;">
                        <div class="table-empty-icon">⚠️</div>
                        <p class="table-empty-text">Erro ao carregar devedores</p>
                        <button class="btn btn-primary btn-sm" onclick="TelaDevedores.render()" style="margin-top:16px;">Tentar novamente</button>
                    </div>
                </div>`;
        }
    },

    _renderConteudo() {
        const app = document.getElementById('conteudo-principal');
        const filtrados = this._devedores.filter(d =>
            d.nome.toLowerCase().includes(this._filtro.toLowerCase()) ||
            (d.contato && d.contato.toLowerCase().includes(this._filtro.toLowerCase()))
        );

        app.innerHTML = `
        <div class="content-wrapper">
            <div class="page-header">
                <div style="display:flex;align-items:center;gap:16px;">
                    <div class="search-box">
                        <i data-lucide="search" style="width:18px;height:18px;color:var(--text-muted);position:absolute;left:14px;top:50%;transform:translateY(-50%);pointer-events:none;"></i>
                        <input type="text" id="busca-devedor" class="form-input"
                            style="padding-left:42px;width:320px;height:40px;"
                            placeholder="Buscar devedor..."
                            value="${this._filtro}"
                            oninput="TelaDevedores._handleBusca(this.value)">
                    </div>
                </div>
                <button class="btn btn-primary" onclick="TelaDevedores._abrirModalNovo()">
                    <i data-lucide="plus" style="width:18px;height:18px;"></i>
                    Novo Devedor
                </button>
            </div>

            ${filtrados.length > 0 ? this._renderTabela(filtrados) : this._renderVazio()}

            <!-- Modal Novo Devedor -->
            ${this._renderModalNovo()}
            ${this._renderModalEditar()}
        </div>`;

        if (window.lucide) window.lucide.createIcons();
        // Foco no campo busca
        setTimeout(() => document.getElementById('busca-devedor')?.focus(), 100);
    },

    _renderTabela(devedores) {
        const rows = devedores.map(d => `
            <tr class="clickable" onclick="window.location.hash='#/devedor/${d.id}'">
                <td>
                    <div style="display:flex;align-items:center;gap:10px;">
                        <div class="sidebar__avatar" style="width:32px;height:32px;font-size:12px;">${Formatadores.obterInicial(d.nome)}</div>
                        <span style="font-weight:500;">${d.nome}</span>
                    </div>
                </td>
                <td style="color:var(--text-secondary);">${d.contato || '—'}</td>
                <td style="text-align:center;">${d._empAtivos}</td>
                <td class="cell-money">${formatarReais(d._totalDevido)}</td>
                <td>
                    <div style="display:flex;gap:8px;" onclick="event.stopPropagation()">
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="TelaDevedores._abrirModalEditar('${d.id}')" title="Editar">
                            <i data-lucide="pencil" style="width:16px;height:16px;"></i>
                        </button>
                        <button class="btn btn-ghost btn-sm btn-icon" onclick="window.location.hash='#/devedor/${d.id}'" title="Ver perfil">
                            <i data-lucide="eye" style="width:16px;height:16px;"></i>
                        </button>
                    </div>
                </td>
            </tr>`).join('');

        return `
        <div class="table-container">
            <table class="data-table">
                <thead>
                    <tr>
                        <th>Nome</th>
                        <th>Contato</th>
                        <th style="text-align:center;">Emp. Ativos</th>
                        <th class="col-right">Total Devido</th>
                        <th style="width:100px;">Ações</th>
                    </tr>
                </thead>
                <tbody>${rows}</tbody>
            </table>
        </div>`;
    },

    _renderVazio() {
        const msg = this._filtro
            ? 'Nenhum devedor encontrado para esta busca.'
            : 'Você ainda não cadastrou devedores.';
        return `
        <div class="table-container">
            <div class="table-empty">
                <div class="table-empty-icon">👥</div>
                <p class="table-empty-text">${msg}</p>
            </div>
        </div>`;
    },

    _renderModalNovo() {
        return `
        <div id="modal-novo-devedor" class="modal-overlay hidden" onclick="TelaDevedores._fecharModal(event, 'modal-novo-devedor')">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Novo Devedor</h3>
                    <button class="modal-close" onclick="document.getElementById('modal-novo-devedor').classList.add('hidden')">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="form-novo-devedor" onsubmit="TelaDevedores._handleSalvarNovo(event)">
                        <div class="form-group">
                            <label class="form-label">Nome <span class="required">*</span></label>
                            <input type="text" id="dev-nome" class="form-input" placeholder="Nome completo" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contato</label>
                            <input type="text" id="dev-contato" class="form-input" placeholder="Telefone ou email">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Observações</label>
                            <textarea id="dev-obs" class="form-textarea" placeholder="Informações adicionais" rows="3"></textarea>
                        </div>
                        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
                            <button type="button" class="btn btn-ghost" onclick="document.getElementById('modal-novo-devedor').classList.add('hidden')">Cancelar</button>
                            <button type="submit" class="btn btn-primary" id="btn-salvar-devedor">Salvar</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
    },

    _renderModalEditar() {
        return `
        <div id="modal-editar-devedor" class="modal-overlay hidden" onclick="TelaDevedores._fecharModal(event, 'modal-editar-devedor')">
            <div class="modal" onclick="event.stopPropagation()">
                <div class="modal-header">
                    <h3 class="modal-title">Editar Devedor</h3>
                    <button class="modal-close" onclick="document.getElementById('modal-editar-devedor').classList.add('hidden')">
                        <i data-lucide="x"></i>
                    </button>
                </div>
                <div class="modal-body">
                    <form id="form-editar-devedor" onsubmit="TelaDevedores._handleSalvarEditar(event)">
                        <input type="hidden" id="edit-id">
                        <div class="form-group">
                            <label class="form-label">Nome <span class="required">*</span></label>
                            <input type="text" id="edit-nome" class="form-input" required>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Contato</label>
                            <input type="text" id="edit-contato" class="form-input">
                        </div>
                        <div class="form-group">
                            <label class="form-label">Observações</label>
                            <textarea id="edit-obs" class="form-textarea" rows="3"></textarea>
                        </div>
                        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:8px;">
                            <button type="button" class="btn btn-ghost" onclick="document.getElementById('modal-editar-devedor').classList.add('hidden')">Cancelar</button>
                            <button type="submit" class="btn btn-primary">Salvar Alterações</button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;
    },

    _renderSkeleton() {
        return `
        <div class="content-wrapper">
            <div class="page-header">
                <div class="skeleton skeleton-title" style="width:320px;height:40px;"></div>
                <div class="skeleton" style="width:150px;height:44px;border-radius:8px;"></div>
            </div>
            <div class="table-container">
                ${Array(6).fill('<div class="skeleton skeleton-row"></div>').join('')}
            </div>
        </div>`;
    },

    // == Handlers ==

    _handleBusca(valor) {
        this._filtro = valor;
        this._renderConteudo();
    },

    _abrirModalNovo() {
        document.getElementById('modal-novo-devedor').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => document.getElementById('dev-nome')?.focus(), 200);
    },

    async _abrirModalEditar(id) {
        const d = this._devedores.find(x => x.id === id);
        if (!d) return;
        document.getElementById('edit-id').value = d.id;
        document.getElementById('edit-nome').value = d.nome;
        document.getElementById('edit-contato').value = d.contato || '';
        document.getElementById('edit-obs').value = d.observacoes || '';
        document.getElementById('modal-editar-devedor').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
    },

    _fecharModal(event, modalId) {
        if (event.target.classList.contains('modal-overlay')) {
            document.getElementById(modalId).classList.add('hidden');
        }
    },

    async _handleSalvarNovo(event) {
        event.preventDefault();
        const nome = document.getElementById('dev-nome').value.trim();
        const contato = document.getElementById('dev-contato').value.trim();
        const observacoes = document.getElementById('dev-obs').value.trim();

        if (!nome) {
            App.showToast('O nome é obrigatório.', 'error');
            return;
        }

        const resultado = await Devedores.criar({ nome, contato: contato || null, observacoes: observacoes || null });
        if (resultado) {
            document.getElementById('modal-novo-devedor').classList.add('hidden');
            App.showToast('Devedor cadastrado com sucesso!', 'success');
            this.render();
        } else {
            App.showToast('Erro ao cadastrar devedor.', 'error');
        }
    },

    async _handleSalvarEditar(event) {
        event.preventDefault();
        const id = document.getElementById('edit-id').value;
        const nome = document.getElementById('edit-nome').value.trim();
        const contato = document.getElementById('edit-contato').value.trim();
        const observacoes = document.getElementById('edit-obs').value.trim();

        if (!nome) {
            App.showToast('O nome é obrigatório.', 'error');
            return;
        }

        const resultado = await Devedores.atualizar(id, { nome, contato: contato || null, observacoes: observacoes || null });
        if (resultado) {
            document.getElementById('modal-editar-devedor').classList.add('hidden');
            App.showToast('Devedor atualizado!', 'success');
            this.render();
        } else {
            App.showToast('Erro ao atualizar.', 'error');
        }
    }
};

window.TelaDevedores = TelaDevedores;
