// ============================================================
// Tela Novo Empréstimo — Formulário completo
// ============================================================

const TelaNovoEmprestimo = {
    _devedorId: null,
    _modalidade: 'livre',

    async render(devedorId) {
        this._devedorId = devedorId || null;
        this._modalidade = 'livre';
        const app = document.getElementById('conteudo-principal');

        // Carrega lista de devedores para o select
        const devedores = await Devedores.listar();

        app.innerHTML = `
        <div class="content-wrapper" style="max-width:800px;">
            <div class="page-header">
                <div style="display:flex;align-items:center;gap:12px;">
                    <button class="btn btn-ghost btn-icon" onclick="window.history.back()" title="Voltar">
                        <i data-lucide="arrow-left"></i>
                    </button>
                    <h1 class="page-title">Novo Empréstimo</h1>
                </div>
            </div>

            <div class="card">
                <div class="card-body">
                    <form id="form-novo-emp" onsubmit="TelaNovoEmprestimo._handleSalvar(event)">
                        <!-- Devedor -->
                        <div class="form-group">
                            <label class="form-label">Devedor <span class="required">*</span></label>
                            <select id="emp-devedor" class="form-select" required>
                                <option value="">Selecione um devedor</option>
                                ${devedores.map(d => `
                                    <option value="${d.id}" ${d.id === this._devedorId ? 'selected' : ''}>${d.nome}</option>
                                `).join('')}
                            </select>
                        </div>

                        <!-- Grid 2 colunas -->
                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Valor Principal (R$) <span class="required">*</span></label>
                                <input type="number" id="emp-valor" class="form-input form-input-money"
                                    step="0.01" min="0.01" placeholder="0,00" required
                                    oninput="TelaNovoEmprestimo._atualizarPreview()">
                            </div>
                            <div class="form-group">
                                <label class="form-label">Taxa Mensal (%) <span class="required">*</span></label>
                                <input type="number" id="emp-taxa" class="form-input form-input-money"
                                    step="0.01" min="0.01" max="99.99" placeholder="5,00" required
                                    oninput="TelaNovoEmprestimo._atualizarPreview()">
                            </div>
                        </div>

                        <div class="form-row">
                            <div class="form-group">
                                <label class="form-label">Data de Início <span class="required">*</span></label>
                                <input type="date" id="emp-data" class="form-input" value="${Datas.hojeISO()}" required>
                            </div>
                            <div class="form-group">
                                <label class="form-label">Modalidade <span class="required">*</span></label>
                                <div style="display:flex;gap:12px;margin-top:4px;">
                                    <label class="radio-option ${this._modalidade === 'livre' ? 'radio-option--active' : ''}">
                                        <input type="radio" name="modalidade" value="livre" checked
                                            onchange="TelaNovoEmprestimo._setModalidade('livre')">
                                        <span>Livre</span>
                                    </label>
                                    <label class="radio-option ${this._modalidade === 'price' ? 'radio-option--active' : ''}">
                                        <input type="radio" name="modalidade" value="price"
                                            onchange="TelaNovoEmprestimo._setModalidade('price')">
                                        <span>Price</span>
                                    </label>
                                </div>
                            </div>
                        </div>

                        <!-- Campos Price (condicionais) -->
                        <div id="price-section" style="display:none;">
                            <div class="form-row">
                                <div class="form-group">
                                    <label class="form-label">Prazo em Meses <span class="required">*</span></label>
                                    <input type="number" id="emp-prazo" class="form-input" min="1" placeholder="12"
                                        oninput="TelaNovoEmprestimo._atualizarPreview()">
                                </div>
                                <div class="form-group">
                                    <label class="form-label">PMT (Parcela Calculada)</label>
                                    <div class="pmt-display" id="pmt-display">
                                        <span style="color:var(--text-muted);">Preencha os campos</span>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <!-- Observações -->
                        <div class="form-group">
                            <label class="form-label">Observações</label>
                            <textarea id="emp-obs" class="form-textarea" rows="3" placeholder="Informações adicionais"></textarea>
                        </div>

                        <!-- Botão -->
                        <div style="display:flex;gap:12px;justify-content:flex-end;margin-top:16px;">
                            <button type="button" class="btn btn-ghost" onclick="window.history.back()">Cancelar</button>
                            <button type="submit" class="btn btn-primary btn-lg" id="btn-criar-emp">
                                <i data-lucide="plus" style="width:18px;height:18px;"></i>
                                Criar Empréstimo
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>`;

        if (window.lucide) window.lucide.createIcons();
    },

    _setModalidade(valor) {
        this._modalidade = valor;
        const priceSection = document.getElementById('price-section');
        const prazoInput = document.getElementById('emp-prazo');

        if (valor === 'price') {
            priceSection.style.display = 'block';
            prazoInput.required = true;
        } else {
            priceSection.style.display = 'none';
            prazoInput.required = false;
        }

        // Atualiza visual dos radio buttons
        document.querySelectorAll('.radio-option').forEach(el => {
            const input = el.querySelector('input');
            el.classList.toggle('radio-option--active', input.checked);
        });

        this._atualizarPreview();
    },

    _atualizarPreview() {
        if (this._modalidade !== 'price') return;

        const valor = parseFloat(document.getElementById('emp-valor')?.value);
        const taxa = parseFloat(document.getElementById('emp-taxa')?.value) / 100;
        const prazo = parseInt(document.getElementById('emp-prazo')?.value);
        const pmtDisplay = document.getElementById('pmt-display');

        if (valor > 0 && taxa > 0 && prazo > 0) {
            const pmt = calcularPMT(valor, taxa, prazo);
            pmtDisplay.innerHTML = `<span class="pmt-value">${formatarReais(pmt)}</span><small style="color:var(--text-muted);">/mês</small>`;
        } else {
            pmtDisplay.innerHTML = `<span style="color:var(--text-muted);">Preencha os campos</span>`;
        }
    },

    async _handleSalvar(event) {
        event.preventDefault();

        const devedorId = document.getElementById('emp-devedor').value;
        const valor = parseFloat(document.getElementById('emp-valor').value);
        const taxa = parseFloat(document.getElementById('emp-taxa').value) / 100;
        const data = document.getElementById('emp-data').value;
        const modalidade = this._modalidade;
        const prazo = modalidade === 'price' ? parseInt(document.getElementById('emp-prazo').value) : null;
        const obs = document.getElementById('emp-obs').value.trim();

        // Validações
        if (!devedorId) { App.showToast('Selecione um devedor.', 'error'); return; }
        if (!valor || valor <= 0) { App.showToast('Valor principal deve ser maior que zero.', 'error'); return; }
        if (!taxa || taxa <= 0 || taxa >= 1) { App.showToast('Taxa deve ser entre 0% e 100%.', 'error'); return; }
        if (!data) { App.showToast('Informe a data de início.', 'error'); return; }
        if (modalidade === 'price' && (!prazo || prazo <= 0)) {
            App.showToast('Prazo obrigatório para modalidade Price.', 'error');
            return;
        }

        const btn = document.getElementById('btn-criar-emp');
        btn.disabled = true;
        btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;"></span> Criando...';

        const dados = {
            devedor_id: devedorId,
            valor_principal: valor,
            taxa_mensal: taxa,
            data_inicio: data,
            prazo_meses: prazo,
            modalidade,
            saldo_devedor: valor,
            status: 'ativo',
            observacoes: obs || null
        };

        const novo = await Emprestimos.criar(dados);
        if (novo) {
            App.showToast('Empréstimo criado com sucesso!', 'success');
            window.location.hash = `#/emprestimo/${novo.id}`;
        } else {
            App.showToast('Erro ao criar empréstimo.', 'error');
            btn.disabled = false;
            btn.innerHTML = '<i data-lucide="plus" style="width:18px;height:18px;"></i> Criar Empréstimo';
            if (window.lucide) window.lucide.createIcons();
        }
    }
};

window.TelaNovoEmprestimo = TelaNovoEmprestimo;
