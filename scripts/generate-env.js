/**
 * generate-env.js — Gera o arquivo env.js com as variáveis de ambiente
 * 
 * Executado durante o build da Vercel para injetar variáveis
 * de ambiente no frontend estático.
 * 
 * Em desenvolvimento local, o env.js já existe com valores manuais.
 */
const fs = require('fs');
const path = require('path');

const SUPABASE_URL = (process.env.VITE_SUPABASE_URL || '').trim();
const SUPABASE_ANON_KEY = (process.env.VITE_SUPABASE_ANON_KEY || '').trim();

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.warn('⚠️  Variáveis VITE_SUPABASE_URL e/ou VITE_SUPABASE_ANON_KEY não encontradas.');
  console.warn('   O env.js será gerado com valores vazios.');
}

const content = `window.__ENV__ = {
  SUPABASE_URL: "${SUPABASE_URL}",
  SUPABASE_ANON_KEY: "${SUPABASE_ANON_KEY}"
};
`;

const outputPath = path.join(__dirname, '..', 'env.js');
fs.writeFileSync(outputPath, content, 'utf-8');
console.log('✅ env.js gerado com sucesso em', outputPath);
