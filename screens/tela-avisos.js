import {
  gerarTodosOsAvisos,
  gerarResumoParcelas,
  fmt,
  fmtData
} from '../modules/engine-avisos.js';

let todosOsAvisos = [];
let filtroAtivo = 'todos';

export async function inicializarTelaAvisos() {
  renderizarEsqueleto();
  try {
    const [avisos, parcelas] = await Promise.all([
      gerarTodosOsAvisos(),
      gerarResumoParcelas()
    ]);
    todosOsAvisos = avisos;
    renderizarTelaCompleta(avisos, parcelas);
  } catch (err) {
    renderizarErro(err.message);
  }
}

function renderizarTelaCompleta(avisos, parcelas) {
  const content = document.getElementById(
    'conteudo-principal'
  );
  content.innerHTML = `

    <!-- Header -->
    <div class="tela-header">
      <div>
        <h1 class="tela-titulo">Central de Avisos</h1>
        <p class="tela-subtitulo">
          Acompanhe vencimentos, atrasos e movimentações.
        </p>
      </div>
      <button class="btn-secundario"
        onclick="marcarTodosComoLidos()">
        Marcar todos como lidos
      </button>
    </div>

    <!-- PAINEL DE RESUMO DO MÊS -->
    ${renderizarResumoMes(avisos)}

    <!-- PARCELAS DO MÊS POR DEVEDOR -->
    ${renderizarTabelaParcelas(parcelas)}

    <!-- FILTROS -->
    <div class="avisos-filtros">
      ${renderizarFiltros(avisos)}
    </div>

    <!-- LISTA DE AVISOS -->
    <div class="avisos-lista" id="avisos-lista">
      ${renderizarListaAvisos(avisos, 'todos')}
    </div>

  `;
}

function renderizarResumoMes(avisos) {
  const resumo = avisos.find(a => a.tipo === 'RESUMO_MES');
  if (!resumo) return '';
  const d = resumo.dados;
  const qtdAtrasados = avisos.filter(
    a => a.filtro === 'atrasados'
  ).length;
  const qtdVencimentos = avisos.filter(
    a => a.filtro === 'vencimentos'
  ).length;

  return `
    <div class="resumo-mes-grid">
      <div class="resumo-card">
        <span class="resumo-label">Carteira Total</span>
        <span class="resumo-valor">
          ${fmt(d.totalSaldoCarteira)}
        </span>
        <span class="resumo-sub">
          ${d.qtdAtivos} empréstimo(s) ativo(s)
        </span>
      </div>
      <div class="resumo-card">
        <span class="resumo-label">Juros Esperados no Mês</span>
        <span class="resumo-valor positivo">
          ${fmt(d.totalParcelasMes)}
        </span>
        <span class="resumo-sub">Total de juros do ciclo</span>
      </div>
      <div class="resumo-card">
        <span class="resumo-label">Recebido Este Mês</span>
        <span class="resumo-valor positivo">
          ${fmt(d.totalRecebidoMes)}
        </span>
        <span class="resumo-sub">
          ${fmt(d.totalParcelasMes - d.totalRecebidoMes)}
           ainda a receber
        </span>
      </div>
      <div class="resumo-card ${qtdAtrasados > 0
        ? 'resumo-card-alerta' : ''}">
        <span class="resumo-label">Inadimplência</span>
        <span class="resumo-valor ${qtdAtrasados > 0
          ? 'negativo' : 'positivo'}">
          ${qtdAtrasados} atrasado(s)
        </span>
        <span class="resumo-sub">
          ${qtdVencimentos} vence(m) em breve
        </span>
      </div>
    </div>
  `;
}

function renderizarTabelaParcelas(parcelas) {
  if (!parcelas || parcelas.length === 0) return '';
  const total = parcelas.reduce(
    (a, p) => a + p.jurosProximos, 0
  );

  return `
    <div class="parcelas-mes-wrapper">
      <div class="parcelas-mes-header">
        <span class="comparacao-titulo">
          Próximas Parcelas por Devedor
        </span>
        <span class="parcelas-total">
          Total esperado: <strong>${fmt(total)}</strong>
        </span>
      </div>
      <div class="tabela-scroll">
        <table class="tabela-padrao">
          <thead>
            <tr>
              <th>Devedor</th>
              <th>Saldo Devedor</th>
              <th>Juros do Ciclo</th>
              <th>Próximo Pagamento</th>
              <th>Situação</th>
            </tr>
          </thead>
          <tbody>
            ${parcelas.map(p => `
              <tr class="linha-clicavel"
                onclick="navegarParaEmprestimo(
                  '${p.emprestimoId}')">
                <td>
                  <span class="devedor-nome">
                    ${p.devedor}
                  </span>
                </td>
                <td class="text-right">
                  ${fmt(p.saldoDevedor)}
                </td>
                <td class="text-right positivo bold">
                  ${fmt(p.jurosProximos)}
                </td>
                <td class="text-right">
                  ${fmtData(p.proximaParcela.split('T')[0])}
                </td>
                <td>
                  ${badgeStatus(p.status, p.diasEmAtraso,
                    p.diasParaVencer)}
                </td>
              </tr>
            `).join('')}
            <tr class="linha-total">
              <td><strong>TOTAL</strong></td>
              <td class="text-right">
                <strong>
                  ${fmt(parcelas.reduce(
                    (a,p) => a + p.saldoDevedor, 0
                  ))}
                </strong>
              </td>
              <td class="text-right positivo bold">
                <strong>${fmt(total)}</strong>
              </td>
              <td colspan="2"></td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function badgeStatus(status, atraso, vencer) {
  const configs = {
    atrasado: {
      cls: 'badge-critico',
      txt: `${atraso}d em atraso`
    },
    vencendo: {
      cls: 'badge-alerta',
      txt: `Venceu há ${atraso}d`
    },
    urgente: {
      cls: 'badge-urgente',
      txt: `Vence em ${vencer}d`
    },
    normal: {
      cls: 'badge-normal',
      txt: `${vencer}d para vencer`
    }
  };
  const c = configs[status] || configs.normal;
  return `<span class="badge ${c.cls}">${c.txt}</span>`;
}

function renderizarFiltros(avisos) {
  const grupos = {
    todos: avisos.length,
    atrasados: avisos.filter(a=>a.filtro==='atrasados').length,
    vencimentos: avisos.filter(a=>a.filtro==='vencimentos').length,
    parcelas: avisos.filter(a=>a.filtro==='parcelas').length,
    movimentacoes: avisos.filter(
      a=>a.filtro==='movimentacoes'
    ).length,
    financeiro: avisos.filter(a=>a.filtro==='financeiro').length,
  };
  const filtros = [
    { id:'todos',        label:'Todos' },
    { id:'atrasados',    label:'Atrasados' },
    { id:'vencimentos',  label:'Vencimentos' },
    { id:'parcelas',     label:'Parcelas do Mês' },
    { id:'movimentacoes',label:'Movimentações' },
    { id:'financeiro',   label:'Financeiro' },
  ];
  return filtros.map(f => `
    <button
      class="filtro-btn ${filtroAtivo===f.id
        ? 'filtro-ativo':''}"
      onclick="filtrarAvisos('${f.id}')">
      ${f.label}
      ${grupos[f.id] > 0
        ? `<span class="filtro-count">${grupos[f.id]}</span>`
        : ''}
    </button>
  `).join('');
}

function renderizarListaAvisos(avisos, filtro) {
  const lista = filtro === 'todos'
    ? avisos.filter(a => a.tipo !== 'RESUMO_MES')
    : avisos.filter(a => a.filtro === filtro);

  if (lista.length === 0) {
    return `
      <div class="avisos-vazio">
        <span class="avisos-vazio-icone">🌟</span>
        <span class="avisos-vazio-titulo">
          Nenhum aviso neste filtro
        </span>
        <span class="avisos-vazio-sub">
          Tudo em dia para esta categoria.
        </span>
      </div>
    `;
  }

  return lista.map(aviso => `
    <div class="aviso-card ${aviso.lido ? 'aviso-lido' : ''}"
      style="border-left: 4px solid ${aviso.cor}"
      id="aviso-${aviso.emprestimoId}-${aviso.tipo}">
      <div class="aviso-card-header">
        <div class="aviso-info">
          <span class="aviso-icone">${aviso.icone}</span>
          <div>
            <span class="aviso-titulo">${aviso.titulo}</span>
            <span class="aviso-data">
              ${new Date(aviso.createdAt)
                .toLocaleString('pt-BR')}
            </span>
          </div>
        </div>
        <div class="aviso-acoes">
          ${aviso.emprestimoId ? `
            <button class="btn-sm btn-secundario"
              onclick="event.stopPropagation();
                navegarParaEmprestimo(
                  '${aviso.emprestimoId}')">
              Ver Empréstimo
            </button>
          ` : ''}
          <button class="btn-sm btn-icon"
            onclick="event.stopPropagation();
              marcarComoLido('${aviso.emprestimoId}',
                '${aviso.tipo}')"
            title="Marcar como lido">
            ${aviso.lido ? '👁' : '○'}
          </button>
        </div>
      </div>
      <p class="aviso-mensagem">${aviso.mensagem}</p>
    </div>
  `).join('');
}

// Filtrar avisos sem recarregar do banco
window.filtrarAvisos = function(filtro) {
  filtroAtivo = filtro;
  document.querySelectorAll('.filtro-btn').forEach(btn => {
    btn.classList.toggle(
      'filtro-ativo',
      btn.onclick?.toString().includes(`'${filtro}'`)
    );
  });
  document.getElementById('avisos-lista').innerHTML =
    renderizarListaAvisos(todosOsAvisos, filtro);
};

// Marcar aviso como lido
window.marcarComoLido = function(emprestimoId, tipo) {
  const idx = todosOsAvisos.findIndex(
    a => a.emprestimoId === emprestimoId && a.tipo === tipo
  );
  if (idx !== -1) {
    todosOsAvisos[idx].lido = true;
    const card = document.getElementById(
      `aviso-${emprestimoId}-${tipo}`
    );
    if (card) card.classList.add('aviso-lido');
  }
};

// Marcar todos como lidos
window.marcarTodosComoLidos = function() {
  todosOsAvisos.forEach(a => a.lido = true);
  document.querySelectorAll('.aviso-card')
    .forEach(c => c.classList.add('aviso-lido'));
  mostrarToast('Todos os avisos marcados como lidos.',
    'sucesso');
};

// Navegar para empréstimo
window.navegarParaEmprestimo = function(emprestimoId) {
  sessionStorage.setItem('_emp_id', emprestimoId);
  navegarPara('detalhe-emprestimo');
};

function renderizarEsqueleto() {
  document.getElementById('conteudo-principal').innerHTML =
    `<div class="skeleton-wrapper">
       <div class="skeleton" style="height:120px;
         margin-bottom:24px"></div>
       <div class="skeleton" style="height:200px;
         margin-bottom:24px"></div>
       <div class="skeleton" style="height:400px"></div>
     </div>`;
}

function renderizarErro(msg) {
  document.getElementById('conteudo-principal').innerHTML =
    `<div class="erro-wrapper">
       <span class="erro-icone">⚠️</span>
       <p>Erro ao carregar avisos: ${msg}</p>
       <button class="btn-primario"
         onclick="inicializarTelaAvisos()">
         Tentar novamente
       </button>
     </div>`;
}

export { inicializarTelaAvisos };
