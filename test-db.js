const url = 'https://vlawdywcvbhbiuhfolml.supabase.co/rest/v1';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZsYXdkeXdjdmJoYml1aGZvbG1sIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzM3MDU1ODYsImV4cCI6MjA4OTI4MTU4Nn0.-nK4Gnlu7MPOMukHglJWlYg3aOjD8HpDQTgZZpHUpto';
const headers = { 'apikey': key, 'Authorization': `Bearer ${key}` };

async function run() {
  console.log('--- PASSO 2 - RESULTS ---');
  let res = await fetch(`${url}/alertas?select=*&limit=1`, { headers });
  if (!res.ok) {
    console.log(`Table "alertas" error or does not exist: ${res.status} ${res.statusText}`);
  } else {
    let data = await res.json();
    console.log('Query 1: Table "alertas" exists. Emptiness? length=', data.length);
  }

  res = await fetch(`${url}/emprestimos?select=id,saldo_devedor,taxa_mensal,data_inicio,modalidade,status,devedor_id&status=eq.ativo`, { headers });
  const emprestimos = await res.json();
  if (!Array.isArray(emprestimos)) {
    console.error('Failed to parse emprestimos: ', emprestimos);
    return;
  }
  
  res = await fetch(`${url}/devedores?select=id,nome`, { headers });
  const devedores = await res.json();

  res = await fetch(`${url}/pagamentos?select=id,emprestimo_id,data_pagamento`, { headers });
  const pagamentos = await res.json();

  const results = emprestimos.map(e => {
    const dev = (devedores || []).find(d => d.id === e.devedor_id);
    const pags = (pagamentos || []).filter(p => p.emprestimo_id === e.id);
    pags.sort((a,b) => new Date(b.data_pagamento) - new Date(a.data_pagamento));
    return {
      id: e.id,
      saldo_devedor: e.saldo_devedor,
      taxa_mensal: e.taxa_mensal,
      data_inicio: e.data_inicio,
      modalidade: e.modalidade,
      status: e.status,
      devedor: dev ? dev.nome : null,
      ultimo_pagamento: pags.length > 0 ? pags[0].data_pagamento : null,
      total_pagamentos: pags.length
    };
  });
  
  results.sort((a, b) => {
    if (!a.ultimo_pagamento) return -1;
    if (!b.ultimo_pagamento) return 1;
    return new Date(a.ultimo_pagamento) - new Date(b.ultimo_pagamento);
  });

  console.log('Query 3: Active loans with full data:');
  console.table(results);
}
run();
