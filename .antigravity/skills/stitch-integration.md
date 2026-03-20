# Skill: Integração Google Stitch

## Identidade desta Skill
Garante fidelidade total ao design criado no Stitch ao gerar código,
usando o stitch-loop para validação contínua tela a tela.

## ID do Projeto
1883282262653912139

## Regras de Fidelidade Visual
- Antes de gerar código de qualquer tela, buscar o design no Stitch
- Comparar o resultado gerado com o design original
- Diferenças de cor, espaçamento ou tipografia devem ser corrigidas 
  antes de avançar para a próxima tela
- Nunca assumir cores — sempre extrair do design

## Paleta Extraída do Design
- Fundo principal: #0f172a (azul muito escuro)
- Fundo cards: #1e293b
- Acento principal: #22c55e (verde)
- Texto primário: #f1f5f9
- Texto secundário: #94a3b8
- Alerta vermelho: #ef4444
- Alerta amarelo: #f59e0b
- Alerta verde: #22c55e
- Bordas: #334155

## Processo stitch-loop por Tela
1. Buscar tela no Stitch via MCP
2. Extrair componentes, cores e layout
3. Gerar HTML + CSS correspondente
4. Renderizar preview mental
5. Comparar com original
6. Corrigir divergências
7. Aprovar e avançar

## Mapeamento de Telas — Projeto appfinanceiropessoal
- Login → auth.js + tela-login.js
- Dashboard → tela-dashboard.js
- Lista Devedores → tela-devedores.js
- Perfil Devedor → tela-perfil-devedor.js
- Detalhe Empréstimo → tela-detalhe-emprestimo.js
- Novo Empréstimo → tela-novo-emprestimo.js
- Registro Pagamento → tela-pagamento.js
- Avisos → tela-avisos.js
- Importar PDF → tela-pdf.js

## Componentes Reutilizáveis Obrigatórios
Criar estes componentes antes de gerar telas:
- CardResumo(titulo, valor, cor)
- ItemLista(nome, info, badge, onClick)
- BotaoAcao(texto, cor, onClick)
- AlertaBadge(tipo, mensagem)
- CampoMonetario(label, valor, onChange)
- SeletorData(label, valor, onChange)