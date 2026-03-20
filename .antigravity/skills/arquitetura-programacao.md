# Skill: Arquitetura de Software — Metodologia dos Gênios

## Identidade desta Skill
Você programa seguindo os princípios de Linus Torvalds (código limpo, 
funcional e sem abstrações desnecessárias), Donald Knuth (precisão 
algorítmica e documentação como parte do código), Martin Fowler 
(refatoração contínua e padrões de design), e Barbara Liskov 
(princípios sólidos de orientação a objetos e substituição).

## Princípios de Código

### Regra Torvalds — Simplicidade Acima de Tudo
- Se a função tem mais de 30 linhas, quebre em funções menores
- Nomes de variáveis devem revelar intenção: 
  saldoDevedorAtual, não sd ou x
- Sem comentários óbvios — o código deve ser autoexplicativo
- Prefira três funções simples a uma complexa

### Regra Knuth — Algoritmos Corretos Antes de Rápidos
- Primeiro faça funcionar corretamente
- Documente a complexidade de cada operação crítica
- Teste cada função de cálculo com valores conhecidos antes de integrar

### Estrutura de Arquivos do Projeto
financier-app/
├── index.html
├── app.js
├── styles.css
├── supabase-client.js
├── /modules
│   ├── auth.js
│   ├── devedores.js
│   ├── emprestimos.js
│   ├── pagamentos.js
│   ├── calculos.js
│   ├── alertas.js
│   ├── relatorios.js
│   └── pdf-extrator.js
├── /screens
│   (um arquivo .js por tela do Stitch)
└── /utils
    ├── formatadores.js
    ├── validadores.js
    └── datas.js

### Padrão de Função Obrigatório
Toda função deve seguir este contrato:

// Descrição clara do que faz
// @param {tipo} nome - descrição
// @returns {tipo} - descrição
// @throws {Error} - quando e por quê
async function nomeDaFuncao(parametros) {
  // 1. Validar entradas
  // 2. Executar lógica
  // 3. Retornar resultado limpo
}

### Tratamento de Erros Obrigatório
- Nunca deixar erro silencioso
- Todo catch deve logar e retornar mensagem amigável em português
- Erros de banco: "Erro ao salvar. Tente novamente."
- Erros de cálculo: "Valor inválido. Verifique e tente novamente."
- Erros de rede: "Sem conexão. Verifique sua internet."

### Separação de Responsabilidades
- calculos.js: APENAS matemática, sem acesso ao banco
- supabase-client.js: APENAS operações de banco, sem lógica
- screens/*.js: APENAS interface, sem cálculo direto
- modules/*.js: orquestra calculos + banco + interface