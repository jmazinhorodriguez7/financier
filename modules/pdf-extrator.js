// ============================================
// pdf-extrator.js — Parseador Lógico de PDF
// ============================================

const PdfExtrator = {
    /**
     * Recebe um ArrayBuffer de um arquivo PDF e extrai as linhas financeiras.
     * @param {ArrayBuffer} arrayBuffer 
     * @returns {Promise<Array>} Array de objetos processados
     */
    async parse(arrayBuffer) {
        try {
            // Documentação do PDF.js: Carrega o documento Uint8Array
            const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
            const pdf = await loadingTask.promise;
            const result = [];
            
            for (let i = 1; i <= pdf.numPages; i++) {
                const page = await pdf.getPage(i);
                const content = await page.getTextContent();
                
                // Agrupar itens de texto por coordenada Y (linhas horizontais)
                const lines = {};
                content.items.forEach(item => {
                    const y = Math.round(item.transform[5]); 
                    if (!lines[y]) lines[y] = [];
                    lines[y].push(item);
                });
                
                // Ordenar do topo para a base
                const sortedY = Object.keys(lines).map(Number).sort((a, b) => b - a);
                
                // Construir strings completas por linha (esquerda pra direita)
                const textLines = sortedY.map(y => {
                    const lineItems = lines[y].sort((a, b) => a.transform[4] - b.transform[4]);
                    return lineItems.map(it => it.str).join(' ').replace(/\s+/g, ' ').trim();
                });
                
                // Processar cada linha com Regexes
                textLines.forEach(line => {
                    const regexData = /(\d{2})[\/\-](\d{2})[\/\-](\d{4})/;
                    const regexValor = /R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g;
                    
                    const dateMatch = line.match(regexData);
                    const valueMatches = [...line.matchAll(regexValor)];
                    
                    if (dateMatch && valueMatches.length > 0) {
                        const dataRaw = dateMatch[0];
                        // Pega sempre a última correspondência de valor na linha
                        const valorRaw = valueMatches[valueMatches.length - 1][1]; 
                        const valorFullStr = valueMatches[valueMatches.length - 1][0];
                        
                        // Extrai a descrição removendo data e valor
                        let descricao = line.replace(dataRaw, '').replace(valorFullStr, '').trim();
                        // Limpa caracteres soltos nas pontas
                        descricao = descricao.replace(/^[-\|]\s*|\s*[-\|]$/g, '').trim();
                        
                        let tipo = 'indefinido';
                        const descrLower = descricao.toLowerCase();
                        if (descrLower.includes('recebid') || descrLower.includes('crédito') || descrLower.includes('credito') || descrLower.includes('depósito')) {
                            tipo = 'entrada';
                        } else if (descrLower.includes('enviad') || descrLower.includes('débito') || descrLower.includes('debito') || descrLower.includes('pagament')) {
                            tipo = 'saida';
                        }
                        
                        // Formatar Data ISO (YYYY-MM-DD)
                        const parts = dataRaw.split(/[\/\-]/);
                        const dataIso = `${parts[2]}-${parts[1]}-${parts[0]}`;
                        
                        // Formatar Valor numérico
                        const valorFloat = parseFloat(valorRaw.replace(/\./g, '').replace(',', '.'));
                        
                        if (!isNaN(valorFloat) && valorFloat > 0) {
                            result.push({
                                data: dataIso,
                                descricao: descricao || 'Lançamento extraído',
                                valor: valorFloat,
                                tipo: tipo
                            });
                        }
                    }
                });
            }
            return result;
        } catch (error) {
            console.error('Erro na extração do PDF:', error);
            if (error.name === 'PasswordException') {
                throw new Error('PROTECTED');
            }
            throw new Error('READ_FAIL');
        }
    }
};

window.PdfExtrator = PdfExtrator;
