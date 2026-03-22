// =============================================
// tela-avisos.js — Central de Avisos Completa
// =============================================

import supabase from '../supabase-client.js';
import { formatarReais } from '../utils/formatadores.js';

let todosAvisos = [];
let filtroAtivo = 'todos';

// Inicializar a tela de Avisos
export async function inicializarAvisos() {
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
async function gerarTodosOsAvisos() {
  todosAvisos = [];

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  // Buscar todos os empréstimos ativos com dados completos
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
    .eq('user_id', user.id)
    .eq('status', 'ativo')
    .order('created_at', { ascending: false });

  if (error || !emprestimos) {
    console.error('Erro ao buscar empréstimos:', error);
    return;
  }

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  for (const emp of emprestimos) {
    const devedor = emp.devedores;
    const pagamentos = (emp.pagamentos || []).sort(
      (a, b) => new Date(b.data_pagamento)
        - new Date(a.data_pagamento)
    );
    const ultimoPagamento = pagamentos[0] || null;

    // Data do último pagamento ou data de início
    const refData = ultimoPagamento
      ? new Date(ultimoPagamento.data_pagamento + 'T00:00:00')
      : new Date(emp.data_inicio + 'T00:00:00');

    // Próxima data de vencimento = ref + 30 dias
    const proximoVenc = new Date(refData);
    proximoVenc.setDate(proximoVenc.getDate() + 30);
    proximoVenc.setHours(0, 0, 0, 0);

    const diasParaVenc = Math.floor(
      (proximoVenc - hoje) / (1000 * 60 * 60 * 24)
    );
    const diasAtraso = diasParaVenc < 0
      ? Math.abs(diasParaVenc) : 0;
    const jurosProximos = Math.round(
      emp.saldo_devedor * emp.taxa_mensal * 100
    ) / 100;
    const totalPago = pagamentos
      .reduce((a, p) => a + p.valor_pago, 0);
    const percQuitado = Math.round(
      ((emp.valor_principal - emp.saldo_devedor)
        / emp.valor_principal) * 100
    );

    // ── TIPO 1: ATRASADO ──────────────────────────────
    if (diasAtraso > 0) {
      todosAvisos.push({
        id: `atrasado-${emp.id}`,
        tipo: diasAtraso > 30 ? 'critico' : 'atrasado',
        icone: diasAtraso > 30 ? '🚨' : '⚠️',
        titulo: diasAtraso > 30
          ? `${devedor.nome} — Atraso grave`
          : `${devedor.nome} — Em atraso`,
        descricao: `${diasAtraso} dias sem pagamento. ` +
          `Juros acumulando sobre saldo de ` +
          `${formatarReais(emp.saldo_devedor)}.`,
        detalhe: `Último pagamento: ` +
          (ultimoPagamento
            ? new Date(ultimoPagamento.data_pagamento +
                'T00:00:00')
              .toLocaleDateString('pt-BR')
            : 'Nenhum'),
        valorDestaque: formatarReais(jurosProximos),
        labelValor: 'Juros do período',
        emprestimoId: emp.id,
        devedor: devedor.nome,
        contato: devedor.contato,
        ordem: diasAtraso > 30 ? 1 : 2,
        lido: false,
        criadoEm: new Date()
      });
    }

    // ── TIPO 2: PRÓXIMO DO VENCIMENTO ─────────────────
    if (diasParaVenc >= 0 && diasParaVenc <= 7) {
      todosAvisos.push({
        id: `vencendo-${emp.id}`,
        tipo: 'vencimento',
        icone: '📅',
        titulo: `${devedor.nome} — Vence em ${
          diasParaVenc === 0
            ? 'hoje'
            : diasParaVenc === 1
            ? 'amanhã'
            : `${diasParaVenc} dias`
        }`,
        descricao: `Parcela prevista para ` +
          `${proximoVenc.toLocaleDateString('pt-BR')}.`,
        detalhe: `Saldo devedor: ` +
          `${formatarReais(emp.saldo_devedor)}`,
        valorDestaque: formatarReais(jurosProximos),
        labelValor: 'Juros estimados',
        emprestimoId: emp.id,
        devedor: devedor.nome,
        contato: devedor.contato,
        ordem: 3,
        lido: false,
        criadoEm: new Date()
      });
    }

    // ── TIPO 3: PRÓXIMO DO VENCIMENTO (7-15 DIAS) ─────
    if (diasParaVenc > 7 && diasParaVenc <= 15) {
      todosAvisos.push({
        id: `prevencao-${emp.id}`,
        tipo: 'prevencao',
        icone: '🔔',
        titulo: `${devedor.nome} — Vence em ${
          diasParaVenc
        } dias`,
        descricao: `Parcela prevista para ` +
          `${proximoVenc.toLocaleDateString('pt-BR')}.`,
        detalhe: `Juros estimados: ` +
          `${formatarReais(jurosProximos)}`,
        valorDestaque: formatarReais(emp.saldo_devedor),
        labelValor: 'Saldo devedor',
        emprestimoId: emp.id,
        devedor: devedor.nome,
        contato: devedor.contato,
        ordem: 4,
        lido: false,
        criadoEm: new Date()
      });
    }

    // ── TIPO 4: PAGAMENTO ABAIXO DOS JUROS ───────────
    if (ultimoPagamento &&
      ultimoPagamento.valor_amortizacao < 0) {
      todosAvisos.push({
        id: `saldo-cresceu-${emp.id}`,
        tipo: 'atencao',
        icone: '📈',
        titulo: `${devedor.nome} — Saldo cresceu`,
        descricao: `Último pagamento foi menor que os ` +
          `juros. O saldo aumentou ` +
          `${formatarReais(
            Math.abs(ultimoPagamento.valor_amortizacao)
          )}.`,
        detalhe: `Saldo atual: ` +
          `${formatarReais(emp.saldo_devedor)}`,
        valorDestaque: formatarReais(
          Math.abs(ultimoPagamento.valor_amortizacao)
        ),
        labelValor: 'Saldo acrescido',
        emprestimoId: emp.id,
        devedor: devedor.nome,
        contato: devedor.contato,
        ordem: 5,
        lido: false,
        criadoEm: new Date()
      });
    }

    // ── TIPO 5: MOVIMENTAÇÃO RECENTE ─────────────────
    if (ultimoPagamento) {
      const dataPgto = new Date(
        ultimoPagamento.data_pagamento + 'T00:00:00'
      );
      const diasDesde = Math.floor(
        (hoje - dataPgto) / (1000 * 60 * 60 * 24)
      );
      if (diasDesde <= 3) {
        todosAvisos.push({
          id: `recente-${emp.id}-${ultimoPagamento.data_pagamento}`,
          tipo: 'recente',
          icone: '✅',
          titulo: `${devedor.nome} — Pagamento recebido`,
          descricao: `${formatarReais(
            ultimoPagamento.valor_pago
          )} recebido em ` +
            `${dataPgto.toLocaleDateString('pt-BR')}.`,
          detalhe: `Novo saldo: ` +
            `${formatarReais(ultimoPagamento.saldo_apos)}`,
          valorDestaque: formatarReais(
            ultimoPagamento.valor_pago
          ),
          labelValor: 'Valor recebido',
          emprestimoId: emp.id,
          devedor: devedor.nome,
          contato: devedor.contato,
          ordem: 6,
          lido: false,
          criadoEm: dataPgto
        });
      }
    }

    // ── TIPO 6: PRÓXIMA PARCELA DO MÊS ───────────────
    const mesAtual = hoje.getMonth();
    const anoAtual = hoje.getFullYear();
    const mesVenc = proximoVenc.getMonth();
    const anoVenc = proximoVenc.getFullYear();
    if (mesVenc === mesAtual && anoVenc === anoAtual
      && diasParaVenc > 15) {
      todosAvisos.push({
        id: `parcela-mes-${emp.id}`,
        tipo: 'parcela',
        icone: '💰',
        titulo: `${devedor.nome} — Parcela este mês`,
        descricao: `Vencimento em ` +
          `${proximoVenc.toLocaleDateString('pt-BR')} ` +
          `(${diasParaVenc} dias).`,
        detalhe: `Juros estimados: ` +
          `${formatarReais(jurosProximos)}`,
        valorDestaque: formatarReais(jurosProximos),
        labelValor: 'Juros do período',
        emprestimoId: emp.id,
        devedor: devedor.nome,
        contato: devedor.contato,
        ordem: 7,
        lido: false,
        criadoEm: new Date()
      });
    }

    // ── TIPO 7: QUASE QUITADO ─────────────────────────
    if (percQuitado >= 80 && percQuitado < 100) {
      todosAvisos.push({
        id: `quase-quitado-${emp.id}`,
        tipo: 'progresso',
        icone: '🏁',
        titulo: `${devedor.nome} — ${percQuitado}% quitado`,
        descricao: `Faltam apenas ` +
          `${formatarReais(emp.saldo_devedor)} ` +
          `para quitar o empréstimo.`,
        detalhe: `Pago até agora: ` +
          `${formatarReais(totalPago)}`,
        valorDestaque: formatarReais(emp.saldo_devedor),
        labelValor: 'Saldo restante',
        emprestimoId: emp.id,
        devedor: devedor.nome,
        contato: devedor.contato,
        ordem: 8,
        lido: false,
        criadoEm: new Date()
      });
    }

    // ── TIPO 8: SEM NENHUM PAGAMENTO ─────────────────
    if (pagamentos.length === 0) {
      const diasSemPgto = Math.floor(
        (hoje - new Date(emp.data_inicio + 'T00:00:00'))
        / (1000 * 60 * 60 * 24)
      );
      if (diasSemPgto > 30) {
        todosAvisos.push({
          id: `sem-pgto-${emp.id}`,
          tipo: 'atrasado',
          icone: '⚠️',
          titulo: `${devedor.nome} — Sem pagamentos`,
          descricao: `Este empréstimo existe há ` +
            `${diasSemPgto} dias e nunca teve ` +
            `pagamento registrado.`,
          detalhe: `Valor original: ` +
            `${formatarReais(emp.valor_principal)}`,
          valorDestaque: formatarReais(
            emp.saldo_devedor * emp.taxa_mensal
          ),
          labelValor: 'Juros acumulados',
          emprestimoId: emp.id,
          devedor: devedor.nome,
          contato: devedor.contato,
          ordem: 2,
          lido: false,
          criadoEm: new Date()
        });
      }
    }
  }

  // ── TIPO 9: RESUMO MENSAL ─────────────────────────
  if (emprestimos.length > 0) {
    const totalJurosMes = emprestimos.reduce(
      (a, e) => a + Math.round(
        e.saldo_devedor * e.taxa_mensal * 100
      ) / 100, 0
    );
    const totalSaldo = emprestimos.reduce(
      (a, e) => a + e.saldo_devedor, 0
    );
    const totalAtrasados = emprestimos.filter(e => {
      const pgs = (e.pagamentos || []).sort(
        (a,b) => new Date(b.data_pagamento)
          - new Date(a.data_pagamento)
      );
      const ref = pgs[0]
        ? new Date(pgs[0].data_pagamento + 'T00:00:00')
        : new Date(e.data_inicio + 'T00:00:00');
      const prox = new Date(ref);
      prox.setDate(prox.getDate() + 30);
      return prox < hoje;
    }).length;

    const nomeMes = hoje.toLocaleDateString('pt-BR', {
      month: 'long', year: 'numeric'
    });

    todosAvisos.push({
      id: 'resumo-mensal',
      tipo: 'resumo',
      icone: '📊',
      titulo: `Resumo — ${
        nomeMes.charAt(0).toUpperCase() + nomeMes.slice(1)
      }`,
      descricao:
        `${emprestimos.length} empréstimo(s) ativo(s). ` +
        `${totalAtrasados} em atraso. ` +
        `Juros esperados este mês: ` +
        `${formatarReais(totalJurosMes)}.`,
      detalhe: `Total em carteira: ` +
        `${formatarReais(totalSaldo)}`,
      valorDestaque: formatarReais(totalJurosMes),
      labelValor: 'Juros do mês',
      emprestimoId: null,
      devedor: null,
      contato: null,
      ordem: 0,
      lido: false,
      criadoEm: new Date()
    });
  }

  // Ordenar por prioridade
  todosAvisos.sort((a, b) => a.ordem - b.ordem);
}

// Renderizar lista de avisos
function renderizarAvisos(filtro) {
  filtroAtivo = filtro;
  const container = document.getElementById('lista-avisos');
  if (!container) return;

  atualizarFiltroAtivo(filtro);

  const avisosFiltrados = filtrarAvisos(filtro);

  if (avisosFiltrados.length === 0) {
    container.innerHTML = `
      <div class="avisos-vazio">
        <span class="avisos-vazio-icone">
          ${filtro === 'atrasados' ? '✅'
            : filtro === 'vencimento' ? '🎉'
            : filtro === 'recente' ? '📭'
            : '⭐'}
        </span>
        <p class="avisos-vazio-titulo">
          ${filtro === 'atrasados'
            ? 'Nenhum empréstimo em atraso!'
            : filtro === 'vencimento'
            ? 'Nenhum vencimento próximo!'
            : filtro === 'recente'
            ? 'Nenhuma movimentação recente.'
            : 'Tudo em dia e sob controle.'}
        </p>
        <p class="avisos-vazio-sub">
          ${filtro === 'todos' && todosAvisos.length === 0
            ? 'Cadastre empréstimos para ver os avisos aqui.'
            : 'Nenhum aviso nesta categoria no momento.'}
        </p>
      </div>
    `;
    return;
  }

  container.innerHTML = avisosFiltrados
    .map(aviso => renderizarCardAviso(aviso))
    .join('');

  // Adicionar listeners nos botões
  container.querySelectorAll('[data-emprestimo-id]')
    .forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.emprestimoId;
        if (id) navegarParaEmprestimo(id);
      });
    });

  container.querySelectorAll('[data-whats]')
    .forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const contato = btn.dataset.whats;
        const msg = btn.dataset.msg;
        if (contato) abrirWhatsApp(contato, msg);
      });
    });
}

// Filtrar avisos por tipo
function filtrarAvisos(filtro) {
  if (filtro === 'todos') return todosAvisos;
  if (filtro === 'atrasados') return todosAvisos.filter(
    a => ['atrasado','critico','sem-pgto'].includes(a.tipo)
  );
  if (filtro === 'vencimento') return todosAvisos.filter(
    a => ['vencimento','prevencao','parcela'].includes(a.tipo)
  );
  if (filtro === 'recente') return todosAvisos.filter(
    a => ['recente','progresso','resumo'].includes(a.tipo)
  );
  if (filtro === 'atencao') return todosAvisos.filter(
    a => ['atencao','saldo-cresceu'].includes(a.tipo)
  );
  return todosAvisos;
}

// Renderizar card individual
function renderizarCardAviso(aviso) {
  const corBorda = {
    critico:   '#ef4444',
    atrasado:  '#f97316',
    vencimento:'#f59e0b',
    prevencao: '#eab308',
    parcela:   '#3b82f6',
    recente:   '#22c55e',
    progresso: '#a855f7',
    atencao:   '#f97316',
    resumo:    '#64748b',
  }[aviso.tipo] || '#64748b';

  const msgWhats = aviso.contato
    ? encodeURIComponent(
        `Olá ${aviso.devedor}, passando para lembrar ` +
        `que sua parcela vence em breve. ` +
        `Saldo devedor: ${aviso.valorDestaque}. ` +
        `Qualquer dúvida estou à disposição.`
      )
    : '';

  return `
    <div class="aviso-card aviso-${aviso.tipo}"
      style="border-left-color: ${corBorda}">

      <div class="aviso-card-topo">
        <span class="aviso-icone">${aviso.icone}</span>
        <div class="aviso-card-info">
          <span class="aviso-titulo">${aviso.titulo}</span>
          <span class="aviso-descricao">
            ${aviso.descricao}
          </span>
          <span class="aviso-detalhe">${aviso.detalhe}</span>
        </div>
        <div class="aviso-valor-destaque">
          <span class="aviso-valor-num">
            ${aviso.valorDestaque}
          </span>
          <span class="aviso-valor-label">
            ${aviso.labelValor}
          </span>
        </div>
      </div>

      <div class="aviso-card-acoes">
        ${aviso.emprestimoId ? `
          <button class="btn-aviso btn-ver"
            data-emprestimo-id="${aviso.emprestimoId}">
            Ver Empréstimo
          </button>
        ` : ''}
        ${aviso.contato ? `
          <button class="btn-aviso btn-whats"
            data-whats="${aviso.contato}"
            data-msg="${msgWhats}">
            WhatsApp
          </button>
        ` : ''}
      </div>

    </div>
  `;
}

// Atualizar destaque do filtro ativo
function atualizarFiltroAtivo(filtro) {
  document.querySelectorAll('.aviso-filtro').forEach(btn => {
    btn.classList.toggle(
      'ativo', btn.dataset.filtro === filtro
    );
  });
}

// Contar não lidos para badge na sidebar
function atualizarBadgeSidebar() {
  const criticos = todosAvisos.filter(
    a => ['critico','atrasado'].includes(a.tipo)
  ).length;
  // A classe configurada antes era .nav-badge #badge-avisos
  const badge = document.getElementById('badge-avisos') || document.getElementById('sidebar-avisos-badge');
  if (badge) {
    badge.textContent = criticos > 0 ? criticos : '';
    badge.style.display = criticos > 0 ? 'flex' : 'none';
  }
}

// Marcar todos como lidos
export function marcarTodosComoLidos() {
  todosAvisos.forEach(a => a.lido = true);
  if(window.App && App.showToast) {
     App.showToast('Todos os avisos marcados como lidos.', 'sucesso');
  }
  atualizarBadgeSidebar();
}

// Navegar para empréstimo
function navegarParaEmprestimo(id) {
  sessionStorage.setItem('_abrir_emprestimo', id);
  if (window.location) {
    window.location.hash = '#/emprestimo/' + id;
  }
}

// Abrir WhatsApp
function abrirWhatsApp(contato, msg) {
  const numero = contato.replace(/\D/g, '');
  const url = `https://wa.me/55${numero}?text=${msg}`;
  window.open(url, '_blank');
}

// Expor funções globais para os botões do HTML
window.filtrarAvisosView = (filtro) => {
  renderizarAvisos(filtro);
};
window.marcarTodosComoLidos = marcarTodosComoLidos;
window.recarregarAvisos = async () => {
  renderizarEsqueleto();
  await gerarTodosOsAvisos();
  renderizarAvisos(filtroAtivo);
  atualizarBadgeSidebar();
};
