const fs = require('fs');
const code = fs.readFileSync('./modules/calculos.js', 'utf8');
global.window = {}; // mock window for node
eval(code);

let passed = 0; let failed = 0;
function assertMatch(name, expected, actual) {
    if (!actual) {
        console.log(`[FALHA] ${name}: Retorno indefinido`);
        failed++;
        return;
    }
    let ok = true;
    for(let k in expected) {
        if(actual[k] !== expected[k]) { ok = false; console.log(`[FALHA] ${name}: Esperado ${k}=${expected[k]}, Obtido ${k}=${actual[k]}`); }
    }
    if (ok) { console.log(`[PASSOU] ${name}`); passed++; } else { failed++; }
}

try {
    const pmt = calcularPMT(10000, 0.05, 12);
    if (pmt === 1128.25) { console.log('[PASSOU] 4.2 Criar empréstimo Price'); passed++; } 
    else { console.log('[FALHA] 4.2 Criar empréstimo Price. Obtido: ' + pmt); failed++; }

    assertMatch('5.1 SD=5000 taxa=5% pgto=500', { juros: 250, amortizacao: 250, novoSaldo: 4750 }, calcularPagamentoLivre(5000, 0.05, 500));
    assertMatch('5.2 SD=5000 taxa=5% pgto=200 alerta', { juros: 250, amortizacao: -50, alerta: true }, calcularPagamentoLivre(5000, 0.05, 200));
    assertMatch('5.3 SD=5000 taxa=5% pgto=250', { juros: 250, amortizacao: 0, novoSaldo: 5000 }, calcularPagamentoLivre(5000, 0.05, 250));
    assertMatch('5.4 SD=500 taxa=5% pgto=600 quitado', { juros: 25, amortizacao: 500, novoSaldo: 0, quitado: true }, calcularPagamentoLivre(500, 0.05, 600));

    console.log(`\n--- Math Unit Tests: ${passed} PASSOU, ${failed} FALHOU ---`);
} catch(e) {
    console.error(e);
}
