import supabase from '../supabase-client.js';

// =============================================
// ENGINE DE AVISOS — gera todos os alertas
// automaticamente a partir dos dados do banco
// =============================================

// Tipos de aviso com prioridade
const TIPOS = {
  ATRASADO_CRITICO:    { prioridade: 1, cor: '#ef4444',
    icone: '🚨', filtro: 'atrasados' },
  ATRASADO_MODERADO:   { prioridade: 2, cor: '#f97316',
    icone: '⚠️', filtro: 'atrasados' },
  VENCE_HOJE:          { prioridade: 3, cor: '#f59e0b',
    icone: '📅', filtro: 'vencimentos' },
  VENCE_EM_BREVE:      { prioridade: 4, cor: '#eab308',
    icone: '⏰', filtro: 'vencimentos' },
  PARCELA_MES_ATUAL:   { prioridade: 5, cor: '#3b82f6',
    icone: '💰', filtro: 'parcelas' },
  SALDO_CRESCENDO:     { prioridade: 6, cor: '#a855f7',
    icone: '📈', filtro: 'financeiro' },
  QUITACAO_PROXIMA:    { prioridade: 7, cor: '#22c55e',
    icone: '🎯', filtro: 'financeiro' },
  PAGAMENTO_RECEBIDO:  { prioridade: 8, cor: '#10b981',
    icone: '✅', filtro: 'movimentacoes' },
  EMPRESTIMO_QUITADO:  { prioridade: 9, cor: '#6366f1',
    icone: '🏆', filtro: 'movimentacoes' },
  NOVO_EMPRESTIMO:     { prioridade: 10, cor: '#06b6d4',
    icone: '📋', filtro: 'movimentacoes' },
  ANIVERSARIO_CONTRATO:{ prioridade: 11, cor: '#8b5cf6',
    icone: '🗓️', filtro: 'financeiro' },
  ALTO_RENDIMENTO:     { prioridade: 12, cor: '#22c55e',
    icone: '💹', filtro: 'financeiro' },
};

// Calcular data do próximo pagamento
function calcularProximoPagamento(ultimoPagamento, dataInicio) {
  const base = ultimoPagamento
    ? new Date(ultimoPagamento + 'T12:00:00')
    : new Date(dataInicio + 'T12:00:00');
  const proxima = new Date(base);
  proxima.setMonth(proxima.getMonth() + 1);
  return proxima;
}

// Calcular dias em atraso ou dias para vencer
function calcularDias(dataAlvo) {
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  const alvo = new Date(dataAlvo);
  alvo.setHours(0, 0, 0, 0);
  return Math.floor((hoje - alvo) / (1000 * 60 * 60 * 24));
}

// Formatar reais
function fmt(valor) {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency', currency: 'BRL'
  }).format(valor);
}

// Formatar data
function fmtData(data) {
  return new Date(data + 'T12:00:00')
    .toLocaleDateString('pt-BR');
}

// FUNÇÃO PRINCIPAL — gerar todos os avisos
export async function gerarTodosOsAvisos() {
  const { data: emprestimos, error } = await supabase
    .from('emprestimos')
    .select(`
      id,
      valor_principal,
      taxa_mensal,
      data_inicio,
      prazo_meses,
      prazo_restante,
      modalidade,
      saldo_devedor,
      status,
      created_at,
      devedores ( id, nome, contato ),
      pagamentos (
        id,
        data_pagamento,
        valor_pago,
        valor_juros,
        valor_amortizacao,
        saldo_apos,
        created_at
      )
    `)
    .in('status', ['ativo', 'quitado'])
    .order('created_at', { ascending: false });

  if (error) throw new Error('Erro ao buscar dados: ' +
    error.message);

  const avisos = [];
  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  // ---- Resumo mensal global ----
  const mesAtual = hoje.getMonth();
  const anoAtual = hoje.getFullYear();

  let totalParcelasMes = 0;
  let totalRecebidoMes = 0;
  let totalAtrasados = 0;
  let totalSaldoCarteira = 0;

  const emprestimosAtivos = emprestimos.filter(
    e => e.status === 'ativo'
  );

  emprestimosAtivos.forEach(emp => {
    totalSaldoCarteira += emp.saldo_devedor;
    const jurosProximos = emp.saldo_devedor * emp.taxa_mensal;
    totalParcelasMes += jurosProximos;
  });

  const pgtosMes = emprestimos.flatMap(e =>
    (e.pagamentos || []).filter(p => {
      const d = new Date(p.data_pagamento + 'T12:00:00');
      return d.getMonth() === mesAtual &&
             d.getFullYear() === anoAtual;
    })
  );
  totalRecebidoMes = pgtosMes
    .reduce((a, p) => a + p.valor_pago, 0);

  // ---- Aviso de resumo do mês ----
  avisos.push({
    tipo: 'RESUMO_MES',
    prioridade: 0,
    cor: '#22c55e',
    icone: '📊',
    filtro: 'resumo',
    titulo: `Resumo de ${hoje.toLocaleDateString('pt-BR', {month:'long',year:'numeric'})}`,
    mensagem: `Carteira total: ${fmt(totalSaldoCarteira)} | ` +
      `Juros esperados: ${fmt(totalParcelasMes)} | ` +
      `Recebido no mês: ${fmt(totalRecebidoMes)}`,
    dados: {
      totalSaldoCarteira,
      totalParcelasMes,
      totalRecebidoMes,
      qtdAtivos: emprestimosAtivos.length
    },
    lido: false,
    createdAt: new Date().toISOString()
  });

  // ---- Avisos por empréstimo ativo ----
  emprestimosAtivos.forEach(emp => {
    const devedor = emp.devedores?.nome || 'Devedor';
    const pagamentos = (emp.pagamentos || []).sort(
      (a, b) => new Date(b.data_pagamento) -
                new Date(a.data_pagamento)
    );
    const ultimoPagamento = pagamentos[0];
    const proximaParcela = calcularProximoPagamento(
      ultimoPagamento?.data_pagamento, emp.data_inicio
    );
    const diasParaVencer = calcularDias(proximaParcela) * -1;
    const diasEmAtraso = calcularDias(proximaParcela);
    const jurosProximos = Math.round(
      emp.saldo_devedor * emp.taxa_mensal * 100
    ) / 100;

    // --- ATRASADOS CRÍTICOS (> 60 dias) ---
    if (diasEmAtraso > 60) {
      totalAtrasados++;
      avisos.push({
        tipo: 'ATRASADO_CRITICO',
        ...TIPOS.ATRASADO_CRITICO,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `🚨 Atraso grave — ${devedor}`,
        mensagem: `${diasEmAtraso} dias sem pagamento. ` +
          `Saldo devedor: ${fmt(emp.saldo_devedor)}. ` +
          `Juros acumulados estimados: ` +
          `${fmt(jurosProximos * Math.floor(diasEmAtraso/30))}.`,
        dados: {
          diasEmAtraso,
          saldoDevedor: emp.saldo_devedor,
          jurosProximos,
          proximaParcela: proximaParcela.toISOString()
        },
        lido: false,
        createdAt: new Date().toISOString()
      });

    // --- ATRASADOS MODERADOS (31-60 dias) ---
    } else if (diasEmAtraso > 30) {
      totalAtrasados++;
      avisos.push({
        tipo: 'ATRASADO_MODERADO',
        ...TIPOS.ATRASADO_MODERADO,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `⚠️ Pagamento em atraso — ${devedor}`,
        mensagem: `${diasEmAtraso} dias desde o último ` +
          `pagamento. Juros do período: ${fmt(jurosProximos)}. ` +
          `Saldo atual: ${fmt(emp.saldo_devedor)}.`,
        dados: {
          diasEmAtraso,
          saldoDevedor: emp.saldo_devedor,
          jurosProximos,
          proximaParcela: proximaParcela.toISOString()
        },
        lido: false,
        createdAt: new Date().toISOString()
      });

    // --- VENCE HOJE ---
    } else if (diasEmAtraso === 0) {
      avisos.push({
        tipo: 'VENCE_HOJE',
        ...TIPOS.VENCE_HOJE,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `📅 Vence hoje — ${devedor}`,
        mensagem: `Pagamento previsto para hoje. ` +
          `Juros do período: ${fmt(jurosProximos)}. ` +
          `Saldo atual: ${fmt(emp.saldo_devedor)}.`,
        dados: {
          saldoDevedor: emp.saldo_devedor,
          jurosProximos,
          proximaParcela: proximaParcela.toISOString()
        },
        lido: false,
        createdAt: new Date().toISOString()
      });

    // --- VENCE EM BREVE (1-7 dias) ---
    } else if (diasParaVencer <= 7 && diasParaVencer > 0) {
      avisos.push({
        tipo: 'VENCE_EM_BREVE',
        ...TIPOS.VENCE_EM_BREVE,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `⏰ Vence em ${diasParaVencer} dia(s) — ${devedor}`,
        mensagem: `Próximo pagamento previsto para ` +
          `${fmtData(proximaParcela.toISOString().split('T')[0])}. ` +
          `Juros estimados: ${fmt(jurosProximos)}.`,
        dados: {
          diasParaVencer,
          saldoDevedor: emp.saldo_devedor,
          jurosProximos,
          proximaParcela: proximaParcela.toISOString()
        },
        lido: false,
        createdAt: new Date().toISOString()
      });

    // --- PARCELA DO MÊS (8-30 dias) ---
    } else if (diasParaVencer <= 30) {
      avisos.push({
        tipo: 'PARCELA_MES_ATUAL',
        ...TIPOS.PARCELA_MES_ATUAL,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `💰 Parcela do mês — ${devedor}`,
        mensagem: `Próximo pagamento em ` +
          `${fmtData(proximaParcela.toISOString().split('T')[0])} ` +
          `(${diasParaVencer} dias). ` +
          `Juros estimados: ${fmt(jurosProximos)}.`,
        dados: {
          diasParaVencer,
          saldoDevedor: emp.saldo_devedor,
          jurosProximos,
          proximaParcela: proximaParcela.toISOString()
        },
        lido: false,
        createdAt: new Date().toISOString()
      });
    }

    // --- SALDO CRESCENDO (pgto < juros nos últimos 3 meses) ---
    const ultimos3 = pagamentos.slice(0, 3);
    if (ultimos3.length >= 2) {
      const saldoCrescendo = ultimos3.every(
        p => p.valor_amortizacao < 0
      );
      if (saldoCrescendo) {
        avisos.push({
          tipo: 'SALDO_CRESCENDO',
          ...TIPOS.SALDO_CRESCENDO,
          emprestimoId: emp.id,
          devedorNome: devedor,
          titulo: `📈 Saldo crescendo — ${devedor}`,
          mensagem: `Nos últimos ${ultimos3.length} pagamentos ` +
            `o valor pago não cobriu os juros. O saldo devedor ` +
            `aumentou. Saldo atual: ${fmt(emp.saldo_devedor)}.`,
          dados: { saldoDevedor: emp.saldo_devedor },
          lido: false,
          createdAt: new Date().toISOString()
        });
      }
    }

    // --- QUITAÇÃO PRÓXIMA (saldo < 2 parcelas) ---
    if (emp.saldo_devedor <= jurosProximos * 2 &&
        emp.saldo_devedor > 0) {
      avisos.push({
        tipo: 'QUITACAO_PROXIMA',
        ...TIPOS.QUITACAO_PROXIMA,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `🎯 Quitação próxima — ${devedor}`,
        mensagem: `Faltam apenas ${fmt(emp.saldo_devedor)} ` +
          `para quitar este empréstimo. ` +
          `Apenas 1 ou 2 parcelas restantes.`,
        dados: { saldoDevedor: emp.saldo_devedor, jurosProximos },
        lido: false,
        createdAt: new Date().toISOString()
      });
    }

    // --- ANIVERSÁRIO DO CONTRATO ---
    const dataInicio = new Date(emp.data_inicio + 'T12:00:00');
    const diaAniv = dataInicio.getDate();
    const mesAniv = dataInicio.getMonth();
    const diaHoje = hoje.getDate();
    const mesHoje = hoje.getMonth();
    if (diaHoje === diaAniv && mesHoje !== mesAniv) {
      const anos = anoAtual - dataInicio.getFullYear();
      const meses = (anoAtual * 12 + mesHoje) -
        (dataInicio.getFullYear() * 12 + mesAniv);
      avisos.push({
        tipo: 'ANIVERSARIO_CONTRATO',
        ...TIPOS.ANIVERSARIO_CONTRATO,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `🗓️ Aniversário do contrato — ${devedor}`,
        mensagem: `${meses} ${meses === 1 ? 'mês' : 'meses'} ` +
          `(${anos > 0 ? anos + ' ano(s) e ' : ''}` +
          `${meses % 12} mes(es)) de contrato com ${devedor}. ` +
          `Total pago até hoje: ` +
          `${fmt(pagamentos.reduce((a,p) => a + p.valor_pago, 0))}.`,
        dados: { meses, anos },
        lido: false,
        createdAt: new Date().toISOString()
      });
    }

    // --- ALTO RENDIMENTO (juros > R$500 no mês) ---
    if (jurosProximos >= 500) {
      avisos.push({
        tipo: 'ALTO_RENDIMENTO',
        ...TIPOS.ALTO_RENDIMENTO,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `💹 Alto rendimento — ${devedor}`,
        mensagem: `Este empréstimo vai gerar ` +
          `${fmt(jurosProximos)} de juros neste ciclo. ` +
          `Saldo devedor: ${fmt(emp.saldo_devedor)}.`,
        dados: { jurosProximos, saldoDevedor: emp.saldo_devedor },
        lido: false,
        createdAt: new Date().toISOString()
      });
    }
  });

  // ---- Movimentações recentes (últimos 7 dias) ----
  const seteDiasAtras = new Date();
  seteDiasAtras.setDate(seteDiasAtras.getDate() - 7);

  emprestimos.forEach(emp => {
    const devedor = emp.devedores?.nome || 'Devedor';
    const pagamentos = emp.pagamentos || [];

    // Pagamentos recentes
    pagamentos
      .filter(p => new Date(p.created_at) >= seteDiasAtras)
      .forEach(p => {
        const quitado = p.saldo_apos <= 0.01;
        if (quitado) {
          avisos.push({
            tipo: 'EMPRESTIMO_QUITADO',
            ...TIPOS.EMPRESTIMO_QUITADO,
            emprestimoId: emp.id,
            devedorNome: devedor,
            titulo: `🏆 Empréstimo quitado — ${devedor}`,
            mensagem: `Parabéns! O empréstimo de ` +
              `${fmt(emp.valor_principal)} foi quitado ` +
              `em ${fmtData(p.data_pagamento)}. ` +
              `Total recebido: ` +
              `${fmt(pagamentos.reduce((a,x)=>a+x.valor_pago,0))}.`,
            dados: { valorPrincipal: emp.valor_principal },
            lido: false,
            createdAt: p.created_at
          });
        } else {
          avisos.push({
            tipo: 'PAGAMENTO_RECEBIDO',
            ...TIPOS.PAGAMENTO_RECEBIDO,
            emprestimoId: emp.id,
            devedorNome: devedor,
            titulo: `✅ Pagamento recebido — ${devedor}`,
            mensagem: `${fmt(p.valor_pago)} recebido em ` +
              `${fmtData(p.data_pagamento)}. ` +
              `Juros: ${fmt(p.valor_juros)} | ` +
              `Amort.: ${fmt(Math.max(0, p.valor_amortizacao))} | ` +
              `Saldo restante: ${fmt(p.saldo_apos)}.`,
            dados: {
              valorPago: p.valor_pago,
              valorJuros: p.valor_juros,
              valorAmort: p.valor_amortizacao,
              saldoApos: p.saldo_apos
            },
            lido: false,
            createdAt: p.created_at
          });
        }
      });

    // Empréstimos criados recentemente
    if (new Date(emp.created_at) >= seteDiasAtras &&
        emp.status === 'ativo') {
      avisos.push({
        tipo: 'NOVO_EMPRESTIMO',
        ...TIPOS.NOVO_EMPRESTIMO,
        emprestimoId: emp.id,
        devedorNome: devedor,
        titulo: `📋 Novo empréstimo — ${devedor}`,
        mensagem: `Empréstimo de ${fmt(emp.valor_principal)} ` +
          `criado em ${fmtData(emp.data_inicio)}. ` +
          `Taxa: ${(emp.taxa_mensal*100).toFixed(2)
            .replace('.',',')}% a.m. | ` +
          `Modalidade: ${{livre:'Livre',price:'Price',
            sac:'SAC'}[emp.modalidade]}.`,
        dados: {
          valorPrincipal: emp.valor_principal,
          taxa: emp.taxa_mensal,
          modalidade: emp.modalidade
        },
        lido: false,
        createdAt: emp.created_at
      });
    }
  });

  // Ordenar por prioridade e data
  return avisos.sort((a, b) => {
    if (a.prioridade !== b.prioridade)
      return a.prioridade - b.prioridade;
    return new Date(b.createdAt) - new Date(a.createdAt);
  });
}

// Resumo de parcelas do mês por devedor
export async function gerarResumoParcelas() {
  const { data: emprestimos } = await supabase
    .from('emprestimos')
    .select(`
      id, saldo_devedor, taxa_mensal, data_inicio,
      devedores ( id, nome ),
      pagamentos ( data_pagamento )
    `)
    .eq('status', 'ativo');

  if (!emprestimos) return [];

  return emprestimos.map(emp => {
    const pagamentos = (emp.pagamentos || []).sort(
      (a,b) => new Date(b.data_pagamento) -
               new Date(a.data_pagamento)
    );
    const proximaParcela = calcularProximoPagamento(
      pagamentos[0]?.data_pagamento, emp.data_inicio
    );
    const juros = Math.round(
      emp.saldo_devedor * emp.taxa_mensal * 100
    ) / 100;
    const dias = calcularDias(proximaParcela) * -1;
    const diasAtrasado = calcularDias(proximaParcela);
    return {
      emprestimoId: emp.id,
      devedor: emp.devedores?.nome,
      saldoDevedor: emp.saldo_devedor,
      jurosProximos: juros,
      proximaParcela: proximaParcela.toISOString(),
      diasParaVencer: dias,
      diasEmAtraso: diasAtrasado > 0 ? diasAtrasado : 0,
      status: diasAtrasado > 30 ? 'atrasado'
        : diasAtrasado > 0 ? 'vencendo'
        : dias <= 7 ? 'urgente'
        : 'normal'
    };
  }).sort((a, b) => b.diasEmAtraso - a.diasEmAtraso ||
    a.diasParaVencer - b.diasParaVencer);
}

export { fmt, fmtData };
