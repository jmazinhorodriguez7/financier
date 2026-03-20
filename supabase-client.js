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
