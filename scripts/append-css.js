const fs = require('fs');
const css = `
/* Resumo do mês */
.resumo-mes-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 16px;
  margin-bottom: 24px;
}
.resumo-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.resumo-card-alerta {
  border-color: #ef4444;
  background: rgba(239,68,68,0.05);
}
.resumo-label {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  color: var(--text-secondary);
}
.resumo-valor {
  font-size: 22px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
}
.resumo-sub {
  font-size: 12px;
  color: var(--text-muted);
}
.positivo { color: #22c55e !important; }
.negativo { color: #ef4444 !important; }
.bold { font-weight: 700 !important; }

/* Tabela de parcelas */
.parcelas-mes-wrapper {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 12px;
  padding: 20px;
  margin-bottom: 24px;
  display: flex;
  flex-direction: column;
  gap: 16px;
}
.parcelas-mes-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.parcelas-total {
  font-size: 14px;
  color: var(--text-secondary);
}
.linha-clicavel { cursor: pointer; }
.linha-clicavel:hover td {
  background: var(--bg-hover);
}
.linha-total td {
  background: rgba(34,197,94,0.08) !important;
  border-top: 2px solid var(--green-500);
}
.text-right { text-align: right !important; }

/* Badges de status */
.badge {
  display: inline-block;
  padding: 3px 10px;
  border-radius: 20px;
  font-size: 11px;
  font-weight: 600;
  white-space: nowrap;
}
.badge-critico {
  background: rgba(239,68,68,0.15);
  color: #ef4444;
  border: 1px solid #ef4444;
}
.badge-alerta {
  background: rgba(249,115,22,0.15);
  color: #f97316;
  border: 1px solid #f97316;
}
.badge-urgente {
  background: rgba(245,158,11,0.15);
  color: #f59e0b;
  border: 1px solid #f59e0b;
}
.badge-normal {
  background: rgba(34,197,94,0.15);
  color: #22c55e;
  border: 1px solid #22c55e;
}

/* Filtros */
.avisos-filtros {
  display: flex;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 20px;
}
.filtro-btn {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  display: flex;
  align-items: center;
  gap: 6px;
  transition: all 150ms;
}
.filtro-btn:hover {
  border-color: var(--green-500);
  color: var(--text-primary);
}
.filtro-ativo {
  background: var(--green-500) !important;
  border-color: var(--green-500) !important;
  color: #000 !important;
  font-weight: 600 !important;
}
.filtro-count {
  background: rgba(0,0,0,0.2);
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 11px;
}
.filtro-ativo .filtro-count {
  background: rgba(0,0,0,0.25);
}

/* Cards de aviso */
.avisos-lista {
  display: flex;
  flex-direction: column;
  gap: 12px;
}
.aviso-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 10px;
  padding: 16px 20px;
  transition: opacity 300ms;
}
.aviso-lido { opacity: 0.5; }
.aviso-card-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 8px;
}
.aviso-info {
  display: flex;
  align-items: flex-start;
  gap: 12px;
}
.aviso-icone { font-size: 22px; flex-shrink: 0; }
.aviso-titulo {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  display: block;
}
.aviso-data {
  font-size: 11px;
  color: var(--text-muted);
}
.aviso-acoes {
  display: flex;
  gap: 8px;
  align-items: center;
  flex-shrink: 0;
}
.aviso-mensagem {
  font-size: 13px;
  color: var(--text-secondary);
  margin: 0;
  line-height: 1.6;
  padding-left: 34px;
}
.avisos-vazio {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8px;
  padding: 64px 0;
  color: var(--text-muted);
}
.avisos-vazio-icone { font-size: 48px; }
.avisos-vazio-titulo {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-secondary);
}
.avisos-vazio-sub { font-size: 13px; }

/* Badge na sidebar para avisos não lidos */
.nav-badge {
  background: #ef4444;
  color: white;
  border-radius: 10px;
  padding: 1px 7px;
  font-size: 10px;
  font-weight: 700;
  margin-left: auto;
}
`;
fs.appendFileSync('styles.css', '\\n' + css + '\\n');
console.log('CSS appended to styles.css successfully.');
