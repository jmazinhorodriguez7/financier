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
            // Nova query completa para devedores, empréstimos e pagamentos
            const { data: devedores, error } = await window.FinancierDB
                .from('devedores')
                .select(`
                    id,
                    nome,
                    contato,
                    created_at,
                    emprestimos (
                        id,
                        valor_principal,
                        saldo_devedor,
                        taxa_mensal,
                        data_inicio,
                        prazo_meses,
                        modalidade,
                        status,
                        pagamentos (
                            data_pagamento,
                            valor_pago,
                            valor_juros,
                            valor_amortizacao,
                            saldo_apos
                        )
                    )
                `)
                .order('nome', { ascending: true });

            if (error) throw error;

            this._devedores = devedores || [];
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

            ${filtrados.length > 0 ? this._renderListaCards(filtrados) : this._renderVazio()}

            <!-- Rodapé com Totais -->
            ${filtrados.length > 0 ? this._renderRodape(filtrados) : ''}

            <!-- Modal Novo Devedor -->
            ${this._renderModalNovo()}
            ${this._renderModalEditar()}
        </div>`;

        if (window.lucide) window.lucide.createIcons();
        // Foco no campo busca
        setTimeout(() => document.getElementById('busca-devedor')?.focus(), 100);
    },

    _renderListaCards(devedores) {
        const fmt = v => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL'
        }).format(v || 0);

        const cards = devedores.map(dev => {
            const proxParcela = this._calcularProximaParcelaDevedor(dev);
            const temAtivo = proxParcela.qtdEmprestimosAtivos > 0;

            return `
            <div class="devedor-card" onclick="window.location.hash='#/devedor/${dev.id}'">
                <div class="devedor-info">
                    <div class="devedor-avatar">
                        ${Formatadores.obterInicial(dev.nome)}
                    </div>
                    <div>
                        <span class="devedor-nome">${dev.nome}</span>
                        <span class="devedor-contato">${dev.contato || '—'}</span>
                    </div>
                </div>

                ${temAtivo ? `
                    <div class="devedor-proxima-parcela">
                        <div class="proxparcela-valor">
                            ${fmt(proxParcela.valor)}
                        </div>
                        <div class="proxparcela-info">
                            <span class="proxparcela-data">
                                📅 ${proxParcela.dataFormatada}
                            </span>
                            <span class="proxparcela-badge"
                                style="background:${proxParcela.cor}22;
                                       color:${proxParcela.cor};
                                       border:1px solid ${proxParcela.cor}55">
                                ${proxParcela.label}
                            </span>
                        </div>
                        ${proxParcela.qtdEmprestimosAtivos > 1 ? `
                            <span class="proxparcela-multi">
                                Soma de ${proxParcela.qtdEmprestimosAtivos} empréstimos ativos
                            </span>
                        ` : ''}
                    </div>
                ` : `
                    <div class="devedor-proxima-parcela inativo">
                        <span class="proxparcela-vazio">Sem empréstimos ativos</span>
                    </div>
                `}
            </div>`;
        }).join('');

        return `<div class="devedor-card-container">${cards}</div>`;
    },

    _renderRodape(devedores) {
        const fmt = v => new Intl.NumberFormat('pt-BR', {
            style: 'currency', currency: 'BRL'
        }).format(v || 0);

        // Calcular total geral das próximas parcelas
        const totalTodasParcelas = devedores.reduce((acc, dev) => {
            const p = this._calcularProximaParcelaDevedor(dev);
            return acc + p.valor;
        }, 0);

        const qtdAtrasados = devedores.filter(dev => {
            const p = this._calcularProximaParcelaDevedor(dev);
            return p.status === 'atrasado';
        }).length;

        return `
        <div class="devedores-rodape">
            <div class="rodape-info">
                <span>${devedores.length} devedor(es)</span>
                ${qtdAtrasados > 0 ? `
                    <span style="color:#ef4444; font-weight:600;">
                        ${qtdAtrasados} em atraso
                    </span>
                ` : ''}
            </div>
            <div class="rodape-total">
                <span class="rodape-total-label">Total próximas parcelas</span>
                <span class="rodape-total-valor">${fmt(totalTodasParcelas)}</span>
            </div>
        </div>`;
    },

    _calcularProximaParcelaDevedor(devedor) {
        // Pegar apenas empréstimos ativos
        const ativos = (devedor.emprestimos || [])
            .filter(e => e.status === 'ativo');

        if (ativos.length === 0) {
            return {
                valor: 0,
                data: null,
                status: 'sem-emprestimo',
                label: 'Sem ativos',
                cor: '#64748b',
                qtdEmprestimosAtivos: 0
            };
        }

        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);

        let totalProximaParcela = 0;
        let datasMaisProximas = [];

        ativos.forEach(emp => {
            const pagamentos = (emp.pagamentos || []).sort(
                (a, b) => new Date(b.data_pagamento) - new Date(a.data_pagamento)
            );
            const ultimo = pagamentos[0];

            // Calcular data do próximo vencimento
            const base = ultimo
                ? new Date(ultimo.data_pagamento + 'T00:00:00')
                : new Date(emp.data_inicio + 'T00:00:00');
            const proxVenc = new Date(base);
            proxVenc.setDate(proxVenc.getDate() + 30);
            proxVenc.setHours(0, 0, 0, 0);

            datasMaisProximas.push(proxVenc);

            // Calcular valor estimado da parcela conforme modalidade
            const taxa = Number(emp.taxa_mensal || 0);
            const saldo = Number(emp.saldo_devedor || 0);
            const juros = Math.round(saldo * taxa * 100) / 100;

            let valorParcela = 0;

            if (emp.modalidade === 'price' && emp.prazo_meses) {
                const n = Number(emp.prazo_meses);
                const pmt = (saldo * taxa * Math.pow(1 + taxa, n)) / (Math.pow(1 + taxa, n) - 1);
                valorParcela = Math.round(pmt * 100) / 100;
            } else if (emp.modalidade === 'sac' && emp.prazo_meses) {
                const pgtosFeit = pagamentos.length;
                const prazoRest = Number(emp.prazo_meses) - pgtosFeit;
                const amort = prazoRest > 0 ? Math.round((saldo / prazoRest) * 100) / 100 : saldo;
                valorParcela = Math.round((amort + juros) * 100) / 100;
            } else {
                valorParcela = juros;
            }

            totalProximaParcela += valorParcela;
        });

        const dataMaisProxima = datasMaisProximas.sort((a, b) => a - b)[0];

        const diffDias = Math.floor((dataMaisProxima - hoje) / (1000 * 60 * 60 * 24));

        let status, label, cor;

        if (diffDias < 0) {
            status = 'atrasado';
            label = `${Math.abs(diffDias)}d em atraso`;
            cor = '#ef4444';
        } else if (diffDias === 0) {
            status = 'hoje';
            label = 'Vence hoje';
            cor = '#f59e0b';
        } else if (diffDias <= 7) {
            status = 'breve';
            label = `Vence em ${diffDias}d`;
            cor = '#eab308';
        } else {
            status = 'normal';
            label = `Em ${diffDias} dias`;
            cor = '#22c55e';
        }

        return {
            valor: Math.round(totalProximaParcela * 100) / 100,
            data: dataMaisProxima,
            dataFormatada: dataMaisProxima.toLocaleDateString('pt-BR'),
            diffDias,
            status,
            label,
            cor,
            qtdEmprestimosAtivos: ativos.length
        };
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
