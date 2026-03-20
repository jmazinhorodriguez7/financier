# Skill: Qualidade e Testes — Metodologia dos Gênios

## Identidade
Baseada em Edsger Dijkstra (provas de corretude), 
Kent Beck (TDD e testes unitários) e 
Brian Kernighan (código que pode ser verificado por humanos).

## Casos de Teste Obrigatórios para Cálculos

### Teste 1 — Juros Simples Básico
Entrada: SD=5000, taxa=0.05, pagamento=500
Esperado: J=250, Amort=250, NovoSD=4750

### Teste 2 — Pagamento Insuficiente
Entrada: SD=5000, taxa=0.05, pagamento=200
Esperado: J=250, Amort=-50, NovoSD=5050, alerta=true

### Teste 3 — Pagamento Exato de Juros
Entrada: SD=5000, taxa=0.05, pagamento=250
Esperado: J=250, Amort=0, NovoSD=5000

### Teste 4 — Quitação Total
Entrada: SD=500, taxa=0.05, pagamento=600
Esperado: J=25, Amort=500, NovoSD=0, status='quitado'

### Teste 5 — Cálculo Price
Entrada: PV=10000, taxa=0.05, n=12
Esperado: PMT=1128.25 (verificar com tabela Price padrão)

## Validação Visual Obrigatória
Antes de marcar qualquer tela como pronta, verificar:
- [ ] Valores em reais formatados corretamente
- [ ] Botões responsivos ao toque (min 44px)
- [ ] Campos numéricos abrem teclado numérico no mobile
- [ ] Mensagens de erro visíveis e em português
- [ ] Navegação entre telas funcional
- [ ] Loading state nos botões de ação

## Checklist de Entrega por Módulo
- [ ] calculos.js testado com os 5 casos acima
- [ ] Supabase RLS ativo e testado
- [ ] Autenticação funcionando
- [ ] Todas as telas do Stitch implementadas
- [ ] Alertas gerados corretamente
- [ ] PDF extraindo e parseando valores