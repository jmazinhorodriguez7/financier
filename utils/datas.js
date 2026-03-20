// ============================================================
// Datas — Utilitários de manipulação de datas
// ============================================================

/**
 * Calcula a diferença em dias entre duas datas
 * @param {Date|string} data1
 * @param {Date|string} data2
 * @returns {number} Número de dias (positivo se data2 > data1)
 */
function diasEntreDatas(data1, data2) {
    const d1 = new Date(data1);
    const d2 = new Date(data2);
    const diffMs = d2.getTime() - d1.getTime();
    return Math.round(diffMs / (1000 * 60 * 60 * 24));
}

/**
 * Formata uma data como ISO string (YYYY-MM-DD)
 * @param {Date|string} data
 * @returns {string}
 */
function formatarDataISO(data) {
    const d = new Date(data);
    if (isNaN(d.getTime())) return '';
    return d.toISOString().split('T')[0];
}

/**
 * Adiciona meses a uma data
 * @param {Date|string} data
 * @param {number} meses
 * @returns {Date}
 */
function adicionarMeses(data, meses) {
    const d = new Date(data);
    d.setMonth(d.getMonth() + meses);
    return d;
}

/**
 * Retorna a data de hoje formatada como ISO
 * @returns {string} YYYY-MM-DD
 */
function hojeISO() {
    return formatarDataISO(new Date());
}

/**
 * Calcula meses decorridos entre duas datas
 * @param {Date|string} dataInicio
 * @param {Date|string} dataFim
 * @returns {number}
 */
function mesesEntreDatas(dataInicio, dataFim) {
    const d1 = new Date(dataInicio);
    const d2 = new Date(dataFim);
    return (d2.getFullYear() - d1.getFullYear()) * 12 + (d2.getMonth() - d1.getMonth());
}

/**
 * Verifica se uma data já passou
 * @param {Date|string} data
 * @returns {boolean}
 */
function dataPassou(data) {
    const d = new Date(data);
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);
    d.setHours(0, 0, 0, 0);
    return d < hoje;
}

// Exporta para uso global
window.Datas = {
    diasEntreDatas,
    formatarDataISO,
    adicionarMeses,
    hojeISO,
    mesesEntreDatas,
    dataPassou
};
