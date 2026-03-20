// ============================================
// Tela Importar PDF
// ============================================

const TelaPdf = {
    _linhasExtraidas: [],

    async render() {
        const app = document.getElementById('app');
        
        app.innerHTML = `
        <div class="content-wrapper">
            <div class="page-header">
                <div>
                    <h1 class="page-title">Importar Extrato PDF</h1>
                    <p class="page-subtitle">Faça upload de extratos bancários para o Financier processar e sugerir pagamentos a registrar.</p>
                </div>
            </div>

            <div class="upload-container">
                <!-- Dropzone Area -->
                <div class="upload-area" id="pdf-dropzone" onclick="document.getElementById('pdf-file-input').click()">
                    <div class="upload-area-icon">
                        <i data-lucide="upload-cloud" style="width:32px;height:32px;"></i>
                    </div>
                    <h3 class="upload-area-title">Clique ou arraste um PDF aqui</h3>
                    <p class="upload-area-subtitle">O sistema tentará extrair datas, descrições e valores automaticamente</p>
                    <input type="file" id="pdf-file-input" accept=".pdf" style="display:none;" onchange="TelaPdf.handleFileInput(event)">
                </div>

                <!-- Painel de Associação (Oculto até ler o PDF) -->
                <div id="pdf-association-section" style="display:none;">
                    <h3 class="page-title" style="font-size:16px;margin-bottom:16px;">Associação de Lote</h3>
                    <div class="pdf-association-panel">
                        <div class="form-group">
                            <label class="form-label">Devedor (Remetente dos pagamentos)</label>
                            <select id="sel-devedor" class="form-control" onchange="TelaPdf.handleDevedorChange()">
                                <option value="">Selecione um devedor...</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label class="form-label">Empréstimo Vinculado</label>
                            <select id="sel-emprestimo" class="form-control" disabled>
                                <option value="">Aguardando seleção de devedor...</option>
                            </select>
                        </div>
                    </div>
                </div>

                <!-- Tabela Preview -->
                <div id="pdf-preview-section" style="display:none;">
                    <div class="pdf-preview-box">
                        <div class="pdf-preview-header">
                            <h3>Lançamentos Identificados</h3>
                            <div style="display:flex;gap:12px;">
                                <button class="btn btn-outline btn-sm" onclick="TelaPdf.toggleAllCheckboxes(true)">Selecionar Todas</button>
                                <button class="btn btn-outline btn-sm" onclick="TelaPdf.toggleAllCheckboxes(false)">Desmarcar Todas</button>
                                <button class="btn btn-primary btn-sm" onclick="TelaPdf.importarSelecionados()" id="btn-importar-lote">Importar Selecionados</button>
                            </div>
                        </div>
                        <div class="table-container">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th style="width:40px;"></th>
                                        <th>Data</th>
                                        <th>Descrição</th>
                                        <th>Tipo</th>
                                        <th style="text-align:right;">Valor</th>
                                    </tr>
                                </thead>
                                <tbody id="pdf-tbody">
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </div>
        </div>`;

        if (window.lucide) window.lucide.createIcons();
        this._configurarDropzone();
    },

    _configurarDropzone() {
        const dropzone = document.getElementById('pdf-dropzone');
        
        dropzone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropzone.classList.add('upload-area--active');
        });
        
        dropzone.addEventListener('dragleave', () => {
            dropzone.classList.remove('upload-area--active');
        });
        
        dropzone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropzone.classList.remove('upload-area--active');
            
            if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
                const file = e.dataTransfer.files[0];
                this._processarArquivo(file);
            }
        });
    },

    handleFileInput(event) {
        if (event.target.files && event.target.files.length > 0) {
            this._processarArquivo(event.target.files[0]);
        }
    },

    async _processarArquivo(file) {
        if (file.type !== 'application/pdf') {
            App.showToast('Por favor, selecione um arquivo PDF.', 'error');
            return;
        }

        const dropzoneTitle = document.querySelector('.upload-area-title');
        const defaultTitle = dropzoneTitle.innerText;
        dropzoneTitle.innerText = "Processando arquivo...";

        try {
            const arrayBuffer = await file.arrayBuffer();
            const linhas = await window.PdfExtrator.parse(arrayBuffer);
            
            if (linhas.length === 0) {
                App.showToast('Nenhuma linha financeira identificada neste PDF.', 'warning');
                dropzoneTitle.innerText = defaultTitle;
                return;
            }

            this._linhasExtraidas = linhas.map((l, index) => ({...l, id: index, selected: true}));
            this._renderizarPreview();
            await this._carregarDevedores();
            
            document.getElementById('pdf-association-section').style.display = 'block';
            document.getElementById('pdf-preview-section').style.display = 'block';

            App.showToast(`${linhas.length} linhas financeiras extraídas com sucesso.`, 'success');
        } catch (error) {
            if (error.message === 'PROTECTED') {
                App.showToast('Este PDF está protegido. Remova a senha e tente novamente.', 'error');
            } else {
                App.showToast('Não foi possível ler o arquivo. Verifique se é um PDF válido.', 'error');
            }
        } finally {
            dropzoneTitle.innerText = file.name;
        }
    },

    _renderizarPreview() {
        const tbody = document.getElementById('pdf-tbody');
        tbody.innerHTML = this._linhasExtraidas.map(linha => `
            <tr>
                <td>
                    <input type="checkbox" class="pdf-table-checkbox" data-id="${linha.id}" ${linha.selected ? 'checked' : ''} onchange="TelaPdf.handleCheckbox(${linha.id}, this.checked)">
                </td>
                <td>${window.formatarData ? window.formatarData(linha.data) : linha.data}</td>
                <td><span style="font-weight:500;">${linha.descricao}</span></td>
                <td>
                    <span class="badge ${linha.tipo === 'entrada' ? 'badge-success' : (linha.tipo === 'saida' ? 'badge-danger' : 'badge-warning')}">
                        ${linha.tipo}
                    </span>
                </td>
                <td style="text-align:right; font-family:'JetBrains Mono', monospace; font-weight:600;">
                    ${window.formatarReais(linha.valor)}
                </td>
            </tr>
        `).join('');
    },

    handleCheckbox(id, isChecked) {
        const linha = this._linhasExtraidas.find(l => l.id === id);
        if (linha) linha.selected = isChecked;
    },

    toggleAllCheckboxes(state) {
        this._linhasExtraidas.forEach(l => l.selected = state);
        this._renderizarPreview();
    },

    async _carregarDevedores() {
        const selDevedor = document.getElementById('sel-devedor');
        selDevedor.innerHTML = '<option value="">Carregando...</option>';
        try {
            const devedores = await Devedores.listar();
            if (devedores.length === 0) {
                selDevedor.innerHTML = '<option value="">Nenhum devedor cadastrado</option>';
                return;
            }
            selDevedor.innerHTML = '<option value="">Selecione um devedor...</option>' + 
                devedores.map(d => `<option value="${d.id}">${d.nome}</option>`).join('');
        } catch(e) {
            console.error(e);
            selDevedor.innerHTML = '<option value="">Erro ao carregar</option>';
        }
    },

    async handleDevedorChange() {
        const devId = document.getElementById('sel-devedor').value;
        const selEmprestimo = document.getElementById('sel-emprestimo');
        
        if (!devId) {
            selEmprestimo.innerHTML = '<option value="">Aguardando seleção de devedor...</option>';
            selEmprestimo.disabled = true;
            return;
        }

        selEmprestimo.innerHTML = '<option value="">Carregando empréstimos...</option>';
        selEmprestimo.disabled = true;

        try {
            const userId = Auth.getUsuarioId();
            const { data, error } = await FinancierDB
                .from('emprestimos')
                .select('*')
                .eq('user_id', userId)
                .eq('devedor_id', devId)
                .in('status', ['ativo', 'renegociado'])
                .order('created_at', { ascending: false });
            
            if (error) throw error;
            
            if (data.length === 0) {
                selEmprestimo.innerHTML = '<option value="">Devedor não possui empréstimos ativos</option>';
            } else {
                selEmprestimo.innerHTML = '<option value="">Selecione um empréstimo...</option>' + 
                    data.map(e => `<option value="${e.id}">${window.formatarReais(e.valor_principal)} (${window.formatarData(e.data_inicio)})</option>`).join('');
                selEmprestimo.disabled = false;
            }
        } catch(e) {
            console.error(e);
            selEmprestimo.innerHTML = '<option value="">Erro ao carregar empréstimos</option>';
        }
    },

    async importarSelecionados() {
        const emprestimoId = document.getElementById('sel-emprestimo').value;
        const devedorId = document.getElementById('sel-devedor').value;
        const btn = document.getElementById('btn-importar-lote');

        if (!devedorId || !emprestimoId) {
            App.showToast('Você deve associar um Devedor e um Empréstimo para importar.', 'error');
            return;
        }

        const linhasSelecionadas = this._linhasExtraidas.filter(l => l.selected);
        if (linhasSelecionadas.length === 0) {
            App.showToast('Selecione pelo menos uma linha para importar.', 'warning');
            return;
        }

        // Bloquear botão de submissão
        const btnOriginalTexto = btn.innerText;
        btn.innerHTML = '<i class="spinner"></i> Processando...';
        btn.disabled = true;

        try {
            // Buscar detalhes do empréstimo base para atualizar o saldo rotativamente
            const userId = Auth.getUsuarioId();
            const { data: emprestimosInfo, error: errEmp } = await FinancierDB
                .from('emprestimos')
                .select('*')
                .eq('id', emprestimoId)
                .eq('user_id', userId);
            
            if (errEmp || !emprestimosInfo[0]) throw new Error("Empréstimo não encontrado");
            let emprestimoAtual = emprestimosInfo[0];

            // Ordenar da data mais antiga para a mais nova, fundamental para matemática de juros contínuos
            const fila = [...linhasSelecionadas].sort((a,b) => new Date(a.data) - new Date(b.data));
            
            let sucessos = 0;

            for (const item of fila) {
                // Cálculos via módulo matemático puro
                const calc = window.calcularPagamentoLivre(
                    emprestimoAtual.saldo_devedor, 
                    emprestimoAtual.taxa_mensal / 100, 
                    item.valor
                );

                const novoPagamento = {
                    user_id: userId,
                    emprestimo_id: emprestimoId,
                    valor_pago: item.valor,
                    data_pagamento: item.data,
                    observacoes: `[Importação Lote PDF]: ${item.descricao}`,
                    juros_pagos: calc.juros,
                    amortizacao: calc.amortizacao
                };

                // Inserir registro de pagamento
                const { error: errInsert } = await FinancierDB.from('pagamentos').insert([novoPagamento]);
                if (errInsert) throw errInsert;

                let novoStatus = emprestimoAtual.status;
                if (calc.novoSaldo <= 0.01) novoStatus = 'quitado';

                // Atualizar tabela de empréstimo e estado em memória para a próxima iteração
                const { error: errUpdate } = await FinancierDB.from('emprestimos').update({
                    saldo_devedor: calc.novoSaldo,
                    status: novoStatus,
                    updated_at: new Date().toISOString()
                }).eq('id', emprestimoId);

                if (errUpdate) throw errUpdate;

                emprestimoAtual.saldo_devedor = calc.novoSaldo;
                emprestimoAtual.status = novoStatus;
                sucessos++;
            }

            App.showToast(`${sucessos} pagamentos importados com sucesso.`, 'success');
            
            // Redireciona para o detalhe e avisa que atualizou o sistema
            window.location.hash = '#/emprestimo/' + emprestimoId;

        } catch (error) {
            console.error('Falha na importação em lote:', error);
            App.showToast('Ocorreu um erro durante o processamento do lote.', 'error');
            btn.innerHTML = btnOriginalTexto;
            btn.disabled = false;
        }
    }
};

window.TelaPdf = TelaPdf;
