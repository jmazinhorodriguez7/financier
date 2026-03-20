# Skill: Matemática Financeira — Metodologia dos Gênios

## Identidade desta Skill
Você aplica os princípios de Leonhard Euler (número e e juros compostos), 
Carl Friedrich Gauss (precisão numérica e eliminação de erros de 
arredondamento), Irving Fisher (valor do dinheiro no tempo) e 
John von Neumann (modelagem computacional de sistemas financeiros).
Toda operação financeira segue esses fundamentos sem exceção.

## Regras de Cálculo

### Juros Simples sobre Saldo Devedor (Modalidade Livre)
J = SD × i
Amortização = VP - J
Novo SD = SD - Amortização

Onde:
- SD = saldo devedor atual antes do pagamento
- i = taxa mensal decimal (ex: 5% = 0.05)
- VP = valor do pagamento recebido
- Se VP < J, a amortização é negativa e o saldo cresce

### Sistema Price — Parcela Fixa (Prazo Definido)
PMT = PV × [i × (1+i)^n] / [(1+i)^n - 1]

Onde:
- PV = valor principal
- i = taxa mensal decimal
- n = número de parcelas
- PMT = valor fixo mensal

### Decomposição de cada parcela Price
J_k = SD_{k-1} × i
Amort_k = PMT - J_k
SD_k = SD_{k-1} - Amort_k

### Precisão Numérica (Regra de Gauss)
- Todos os cálculos intermediários usam 10 casas decimais
- Arredondamento para 2 casas apenas na exibição final
- Nunca arredonde valores intermediários — isso acumula erro
- Use Math.round(valor * 100) / 100 apenas no momento de salvar

### Tratamento de Pagamento Insuficiente
- Se VP < J: registrar normalmente, saldo cresce, emitir alerta visual
- Se VP = J: amortização zero, saldo mantido, registrar
- Se VP > SD + J_último: calcular troco e marcar como quitado

### Cálculo Proporcional de Dias
Se pagamento ocorrer antes de completar 30 dias:
J_proporcional = SD × i × (dias_decorridos / 30)
Aplicar apenas quando modalidade = 'livre' e 
diferença entre pagamentos < 25 dias

### Capitalização Composta (quando aplicável)
SD_composto = PV × (1 + i)^n
Usar apenas quando explicitamente solicitado pelo usuário

### Validações Obrigatórias
- Taxa mensal nunca pode ser zero ou negativa
- Valor principal nunca pode ser zero ou negativo  
- Data de pagamento não pode ser anterior à data do empréstimo
- Saldo devedor nunca pode ser negativo após cálculo
- Se saldo resultante <= 0.01, marcar empréstimo como quitado

### Geração de Tabela de Amortização Completa
Para empréstimos Price, gerar tabela prévia com todas as parcelas:
Mês | Parcela | Juros | Amortização | Saldo Devedor
Usar esta tabela para comparar com pagamentos reais e identificar desvios