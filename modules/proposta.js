// ============================================================
// proposta.js — Geração de Proposta de Empréstimo (PDF + WhatsApp)
// ============================================================

const PropostaEmprestimo = {

    /**
     * Gera PDF profissional da proposta de empréstimo
     * @param {object} dados - { nomeDevedor, valor, taxa, prazo, modalidade }
     * @returns {string} nome do arquivo gerado
     */
    gerar(dados) {
        const { nomeDevedor, valor, taxa, prazo, modalidade } = dados;
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });

        const hoje = new Date().toLocaleDateString('pt-BR');
        const validade = new Date();
        validade.setDate(validade.getDate() + 7);
        const dataValidade = validade.toLocaleDateString('pt-BR');

        let parcelaInicial, totalJuros, totalPago, tabela;
        const i = taxa / 100;

        if (modalidade === 'price') {
            const pmt = Calculos.calcularPMT(valor, i, prazo);
            tabela = Calculos.gerarTabelaPrice(valor, i, prazo);
            parcelaInicial = pmt;
            totalJuros = Calculos.arredondar(tabela.reduce((a, p) => a + p.juros, 0));
            totalPago = Calculos.arredondar(tabela.reduce((a, p) => a + p.pmt, 0));
            // Normalize tabela fields for PDF table
            tabela = tabela.map(p => ({
                mes: p.mes, juros: p.juros, amortizacao: p.amortizacao,
                parcela: p.pmt, novoSaldo: p.novoSaldo
            }));
        } else if (modalidade === 'sac') {
            tabela = Calculos.gerarTabelaSAC(valor, i, prazo);
            parcelaInicial = tabela[0].parcela;
            totalJuros = Calculos.arredondar(tabela.reduce((a, p) => a + p.juros, 0));
            totalPago = Calculos.arredondar(tabela.reduce((a, p) => a + p.parcela, 0));
        } else {
            const amortL = Calculos.arredondar(valor / prazo);
            parcelaInicial = Calculos.arredondar(valor * i + amortL);
            let s = valor, tj = 0, tp = 0;
            tabela = [];
            for (let m = 1; m <= prazo; m++) {
                const juros = Calculos.arredondar(s * i);
                const parcela = Calculos.arredondar(juros + amortL);
                tj += juros; tp += parcela;
                tabela.push({ mes: m, juros, amortizacao: amortL, parcela, novoSaldo: Calculos.arredondar(Math.max(0, s - amortL)) });
                s = Calculos.arredondar(s - amortL);
            }
            totalJuros = Calculos.arredondar(tj);
            totalPago = Calculos.arredondar(tp);
        }

        const modalidadeLabel = {
            livre: 'Juros Simples (Livre)',
            price: 'Price (Parcela Fixa)',
            sac: 'SAC (Amortização Fixa)'
        }[modalidade];

        // CABEÇALHO
        doc.setFillColor(13, 31, 15);
        doc.rect(0, 0, 210, 40, 'F');
        doc.setTextColor(34, 197, 94);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.text('FINANCIER', 14, 15);
        doc.setTextColor(241, 245, 249);
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Proposta de Empréstimo', 14, 24);
        doc.setFontSize(9);
        doc.setTextColor(148, 163, 184);
        doc.text(`Emitida em: ${hoje}`, 14, 32);
        doc.text(`Válida até: ${dataValidade}`, 14, 37);

        const numProposta = 'PROP-' + Date.now().toString().slice(-6);
        doc.setTextColor(34, 197, 94);
        doc.setFontSize(10);
        doc.text(numProposta, 210 - 14, 20, { align: 'right' });

        // DADOS DO SOLICITANTE
        let y = 50;
        doc.setFillColor(18, 33, 20);
        doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'bold');
        doc.text('DADOS DO SOLICITANTE', 18, y + 5.5);
        y += 12;
        doc.setTextColor(30, 30, 30);
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        if (nomeDevedor) {
            doc.setFont('helvetica', 'bold');
            doc.text('Nome:', 14, y);
            doc.setFont('helvetica', 'normal');
            doc.text(nomeDevedor, 40, y);
            y += 7;
        }

        // CONDIÇÕES
        y += 4;
        doc.setFillColor(18, 33, 20);
        doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'bold');
        doc.text('CONDIÇÕES DO EMPRÉSTIMO', 18, y + 5.5);
        y += 12;

        doc.autoTable({
            startY: y,
            body: [
                [
                    { content: 'Valor Solicitado', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    { content: formatarReais(valor), styles: { fontStyle: 'bold', fontSize: 12, textColor: [13, 31, 15] } },
                    { content: 'Modalidade', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    modalidadeLabel
                ],
                [
                    { content: 'Taxa de Juros', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    taxa.toFixed(2).replace('.', ',') + '% ao mês',
                    { content: 'Prazo', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    prazo ? prazo + ' meses' : 'Indefinido'
                ],
                [
                    { content: 'Parcela Inicial', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    { content: formatarReais(parcelaInicial), styles: { fontStyle: 'bold' } },
                    { content: 'Total de Juros', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    { content: formatarReais(totalJuros), styles: { textColor: [180, 50, 50] } }
                ],
                [
                    { content: 'Total a Pagar', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    { content: formatarReais(totalPago), styles: { fontStyle: 'bold' } },
                    { content: 'Custo Efetivo', styles: { fontStyle: 'bold', fillColor: [240, 248, 241] } },
                    formatarReais(totalPago - valor)
                ]
            ],
            bodyStyles: { fontSize: 10 },
            columnStyles: { 0: { cellWidth: 40 }, 1: { cellWidth: 51 }, 2: { cellWidth: 40 }, 3: { cellWidth: 51 } },
            margin: { left: 14, right: 14 },
            tableLineColor: [200, 220, 202],
            tableLineWidth: 0.3
        });

        y = doc.lastAutoTable.finalY + 10;

        // TABELA DE PARCELAS
        doc.setFillColor(18, 33, 20);
        doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'bold');
        doc.text('SIMULAÇÃO DE PARCELAS', 18, y + 5.5);
        y += 10;

        const parcelasExibir = tabela.slice(0, 24);
        const hasMais = tabela.length > 24;

        doc.autoTable({
            startY: y,
            head: [['Mês', 'Juros', 'Amortização', 'Parcela', 'Saldo Restante']],
            body: parcelasExibir.map(p => [
                p.mes,
                formatarReais(p.juros),
                formatarReais(p.amortizacao || (p.parcela - p.juros)),
                formatarReais(p.parcela),
                formatarReais(p.novoSaldo)
            ]),
            headStyles: {
                fillColor: [13, 31, 15], textColor: [34, 197, 94],
                fontStyle: 'bold', fontSize: 8
            },
            bodyStyles: { fontSize: 8 },
            alternateRowStyles: { fillColor: [245, 250, 246] },
            columnStyles: {
                1: { halign: 'right' }, 2: { halign: 'right' },
                3: { halign: 'right', fontStyle: 'bold' }, 4: { halign: 'right' }
            },
            margin: { left: 14, right: 14 }
        });

        y = doc.lastAutoTable.finalY + 4;

        if (hasMais) {
            doc.setFontSize(8);
            doc.setTextColor(148, 163, 184);
            doc.text(`* Exibindo 24 de ${tabela.length} parcelas. Tabela completa disponível no sistema.`, 14, y);
            y += 8;
        }

        // RESUMO FINANCEIRO
        y += 4;
        doc.setFillColor(230, 255, 235);
        doc.roundedRect(14, y, 182, 28, 3, 3, 'F');
        doc.setDrawColor(34, 197, 94);
        doc.setLineWidth(0.5);
        doc.roundedRect(14, y, 182, 28, 3, 3, 'S');

        doc.setFontSize(9);
        doc.setTextColor(13, 31, 15);
        doc.setFont('helvetica', 'bold');
        doc.text('RESUMO', 18, y + 7);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9);
        const col1 = 14, col2 = 75, col3 = 135;

        doc.text('Valor do empréstimo:', col1 + 4, y + 14);
        doc.setFont('helvetica', 'bold');
        doc.text(formatarReais(valor), col1 + 4, y + 20);

        doc.setFont('helvetica', 'normal');
        doc.text('Total de juros:', col2, y + 14);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(180, 50, 50);
        doc.text(formatarReais(totalJuros), col2, y + 20);

        doc.setTextColor(13, 31, 15);
        doc.setFont('helvetica', 'normal');
        doc.text('Total a pagar:', col3, y + 14);
        doc.setFont('helvetica', 'bold');
        doc.text(formatarReais(totalPago), col3, y + 20);

        y += 36;

        // CONDIÇÕES GERAIS
        doc.setFillColor(18, 33, 20);
        doc.roundedRect(14, y, 182, 8, 2, 2, 'F');
        doc.setFontSize(9);
        doc.setTextColor(34, 197, 94);
        doc.setFont('helvetica', 'bold');
        doc.text('CONDIÇÕES GERAIS', 18, y + 5.5);
        y += 12;

        const condicoes = [
            '• Os juros incidem mensalmente sobre o saldo devedor.',
            '• Pagamentos antecipados reduzem o saldo e os juros futuros.',
            '• Esta proposta é válida por 7 dias a partir da data de emissão.',
            '• Os valores são simulados e podem ser ajustados em comum acordo.',
            `• Modalidade ${modalidadeLabel}: ` +
            (modalidade === 'price'
                ? 'parcela fixa durante todo o período.'
                : modalidade === 'sac'
                    ? 'amortização fixa e parcela decrescente a cada mês.'
                    : 'juros calculados sobre o saldo devedor a cada período.'),
        ];

        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(60, 60, 60);
        condicoes.forEach(linha => {
            doc.text(linha, 14, y);
            y += 6;
        });

        // ASSINATURA
        y += 8;
        doc.setDrawColor(180, 200, 182);
        doc.setLineWidth(0.3);
        doc.line(14, y, 90, y);
        doc.line(120, y, 196, y);

        doc.setFontSize(8);
        doc.setTextColor(148, 163, 184);
        doc.text('Credor', 52, y + 5, { align: 'center' });
        doc.text('Devedor', 158, y + 5, { align: 'center' });

        doc.setFontSize(7);
        doc.text('Data: ____/____/________', 14, y + 12);
        doc.text('Data: ____/____/________', 120, y + 12);

        // RODAPÉ
        const totalPgs = doc.internal.getNumberOfPages();
        for (let pg = 1; pg <= totalPgs; pg++) {
            doc.setPage(pg);
            doc.setFontSize(7);
            doc.setTextColor(148, 163, 184);
            doc.text(
                `Financier — ${numProposta} — Emitida em ${hoje}`,
                14, doc.internal.pageSize.height - 6
            );
            doc.text(
                `Página ${pg} de ${totalPgs}`,
                196, doc.internal.pageSize.height - 6,
                { align: 'right' }
            );
        }

        // SALVAR
        const nomeArquivo = `proposta-emprestimo-${(nomeDevedor || 'devedor').toLowerCase().replace(/\s+/g, '-')}-${new Date().toISOString().slice(0, 10)}.pdf`;
        doc.save(nomeArquivo);
        return nomeArquivo;
    },

    /**
     * Modal simples para solicitar nome do devedor antes de gerar proposta
     */
    solicitarNomeDevedor() {
        return new Promise(resolve => {
            const overlay = document.createElement('div');
            overlay.className = 'drawer-overlay drawer-open';
            overlay.style.cssText = 'display:flex;align-items:center;justify-content:center;';
            overlay.innerHTML = `
                <div style="
                    background:var(--bg-surface);
                    border:1px solid var(--border-normal);
                    border-radius:12px; padding:32px;
                    width:400px; z-index:300;
                    display:flex; flex-direction:column; gap:16px;"
                    onclick="event.stopPropagation()">
                    <h3 style="color:var(--text-primary);margin:0">Nome do Devedor</h3>
                    <p style="color:var(--text-secondary);font-size:13px;margin:0">
                        Informe o nome para constar na proposta. Deixe em branco para omitir.
                    </p>
                    <input id="input-nome-proposta" type="text" placeholder="Nome completo (opcional)" class="form-input" autofocus>
                    <div style="display:flex;gap:12px;justify-content:flex-end">
                        <button class="btn btn-ghost" id="btn-pular-nome">Pular</button>
                        <button class="btn btn-primary" id="btn-confirmar-nome">Confirmar</button>
                    </div>
                </div>
            `;
            document.body.appendChild(overlay);

            const fechar = (nome) => {
                overlay.remove();
                resolve(nome);
            };

            document.getElementById('btn-pular-nome').addEventListener('click', () => fechar(''));
            document.getElementById('btn-confirmar-nome').addEventListener('click', () => {
                fechar(document.getElementById('input-nome-proposta').value);
            });
            document.getElementById('input-nome-proposta').addEventListener('keydown', e => {
                if (e.key === 'Enter') fechar(e.target.value);
            });
            overlay.addEventListener('click', (e) => {
                if (e.target === overlay) fechar('');
            });
        });
    },

    /**
     * Compartilhar proposta via WhatsApp (texto formatado)
     */
    compartilharWhatsApp(dados) {
        const { nomeDevedor, valor, taxa, prazo, modalidade, parcelaInicial, totalPago } = dados;
        const modalidadeLabel = {
            livre: 'Juros Simples (Livre)',
            price: 'Price (Parcela Fixa)',
            sac: 'SAC (Amortização Fixa)'
        }[modalidade];

        const texto = `*PROPOSTA DE EMPRÉSTIMO — FINANCIER*

${nomeDevedor ? `👤 *Solicitante:* ${nomeDevedor}\n` : ''}💰 *Valor:* ${formatarReais(valor)}
📊 *Taxa:* ${taxa.toFixed(2).replace('.', ',')}% ao mês
📅 *Prazo:* ${prazo ? prazo + ' meses' : 'Indefinido'}
🏦 *Modalidade:* ${modalidadeLabel}

💵 *Parcela inicial:* ${formatarReais(parcelaInicial)}
💳 *Total a pagar:* ${formatarReais(totalPago)}

_Proposta válida por 7 dias._
_Gerada pelo Financier._`.trim();

        const url = 'https://wa.me/?text=' + encodeURIComponent(texto);
        window.open(url, '_blank');
    }
};

window.PropostaEmprestimo = PropostaEmprestimo;
