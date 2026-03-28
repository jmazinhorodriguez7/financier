// =============================================
// tela-relatorio-mensal.js — Performance Mensal
// =============================================

async function inicializarRelatorioMensal() {
  const supabase = window.FinancierDB;
  const container = document.getElementById('conteudo-principal');
  if (!container) return;

  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);

  const fmtPct = v =>
    (v || 0).toFixed(2).replace('.', ',') + '%';

  const arr = v => Math.round(v * 100) / 100;

  container.innerHTML = `
    <div class="tela-relatorio">

      <div class="tela-header">
        <div>
          <h1 class="tela-titulo">Relatório Mensal</h1>
          <p class="tela-subtitulo">
            Performance consolidada mês a mês da carteira.
          </p>
        </div>
        <div style="display:flex;gap:10px;align-items:center;">
          <select id="sel-ano"
            class="input-select"
            onchange="trocarAno()">
          </select>
          <button class="btn-secundario"
            onclick="exportarRelatorioMensalPDF()">
            Exportar PDF
          </button>
        </div>
      </div>

      <!-- Cards de resumo do ano -->
      <div class="rm-cards-grid" id="rm-cards">
        <div class="skeleton" style="height:100px"></div>
        <div class="skeleton" style="height:100px"></div>
        <div class="skeleton" style="height:100px"></div>
        <div class="skeleton" style="height:100px"></div>
      </div>

      <!-- Gráfico de barras mensal -->
      <div class="rm-grafico-wrapper">
        <div class="rm-grafico-header">
          <span class="rm-secao-titulo">
            Recebimentos por Mês
          </span>
          <div class="rm-legenda">
            <span class="rm-legenda-item juros">
              Juros
            </span>
            <span class="rm-legenda-item amort">
              Amortização
            </span>
          </div>
        </div>
        <div class="rm-grafico-container">
          <canvas id="grafico-mensal"></canvas>
        </div>
      </div>

      <!-- Gráfico de linha — evolução da carteira -->
      <div class="rm-grafico-wrapper" style="margin-top:24px">
        <div class="rm-grafico-header">
          <span class="rm-secao-titulo">
            Evolução do Saldo Total da Carteira
          </span>
        </div>
        <div class="rm-grafico-container">
          <canvas id="grafico-carteira"></canvas>
        </div>
      </div>

      <!-- Tabela mensal detalhada -->
      <div class="rm-tabela-wrapper" style="margin-top:24px">
        <div class="rm-grafico-header">
          <span class="rm-secao-titulo">
            Detalhamento Mensal
          </span>
        </div>
        <div class="table-responsive">
          <table class="tabela-padrao">
            <thead>
              <tr>
                <th>Mês</th>
                <th class="text-right">Recebido</th>
                <th class="text-right">Juros</th>
                <th class="text-right">Amortização</th>
                <th class="text-right">Nº Pgtos</th>
                <th class="text-right">Saldo Carteira</th>
                <th class="text-right">vs Mês Ant.</th>
              </tr>
            </thead>
            <tbody id="rm-tabela-body">
              <tr><td colspan="7"
                style="text-align:center;
                  color:var(--text-muted);
                  padding:32px">
                Carregando...
              </td></tr>
            </tbody>
          </table>
        </div>
      </div>

      <!-- Ranking de devedores no ano -->
      <div class="rm-ranking-wrapper" style="margin-top:24px">
        <div class="rm-grafico-header">
          <span class="rm-secao-titulo">
            Ranking de Devedores — Juros Pagos no Ano
          </span>
        </div>
        <div id="rm-ranking-lista"></div>
      </div>

    </div>
  `;

  // Popular seletor de anos
  await popularSeletorAnos();

  // Carregar dados do ano atual
  const anoAtual = new Date().getFullYear();
  document.getElementById('sel-ano').value = anoAtual;
  await carregarDadosRelatorio(anoAtual);
}

// Popular seletor de anos com base nos pagamentos
async function popularSeletorAnos() {
  const supabase = window.FinancierDB;
  const { data: pgtos } = await supabase
    .from('pagamentos')
    .select('data_pagamento')
    .order('data_pagamento', { ascending: true });

  const anos = new Set();
  const anoAtual = new Date().getFullYear();
  anos.add(anoAtual);

  (pgtos || []).forEach(p => {
    if (p.data_pagamento) {
        const ano = new Date(p.data_pagamento + 'T00:00:00').getFullYear();
        anos.add(ano);
    }
  });

  const sel = document.getElementById('sel-ano');
  if (!sel) return;

  sel.innerHTML = '';
  [...anos].sort((a,b) => b - a).forEach(ano => {
    const opt = document.createElement('option');
    opt.value = ano;
    opt.textContent = ano;
    sel.appendChild(opt);
  });
}

// Trocar ano no seletor
window.trocarAno = async function() {
  const ano = parseInt(
    document.getElementById('sel-ano').value
  );
  await carregarDadosRelatorio(ano);
};

// Carregar e processar todos os dados do ano
async function carregarDadosRelatorio(ano) {
  const supabase = window.FinancierDB;
  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);
  const arr = v => Math.round(v * 100) / 100;

  // Buscar pagamentos do ano
  const dataInicio = `${ano}-01-01`;
  const dataFim = `${ano}-12-31`;

  const { data: pagamentos, error } = await supabase
    .from('pagamentos')
    .select(`
      data_pagamento,
      valor_pago,
      valor_juros,
      valor_amortizacao,
      saldo_apos,
      emprestimos (
        id,
        valor_principal,
        taxa_mensal,
        devedores ( nome )
      )
    `)
    .gte('data_pagamento', dataInicio)
    .lte('data_pagamento', dataFim)
    .order('data_pagamento', { ascending: true });

  if (error) {
    console.error('Erro ao buscar relatório:', error);
    return;
  }

  // Buscar saldo atual da carteira
  const { data: empAtivos } = await supabase
    .from('emprestimos')
    .select('saldo_devedor, valor_principal')
    .eq('status', 'ativo');

  const saldoAtual = (empAtivos || [])
    .reduce((a, e) => a + (e.saldo_devedor || 0), 0);

  // Processar por mês
  const meses = Array.from({length: 12}, (_, i) => ({
    mes: i,
    label: new Date(ano, i, 1).toLocaleDateString('pt-BR',
      { month: 'short' }).replace('.',''),
    labelCompleto: new Date(ano, i, 1)
      .toLocaleDateString('pt-BR',
        { month: 'long' }),
    totalRecebido: 0,
    totalJuros: 0,
    totalAmort: 0,
    qtdPgtos: 0,
    pagamentos: []
  }));

  (pagamentos || []).forEach(p => {
    const mes = new Date(
      p.data_pagamento + 'T00:00:00'
    ).getMonth();
    meses[mes].totalRecebido += (p.valor_pago || 0);
    meses[mes].totalJuros += (p.valor_juros || 0);
    meses[mes].totalAmort += (p.valor_amortizacao || 0);
    meses[mes].qtdPgtos++;
    meses[mes].pagamentos.push(p);
  });

  // Arredondar
  meses.forEach(m => {
    m.totalRecebido = arr(m.totalRecebido);
    m.totalJuros = arr(m.totalJuros);
    m.totalAmort = arr(m.totalAmort);
  });

  // Calcular totais do ano
  const totalAnoRecebido = arr(
    meses.reduce((a, m) => a + m.totalRecebido, 0)
  );
  const totalAnoJuros = arr(
    meses.reduce((a, m) => a + m.totalJuros, 0)
  );
  const totalAnoAmort = arr(
    meses.reduce((a, m) => a + m.totalAmort, 0)
  );
  const totalPgtos = meses.reduce(
    (a, m) => a + m.qtdPgtos, 0
  );
  const mediaMensal = arr(
    totalAnoRecebido / 12
  );

  // Identificar melhor e pior mês
  const mesesComDados = meses.filter(m => m.qtdPgtos > 0);
  const melhorMes = mesesComDados.length
    ? mesesComDados.reduce((a, b) =>
        a.totalRecebido > b.totalRecebido ? a : b)
    : null;

  // Ranking de devedores
  const rankingMap = {};
  (pagamentos || []).forEach(p => {
    const nome = p.emprestimos?.devedores?.nome || '—';
    if (!rankingMap[nome]) {
      rankingMap[nome] = {
        nome,
        totalJuros: 0,
        totalPago: 0,
        qtdPgtos: 0
      };
    }
    rankingMap[nome].totalJuros += (p.valor_juros || 0);
    rankingMap[nome].totalPago += (p.valor_pago || 0);
    rankingMap[nome].qtdPgtos++;
  });

  const ranking = Object.values(rankingMap)
    .sort((a, b) => b.totalJuros - a.totalJuros);

  // Renderizar tudo
  renderizarCardsAno(
    totalAnoRecebido, totalAnoJuros,
    totalAnoAmort, totalPgtos,
    mediaMensal, melhorMes
  );
  renderizarGraficoBarras(meses);
  renderizarGraficoCarteira(meses, saldoAtual, ano);
  renderizarTabelaMensal(meses);
  renderizarRanking(ranking, totalAnoJuros);

  // Guardar para exportação
  window._relatorioAtual = {
    ano, meses, totalAnoRecebido, totalAnoJuros,
    totalAnoAmort, totalPgtos, mediaMensal,
    melhorMes, ranking, saldoAtual
  };
}

// Cards do topo
function renderizarCardsAno(
  recebido, juros, amort, pgtos, media, melhorMes
) {
  const el = document.getElementById('rm-cards');
  if (!el) return;
  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);

  el.innerHTML = `
    <div class="rm-card">
      <span class="rm-card-icone">💰</span>
      <span class="rm-card-label">Total Recebido</span>
      <span class="rm-card-valor">${fmt(recebido)}</span>
      <span class="rm-card-sub">
        no ano selecionado
      </span>
    </div>
    <div class="rm-card destaque-juros">
      <span class="rm-card-icone">📈</span>
      <span class="rm-card-label">Total de Juros</span>
      <span class="rm-card-valor positivo">
        ${fmt(juros)}
      </span>
      <span class="rm-card-sub">
        ${recebido > 0
          ? ((juros/recebido)*100).toFixed(1)
            .replace('.',',') + '% do recebido'
          : '—'}
      </span>
    </div>
    <div class="rm-card">
      <span class="rm-card-icone">🔽</span>
      <span class="rm-card-label">Amortização</span>
      <span class="rm-card-valor">${fmt(amort)}</span>
      <span class="rm-card-sub">
        capital devolvido
      </span>
    </div>
    <div class="rm-card">
      <span class="rm-card-icone">📅</span>
      <span class="rm-card-label">Média Mensal</span>
      <span class="rm-card-valor">${fmt(media)}</span>
      <span class="rm-card-sub">
        ${pgtos} pagamento(s) no ano
      </span>
    </div>
    ${melhorMes ? `
      <div class="rm-card destaque-melhor">
        <span class="rm-card-icone">🏆</span>
        <span class="rm-card-label">Melhor Mês</span>
        <span class="rm-card-valor positivo">
          ${fmt(melhorMes.totalRecebido)}
        </span>
        <span class="rm-card-sub">
          ${melhorMes.labelCompleto}
        </span>
      </div>
    ` : ''}
  `;
}

// Gráfico de barras empilhadas
let graficoBarras = null;
function renderizarGraficoBarras(meses) {
  const ctx = document.getElementById(
    'grafico-mensal'
  )?.getContext('2d');
  if (!ctx) return;
  if (graficoBarras) graficoBarras.destroy();

  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);

  graficoBarras = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: meses.map(m => m.label),
      datasets: [
        {
          label: 'Juros',
          data: meses.map(m => m.totalJuros),
          backgroundColor: 'rgba(34,197,94,0.7)',
          borderRadius: 4
        },
        {
          label: 'Amortização',
          data: meses.map(m => m.totalAmort),
          backgroundColor: 'rgba(59,130,246,0.6)',
          borderRadius: 4
        }
      ]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` ${ctx.dataset.label}: ` +
              fmt(ctx.parsed.y)
          }
        }
      },
      scales: {
        x: {
          stacked: true,
          ticks: { color: '#94a3b8' },
          grid: { color: 'rgba(255,255,255,0.05)' }
        },
        y: {
          stacked: true,
          ticks: {
            color: '#94a3b8',
            callback: v => 'R$ ' +
              (v/1000).toFixed(0) + 'k'
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

// Gráfico de linha — evolução do saldo
let graficoCarteira = null;
function renderizarGraficoCarteira(meses, saldoAtual, ano) {
  const ctx = document.getElementById(
    'grafico-carteira'
  )?.getContext('2d');
  if (!ctx) return;
  if (graficoCarteira) graficoCarteira.destroy();

  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);
  const arr = v => Math.round(v * 100) / 100;

  // Reconstruir saldo mês a mês de trás para frente
  let saldo = saldoAtual;
  const saldosMeses = [];
  const hoje = new Date();
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  for (let i = 11; i >= 0; i--) {
    if (ano === anoAtual && i > mesAtual) {
      saldosMeses[i] = null;
    } else {
      saldosMeses[i] = arr(saldo);
      saldo += meses[i].totalAmort;
    }
  }

  graficoCarteira = new Chart(ctx, {
    type: 'line',
    data: {
      labels: meses.map(m => m.label),
      datasets: [{
        label: 'Saldo da Carteira',
        data: saldosMeses,
        borderColor: '#22c55e',
        backgroundColor: 'rgba(34,197,94,0.08)',
        borderWidth: 2,
        pointBackgroundColor: '#22c55e',
        pointRadius: 4,
        fill: true,
        tension: 0.4,
        spanGaps: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: ctx => ` Saldo: ${fmt(ctx.parsed.y)}`
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
            callback: v => 'R$ ' +
              (v/1000).toFixed(0) + 'k'
          },
          grid: { color: 'rgba(255,255,255,0.05)' }
        }
      }
    }
  });
}

// Tabela detalhada por mês
function renderizarTabelaMensal(meses) {
  const tbody = document.getElementById('rm-tabela-body');
  if (!tbody) return;

  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);
  const arr = v => Math.round(v * 100) / 100;

  const hoje = new Date();
  const mesAtual = hoje.getMonth();

  let html = '';
  let saldoAnterior = null;

  meses.forEach((m, i) => {
    if (m.qtdPgtos === 0 && i > mesAtual) return;

    const diff = saldoAnterior !== null
      ? arr(m.totalRecebido - saldoAnterior)
      : null;
    const diffHtml = diff !== null
      ? `<span style="color:${
          diff >= 0 ? '#22c55e' : '#ef4444'
        };font-weight:600">
          ${diff >= 0 ? '+' : ''}${fmt(diff)}
        </span>`
      : '—';

    const isMesAtual = i === mesAtual;

    html += `
      <tr style="${isMesAtual
        ? 'background:rgba(34,197,94,0.06);'
        : ''}">
        <td>
          <strong>${m.labelCompleto}</strong>
          ${isMesAtual
            ? '<span class="badge-atual">Atual</span>'
            : ''}
        </td>
        <td class="text-right">
          <strong>${fmt(m.totalRecebido)}</strong>
        </td>
        <td class="text-right positivo">
          ${fmt(m.totalJuros)}
        </td>
        <td class="text-right">
          ${fmt(m.totalAmort)}
        </td>
        <td class="text-right">
          ${m.qtdPgtos || '—'}
        </td>
        <td class="text-right">—</td>
        <td class="text-right">${diffHtml}</td>
      </tr>
    `;
    saldoAnterior = m.totalRecebido;
  });

  // Linha de total
  const totRecebido = arr(
    meses.reduce((a,m) => a + m.totalRecebido, 0)
  );
  const totJuros = arr(
    meses.reduce((a,m) => a + m.totalJuros, 0)
  );
  const totAmort = arr(
    meses.reduce((a,m) => a + m.totalAmort, 0)
  );
  const totPgtos = meses.reduce(
    (a,m) => a + m.qtdPgtos, 0
  );

  html += `
    <tr class="linha-total">
      <td><strong>TOTAL DO ANO</strong></td>
      <td class="text-right">
        <strong>${fmt(totRecebido)}</strong>
      </td>
      <td class="text-right positivo">
        <strong>${fmt(totJuros)}</strong>
      </td>
      <td class="text-right">
        <strong>${fmt(totAmort)}</strong>
      </td>
      <td class="text-right">
        <strong>${totPgtos}</strong>
      </td>
      <td class="text-right">—</td>
      <td class="text-right">—</td>
    </tr>
  `;

  tbody.innerHTML = html;
}

// Ranking de devedores
function renderizarRanking(ranking, totalJurosAno) {
  const el = document.getElementById('rm-ranking-lista');
  if (!el || ranking.length === 0) {
    if (el) el.innerHTML =
      '<p style="color:var(--text-muted);' +
      'padding:20px">Sem pagamentos no período.</p>';
    return;
  }

  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);

  el.innerHTML = ranking.map((r, i) => {
    const pct = totalJurosAno > 0
      ? (r.totalJuros / totalJurosAno) * 100
      : 0;
    return `
      <div class="ranking-item">
        <div class="ranking-pos">
          ${i === 0 ? '🥇' : i === 1
            ? '🥈' : i === 2
            ? '🥉' : `${i+1}º`}
        </div>
        <div class="ranking-avatar">
          ${r.nome.charAt(0).toUpperCase()}
        </div>
        <div class="ranking-info">
          <span class="ranking-nome">${r.nome}</span>
          <div class="ranking-barra-bg">
            <div class="ranking-barra-fill"
              style="width:${pct.toFixed(1)}%"></div>
          </div>
        </div>
        <div class="ranking-valores">
          <span class="ranking-juros positivo">
            ${fmt(r.totalJuros)}
          </span>
          <span class="ranking-pago">
            ${r.qtdPgtos} pgto(s) | ${fmt(r.totalPago)}
          </span>
        </div>
      </div>
    `;
  }).join('');
}

// Exportar globalmente para o roteador do app.js
window.TelaRelatorioMensal = { render: inicializarRelatorioMensal };

window.exportarRelatorioMensalPDF = function() {
  const dados = window._relatorioAtual;
  if (!dados) {
    App.showToast('Carregue os dados do relatório antes de exportar.', 'error');
    return;
  }

  try {
    const { jsPDF } = window.jspdf;
    if (!jsPDF) throw new Error('jsPDF não carregado');

    const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    const MESES_NOMES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

    const fmt = v => new Intl.NumberFormat('pt-BR', { style:'currency', currency:'BRL' }).format(v || 0);

    // Cabeçalho
    doc.setFillColor(6, 15, 7);
    doc.rect(0, 0, 210, 36, 'F');
    doc.setTextColor(34, 197, 94);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('FINANCIER', 14, 16);
    doc.setTextColor(241, 245, 249);
    doc.setFontSize(13);
    doc.text(`Relatório Mensal de Performance — ${dados.ano}`, 14, 26);
    doc.setFontSize(9);
    doc.setTextColor(148, 163, 184);
    doc.text(`Gerado em ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR', { hour:'2-digit', minute:'2-digit' })}`, 14, 33);

    // Cards de resumo
    let y = 48;
    doc.setTextColor(30, 30, 30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.text('RESUMO DO ANO', 14, y);
    y += 6;

    const kpis = [
      { label: 'Total Recebido', valor: fmt(dados.totalAnoRecebido) },
      { label: 'Total de Juros', valor: fmt(dados.totalAnoJuros) },
      { label: 'Amortização', valor: fmt(dados.totalAnoAmort) },
      { label: 'Nº de Pagamentos', valor: String(dados.totalPgtos) },
      { label: 'Média Mensal', valor: fmt(dados.mediaMensal) },
    ];

    if (dados.melhorMes) {
      kpis.push({ label: `Melhor Mês (${dados.melhorMes.labelCompleto})`, valor: fmt(dados.melhorMes.totalRecebido) });
    }

    const colW = 60;
    kpis.forEach((k, i) => {
      const col = i % 3;
      const row = Math.floor(i / 3);
      const x = 14 + col * colW;
      const yRow = y + row * 18;
      doc.setFillColor(243, 244, 246);
      doc.roundedRect(x, yRow, colW - 4, 14, 2, 2, 'F');
      doc.setFontSize(7.5);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 116, 139);
      doc.text(k.label, x + 4, yRow + 5);
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(15, 23, 42);
      doc.text(k.valor, x + 4, yRow + 11);
    });

    y += Math.ceil(kpis.length / 3) * 18 + 10;

    // Tabela mensal
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(11);
    doc.setTextColor(30, 30, 30);
    doc.text('DETALHAMENTO MENSAL', 14, y);
    y += 5;

    const headers = ['Mês', 'Recebido', 'Juros', 'Amortização', 'Pgtos'];
    const colWidths = [36, 38, 38, 38, 22];
    const tableLeft = 14;

    // Header da tabela
    doc.setFillColor(34, 197, 94);
    doc.rect(tableLeft, y, 172, 7, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(8);
    let xH = tableLeft + 2;
    headers.forEach((h, i) => {
      doc.text(h, xH, y + 5);
      xH += colWidths[i];
    });
    y += 7;

    dados.meses.forEach((m, idx) => {
      if (y > 265) {
        doc.addPage();
        y = 20;
      }
      const bg = idx % 2 === 0 ? [249, 250, 251] : [255, 255, 255];
      doc.setFillColor(...bg);
      doc.rect(tableLeft, y, 172, 7, 'F');
      doc.setTextColor(15, 23, 42);
      doc.setFont('helvetica', m.qtdPgtos > 0 ? 'bold' : 'normal');
      const row = [
        MESES_NOMES[m.mes],
        fmt(m.totalRecebido),
        fmt(m.totalJuros),
        fmt(m.totalAmort),
        String(m.qtdPgtos || '—')
      ];
      let xR = tableLeft + 2;
      row.forEach((cell, i) => {
        doc.setFontSize(8);
        doc.text(cell, xR, y + 5);
        xR += colWidths[i];
      });
      y += 7;
    });

    // Linha de total
    doc.setFillColor(6, 15, 7);
    doc.rect(tableLeft, y, 172, 8, 'F');
    doc.setTextColor(34, 197, 94);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    const totalRow = ['TOTAL', fmt(dados.totalAnoRecebido), fmt(dados.totalAnoJuros), fmt(dados.totalAnoAmort), String(dados.totalPgtos)];
    let xT = tableLeft + 2;
    totalRow.forEach((cell, i) => {
      doc.text(cell, xT, y + 5.5);
      xT += colWidths[i];
    });
    y += 14;

    // Ranking de devedores
    if (dados.ranking && dados.ranking.length > 0) {
      if (y > 250) { doc.addPage(); y = 20; }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(30, 30, 30);
      doc.text('RANKING DE DEVEDORES — JUROS PAGOS NO ANO', 14, y);
      y += 5;

      dados.ranking.slice(0, 10).forEach((r, i) => {
        if (y > 270) { doc.addPage(); y = 20; }
        const medal = i === 0 ? '1°' : i === 1 ? '2°' : i === 2 ? '3°' : `${i+1}°`;
        doc.setFillColor(i % 2 === 0 ? 243 : 255, i % 2 === 0 ? 244 : 255, i % 2 === 0 ? 246 : 255);
        doc.rect(14, y, 172, 7, 'F');
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8);
        doc.setTextColor(100, 116, 139);
        doc.text(medal, 16, y + 5);
        doc.setTextColor(15, 23, 42);
        doc.setFont('helvetica', 'normal');
        doc.text(r.nome, 30, y + 5);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(34, 197, 94);
        doc.text(fmt(r.totalJuros), 160, y + 5, { align: 'right' });
        y += 7;
      });
    }

    // Rodapé
    const pageCount = doc.internal.getNumberOfPages();
    for (let p = 1; p <= pageCount; p++) {
      doc.setPage(p);
      doc.setFontSize(8);
      doc.setTextColor(148, 163, 184);
      doc.text(`Financier — Relatório Mensal ${dados.ano} | Página ${p} de ${pageCount}`, 105, 290, { align: 'center' });
    }

    doc.save(`relatorio-mensal-${dados.ano}.pdf`);
    App.showToast('PDF exportado com sucesso!', 'success');
  } catch (err) {
    console.error('Erro ao exportar PDF:', err);
    App.showToast('Erro ao gerar PDF. jsPDF não carregado?', 'error');
  }
};
