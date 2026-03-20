import { 
  calcularPagamentoLivre, 
  calcularPMT 
} from '../modules/calculos.js';

let passou = 0;
let falhou = 0;

function assert(descricao, condicao) {
  if (condicao) {
    console.log(`✅ ${descricao}`);
    passou++;
  } else {
    console.error(`❌ ${descricao}`);
    falhou++;
  }
}

// Teste 1 — Pagamento normal
const t1 = calcularPagamentoLivre(5000, 0.05, 500);
assert('T1: Juros corretos', t1.juros === 250);
assert('T1: Amortização correta', t1.amortizacao === 250);
assert('T1: Novo saldo correto', t1.novoSaldo === 4750);

// Teste 2 — Pagamento insuficiente
const t2 = calcularPagamentoLivre(5000, 0.05, 200);
assert('T2: Saldo cresceu', t2.novoSaldo === 5050);
assert('T2: Alerta ativado', t2.alerta === true);

// Teste 3 — Apenas juros
const t3 = calcularPagamentoLivre(5000, 0.05, 250);
assert('T3: Amortização zero', t3.amortizacao === 0);
assert('T3: Saldo mantido', t3.novoSaldo === 5000);

// Teste 4 — Quitação
const t4 = calcularPagamentoLivre(500, 0.05, 600);
assert('T4: Empréstimo quitado', t4.quitado === true);
assert('T4: Saldo zerado', t4.novoSaldo === 0);

// Teste 5 — PMT Price
const pmt = calcularPMT(10000, 0.05, 12);
assert('T5: PMT Price correto', pmt === 1128.25);

console.log(`\nResultado: ${passou} passou | ${falhou} falhou`);
