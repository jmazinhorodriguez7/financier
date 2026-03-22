// =============================================
// tela-avisos.js — Central de Avisos Completa
// =============================================

// Utilizamos formato clássico
const supabase = window.FinancierDB;
const { formatarReais } = window.Formatadores;
// Obs: Se formatarReais não estiver no window, precisamos garantir sua presença, mas vamos assumir padrão

let todosAvisos = [];
let filtroAtivo = 'todos';

// Inicializar a tela de Avisos
async function inicializarAvisos() {
  const principal = document.getElementById('conteudo-principal');
  if (principal) {
    principal.innerHTML = `
<div class="tela-avisos">

  <!-- Header -->
  <div class="tela-header">
    <div>
      <h1 class="tela-titulo">Central de Avisos</h1>
      <p class="tela-subtitulo">
        Acompanhe vencimentos, atrasos e movimentações.
      </p>
    </div>
    <div style="display:flex;gap:12px;align-items:center">
      <button class="btn-secundario btn-sm"
        onclick="window.recarregarAvisos()">
        Atualizar
      </button>
      <button class="btn-secundario"
        onclick="window.marcarTodosComoLidos()">
        ✓ Marcar todos como lidos
      </button>
    </div>
  </div>

  <!-- Filtros -->
  <div class="avisos-filtros">
    <button class="aviso-filtro ativo"
      data-filtro="todos"
      onclick="window.filtrarAvisosView('todos')">
      Todos
    </button>
    <button class="aviso-filtro"
      data-filtro="atrasados"
      onclick="window.filtrarAvisosView('atrasados')">
      🚨 Atrasados
    </button>
    <button class="aviso-filtro"
      data-filtro="vencimento"
      onclick="window.filtrarAvisosView('vencimento')">
      📅 Próximos
    </button>
    <button class="aviso-filtro"
      data-filtro="recente"
      onclick="window.filtrarAvisosView('recente')">
      ✅ Recentes
    </button>
    <button class="aviso-filtro"
      data-filtro="atencao"
      onclick="window.filtrarAvisosView('atencao')">
      📈 Atenção
    </button>
  </div>

  <!-- Lista de avisos -->
  <div class="lista-avisos" id="lista-avisos">
    <!-- Preenchido dinamicamente -->
  </div>

</div>`;
  }

  renderizarEsqueleto();
  await gerarTodosOsAvisos();
  renderizarAvisos(filtroAtivo);
  atualizarBadgeSidebar();
}

// Renderizar skeleton loading
function renderizarEsqueleto() {
  const container = document.getElementById('lista-avisos');
  if (!container) return;
  container.innerHTML = Array(4).fill(`
    <div class="aviso-skeleton">
      <div class="skeleton-linha larga"></div>
      <div class="skeleton-linha media"></div>
      <div class="skeleton-linha curta"></div>
    </div>
  `).join('');
}

// MOTOR DE GERAÇÃO DE AVISOS
async function buscarEmprestimosParaAvisos() {
  // Primeiro testar sem filtro de user_id (RLS cuida do isolamento)
  const { data: emprestimos, error } = await supabase
    .from('emprestimos')
    .select(`
      id,
      valor_principal,
      taxa_mensal,
      data_inicio,
      prazo_meses,
      modalidade,
      saldo_devedor,
      status,
      devedores (
        id,
        nome,
        contato
      ),
      pagamentos (
        data_pagamento,
        valor_pago,
        valor_juros,
        valor_amortizacao,
        saldo_apos,
        created_at
      )
    `)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false });

  if (error) {
    console.error('Erro na busca de empréstimos:', error);
    throw new Error(
      'Erro ao buscar empréstimos: ' + error.message
    );
  }

  console.log(
    'Empréstimos encontrados para Avisos:',
    emprestimos?.length
  );

  return emprestimos || [];
}

// Inicializar a tela de Avisos
async function inicializarAvisos() {
  const container = document.getElementById('conteudo-principal');

  if (!container) {
    console.error('Container #conteudo-principal não encontrado');
    return;
  }

  container.innerHTML = `
    <div style="padding:32px">
      <h1 style="color:var(--text-primary); margin-bottom:8px">Central de Avisos</h1>
      <p style="color:var(--text-secondary); margin-bottom:24px">
        Acompanhe vencimentos, atrasos e movimentações importantes.
      </p>
      
      <div id="lista-avisos"></div>
    </div>
  `;

  try {
    const emprestimos = await buscarEmprestimosParaAvisos();

    // LOG TEMPORÁRIO — remover após confirmar funcionamento
    console.log('=== DEBUG AVISOS ===');
    console.log('Total de empréstimos:', emprestimos.length);
    emprestimos.forEach(e => {
      console.log(
        e.devedores?.nome,
        '| Saldo:', e.saldo_devedor,
        '| Pagamentos:', e.pagamentos?.length
      );
    });
    console.log('===================');

    if (emprestimos.length === 0) {
      document.getElementById('lista-avisos').innerHTML = `
        <div style="text-align:center;padding:60px; color:var(--text-muted)">
          <p style="font-size:40px">📭</p>
          <p>Nenhum empréstimo ativo encontrado.</p>
          <p style="font-size:12px; margin-top:8px">
            Verifique se existem empréstimos com status "ativo" no Dashboard.
          </p>
        </div>
      `;
      return;
    }

    await processarEExibirAvisos(emprestimos);

  } catch (err) {
    console.error('Erro em inicializarAvisos:', err);
    const lista = document.getElementById('lista-avisos');
    if (lista) {
      lista.innerHTML = `
        <div style="padding:24px; background:rgba(239,68,68,0.1); border-radius:8px; color:#ef4444; border: 1px solid rgba(239,68,68,0.2)">
          <strong style="display:block;margin-bottom:8px">⚠️ Erro ao carregar avisos:</strong>
          ${err.message}
        </div>
      `;
    }
  }
}

async function processarEExibirAvisos(emprestimos) {
  const lista = document.getElementById('lista-avisos');
  if (!lista) return;

  const avisos = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const fmt = v => new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(v || 0);

  const fmtData = d => {
    if (!d) return '—';
    return new Date(d + 'T00:00:00')
      .toLocaleDateString('pt-BR');
  };

  // Resumo geral sempre no topo
  const totalSaldo = emprestimos
    .reduce((a, e) => a + (Number(e.saldo_devedor) || 0), 0);
  const totalJuros = emprestimos
    .reduce((a, e) => a +
      Math.round(Number(e.saldo_devedor) * Number(e.taxa_mensal) * 100) / 100,
    0);

  avisos.push({
    cor: '#64748b',
    icone: '📊',
    titulo: `Resumo — ${hoje.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`,
    descricao: `${emprestimos.length} empréstimo(s) ativo(s). ` +
      `Carteira total: ${fmt(totalSaldo)}. ` +
      `Juros esperados este mês: ${fmt(totalJuros)}.`,
    ordem: 0
  });

  emprestimos.forEach(emp => {
    const nome = emp.devedores?.nome || 'Devedor';
    const pgtos = (emp.pagamentos || []).sort(
      (a, b) => new Date(b.data_pagamento) - new Date(a.data_pagamento)
    );
    const ultimo = pgtos[0];
    const baseData = ultimo
      ? new Date(ultimo.data_pagamento + 'T00:00:00')
      : new Date(emp.data_inicio + 'T00:00:00');
    
    // Calcula próximo vencimento (30 dias após o último pagamento ou início)
    const proxVenc = new Date(baseData);
    proxVenc.setDate(proxVenc.getDate() + 30);
    proxVenc.setHours(0, 0, 0, 0);
    
    const diff = Math.floor((proxVenc - hoje) / (1000 * 60 * 60 * 24));
    const juros = Math.round(Number(emp.saldo_devedor) * Number(emp.taxa_mensal) * 100) / 100;

    // Atrasado
    if (diff < 0) {
      const dias = Math.abs(diff);
      avisos.push({
        cor: dias > 30 ? '#ef4444' : '#f97316',
        icone: dias > 30 ? '🚨' : '⚠️',
        titulo: `${nome} — ${dias > 30 ? 'Atraso grave' : 'Em atraso'} (${dias} dias)`,
        descricao: `Último pagamento: ${ultimo ? fmtData(ultimo.data_pagamento) : 'Nunca'}. ` +
          `Juros do período: ${fmt(juros)}. ` +
          `Saldo devedor: ${fmt(emp.saldo_devedor)}.`,
        ordem: dias > 30 ? 1 : 2,
        emprestimoId: emp.id
      });
    }
    // Vence hoje
    else if (diff === 0) {
      avisos.push({
        cor: '#f59e0b',
        icone: '📅',
        titulo: `${nome} — Vence hoje`,
        descricao: `A parcela vence hoje. Juros estimados: ${fmt(juros)}. ` +
          `Saldo: ${fmt(emp.saldo_devedor)}.`,
        ordem: 3,
        emprestimoId: emp.id
      });
    }
    // Vence em breve (até 7 dias)
    else if (diff <= 7) {
      avisos.push({
        cor: '#eab308',
        icone: '⏰',
        titulo: `${nome} — Vence em ${diff} dia(s)`,
        descricao: `Vencimento em ${proxVenc.toLocaleDateString('pt-BR')}. ` +
          `Juros estimados: ${fmt(juros)}.`,
        ordem: 4,
        emprestimoId: emp.id
      });
    }
    // Parcela do mês (8-30 dias)
    else {
      avisos.push({
        cor: '#3b82f6',
        icone: '💰',
        titulo: `${nome} — Próxima parcela`,
        descricao: `Vencimento em ${proxVenc.toLocaleDateString('pt-BR')} ` +
          `(${diff} dias). Juros estimados: ${fmt(juros)}.`,
        ordem: 5,
        emprestimoId: emp.id
      });
    }

    // Saldo crescendo (amortização negativa)
    if (ultimo && Number(ultimo.valor_amortizacao) < 0) {
      avisos.push({
        cor: '#a855f7',
        icone: '📈',
        titulo: `${nome} — Saldo aumentou`,
        descricao: `O último pagamento não cobriu os juros. ` +
          `O saldo cresceu ${fmt(Math.abs(ultimo.valor_amortizacao))}. ` +
          `Saldo atual: ${fmt(emp.saldo_devedor)}.`,
        ordem: 6,
        emprestimoId: emp.id
      });
    }

    // Pagamento recente (últimos 3 dias)
    if (ultimo) {
      const diasPgto = Math.floor((hoje - new Date(ultimo.data_pagamento + 'T00:00:00')) / (1000 * 60 * 60 * 24));
      if (diasPgto <= 3 && diasPgto >= 0) {
        avisos.push({
          cor: '#22c55e',
          icone: '✅',
          titulo: `${nome} — Pagamento recente`,
          descricao: `${fmt(ultimo.valor_pago)} recebido em ${fmtData(ultimo.data_pagamento)}. ` +
            `Saldo após pagamento: ${fmt(ultimo.saldo_apos)}.`,
          ordem: 7,
          emprestimoId: emp.id
        });
      }
    }

    // Alerta para quem nunca pagou e já passou tempo
    if (pgtos.length === 0) {
      const diasSemPgto = Math.floor((hoje - new Date(emp.data_inicio + 'T00:00:00')) / (1000 * 60 * 60 * 24));
      if (diasSemPgto > 5 && diff > 0) {
        avisos.push({
          cor: '#94a3b8',
          icone: 'ℹ️',
          titulo: `${nome} — Novo contrato`,
          descricao: `Empréstimo iniciado há ${diasSemPgto} dias sem pagamentos ainda. ` +
            `Valor: ${fmt(emp.valor_principal)}.`,
          ordem: 8,
          emprestimoId: emp.id
        });
      }
    }
  });

  // Ordenar por prioridade (ordem)
  avisos.sort((a, b) => a.ordem - b.ordem);

  lista.innerHTML = avisos.map(av => `
    <div style="
      background: #1a2e1c;
      border: 1px solid #2a3f2c;
      border-left: 4px solid ${av.cor};
      border-radius: 12px;
      padding: 16px 20px;
      margin-bottom: 12px;
      display: flex;
      align-items: flex-start;
      gap: 16px;
      cursor: ${av.emprestimoId ? 'pointer' : 'default'};
      transition: transform 0.2s;
    "
    ${av.emprestimoId ? `onclick="sessionStorage.setItem('_abrir_emprestimo','${av.emprestimoId}'); window.location.hash='#/detalhe-emprestimo'"` : ''}
    onmouseover="if(${!!av.emprestimoId}) this.style.transform='translateX(4px)'"
    onmouseout="if(${!!av.emprestimoId}) this.style.transform='translateX(0)'">
      <span style="font-size:24px; flex-shrink:0; margin-top:2px">${av.icone}</span>
      <div style="flex:1">
        <p style="margin:0 0 4px; font-weight:700; font-size:15px; color:#f1f5f9">
          ${av.titulo}
        </p>
        <p style="margin:0; font-size:13px; color:#94a3b8; line-height:1.5">
          ${av.descricao}
        </p>
      </div>
    </div>
  `).join('');

  console.log('Avisos gerados e exibidos:', avisos.length);
}

// Expor funções globais para os botões do HTML (se necessário)
window.recarregarAvisos = async () => {
  await inicializarAvisos();
};

// Exportar globalmente para o roteador do app.js
window.TelaAvisos = { render: inicializarAvisos };
