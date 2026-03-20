let url = window.__ENV__?.SUPABASE_URL;
let key = window.__ENV__?.SUPABASE_ANON_KEY;

// Tenta de forma segura ler import.meta.env para o caso de uso remoto
try {
  const getEnv = new Function('return import.meta.env');
  const env = getEnv();
  if (env && env.VITE_SUPABASE_URL) url = env.VITE_SUPABASE_URL;
  if (env && env.VITE_SUPABASE_ANON_KEY) key = env.VITE_SUPABASE_ANON_KEY;
} catch (error) {
  // Ignora o erro se não houver suporte a módulos ou import.meta
}

const SUPABASE_URL = url;
const SUPABASE_ANON_KEY = key;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Credenciais Supabase não configuradas no window.__ENV__ ou Vite.');
}

const supabaseClient = window.supabase.createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY
);

// Mantendo o FinancerDB acessível globalmente (como era antes) 
// para não quebrar a aplicação que é JavaScript puro
window.FinancierDB = supabaseClient;
