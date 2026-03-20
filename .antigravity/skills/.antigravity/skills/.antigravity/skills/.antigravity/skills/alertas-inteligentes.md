# Skill: Sistema de Alertas Inteligentes

## Lógica de Classificação de Alertas

### Alerta Vermelho — Crítico
Condição: último pagamento registrado há mais de 30 dias E 
empréstimo com status ativo
Mensagem: "Pagamento atrasado [X] dias — Saldo: R$ [valor]"
Ação sugerida: mostrar botão de contato rápido

### Alerta Amarelo — Atenção
Condição: último pagamento registrado entre 25 e 30 dias atrás
Mensagem: "Vencimento em [X] dias — [Nome do devedor]"

### Alerta Verde — Informativo
Condição: pagamento registrado nos últimos 3 dias
Mensagem: "Pagamento recebido de [Nome] — R$ [valor]"

### Alerta Azul — Sistema
Condição: empréstimo quitado, saldo devedor zerado
Mensagem: "[Nome] quitou o empréstimo de R$ [valor original]"

## Geração Automática de Alertas
Verificar condições de alerta nos eventos:
- Ao registrar qualquer pagamento
- Ao abrir o dashboard (verificar todos os empréstimos ativos)
- Ao adicionar novo empréstimo

## Ordenação na Tela de Avisos
1. Vermelhos (mais antigo primeiro)
2. Amarelos (mais próximo do vencimento primeiro)
3. Verdes (mais recente primeiro)
4. Azuis (mais recente primeiro)