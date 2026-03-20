// ============================================================
// Formatadores — Utilitários de formatação pt-BR
// ============================================================

/**
 * Formata um valor numérico como moeda brasileira (R$)
 * @param {number} valor - Valor a formatar
 * @returns {string} Valor formatado como R$ 1.234,56
 */
function formatarReais(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(valor);
}

/**
 * Formata um percentual com duas casas decimais
 * @param {number} valor - Valor decimal (ex: 0.05 para 5%)
 * @returns {string} Percentual formatado como "5,00%"
 */
function formatarPercentual(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return '0,00%';
    const percentual = valor * 100;
    return percentual.toFixed(2).replace('.', ',') + '%';
}

/**
 * Formata percentual a partir de valor já multiplicado (ex: 5 → "5,00%")
 * @param {number} valor - Valor já em percentual
 * @returns {string} Percentual formatado
 */
function formatarPercentualDireto(valor) {
    if (valor === null || valor === undefined || isNaN(valor)) return '0,00%';
    return valor.toFixed(2).replace('.', ',') + '%';
}

/**
 * Formata uma data para o padrão brasileiro DD/MM/AAAA
 * @param {Date|string} data - Data a formatar
 * @returns {string} Data formatada
 */
function formatarData(data) {
    if (!data) return '--';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

/**
 * Formata uma data para exibição curta DD/MM
 * @param {Date|string} data - Data a formatar
 * @returns {string} Data formatada
 */
function formatarDataCurta(data) {
    if (!data) return '--';
    const d = new Date(data);
    if (isNaN(d.getTime())) return '--';
    return d.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit'
    });
}

/**
 * Converte string monetária (R$ 1.234,56) para número
 * @param {string} texto - Texto com valor monetário
 * @returns {number} Valor numérico
 */
function parseMoeda(texto) {
    if (!texto) return 0;
    const limpo = texto.replace(/[R$\s.]/g, '').replace(',', '.');
    const valor = parseFloat(limpo);
    return isNaN(valor) ? 0 : valor;
}

/**
 * Retorna a inicial maiúscula de um nome
 * @param {string} nome - Nome completo
 * @returns {string} Primeira letra maiúscula
 */
function obterInicial(nome) {
    if (!nome) return '?';
    return nome.trim().charAt(0).toUpperCase();
}

// Exporta para uso global
window.Formatadores = {
    formatarReais,
    formatarPercentual,
    formatarPercentualDireto,
    formatarData,
    formatarDataCurta,
    parseMoeda,
    obterInicial
};
