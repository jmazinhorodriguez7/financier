// ============================================
// auth.js — Módulo de Autenticação Supabase
// ============================================

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
                // Tradução de erros do Supabase para português
                const mensagem = this._traduzirErro(error.message);
                return { sucesso: false, erro: mensagem };
            }

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
            if (senha.length < 6) {
                return { sucesso: false, erro: 'A senha deve ter pelo menos 6 caracteres' };
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
