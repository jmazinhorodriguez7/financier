const fs = require('fs');
const css = `
.tela-avisos {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.avisos-filtros {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
}

.aviso-filtro {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-radius: 20px;
  padding: 6px 16px;
  font-size: 13px;
  color: var(--text-secondary);
  cursor: pointer;
  transition: all 150ms;
}
.aviso-filtro:hover {
  border-color: var(--green-500);
  color: var(--text-primary);
}
.aviso-filtro.ativo {
  background: var(--green-500);
  border-color: var(--green-500);
  color: #000;
  font-weight: 600;
}

.lista-avisos {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.aviso-card {
  background: var(--bg-card);
  border: 1px solid var(--border-subtle);
  border-left: 4px solid transparent;
  border-radius: 10px;
  padding: 16px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
  transition: box-shadow 150ms;
}
.aviso-card:hover {
  box-shadow: 0 4px 16px rgba(0,0,0,0.2);
}

.aviso-card-topo {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.aviso-icone {
  font-size: 24px;
  flex-shrink: 0;
  margin-top: 2px;
}

.aviso-card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  flex: 1;
}

.aviso-titulo {
  font-size: 14px;
  font-weight: 700;
  color: var(--text-primary);
}

.aviso-descricao {
  font-size: 13px;
  color: var(--text-secondary);
  line-height: 1.5;
}

.aviso-detalhe {
  font-size: 12px;
  color: var(--text-muted);
}

.aviso-valor-destaque {
  display: flex;
  flex-direction: column;
  align-items: flex-end;
  gap: 2px;
  flex-shrink: 0;
}

.aviso-valor-num {
  font-size: 18px;
  font-weight: 700;
  color: var(--text-primary);
  font-family: 'JetBrains Mono', monospace;
  font-variant-numeric: tabular-nums;
}

.aviso-valor-label {
  font-size: 10px;
  color: var(--text-muted);
  text-align: right;
}

.aviso-card-acoes {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
}

.btn-aviso {
  border-radius: 6px;
  padding: 6px 14px;
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
  border: 1px solid transparent;
  transition: all 150ms;
}

.btn-ver {
  background: rgba(34,197,94,0.12);
  border-color: var(--green-500);
  color: var(--green-400);
}
.btn-ver:hover {
  background: rgba(34,197,94,0.25);
}

.btn-whats {
  background: rgba(37,211,102,0.12);
  border-color: #25d366;
  color: #25d366;
}
.btn-whats:hover {
  background: rgba(37,211,102,0.25);
}

.avisos-vazio {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 20px;
  gap: 12px;
}
.avisos-vazio-icone {
  font-size: 48px;
}
.avisos-vazio-titulo {
  font-size: 16px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 0;
}
.avisos-vazio-sub {
  font-size: 13px;
  color: var(--text-muted);
  margin: 0;
}

.aviso-skeleton {
  background: var(--bg-card);
  border-radius: 10px;
  padding: 20px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}
.skeleton-linha {
  background: var(--bg-hover);
  border-radius: 4px;
  height: 12px;
  animation: pulse 1.5s ease infinite;
}
.skeleton-linha.larga  { width: 60%; }
.skeleton-linha.media  { width: 40%; }
.skeleton-linha.curta  { width: 25%; }

@keyframes pulse {
  0%,100% { opacity: 1; }
  50%      { opacity: 0.4; }
}
`;
fs.appendFileSync('styles.css', '\\n' + css + '\\n');
console.log('CSS dos cards de aviso anexado sucesso!');
