// ============================================================
// Validadores — Funções de validação de entrada
// ============================================================

/**
 * Valida formato de e-mail
 * @param {string} email
 * @returns {boolean}
 */
function validarEmail(email) {
    if (!email || typeof email !== 'string') return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(email.trim());
}

/**
 * Valida senha com mínimo de 6 caracteres
 * @param {string} senha
 * @returns {boolean}
 */
function validarSenha(senha) {
    if (!senha || typeof senha !== 'string') return false;
    return senha.length >= 6;
}

/**
 * Valida valor monetário positivo
 * @param {number} valor
 * @returns {boolean}
 */
function validarValor(valor) {
    if (valor === null || valor === undefined) return false;
    const num = Number(valor);
    return !isNaN(num) && num > 0;
}

/**
 * Valida taxa de juros positiva
 * @param {number} taxa - Taxa mensal em percentual (ex: 5 para 5%)
 * @returns {boolean}
 */
function validarTaxa(taxa) {
    if (taxa === null || taxa === undefined) return false;
    const num = Number(taxa);
    return !isNaN(num) && num > 0 && num <= 100;
}

/**
 * Valida que uma data não é anterior a outra
 * @param {Date|string} data - Data a validar
 * @param {Date|string} dataMinima - Data mínima
 * @returns {boolean}
 */
function validarDataMinima(data, dataMinima) {
    const d1 = new Date(data);
    const d2 = new Date(dataMinima);
    if (isNaN(d1.getTime()) || isNaN(d2.getTime())) return false;
    return d1 >= d2;
}

/**
 * Valida campo obrigatório (não vazio)
 * @param {string} valor
 * @returns {boolean}
 */
function validarObrigatorio(valor) {
    if (valor === null || valor === undefined) return false;
    return String(valor).trim().length > 0;
}

// Exporta para uso global
window.Validadores = {
    validarEmail,
    validarSenha,
    validarValor,
    validarTaxa,
    validarDataMinima,
    validarObrigatorio
};
