const fs = require('fs');

// Carregar calculos.js (simulando ambiente browser)
const calculosCode = fs.readFileSync('c:/financier-app/modules/calculos.js', 'utf8');
const window = {};
eval(calculosCode);
const Calculos = window.Calculos;

let erros = [];

function assert(condition, message) {
    if (!condition) {
        erros.push(message);
        console.error("FALHA:", message);
    } else {
        console.log("PASSOU:", message);
    }
}

// 1.1 a 1.4: gerarTabelaSAC(12000, 0.02, 4)
const tabela = Calculos.gerarTabelaSAC(12000, 0.02, 4);

// 1.1 Amortização fixa
assert(tabela.every(p => p.amortizacao === 3000), "1.1 Cálculo da amortização fixa (esperado 3000 em todos)");

// 1.2 Juros decrescentes
assert(tabela[0].juros === 240, "1.2 Juros mês 1 (esperado 240)");
assert(tabela[1].juros === 180, "1.2 Juros mês 2 (esperado 180)");
assert(tabela[2].juros === 120, "1.2 Juros mês 3 (esperado 120)");
assert(tabela[3].juros === 60,  "1.2 Juros mês 4 (esperado 60)");

// 1.3 Parcela decrescente
assert(tabela[0].parcela === 3240, "1.3 Parcela mês 1 (esperado 3240)");
assert(tabela[1].parcela === 3180, "1.3 Parcela mês 2 (esperado 3180)");
assert(tabela[2].parcela === 3120, "1.3 Parcela mês 3 (esperado 3120)");
assert(tabela[3].parcela === 3060, "1.3 Parcela mês 4 (esperado 3060)");

// 1.4 Saldo final zero
assert(tabela[3].novoSaldo === 0, "1.4 Saldo final zero (esperado 0)");

// 1.3 Gabarito PV=10000, 5%, 12m
const tab10k = Calculos.gerarTabelaSAC(10000, 0.05, 12);
assert(tab10k[0].parcela === 1100, "1.3 Gabarito: 10k P1 = 1100");
assert(tab10k[11].parcela === 850, "1.3 Gabarito: 10k P12 = 850");

// 1.5 Pagamento manual no SAC: calcularPagamentoSAC(5000, 0.05, 500, 10)
const pag = Calculos.calcularPagamentoSAC(5000, 0.05, 500, 10);
assert(pag.juros === 250, "1.5 Juros pag manual (esperado 250)");
assert(pag.amortizacao === 250, "1.5 Amort pag manual (esperado 250)");
assert(pag.novoSaldo === 4750, "1.5 Novo saldo pag manual (esperado 4750)");
assert(pag.parcelaIdeal === 750, "1.5 Parcela ideal (esperado 750)");

// 1.6 Simulação de antecipação: tabelaSAC(12k, 2%, 4m), depois antecipar 2
const ant = Calculos.simularAntecipacao(tabela, 2);
assert(ant.economiaJuros > 0, "1.6 Economia > 0");
assert(ant.parcelasRestantes === 2, "1.6 Parcelas restantes (esperado 2)");

console.log("\nErros encontrados:", erros.length);
if(erros.length > 0) process.exit(1);
