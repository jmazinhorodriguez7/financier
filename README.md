# Financier 💰
Sistema web de gestão de empréstimos pessoais com 
cálculo automático de juros mensais.

## Funcionalidades
- Cadastro de devedores e empréstimos
- Cálculo automático de juros simples e sistema Price
- Registro e histórico de pagamentos com extrato completo
- Sistema de alertas automáticos por vencimento
- Importação de registros via PDF
- Autenticação segura por email e senha

## Tecnologias
- HTML, CSS e JavaScript puro
- Supabase (banco de dados e autenticação)
- PDF.js para extração de arquivos PDF
- Google Stitch para design das telas

## Configuração local

1. Clone o repositório:
   git clone https://github.com/seu-usuario/financier.git
   cd financier

2. Copie o arquivo de variáveis de ambiente:
   cp .env.example .env

3. Preencha o .env com suas credenciais do Supabase

4. Abra o index.html no navegador ou use um servidor local:
   npx serve .

## Banco de Dados
Execute o arquivo sql/schema.sql no painel do Supabase
para criar todas as tabelas com as políticas de segurança.

## Deploy
O projeto pode ser publicado diretamente no Vercel ou
Netlify conectando este repositório GitHub.
