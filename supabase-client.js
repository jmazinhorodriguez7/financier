// ============================================================
// Supabase Client — Inicialização (Dev + Produção)
// ============================================================
// Lê credenciais do env.js (gerado pelo build script ou manualmente)

const SUPABASE_URL = window.__ENV__?.SUPABASE_URL;
const SUPABASE_ANON_KEY = window.__ENV__?.SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error(
    'Credenciais Supabase não configuradas. ' +
    'Verifique o arquivo env.js ou as variáveis de ambiente.'
  );
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  }
);

// Expõe globalmente para todos os módulos
window.FinancierDB = supabaseClient;

// ============================================================
// Segurança — Verificação de domínio
// ============================================================
const DOMINIOS_PERMITIDOS = [
  'localhost',
  '127.0.0.1',
  'financier.vercel.app', 
  // Add other valid domains here for Vercel
];

const dominioAtual = window.location.hostname;
if (!DOMINIOS_PERMITIDOS.includes(dominioAtual) && !dominioAtual.endsWith('.vercel.app')) {
  document.body.innerHTML = '';
  throw new Error('Domínio não autorizado.');
}
