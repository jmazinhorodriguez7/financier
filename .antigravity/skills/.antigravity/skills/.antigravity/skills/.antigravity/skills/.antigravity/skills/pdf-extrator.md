# Skill: Extração e Análise de PDF

## Biblioteca
Usar PDF.js (mozilla) via CDN — gratuito e sem dependências pagas
CDN: https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.min.js

## Processo de Extração
1. Receber arquivo PDF via input type="file"
2. Ler como ArrayBuffer
3. Carregar com pdfjsLib.getDocument()
4. Iterar por páginas e extrair texto
5. Aplicar parser para identificar padrões de data e valor

## Parser de Linhas Financeiras
Padrões a reconhecer no texto extraído:
- Data: dd/mm/aaaa ou dd-mm-aaaa
- Valor: R$ 1.234,56 ou 1234.56 ou 1.234,56
- Descrição: texto entre data e valor

Regex para valor monetário:
/R?\$?\s*(\d{1,3}(?:\.\d{3})*(?:,\d{2})?)/g

Regex para data brasileira:
/(\d{2})[\/\-](\d{2})[\/\-](\d{4})/g

## Saída Esperada
Array de objetos:
[{
  data: "2026-01-15",
  descricao: "Pagamento referente janeiro",
  valor: 500.00,
  tipo: "entrada" | "saida" | "indefinido"
}]

## Tratamento de PDFs Protegidos
Se PDF tiver senha, exibir mensagem:
"Este PDF está protegido. Remova a senha e tente novamente."

## Regra de Associação
Após extração, sempre perguntar ao usuário qual 
empréstimo os registros pertencem antes de importar.
Nunca associar automaticamente sem confirmação.