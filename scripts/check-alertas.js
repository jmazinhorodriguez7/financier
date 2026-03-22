import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config();

const url = process.env.VITE_SUPABASE_URL || 'https://zltvtyvqqoapqfbdtdsu.supabase.co';
const key = process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY;
if (!key) throw new Error('No Supabase key found in env');

const supabase = createClient(url, key);

async function runSQL() {
  console.log('--- PASSO 2: Verificar tabela alertas ---');
  
  // Verify if 'alertas' has data
  const { data: alertasData, error: alertasErr } = await supabase.from('alertas').select('*', { count: 'exact' });
  if (alertasErr) {
    console.log('Tabela alertas - Erro ou não existe:', alertasErr.message);
  } else {
    console.log(`Tabela alertas - Registros: ${alertasData.length}`);
  }

  // Active loans query
  const { data: empData, error: empErr } = await supabase
    .from('emprestimos')
    .select(`
      id,
      saldo_devedor,
      taxa_mensal,
      data_inicio,
      modalidade,
      status,
      devedor_id,
      devedores (nome),
      pagamentos (id, data_pagamento)
    `)
    .eq('status', 'ativo');
    
  if (empErr) {
    console.log('Erro ao buscar emprestimos:', empErr);
  } else {
    console.log('\\n--- Emprestimos ativos ---');
    empData.forEach(e => {
        const pagamentos = e.pagamentos || [];
        const ultimo_pagamento = pagamentos.reduce((max, p) => p.data_pagamento > max ? p.data_pagamento : max, null);
        console.log(`ID: ${e.id.substring(0,8)} | Devedor: ${e.devedores?.nome || 'N/A'} | Saldo: ${e.saldo_devedor} | Último Pgto: ${ultimo_pagamento} | Total Pgtos: ${pagamentos.length}`);
    });
  }
}

runSQL();
