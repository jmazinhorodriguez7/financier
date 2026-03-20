// =============================================
// pdf-exportador.js — Exportação de Relatórios
// =============================================

const PdfExportador = {

    /**
     * Exportar relatório de empréstimos ativos
     * @param {object} filtros - { dataInicio, dataFim, devedorId }
     */
    async exportarEmprestimosAtivos(filtros = {}) {

        // 1. Buscar dados do Supabase com filtros
        let query = window.FinancierDB
            .from('emprestimos')
            .select(`
                id,
                valor_principal,
                taxa_mensal,
                data_inicio,
                prazo_meses,
                modalidade,
                saldo_devedor,
                status,
                created_at,
                devedores (
                    nome,
                    contato
                ),
                pagamentos (
                    data_pagamento,
                    valor_pago,
                    valor_juros,
                    valor_amortizacao,
                    saldo_apos,
                    created_at
                )
            `)
            .eq('status', 'ativo')
            .order('created_at', { ascending: true });

        // Aplicar filtro de período
        if (filtros.dataInicio) {
            query = query.gte('data_inicio', filtros.dataInicio);
        }
        if (filtros.dataFim) {
            query = query.lte('data_inicio', filtros.dataFim);
        }
        if (filtros.devedorId) {
            query = query.eq('devedor_id', filtros.devedorId);
        }

        const { data: emprestimos, error } = await query;

        if (error) throw new Error('Erro ao buscar empréstimos: ' + error.message);
        if (!emprestimos || emprestimos.length === 0) {
            throw new Error('Nenhum empréstimo ativo encontrado para o período selecionado.');
        }

        // 2. Calcular dados derivados para cada empréstimo
        const dadosComCalculo = emprestimos.map(emp => {
            const pagamentosOrdenados = (emp.pagamentos || [])
                .sort((a, b) =>
                    new Date(b.data_pagamento) - new Date(a.data_pagamento));

            const ultimoPagamento = pagamentosOrdenados[0];
            const dataUltimoPgto = ultimoPagamento
                ? new Date(ultimoPagamento.data_pagamento)
                : new Date(emp.data_inicio);

            // Próximo pagamento = último pagamento + 30 dias
            const proximoPagamento = new Date(dataUltimoPgto);
            proximoPagamento.setDate(proximoPagamento.getDate() + 30);

            // Juros do próximo período
            const jurosProximo = Number(emp.saldo_devedor) * Number(emp.taxa_mensal);

            // Dias desde último pagamento
            const hoje = new Date();
            const diasDesdeUltimo = Math.floor(
                (hoje - dataUltimoPgto) / (1000 * 60 * 60 * 24)
            );

            // Status de atraso
            const emAtraso = diasDesdeUltimo > 30;

            return {
                ...emp,
                ultimoPagamento,
                proximoPagamento,
                jurosProximo,
                diasDesdeUltimo,
                emAtraso,
                totalPago: (emp.pagamentos || [])
                    .reduce((acc, p) => acc + Number(p.valor_pago || 0), 0),
                totalJurosPago: (emp.pagamentos || [])
                    .reduce((acc, p) => acc + Number(p.valor_juros || 0), 0),
                totalAmortizado: (emp.pagamentos || [])
                    .reduce((acc, p) => acc + Number(p.valor_amortizacao || 0), 0),
            };
        });

        // 3. Gerar PDF
        this._gerarPDF(dadosComCalculo, filtros);
    },

    /**
     * Busca preview dos dados (sem gerar PDF)
     */
    async buscarPreview(filtros = {}) {
        let query = window.FinancierDB
            .from('emprestimos')
            .select(`
                id, saldo_devedor, taxa_mensal, data_inicio,
                pagamentos (data_pagamento)
            `)
            .eq('status', 'ativo');

        if (filtros.dataInicio) {
            query = query.gte('data_inicio', filtros.dataInicio);
        }
        if (filtros.dataFim) {
            query = query.lte('data_inicio', filtros.dataFim);
        }
        if (filtros.devedorId) {
            query = query.eq('devedor_id', filtros.devedorId);
        }

        const { data, error } = await query;
        if (error) return { total: 0, saldo: 0, juros: 0 };

        const emprestimos = data || [];
        const totalSaldo = emprestimos.reduce((acc, e) => acc + Number(e.saldo_devedor || 0), 0);
        const totalJuros = emprestimos.reduce((acc, e) =>
            acc + (Number(e.saldo_devedor || 0) * Number(e.taxa_mensal || 0)), 0);

        return {
            total: emprestimos.length,
            saldo: totalSaldo,
            juros: totalJuros
        };
    },

    /**
     * Gera o documento PDF
     */
    _gerarPDF(emprestimos, filtros) {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'landscape', unit: 'mm' });

        const dataGeracao = new Date().toLocaleDateString('pt-BR');
        const horaGeracao = new Date().toLocaleTimeString('pt-BR',
            { hour: '2-digit', minute: '2-digit' });

        // ---- CABEÇALHO ----
        doc.setFillColor(13, 31, 15);
        doc.rect(0, 0, 297, 25, 'F');

        doc.setTextColor(34, 197, 94);
        doc.setFontSize(18);
        doc.setFont('helvetica', 'bold');
        doc.text('FINANCIER', 14, 12);

        doc.setTextColor(241, 245, 249);
        doc.setFontSize(11);
        doc.setFont('helvetica', 'normal');
        doc.text('Relatório de Empréstimos Ativos', 14, 19);

        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(
            `Gerado em ${dataGeracao} às ${horaGeracao}`,
            297 - 14,
            12,
            { align: 'right' }
        );

        if (filtros.dataInicio || filtros.dataFim) {
            const periodo = `Período: ${
                filtros.dataInicio
                    ? Formatadores.formatarData(filtros.dataInicio)
                    : 'início'
            } até ${
                filtros.dataFim
                    ? Formatadores.formatarData(filtros.dataFim)
                    : 'hoje'
            }`;
            doc.text(periodo, 297 - 14, 19, { align: 'right' });
        }

        // ---- RESUMO GERAL ----
        const totalSaldo = emprestimos
            .reduce((acc, e) => acc + Number(e.saldo_devedor), 0);
        const totalJurosProximo = emprestimos
            .reduce((acc, e) => acc + e.jurosProximo, 0);
        const emAtrasoCount = emprestimos
            .filter(e => e.emAtraso).length;

        doc.setFillColor(18, 33, 20);
        doc.rect(0, 25, 297, 18, 'F');

        doc.setTextColor(148, 163, 184);
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.text('TOTAL EM CARTEIRA', 14, 31);
        doc.text('JUROS PRÓXIMO CICLO', 100, 31);
        doc.text('EMPRÉSTIMOS ATIVOS', 180, 31);
        doc.text('EM ATRASO', 250, 31);

        doc.setTextColor(241, 245, 249);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text(Formatadores.formatarReais(totalSaldo), 14, 39);
        doc.text(Formatadores.formatarReais(totalJurosProximo), 100, 39);
        doc.text(String(emprestimos.length), 180, 39);

        doc.setTextColor(
            emAtrasoCount > 0 ? 239 : 34,
            emAtrasoCount > 0 ? 68 : 197,
            emAtrasoCount > 0 ? 68 : 94
        );
        doc.text(String(emAtrasoCount), 250, 39);

        // ---- TABELA PRINCIPAL ----
        const colunas = [
            { header: 'Devedor', dataKey: 'devedor' },
            { header: 'Contato', dataKey: 'contato' },
            { header: 'Valor Original', dataKey: 'valorOriginal' },
            { header: 'Taxa Mensal', dataKey: 'taxa' },
            { header: 'Modalidade', dataKey: 'modalidade' },
            { header: 'Início', dataKey: 'dataInicio' },
            { header: 'Total Pago', dataKey: 'totalPago' },
            { header: 'Total Amortizado', dataKey: 'totalAmortizado' },
            { header: 'Saldo Devedor', dataKey: 'saldo' },
            { header: 'Juros Próx. Ciclo', dataKey: 'jurosProximo' },
            { header: 'Próx. Pagamento', dataKey: 'proximoPagamento' },
            { header: 'Dias s/ Pgto', dataKey: 'diasSemPagamento' },
        ];

        const linhas = emprestimos.map(e => ({
            devedor: e.devedores?.nome || '—',
            contato: e.devedores?.contato || '—',
            valorOriginal: Formatadores.formatarReais(e.valor_principal),
            taxa: Formatadores.formatarPercentual(e.taxa_mensal),
            modalidade: e.modalidade === 'price' ? 'Price' : 'Livre',
            dataInicio: Formatadores.formatarData(e.data_inicio),
            totalPago: Formatadores.formatarReais(e.totalPago),
            totalAmortizado: Formatadores.formatarReais(e.totalAmortizado),
            saldo: Formatadores.formatarReais(e.saldo_devedor),
            jurosProximo: Formatadores.formatarReais(e.jurosProximo),
            proximoPagamento: Formatadores.formatarData(e.proximoPagamento),
            diasSemPagamento: String(e.diasDesdeUltimo) + ' dias',
            _emAtraso: e.emAtraso,
        }));

        doc.autoTable({
            startY: 46,
            columns: colunas,
            body: linhas,
            theme: 'grid',
            headStyles: {
                fillColor: [13, 31, 15],
                textColor: [34, 197, 94],
                fontStyle: 'bold',
                fontSize: 7,
            },
            bodyStyles: {
                fontSize: 7,
                textColor: [30, 30, 30],
            },
            alternateRowStyles: {
                fillColor: [245, 250, 245],
            },
            didParseCell: (data) => {
                if (data.section === 'body') {
                    const linha = linhas[data.row.index];
                    // Linha vermelha para empréstimos em atraso
                    if (linha?._emAtraso) {
                        data.cell.styles.textColor = [239, 68, 68];
                        data.cell.styles.fontStyle = 'bold';
                    }
                    // Coluna saldo em destaque
                    if (data.column.dataKey === 'saldo') {
                        data.cell.styles.fontStyle = 'bold';
                    }
                }
            },
            margin: { top: 46, left: 14, right: 14 },
        });

        // ---- RODAPÉ ----
        const totalPaginas = doc.internal.getNumberOfPages();
        for (let i = 1; i <= totalPaginas; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Financier — Relatório confidencial — Página ${i} de ${totalPaginas}`,
                148.5,
                205,
                { align: 'center' }
            );
        }

        // 4. Baixar o arquivo
        const nomeArquivo = `financier-emprestimos-ativos-${
            new Date().toISOString().split('T')[0]
        }.pdf`;
        doc.save(nomeArquivo);
    }
};

// Exporta globalmente
window.PdfExportador = PdfExportador;
