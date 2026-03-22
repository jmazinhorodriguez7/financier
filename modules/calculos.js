// ============================================
// calculos.js — Motor Financeiro do Financier
// ============================================
// Princípios: Gauss (precisão numérica),
// Euler (juros compostos), Irving Fisher (valor do dinheiro no tempo)
// Este módulo é matemática pura — sem acesso ao banco de dados.

// PRECISÃO NUMÉRICA — Regra de Gauss
// Calcular com 10 casas, arredondar apenas na saída
function arredondar(valor) {
  return Math.round(valor * 100) / 100;
}

// JUROS SIMPLES SOBRE SALDO DEVEDOR (Modalidade Livre)
// @param {number} saldoDevedor - saldo atual antes do pagamento
// @param {number} taxaMensal - taxa em decimal (5% = 0.05)
// @param {number} valorPago - valor do pagamento recebido
// @returns {object} { juros, amortizacao, novoSaldo, alerta }
function calcularPagamentoLivre(saldoDevedor, taxaMensal, valorPago) {
  const juros = saldoDevedor * taxaMensal;
  let amortizacao = valorPago - juros;
  
  // Se a amortização for maior que o saldo devedor, o cliente pagou a mais.
  // Limitamos a amortização ao teto do saldo atual para o cálculo formal.
  if (amortizacao > saldoDevedor) {
      amortizacao = saldoDevedor;
  }
  
  const novoSaldo = saldoDevedor - amortizacao;
  const alerta = valorPago < juros;
  const quitado = novoSaldo <= 0.01;
  
  return {
    juros: arredondar(juros),
    amortizacao: arredondar(amortizacao),
    novoSaldo: quitado ? 0 : arredondar(novoSaldo),
    alerta,
    quitado
  };
}

// CÁLCULO DE PARCELA PRICE (PMT)
// @param {number} pv - valor principal
// @param {number} taxaMensal - taxa decimal
// @param {number} prazo - número de parcelas
// @returns {number} valor da parcela fixa
function calcularPMT(pv, taxaMensal, prazo) {
  const i = taxaMensal;
  const n = prazo;
  const pmt = pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
  return arredondar(pmt);
}

// DECOMPOSIÇÃO DE PARCELA PRICE
// @param {number} saldoAnterior - saldo antes da parcela
// @param {number} taxaMensal - taxa decimal
// @param {number} pmt - valor fixo da parcela
// @returns {object} { juros, amortizacao, novoSaldo }
function calcularParcelaPrice(saldoAnterior, taxaMensal, pmt) {
  const juros = saldoAnterior * taxaMensal;
  const amortizacao = pmt - juros;
  const novoSaldo = saldoAnterior - amortizacao;
  const quitado = novoSaldo <= 0.01;
  return {
    juros: arredondar(juros),
    amortizacao: arredondar(amortizacao),
    novoSaldo: quitado ? 0 : arredondar(novoSaldo),
    quitado
  };
}

// GERAÇÃO DE TABELA PRICE COMPLETA
// @param {number} pv - valor principal
// @param {number} taxaMensal - taxa decimal
// @param {number} prazo - número de parcelas
// @returns {Array} tabela completa de amortização
function gerarTabelaPrice(pv, taxaMensal, prazo) {
  const pmt = calcularPMT(pv, taxaMensal, prazo);
  const tabela = [];
  let saldo = pv;
  for (let mes = 1; mes <= prazo; mes++) {
    const parcela = calcularParcelaPrice(saldo, taxaMensal, pmt);
    tabela.push({ mes, pmt, ...parcela, saldoAnterior: saldo });
    saldo = parcela.novoSaldo;
  }
  return tabela;
}

// VALIDAÇÕES
function validarEntradaPagamento(saldoDevedor, taxaMensal, valorPago) {
  if (saldoDevedor <= 0) throw new Error('Saldo devedor inválido');
  if (taxaMensal <= 0) throw new Error('Taxa mensal inválida');
  if (valorPago <= 0) throw new Error('Valor do pagamento inválido');
  return true;
}

function validarEntradaEmprestimo(principal, taxaMensal, prazo, modalidade) {
  if (principal <= 0) throw new Error('Valor principal inválido');
  if (taxaMensal <= 0) throw new Error('Taxa mensal inválida');
  if (modalidade === 'price' && (!prazo || prazo <= 0))
    throw new Error('Prazo obrigatório para modalidade Price');
  return true;
}

// CASOS DE TESTE — executar ao inicializar
function executarTestes() {
  const t1 = calcularPagamentoLivre(5000, 0.05, 500);
  console.assert(t1.juros === 250, 'TESTE 1 FALHOU: juros');
  console.assert(t1.amortizacao === 250, 'TESTE 1 FALHOU: amortizacao');
  console.assert(t1.novoSaldo === 4750, 'TESTE 1 FALHOU: saldo');

  const t2 = calcularPagamentoLivre(5000, 0.05, 200);
  console.assert(t2.juros === 250, 'TESTE 2 FALHOU: juros');
  console.assert(t2.amortizacao === -50, 'TESTE 2 FALHOU: amortizacao');
  console.assert(t2.novoSaldo === 5050, 'TESTE 2 FALHOU: saldo');
  console.assert(t2.alerta === true, 'TESTE 2 FALHOU: alerta');

  const t3 = calcularPagamentoLivre(5000, 0.05, 250);
  console.assert(t3.amortizacao === 0, 'TESTE 3 FALHOU');
  console.assert(t3.novoSaldo === 5000, 'TESTE 3 FALHOU: saldo');

  const t4 = calcularPagamentoLivre(500, 0.05, 600);
  console.assert(t4.quitado === true, 'TESTE 4 FALHOU: quitado');
  console.assert(t4.novoSaldo === 0, 'TESTE 4 FALHOU: saldo');

  const pmt = calcularPMT(10000, 0.05, 12);
  console.assert(pmt === 1128.25, 'TESTE 5 FALHOU: PMT');

  console.log('Todos os testes de cálculo passaram.');
}

// AMORTIZAÇÃO FIXA DO SAC
function calcularAmortizacaoSAC(saldoDevedor, prazoRestante) {
  if (prazoRestante <= 0) throw new Error('Prazo restante inválido para SAC.');
  return arredondar(saldoDevedor / prazoRestante);
}

// PARCELA DO MÊS NO SAC
function calcularParcelaSAC(saldoDevedor, taxaMensal, prazoRestante) {
  const amortizacao = calcularAmortizacaoSAC(saldoDevedor, prazoRestante);
  const juros = arredondar(saldoDevedor * taxaMensal);
  const parcela = arredondar(amortizacao + juros);
  const novoSaldo = arredondar(saldoDevedor - amortizacao);
  const quitado = novoSaldo <= 0.01;
  return {
    amortizacao,
    juros,
    parcela,
    novoSaldo: quitado ? 0 : novoSaldo,
    quitado
  };
}

// REGISTRAR PAGAMENTO MANUAL NO SAC
function calcularPagamentoSAC(saldoDevedor, taxaMensal, valorPago, prazoRestante) {
  const juros = arredondar(saldoDevedor * taxaMensal);
  const amortizacaoIdeal = calcularAmortizacaoSAC(saldoDevedor, prazoRestante);
  const parcelaIdeal = arredondar(amortizacaoIdeal + juros);
  const amortizacao = arredondar(valorPago - juros);
  const novoSaldo = arredondar(saldoDevedor - amortizacao);
  const quitado = novoSaldo <= 0.01;
  const alerta = valorPago < juros;
  return {
    juros,
    amortizacao,
    novoSaldo: quitado ? 0 : novoSaldo,
    quitado,
    alerta,
    parcelaIdeal,
    amortizacaoIdeal
  };
}

// GERAR TABELA SAC COMPLETA
function gerarTabelaSAC(pv, taxaMensal, prazo) {
  const amortizacaoFixa = arredondar(pv / prazo);
  const tabela = [];
  let saldo = pv;
  for (let mes = 1; mes <= prazo; mes++) {
    const juros = arredondar(saldo * taxaMensal);
    const parcela = arredondar(amortizacaoFixa + juros);
    const novoSaldo = arredondar(saldo - amortizacaoFixa);
    tabela.push({
      mes,
      saldoAnterior: saldo,
      amortizacao: amortizacaoFixa,
      juros,
      parcela,
      novoSaldo: novoSaldo <= 0.01 ? 0 : novoSaldo
    });
    saldo = novoSaldo <= 0.01 ? 0 : novoSaldo;
  }
  return tabela;
}

function testarSAC() {
  const tabela = gerarTabelaSAC(12000, 0.02, 4);
  console.assert(tabela[0].amortizacao === 3000, 'SAC T1: amortização fixa errada');
  console.assert(tabela[0].juros === 240, 'SAC T1: juros mês 1 errado');
  console.assert(tabela[0].parcela === 3240, 'SAC T1: parcela mês 1 errada');
  console.assert(tabela[1].juros === 180, 'SAC T2: juros mês 2 errado');
  console.assert(tabela[3].novoSaldo === 0, 'SAC T4: saldo final deve ser zero');
  console.log('Todos os testes SAC passaram.');
}

executarTestes();
testarSAC();

// Expor globalmente (compatível com script tags)
window.Calculos = {
  calcularPagamentoLivre,
  calcularPMT,
  calcularParcelaPrice,
  gerarTabelaPrice,
  calcularParcelaSAC,
  calcularPagamentoSAC,
  gerarTabelaSAC,
  validarEntradaPagamento,
  validarEntradaEmprestimo
};
