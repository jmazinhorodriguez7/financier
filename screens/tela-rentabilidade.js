// =============================================
// tela-rentabilidade.js — Índice de Rentabilidade
// =============================================

async function inicializarRentabilidade() {
  const container = document.getElementById('conteudo-principal');
  if (!container) return;

  const fmtPct = v =>
    (v || 0).toFixed(2).replace('.', ',') + '%';

  container.innerHTML = `
    <div class="tela-rentabilidade">

      <div class="tela-header">
        <div>
          <h1 class="tela-titulo">
            Índice de Rentabilidade
          </h1>
          <p class="tela-subtitulo">
            Taxa efetiva real da carteira considerando
            capital emprestado, juros recebidos e
            inadimplência.
          </p>
        </div>
      </div>

      <!-- Índice principal -->
      <div class="rent-destaque-wrapper"
        id="rent-destaque">
        <div class="skeleton" style="height:180px">
        </div>
      </div>

      <!-- Cards de métricas -->
      <div class="rent-metricas-grid"
        id="rent-metricas" style="margin-top:24px">
      </div>

      <!-- Gráfico de rentabilidade mensal -->
      <div class="rm-grafico-wrapper" style="margin-top:24px">
        <div class="rm-grafico-header">
          <span class="rm-secao-titulo">
            Rentabilidade Mensal Efetiva
          </span>
          <span style="font-size:12px;
            color:var(--text-muted)">
            Juros recebidos ÷ Capital em risco
          </span>
        </div>
        <div class="rm-grafico-container">
          <canvas id="grafico-rentabilidade"></canvas>
        </div>
      </div>

      <!-- Tabela por empréstimo -->
      <div class="rm-tabela-wrapper" style="margin-top:24px">
        <div class="rm-grafico-header">
          <span class="rm-secao-titulo">
            Rentabilidade por Empréstimo
          </span>
        </div>
        <div class="table-responsive">
          <table class="tabela-padrao">
            <thead>
              <tr>
                <th>Devedor</th>
                <th class="text-right">Capital</th>
                <th class="text-right">Saldo Atual</th>
                <th class="text-right">Juros Recebidos</th>
                <th class="text-right">Taxa Contratada</th>
                <th class="text-right">
                  Rentab. Efetiva
                </th>
                <th class="text-right">Status</th>
              </tr>
            </thead>
            <tbody id="rent-tabela-body">
            </tbody>
          </table>
        </div>
      </div>

    </div>
  `;

  await carregarDadosRentabilidade();
}

async function carregarDadosRentabilidade() {
  const supabase = window.FinancierDB;
  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);
  const fmtPct = v => (v || 0).toFixed(2).replace('.', ',') + '%';
  const arr = v => Math.round(v * 100) / 100;

  const { data: emprestimos, error } = await supabase
    .from('emprestimos')
    .select(`
      id,
      valor_principal,
      saldo_devedor,
      taxa_mensal,
      data_inicio,
      status,
      modalidade,
      devedores ( nome ),
      pagamentos (
        data_pagamento,
        valor_pago,
        valor_juros,
        valor_amortizacao
      )
    `)
    .in('status', ['ativo', 'quitado'])
    .order('created_at', { ascending: false });

  if (error || !emprestimos) return;

  // ── CÁLCULO DO ÍNDICE PRINCIPAL ──────────────────────

  // Capital total investido (emprestado)
  const capitalTotal = arr(
    emprestimos.reduce(
      (a, e) => a + (e.valor_principal || 0), 0
    )
  );

  // Capital em risco hoje (apenas ativos)
  const ativos = emprestimos.filter(
    e => e.status === 'ativo'
  );
  const capitalEmRisco = arr(
    ativos.reduce((a, e) => a + (e.saldo_devedor || 0), 0)
  );

  // Total de juros recebidos (histórico completo)
  const todosPagementos = emprestimos.flatMap(
    e => e.pagamentos || []
  );
  const totalJurosRecebidos = arr(
    todosPagementos.reduce(
      (a, p) => a + (p.valor_juros || 0), 0
    )
  );

  // Capital inadimplente (atrasado > 30 dias)
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  let capitalInadimplente = 0;

  ativos.forEach(emp => {
    const pgtos = (emp.pagamentos || []).sort(
      (a, b) => new Date(b.data_pagamento)
               - new Date(a.data_pagamento)
    );
    const ultimo = pgtos[0];
    const base = ultimo
      ? new Date(ultimo.data_pagamento + 'T00:00:00')
      : new Date(emp.data_inicio + 'T00:00:00');
    const proxVenc = new Date(base);
    proxVenc.setMonth(proxVenc.getMonth() + 1);
    
    const diasAtraso = Math.floor(
      (hoje - proxVenc) / (1000 * 60 * 60 * 24)
    );
    if (diasAtraso > 15) { // Reduzi para 15 dias de tolerância
      capitalInadimplente += (emp.saldo_devedor || 0);
    }
  });
  capitalInadimplente = arr(capitalInadimplente);

  // Duração média em meses desde o início
  const anoAtual = hoje.getFullYear();
  const mesAtual = hoje.getMonth();

  // Taxa efetiva mensal real
  let somaMesesPonderada = 0;
  let somaSaldos = 0;

  ativos.forEach(emp => {
    const inicio = new Date(emp.data_inicio + 'T00:00:00');
    const meses = Math.max(1,
      (anoAtual - inicio.getFullYear()) * 12 +
      (mesAtual - inicio.getMonth())
    );
    somaMesesPonderada += meses * (emp.saldo_devedor || 0);
    somaSaldos += (emp.saldo_devedor || 0);
  });

  const mediasMeses = somaSaldos > 0
    ? somaMesesPonderada / somaSaldos : 12;

  const taxaEfetivaMensal = capitalEmRisco > 0
    ? (totalJurosRecebidos / capitalEmRisco)
      / Math.max(mediasMeses, 1)
    : 0;
  const taxaEfetivaAnual = arr(
    ((Math.pow(1 + taxaEfetivaMensal, 12) - 1) * 100)
  );

  // Taxa média contratada anual
  const taxaMediaContratada = ativos.length > 0
    ? arr(
        ((Math.pow(
          1 + (ativos.reduce(
            (a, e) => a + (e.taxa_mensal || 0), 0
          ) / ativos.length),
          12
        ) - 1) * 100)
      )
    : 0;

  // Score de saúde da carteira 0-100
  const percInadimplente = capitalEmRisco > 0
    ? (capitalInadimplente / capitalEmRisco) * 100 : 0;
  const scoreBase = 100 - percInadimplente * 2;
  const score = Math.max(0, Math.min(100,
    Math.round(scoreBase)
  ));

  let scoreCor, scoreLabel;
  if (score >= 85) {
    scoreCor = '#22c55e'; scoreLabel = 'Excelente';
  } else if (score >= 70) {
    scoreCor = '#84cc16'; scoreLabel = 'Boa';
  } else if (score >= 50) {
    scoreCor = '#f59e0b'; scoreLabel = 'Regular';
  } else {
    scoreCor = '#ef4444'; scoreLabel = 'Crítica';
  }

  // ── RENDERIZAR DESTAQUE PRINCIPAL ────────────────────
  const destaque = document.getElementById('rent-destaque');
  if (destaque) {
    destaque.innerHTML = `
      <div class="rent-destaque-grid">

        <div class="rent-indice-principal">
          <span class="rent-indice-label">
            Rentabilidade Efetiva Anual
          </span>
          <span class="rent-indice-valor"
            style="color:${taxaEfetivaAnual >= 0
              ? '#22c55e' : '#ef4444'}">
            ${fmtPct(taxaEfetivaAnual)}
          </span>
          <span class="rent-indice-sub">
            ao ano sobre o capital em risco
          </span>
          <div class="rent-comparativo">
            <span>Taxa contratada média:</span>
            <strong>${fmtPct(taxaMediaContratada)} a.a.</strong>
          </div>
          <div class="rent-comparativo ${
            taxaEfetivaAnual >= taxaMediaContratada * 0.8
              ? 'positivo' : 'negativo'
          }">
            <span>Eficiência da carteira:</span>
            <strong>
              ${taxaMediaContratada > 0
                ? ((taxaEfetivaAnual /
                    taxaMediaContratada) * 100)
                  .toFixed(0) + '%'
                : '—'}
              do potencial
            </strong>
          </div>
        </div>

        <div class="rent-score-wrapper">
          <span class="rent-score-label">
            Saúde da Carteira
          </span>
          <div class="rent-score-circulo"
            style="--score-cor:${scoreCor}">
            <svg viewBox="0 0 100 100">
              <circle cx="50" cy="50" r="40"
                fill="none" stroke="rgba(255,255,255,0.05)"
                stroke-width="10"/>
              <circle cx="50" cy="50" r="40"
                fill="none" stroke="${scoreCor}"
                stroke-width="10"
                stroke-dasharray="${
                  2 * Math.PI * 40 * score / 100
                } ${2 * Math.PI * 40}"
                stroke-dashoffset="${2 * Math.PI * 40 * 0.25}"
                stroke-linecap="round"/>
              <text x="50" y="48"
                text-anchor="middle"
                font-size="20" font-weight="bold"
                fill="${scoreCor}">${score}</text>
              <text x="50" y="64"
                text-anchor="middle"
                font-size="10"
                fill="#94a3b8">${scoreLabel}</text>
            </svg>
          </div>
          <span class="rent-score-sub"
            style="color:${scoreCor}">
            ${percInadimplente.toFixed(1)
              .replace('.',',')}% inadimplente
          </span>
        </div>

      </div>
    `;
  }

  // ── CARDS DE MÉTRICAS ────────────────────────────────
  const metricas = document.getElementById('rent-metricas');
  if (metricas) {
    metricas.innerHTML = `
      <div class="rm-card">
        <span class="rm-card-icone">💼</span>
        <span class="rm-card-label">Capital Total</span>
        <span class="rm-card-valor">
          ${fmt(capitalTotal)}
        </span>
        <span class="rm-card-sub">
          emprestado historicamente
        </span>
      </div>
      <div class="rm-card">
        <span class="rm-card-icone">⚡</span>
        <span class="rm-card-label">Capital em Risco</span>
        <span class="rm-card-valor">
          ${fmt(capitalEmRisco)}
        </span>
        <span class="rm-card-sub">
          saldo total dos ativos
        </span>
      </div>
      <div class="rm-card destaque-juros">
        <span class="rm-card-icone">💰</span>
        <span class="rm-card-label">
          Juros Recebidos
        </span>
        <span class="rm-card-valor positivo">
          ${fmt(totalJurosRecebidos)}
        </span>
        <span class="rm-card-sub">
          histórico completo
        </span>
      </div>
      <div class="rm-card ${
        capitalInadimplente > 0
          ? 'destaque-pendente' : ''
      }">
        <span class="rm-card-icone">⚠️</span>
        <span class="rm-card-label">Inadimplente</span>
        <span class="rm-card-valor ${
          capitalInadimplente > 0 ? 'pendente' : ''
        }">
          ${fmt(capitalInadimplente)}
        </span>
        <span class="rm-card-sub">
          ${percInadimplente.toFixed(1)
            .replace('.',',')}% da carteira ativa
        </span>
      </div>
    `;
  }

  // ── GRÁFICO DE RENTABILIDADE MENSAL ─────────────────
  const mesesLabels = Array.from({length: 12}, (_, i) =>
    new Date(anoAtual, i).toLocaleDateString('pt-BR', {
      month: 'short'
    }).replace('.','')
  );

  const rentPorMes = Array(12).fill(0);
  const capitalPorMes = Array(12).fill(0);

  ativos.forEach(emp => {
    const mesInicio = new Date(
      emp.data_inicio + 'T00:00:00'
    ).getMonth();
    for (let m = mesInicio; m < 12; m++) {
      capitalPorMes[m] += (emp.saldo_devedor || 0);
    }
  });

  todosPagementos.forEach(p => {
    const d = new Date(p.data_pagamento + 'T00:00:00');
    if (d.getFullYear() === anoAtual) {
      const m = d.getMonth();
      rentPorMes[m] += (p.valor_juros || 0);
    }
  });

  const taxasMensais = rentPorMes.map((j, i) => {
    const cap = capitalPorMes[i];
    return cap > 0 ? arr((j / cap) * 100) : null;
  });

  let graficoRent = null;
  const ctxR = document.getElementById(
    'grafico-rentabilidade'
  )?.getContext('2d');
  if (ctxR) {
    if (graficoRent) graficoRent.destroy();
    graficoRent = new Chart(ctxR, {
      type: 'bar',
      data: {
        labels: mesesLabels,
        datasets: [{
          label: 'Rentabilidade Mensal (%)',
          data: taxasMensais,
          backgroundColor: taxasMensais.map(v =>
            v === null ? 'rgba(255,255,255,0.05)'
            : v > 0 ? 'rgba(34,197,94,0.7)'
            : 'rgba(239,68,68,0.7)'
          ),
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: ctx => ctx.parsed.y !== null
                ? ` ${fmtPct(ctx.parsed.y)}` : ' —'
            }
          }
        },
        scales: {
          x: {
            ticks: { color: '#94a3b8' },
            grid: { color: 'rgba(255,255,255,0.05)' }
          },
          y: {
            ticks: {
              color: '#94a3b8',
              callback: v => v + '%'
            },
            grid: { color: 'rgba(255,255,255,0.05)' }
          }
        }
      }
    });
  }

  // ── TABELA POR EMPRÉSTIMO ────────────────────────────
  const tbody = document.getElementById('rent-tabela-body');
  if (tbody) {
    tbody.innerHTML = emprestimos.map(emp => {
      const pgtos = emp.pagamentos || [];
      const jurosEmp = arr(
        pgtos.reduce((a, p) => a + (p.valor_juros||0), 0)
      );
      const taxaEfMensal = emp.valor_principal > 0
        && pgtos.length > 0
        ? jurosEmp / emp.valor_principal / pgtos.length
        : 0;
      const taxaEfAnual = arr(
        (Math.pow(1 + taxaEfMensal, 12) - 1) * 100
      );
      const taxaContAnual = arr(
        (Math.pow(1 + (emp.taxa_mensal || 0), 12) - 1) * 100
      );

      return `
        <tr onclick="sessionStorage.setItem(
          '_abrir_emprestimo','${emp.id}');
          window.navegarPara('detalhe-emprestimo')"
          style="cursor:pointer">
          <td>
            <strong>
              ${emp.devedores?.nome || '—'}
            </strong>
          </td>
          <td class="text-right">
            ${fmt(emp.valor_principal)}
          </td>
          <td class="text-right">
            ${fmt(emp.saldo_devedor)}
          </td>
          <td class="text-right positivo">
            ${fmt(jurosEmp)}
          </td>
          <td class="text-right">
            ${fmtPct((emp.taxa_mensal || 0) * 100)} m.
            / ${fmtPct(taxaContAnual)} a.
          </td>
          <td class="text-right">
            <strong style="color:${
              taxaEfAnual >= taxaContAnual * 0.8
                ? '#22c55e' : '#f59e0b'
            }">
              ${fmtPct(taxaEfAnual)} a.a.
            </strong>
          </td>
          <td class="text-right">
            <span class="badge ${
              emp.status === 'quitado'
                ? 'badge-normal' : 'badge-ativo'
            }">
              ${emp.status === 'quitado'
                ? '✓ Quitado' : '● Ativo'}
            </span>
          </td>
        </tr>
      `;
    }).join('');
  }
}

// Exportar globalmente para o roteador do app.js
window.TelaRentabilidade = { render: inicializarRentabilidade };
