// =============================================
// tela-exportar-pdf.js — Tela de Exportação
// =============================================

const TelaExportarPdf = {

    async render() {
        const app = document.getElementById('app');

        // Buscar devedores para o dropdown
        const devedores = await Devedores.listarTodos();

        app.innerHTML = `
            <div class="page-container" style="max-width:900px;margin:0 auto;padding:32px 24px;">
                
                <!-- Header da página -->
                <div style="display:flex;align-items:center;gap:12px;margin-bottom:32px;">
                    <div style="width:48px;height:48px;border-radius:12px;background:rgba(34,197,94,0.15);display:flex;align-items:center;justify-content:center;">
                        <i data-lucide="file-down" style="color:var(--accent);width:24px;height:24px;"></i>
                    </div>
                    <div>
                        <h1 style="font-size:24px;font-weight:700;color:var(--text-primary);margin:0;">Exportar Relatório</h1>
                        <p style="font-size:14px;color:var(--text-secondary);margin:4px 0 0;">Gere um PDF com todos os empréstimos ativos</p>
                    </div>
                </div>

                <!-- Card de filtros -->
                <div class="card" style="padding:24px;margin-bottom:24px;">
                    <h3 style="font-size:16px;font-weight:600;color:var(--text-primary);margin:0 0 20px;display:flex;align-items:center;gap:8px;">
                        <i data-lucide="filter" style="width:18px;height:18px;color:var(--accent);"></i>
                        Filtros do Relatório
                    </h3>
                    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;">
                        <div class="form-group">
                            <label class="form-label" for="filtro-data-inicio">Data Início</label>
                            <input type="date" id="filtro-data-inicio" class="form-input" />
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="filtro-data-fim">Data Fim</label>
                            <input type="date" id="filtro-data-fim" class="form-input" />
                        </div>
                        <div class="form-group">
                            <label class="form-label" for="filtro-devedor">Devedor</label>
                            <select id="filtro-devedor" class="form-input">
                                <option value="">Todos os devedores</option>
                                ${devedores.map(d => `
                                    <option value="${d.id}">${d.nome}</option>
                                `).join('')}
                            </select>
                        </div>
                    </div>
                    <button id="btn-atualizar-preview" class="btn-secondary" style="margin-top:16px;display:flex;align-items:center;gap:6px;">
                        <i data-lucide="refresh-cw" style="width:14px;height:14px;"></i>
                        Atualizar prévia
                    </button>
                </div>

                <!-- Preview dos totais -->
                <div id="preview-container" style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px;margin-bottom:24px;">
                    <div class="card" style="padding:20px;text-align:center;">
                        <p style="font-size:12px;color:var(--text-secondary);margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Empréstimos Incluídos</p>
                        <p id="preview-total" style="font-size:28px;font-weight:800;color:var(--text-primary);margin:0;">—</p>
                    </div>
                    <div class="card" style="padding:20px;text-align:center;">
                        <p style="font-size:12px;color:var(--text-secondary);margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Total em Carteira</p>
                        <p id="preview-saldo" style="font-size:28px;font-weight:800;color:var(--accent);margin:0;">—</p>
                    </div>
                    <div class="card" style="padding:20px;text-align:center;">
                        <p style="font-size:12px;color:var(--text-secondary);margin:0 0 8px;text-transform:uppercase;letter-spacing:0.5px;">Juros Próximo Ciclo</p>
                        <p id="preview-juros" style="font-size:28px;font-weight:800;color:#f59e0b;margin:0;">—</p>
                    </div>
                </div>

                <!-- Mensagem de erro -->
                <div id="export-error" style="display:none;padding:16px;border-radius:12px;background:rgba(239,68,68,0.1);border:1px solid rgba(239,68,68,0.3);color:#ef4444;margin-bottom:24px;font-size:14px;text-align:center;">
                </div>

                <!-- Botão principal -->
                <button id="btn-gerar-pdf" class="btn-primary" style="width:100%;padding:16px;font-size:16px;font-weight:600;display:flex;align-items:center;justify-content:center;gap:8px;border-radius:12px;">
                    <i data-lucide="download" style="width:20px;height:20px;"></i>
                    <span id="btn-gerar-texto">Gerar e Baixar PDF</span>
                </button>

            </div>
        `;

        if (window.lucide) window.lucide.createIcons();

        // Eventos
        this._bindEvents();

        // Carregar preview inicial
        this._atualizarPreview();
    },

    _bindEvents() {
        document.getElementById('btn-gerar-pdf')
            .addEventListener('click', () => this._gerarPdf());

        document.getElementById('btn-atualizar-preview')
            .addEventListener('click', () => this._atualizarPreview());

        // Auto-update preview ao mudar filtros
        ['filtro-data-inicio', 'filtro-data-fim', 'filtro-devedor'].forEach(id => {
            document.getElementById(id)
                .addEventListener('change', () => this._atualizarPreview());
        });
    },

    _obterFiltros() {
        return {
            dataInicio: document.getElementById('filtro-data-inicio')?.value || '',
            dataFim: document.getElementById('filtro-data-fim')?.value || '',
            devedorId: document.getElementById('filtro-devedor')?.value || ''
        };
    },

    async _atualizarPreview() {
        const filtros = this._obterFiltros();
        const errorEl = document.getElementById('export-error');
        errorEl.style.display = 'none';

        try {
            const preview = await PdfExportador.buscarPreview(filtros);

            document.getElementById('preview-total').textContent = preview.total;
            document.getElementById('preview-saldo').textContent =
                Formatadores.formatarReais(preview.saldo);
            document.getElementById('preview-juros').textContent =
                Formatadores.formatarReais(preview.juros);

            if (preview.total === 0) {
                errorEl.textContent = 'Nenhum empréstimo ativo encontrado com os filtros atuais.';
                errorEl.style.display = 'block';
            }
        } catch (err) {
            console.error('Erro ao buscar preview:', err);
        }
    },

    async _gerarPdf() {
        const btn = document.getElementById('btn-gerar-pdf');
        const textoBtn = document.getElementById('btn-gerar-texto');
        const errorEl = document.getElementById('export-error');
        const filtros = this._obterFiltros();

        errorEl.style.display = 'none';
        btn.disabled = true;
        textoBtn.textContent = 'Gerando relatório...';

        try {
            await PdfExportador.exportarEmprestimosAtivos(filtros);
            App.showToast('PDF exportado com sucesso!', 'success');
        } catch (err) {
            console.error('Erro ao exportar PDF:', err);
            errorEl.textContent = err.message || 'Erro ao gerar o relatório.';
            errorEl.style.display = 'block';
        } finally {
            btn.disabled = false;
            textoBtn.textContent = 'Gerar e Baixar PDF';
        }
    }
};

// Exporta globalmente
window.TelaExportarPdf = TelaExportarPdf;
