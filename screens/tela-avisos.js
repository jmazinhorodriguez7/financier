// ============================================
// Tela Avisos
// ============================================

const TelaAvisos = {
    _alertasCache: [],
    _filtroAtual: 'todos', // 'todos', 'atrasados', 'proximos', 'recentes'

    async render() {
        const app = document.getElementById('conteudo-principal');
        
        app.innerHTML = `
        <div class="content-wrapper">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Central de Avisos</h1>
                    <p class="page-subtitle">Acompanhe alertas importantes sobre vencimentos, atrasos e recebimentos.</p>
                </div>
                <div class="page-actions">
                    <button class="btn btn-outline" onclick="TelaAvisos.marcarTodosLidos()">
                        <i data-lucide="check-square" style="width:16px;height:16px;margin-right:8px;"></i>
                        Marcar todos como lidos
                    </button>
                </div>
            </div>

            <!-- Filtros -->
            <div class="alert-filters">
                <button class="alert-filter-btn active" data-filter="todos" onclick="TelaAvisos.setFiltro('todos', this)">Todos</button>
                <button class="alert-filter-btn" data-filter="atrasados" onclick="TelaAvisos.setFiltro('atrasados', this)">Atrasados</button>
                <button class="alert-filter-btn" data-filter="proximos" onclick="TelaAvisos.setFiltro('proximos', this)">Próximos do Vencimento</button>
                <button class="alert-filter-btn" data-filter="recentes" onclick="TelaAvisos.setFiltro('recentes', this)">Movimentação Recente</button>
            </div>

            <!-- Lista -->
            <div id="alertas-lista">
                ${Array(4).fill('<div class="skeleton skeleton-card" style="height:80px;margin-bottom:16px;"></div>').join('')}
            </div>
        </div>`;

        if (window.lucide) window.lucide.createIcons();
        await this.carregar();
    },

    async carregar() {
        try {
            this._alertasCache = await Alertas.gerarAlertas();
            this.renderizarLista();
            Alertas.atualizarBadge();
        } catch (err) {
            console.error('Erro ao carregar alertas:', err);
            document.getElementById('alertas-lista').innerHTML = `
                <div class="alert alert-error">Erro ao carregar avisos. Tente recarregar a página.</div>
            `;
        }
    },

    setFiltro(filtro, btn) {
        this._filtroAtual = filtro;
        
        // Atualiza UI dos botoes
        document.querySelectorAll('.alert-filter-btn').forEach(b => b.classList.remove('active'));
        if (btn) btn.classList.add('active');

        this.renderizarLista();
    },

    renderizarLista() {
        const container = document.getElementById('alertas-lista');
        if (!container) return;

        let exibidos = this._alertasCache;

        if (this._filtroAtual === 'atrasados') {
            exibidos = exibidos.filter(a => a.tipo === 'vencido');
        } else if (this._filtroAtual === 'proximos') {
            exibidos = exibidos.filter(a => a.tipo === 'proximo');
        } else if (this._filtroAtual === 'recentes') {
            exibidos = exibidos.filter(a => a.tipo === 'recebido' || a.tipo === 'quitado');
        }

        if (exibidos.length === 0) {
            container.innerHTML = `
            <div class="table-empty" style="border: 1px dashed var(--border-subtle); background: transparent;">
                <div class="table-empty-icon">🌟</div>
                <p class="table-empty-text">Excelente! Tudo em dia e sob controle.</p>
                <p style="font-size:13px;color:var(--text-muted);">Nenhum alerta para exibir neste filtro.</p>
            </div>`;
            return;
        }

        container.innerHTML = exibidos.map(alert => `
            <div class="alerta-card alerta-${alert.tipo} ${alert.lido ? 'alerta-lido' : ''}" 
                 onclick="TelaAvisos.lidarCliqueAlerta('${alert.id}', '${alert.emprestimo_id}')">
                
                <div style="display:flex;align-items:center;gap:16px;flex:1;">
                    <div class="alerta-icon-box">
                        <i data-lucide="${alert.icone}"></i>
                    </div>
                    <div class="alerta-content">
                        <div class="alerta-header">
                            <span class="alerta-title">${alert.devedor}</span>
                            <span class="alerta-date">• ${window.formatarData ? window.formatarData(alert.data) : alert.data}</span>
                        </div>
                        <div class="alerta-message">${alert.mensagem}</div>
                    </div>
                </div>
                
                <div style="flex-shrink:0;">
                    <button class="btn btn-outline btn-sm">Ver Empréstimo</button>
                </div>
            </div>
        `).join('');

        if (window.lucide) window.lucide.createIcons();
    },

    lidarCliqueAlerta(alertId, emprestimoId) {
        Alertas.marcarComoLido(alertId);
        window.location.hash = '#/emprestimo/' + emprestimoId;
    },

    async marcarTodosLidos() {
        await Alertas.marcarTodosComoLido();
        // Atualiza o estado local para evitar refetch imediato completo
        this._alertasCache.forEach(a => a.lido = true);
        this.renderizarLista();
        App.showToast('Todos os alertas foram marcados como lidos.', 'success');
    }
};

window.TelaAvisos = TelaAvisos;
