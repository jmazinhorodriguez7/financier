// ============================================
// auth.js — Módulo de Autenticação Supabase
// ============================================

const MAX_TENTATIVAS = 5;
const TEMPO_BLOQUEIO = 15 * 60 * 1000; // 15 minutos
const SESSION_KEY = '_sess_token';

function verificarBloqueio() {
  const dados = JSON.parse(localStorage.getItem('_sec_auth') || '{}');
  const agora = Date.now();
  if (dados.bloqueadoAte && agora < dados.bloqueadoAte) {
    const minutos = Math.ceil((dados.bloqueadoAte - agora) / 60000);
    return { bloqueado: true, mensagem: `Acesso bloqueado. Tente novamente em ${minutos} minuto(s).` };
  }
  return { bloqueado: false };
}

function registrarTentativaFalha() {
  const dados = JSON.parse(localStorage.getItem('_sec_auth') || '{}');
  dados.tentativas = (dados.tentativas || 0) + 1;
  if (dados.tentativas >= MAX_TENTATIVAS) {
    dados.bloqueadoAte = Date.now() + TEMPO_BLOQUEIO;
    dados.tentativas = 0;
  }
  localStorage.setItem('_sec_auth', JSON.stringify(dados));
}

function limparTentativas() {
  localStorage.removeItem('_sec_auth');
}

async function hashTexto(texto) {
  const encoder = new TextEncoder();
  const data = encoder.encode(texto);
  const hash = await crypto.subtle.digest('SHA-256', data);
  return Array.from(new Uint8Array(hash))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('').substring(0, 16);
}

async function registrarAcao(acao) {
  try {
    const { data: { user } } = await window.FinancierDB.auth.getUser();
    if (!user) return;

    const ua = navigator.userAgent;
    const uaHash = await hashTexto(ua);

    await window.FinancierDB.from('log_acesso').insert({
      user_id: user.id,
      acao: acao,
      user_agent_hash: uaHash,
      created_at: new Date().toISOString()
    });
  } catch (_) {}
}
window.registrarAcao = registrarAcao;

async function gerarTokenSessao() {
  const token = window.crypto.randomUUID();
  sessionStorage.setItem(SESSION_KEY, token);
  const { data: { user } } = await window.FinancierDB.auth.getUser();
  if (user) {
      await window.FinancierDB.from('config_usuario').upsert({
        user_id: user.id,
        session_token: token,
        ultimo_acesso: new Date().toISOString()
      }, { onConflict: 'user_id' });
  }
  return token;
}

async function validarTokenSessao() {
  const tokenLocal = sessionStorage.getItem(SESSION_KEY);
  if (!tokenLocal) return;
  const { data: { user } } = await window.FinancierDB.auth.getUser();
  if (!user) return;
  
  const { data } = await window.FinancierDB
    .from('config_usuario')
    .select('session_token')
    .eq('user_id', user.id)
    .single();
    
  if (!data || data.session_token !== tokenLocal) {
    await window.FinancierDB.auth.signOut();
    window.location.replace('/');
  }
}

// Verificar token a cada 2 minutos
setInterval(validarTokenSessao, 2 * 60 * 1000);

const Auth = {
    _session: null,
    _listeners: [],

    /**
     * Registra callback para mudanças de autenticação
     * @param {Function} callback - (event, session)
     */
    onAuthStateChange(callback) {
        this._listeners.push(callback);

        // Registra no Supabase
        window.FinancierDB.auth.onAuthStateChange((event, session) => {
            this._session = session;
            this._listeners.forEach(fn => fn(event, session));
        });

        // Verifica sessão existente
        this._checkSession();
    },

    /**
     * Verifica se há sessão ativa no localStorage
     */
    async _checkSession() {
        try {
            const { data: { session }, error } = await window.FinancierDB.auth.getSession();
            if (error) throw error;

            this._session = session;
            if (session) {
                this._listeners.forEach(fn => fn('INITIAL_SESSION', session));
            }
        } catch (err) {
            console.error('Erro ao verificar sessão:', err.message);
            this._session = null;
        }
    },

    /**
     * Verifica se o usuário está autenticado
     * @returns {boolean}
     */
    isAutenticado() {
        return this._session !== null && this._session !== undefined;
    },

    /**
     * Retorna o usuário atual
     * @returns {object|null}
     */
    getUsuario() {
        return this._session?.user || null;
    },

    /**
     * Retorna o ID do usuário atual
     * @returns {string|null}
     */
    getUsuarioId() {
        return this._session?.user?.id || null;
    },

    /**
     * Retorna o email do usuário atual
     * @returns {string|null}
     */
    getUsuarioEmail() {
        return this._session?.user?.email || null;
    },

    /**
     * Login com email e senha
     * @param {string} email
     * @param {string} senha
     * @returns {object} { sucesso, erro, usuario }
     */
    async login(email, senha) {
        try {
            const statusBloqueio = verificarBloqueio();
            if (statusBloqueio.bloqueado) {
                return { sucesso: false, erro: statusBloqueio.mensagem };
            }

            // Validação de campos
            if (!email || !email.trim()) {
                return { sucesso: false, erro: 'Preencha todos os campos' };
            }
            if (!senha || !senha.trim()) {
                return { sucesso: false, erro: 'Preencha todos os campos' };
            }

            const { data, error } = await window.FinancierDB.auth.signInWithPassword({
                email: email.trim(),
                password: senha
            });

            if (error) {
                registrarTentativaFalha();
                // Tradução de erros do Supabase para português
                const mensagem = this._traduzirErro(error.message);
                return { sucesso: false, erro: mensagem };
            }

            limparTentativas();
            await gerarTokenSessao();
            registrarAcao('LOGIN');

            this._session = data.session;
            return { sucesso: true, erro: null, usuario: data.user };

        } catch (err) {
            console.error('Erro no login:', err);
            return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
        }
    },

    /**
     * Criar nova conta
     * @param {string} email
     * @param {string} senha
     * @param {string} nome
     * @returns {object} { sucesso, erro, usuario }
     */
    async criarConta(email, senha, nome) {
        try {
            if (!email || !email.trim()) {
                return { sucesso: false, erro: 'Preencha todos os campos' };
            }
            if (!senha || !senha.trim()) {
                return { sucesso: false, erro: 'Preencha todos os campos' };
            }
            
            // Validação de senha forte
            const regras = [
              { regex: /.{12,}/, msg: 'mínimo 12 caracteres' },
              { regex: /[A-Z]/, msg: 'uma letra maiúscula' },
              { regex: /[a-z]/, msg: 'uma letra minúscula' },
              { regex: /[0-9]/, msg: 'um número' },
              { regex: /[^A-Za-z0-9]/, msg: 'um caractere especial' }
            ];
            const falhas = regras.filter(r => !r.regex.test(senha)).map(r => r.msg);
            if (falhas.length > 0) {
                return { sucesso: false, erro: 'Senha fraca: precisa ter ' + falhas.join(', ') };
            }

            const { data, error } = await window.FinancierDB.auth.signUp({
                email: email.trim(),
                password: senha,
                options: {
                    data: { nome: nome || '' }
                }
            });

            if (error) {
                const mensagem = this._traduzirErro(error.message);
                return { sucesso: false, erro: mensagem };
            }

            // Login automático após criação
            if (data.session) {
                this._session = data.session;
                return { sucesso: true, erro: null, usuario: data.user };
            }

            // Supabase pode exigir confirmação de email
            return {
                sucesso: true,
                erro: null,
                usuario: data.user,
                confirmarEmail: !data.session
            };

        } catch (err) {
            console.error('Erro ao criar conta:', err);
            return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
        }
    },

    /**
     * Logout
     */
    async logout() {
        try {
            if (window.registrarAcao) {
                await window.registrarAcao('LOGOUT');
            }
            await window.FinancierDB.auth.signOut();
            this._session = null;
        } catch (err) {
            console.error('Erro ao sair:', err);
            // Limpa sessão local mesmo se falhar no servidor
            this._session = null;
        }
    },

    /**
     * Recuperação de senha
     * @param {string} email
     * @returns {object} { sucesso, erro }
     */
    async recuperarSenha(email) {
        try {
            if (!email || !email.trim()) {
                return { sucesso: false, erro: 'Informe seu email' };
            }

            const { error } = await window.FinancierDB.auth.resetPasswordForEmail(
                email.trim(),
                { redirectTo: window.location.origin }
            );

            if (error) {
                return { sucesso: false, erro: this._traduzirErro(error.message) };
            }

            return { sucesso: true, erro: null };

        } catch (err) {
            console.error('Erro ao recuperar senha:', err);
            return { sucesso: false, erro: 'Erro de conexão. Tente novamente.' };
        }
    },

    /**
     * Traduz mensagens de erro do Supabase para português
     * @param {string} mensagemOriginal
     * @returns {string}
     */
    _traduzirErro(mensagemOriginal) {
        const msg = (mensagemOriginal || '').toLowerCase();

        if (msg.includes('invalid login credentials') || msg.includes('invalid_credentials')) {
            return 'Email ou senha incorretos';
        }
        if (msg.includes('email not confirmed')) {
            return 'Confirme seu email antes de fazer login';
        }
        if (msg.includes('user not found') || msg.includes('no user found')) {
            return 'Conta não encontrada';
        }
        if (msg.includes('user already registered') || msg.includes('already been registered')) {
            return 'Este email já está cadastrado';
        }
        if (msg.includes('password') && msg.includes('short')) {
            return 'A senha deve ter pelo menos 6 caracteres';
        }
        if (msg.includes('rate limit') || msg.includes('too many requests')) {
            return 'Muitas tentativas. Aguarde um momento.';
        }
        if (msg.includes('network') || msg.includes('fetch')) {
            return 'Erro de conexão. Verifique sua internet.';
        }

        return mensagemOriginal || 'Erro desconhecido';
    }
};

// Expor globalmente
window.Auth = Auth;
