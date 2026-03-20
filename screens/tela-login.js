// ============================================
// tela-login.js — Tela de Login & Criar Conta
// ============================================

const TelaLogin = {

    /**
     * Renderiza a tela de login no #app
     */
    render() {
        const app = document.getElementById('app');
        app.innerHTML = `
        <div class="login-page" id="login-page">
            <div class="login-card">
                <!-- Logo -->
                <div class="login-logo">
                    <div class="login-logo-icon">
                        <i data-lucide="landmark" style="width:28px;height:28px;color:#0a1a0c;"></i>
                    </div>
                    <h1 class="login-title">Financier</h1>
                </div>

                <!-- Headline -->
                <div class="login-headline">
                    <h2 class="login-headline-title">Bem-vindo de volta</h2>
                    <p class="login-headline-sub">Acesse sua conta para gerenciar seus empréstimos</p>
                </div>

                <!-- Mensagem de erro -->
                <div id="login-error" class="login-error hidden"></div>
                <div id="login-success" class="login-success hidden"></div>

                <!-- Formulário -->
                <form id="login-form" class="login-form" onsubmit="TelaLogin.handleLogin(event)">
                    <div class="form-group">
                        <label class="form-label" for="login-email">Email</label>
                        <div class="login-input-wrapper">
                            <i data-lucide="mail" class="login-input-icon"></i>
                            <input
                                type="email"
                                id="login-email"
                                class="form-input login-input-with-icon"
                                placeholder="seu@email.com"
                                autocomplete="email"
                                required
                            >
                        </div>
                    </div>

                    <div class="form-group">
                        <label class="form-label" for="login-senha">Senha</label>
                        <div class="login-input-wrapper">
                            <i data-lucide="lock" class="login-input-icon"></i>
                            <input
                                type="password"
                                id="login-senha"
                                class="form-input login-input-with-icon login-input-password"
                                placeholder="Sua senha"
                                autocomplete="current-password"
                                required
                            >
                            <button type="button" class="login-toggle-senha" onclick="TelaLogin.toggleSenha('login-senha', this)" title="Mostrar senha">
                                <i data-lucide="eye" class="login-eye-icon"></i>
                            </button>
                        </div>
                    </div>

                    <div class="login-forgot">
                        <a href="#" onclick="TelaLogin.mostrarRecuperarSenha(event)" class="login-forgot-link">Esqueci minha senha</a>
                    </div>

                    <button type="submit" id="btn-entrar" class="btn btn-primary login-btn">
                        Entrar
                    </button>
                </form>

                <!-- Rodapé -->
                <div class="login-footer">
                    Ainda não tem uma conta? <a href="#" onclick="TelaLogin.mostrarCriarConta(event)">Criar conta</a>
                </div>
            </div>

            <!-- Modal Criar Conta -->
            <div id="modal-criar-conta" class="modal-overlay hidden" onclick="TelaLogin.fecharModalFora(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3 class="modal-title">Criar conta</h3>
                        <button class="modal-close" onclick="TelaLogin.fecharModal()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <div id="criar-erro" class="login-error hidden"></div>

                        <form id="form-criar-conta" onsubmit="TelaLogin.handleCriarConta(event)">
                            <div class="form-group">
                                <label class="form-label" for="criar-nome">Nome</label>
                                <div class="login-input-wrapper">
                                    <i data-lucide="user" class="login-input-icon"></i>
                                    <input type="text" id="criar-nome" class="form-input login-input-with-icon" placeholder="Seu nome completo" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="criar-email">Email</label>
                                <div class="login-input-wrapper">
                                    <i data-lucide="mail" class="login-input-icon"></i>
                                    <input type="email" id="criar-email" class="form-input login-input-with-icon" placeholder="seu@email.com" autocomplete="email" required>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="criar-senha">Senha</label>
                                <div class="login-input-wrapper">
                                    <i data-lucide="lock" class="login-input-icon"></i>
                                    <input type="password" id="criar-senha" class="form-input login-input-with-icon login-input-password" placeholder="Mínimo 6 caracteres" autocomplete="new-password" required minlength="6">
                                    <button type="button" class="login-toggle-senha" onclick="TelaLogin.toggleSenha('criar-senha', this)" title="Mostrar senha">
                                        <i data-lucide="eye" class="login-eye-icon"></i>
                                    </button>
                                </div>
                            </div>

                            <div class="form-group">
                                <label class="form-label" for="criar-confirmar">Confirmar senha</label>
                                <div class="login-input-wrapper">
                                    <i data-lucide="lock" class="login-input-icon"></i>
                                    <input type="password" id="criar-confirmar" class="form-input login-input-with-icon login-input-password" placeholder="Repita a senha" autocomplete="new-password" required minlength="6">
                                    <button type="button" class="login-toggle-senha" onclick="TelaLogin.toggleSenha('criar-confirmar', this)" title="Mostrar senha">
                                        <i data-lucide="eye" class="login-eye-icon"></i>
                                    </button>
                                </div>
                            </div>

                            <button type="submit" id="btn-criar" class="btn btn-primary login-btn" style="margin-top: 8px;">
                                Criar conta
                            </button>
                        </form>
                    </div>
                </div>
            </div>

            <!-- Modal Recuperar Senha -->
            <div id="modal-recuperar-senha" class="modal-overlay hidden" onclick="TelaLogin.fecharModalFora(event)">
                <div class="modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <h3 class="modal-title">Recuperar senha</h3>
                        <button class="modal-close" onclick="TelaLogin.fecharModalRecuperar()">
                            <i data-lucide="x"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <p style="color: var(--text-secondary); font-size: 14px; margin-bottom: 20px; line-height: 1.6;">
                            Informe seu email e enviaremos um link para redefinir sua senha.
                        </p>
                        <div id="recuperar-erro" class="login-error hidden"></div>
                        <div id="recuperar-sucesso" class="login-success hidden"></div>

                        <form id="form-recuperar" onsubmit="TelaLogin.handleRecuperarSenha(event)">
                            <div class="form-group">
                                <label class="form-label" for="recuperar-email">Email</label>
                                <div class="login-input-wrapper">
                                    <i data-lucide="mail" class="login-input-icon"></i>
                                    <input type="email" id="recuperar-email" class="form-input login-input-with-icon" placeholder="seu@email.com" required>
                                </div>
                            </div>

                            <button type="submit" id="btn-recuperar" class="btn btn-primary login-btn" style="margin-top: 8px;">
                                Enviar link
                            </button>
                        </form>
                    </div>
                </div>
            </div>
        </div>`;

        // Ativa ícones Lucide
        if (window.lucide) window.lucide.createIcons();

        // Foco no campo de email
        setTimeout(() => {
            const emailInput = document.getElementById('login-email');
            if (emailInput) emailInput.focus();
        }, 200);
    },

    // ==========================================
    // HANDLERS
    // ==========================================

    /**
     * Processa o login
     */
    async handleLogin(event) {
        event.preventDefault();

        const email = document.getElementById('login-email').value;
        const senha = document.getElementById('login-senha').value;
        const btn = document.getElementById('btn-entrar');
        const erroEl = document.getElementById('login-error');

        // Validação frontend
        if (!email || !senha) {
            this._mostrarErro(erroEl, 'Preencha todos os campos');
            return;
        }

        // Loading state
        this._setBtnLoading(btn, true);
        this._esconderMensagem(erroEl);

        const resultado = await Auth.login(email, senha);

        if (resultado.sucesso) {
            // Redireciona para dashboard
            window.location.hash = '#/dashboard';
        } else {
            this._mostrarErro(erroEl, resultado.erro);
            this._setBtnLoading(btn, false);
        }
    },

    /**
     * Processa criação de conta
     */
    async handleCriarConta(event) {
        event.preventDefault();

        const nome = document.getElementById('criar-nome').value;
        const email = document.getElementById('criar-email').value;
        const senha = document.getElementById('criar-senha').value;
        const confirmar = document.getElementById('criar-confirmar').value;
        const btn = document.getElementById('btn-criar');
        const erroEl = document.getElementById('criar-erro');

        // Validações
        if (!nome || !email || !senha || !confirmar) {
            this._mostrarErro(erroEl, 'Preencha todos os campos');
            return;
        }

        if (senha !== confirmar) {
            this._mostrarErro(erroEl, 'As senhas não coincidem');
            return;
        }

        if (senha.length < 6) {
            this._mostrarErro(erroEl, 'A senha deve ter pelo menos 6 caracteres');
            return;
        }

        // Loading state
        this._setBtnLoading(btn, true);
        this._esconderMensagem(erroEl);

        const resultado = await Auth.criarConta(email, senha, nome);

        if (resultado.sucesso) {
            if (resultado.confirmarEmail) {
                // Supabase exige confirmação de email
                this.fecharModal();
                const successEl = document.getElementById('login-success');
                this._mostrarSucesso(successEl, 'Conta criada! Verifique seu email para confirmar.');
            } else {
                // Login automático bem-sucedido
                window.location.hash = '#/dashboard';
            }
        } else {
            this._mostrarErro(erroEl, resultado.erro);
            this._setBtnLoading(btn, false);
        }
    },

    /**
     * Processa recuperação de senha
     */
    async handleRecuperarSenha(event) {
        event.preventDefault();

        const email = document.getElementById('recuperar-email').value;
        const btn = document.getElementById('btn-recuperar');
        const erroEl = document.getElementById('recuperar-erro');
        const sucEl = document.getElementById('recuperar-sucesso');

        if (!email) {
            this._mostrarErro(erroEl, 'Informe seu email');
            return;
        }

        this._setBtnLoading(btn, true);
        this._esconderMensagem(erroEl);
        this._esconderMensagem(sucEl);

        const resultado = await Auth.recuperarSenha(email);

        if (resultado.sucesso) {
            this._mostrarSucesso(sucEl, 'Email enviado! Verifique sua caixa de entrada.');
            this._setBtnLoading(btn, false);
        } else {
            this._mostrarErro(erroEl, resultado.erro);
            this._setBtnLoading(btn, false);
        }
    },

    // ==========================================
    // MODAIS
    // ==========================================

    mostrarCriarConta(event) {
        event.preventDefault();
        document.getElementById('modal-criar-conta').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            document.getElementById('criar-nome')?.focus();
        }, 200);
    },

    fecharModal() {
        document.getElementById('modal-criar-conta').classList.add('hidden');
        document.getElementById('form-criar-conta')?.reset();
        const erroEl = document.getElementById('criar-erro');
        if (erroEl) erroEl.classList.add('hidden');
    },

    mostrarRecuperarSenha(event) {
        event.preventDefault();
        document.getElementById('modal-recuperar-senha').classList.remove('hidden');
        if (window.lucide) window.lucide.createIcons();
        setTimeout(() => {
            document.getElementById('recuperar-email')?.focus();
        }, 200);
    },

    fecharModalRecuperar() {
        document.getElementById('modal-recuperar-senha').classList.add('hidden');
        document.getElementById('form-recuperar')?.reset();
        const erroEl = document.getElementById('recuperar-erro');
        if (erroEl) erroEl.classList.add('hidden');
        const sucEl = document.getElementById('recuperar-sucesso');
        if (sucEl) sucEl.classList.add('hidden');
    },

    fecharModalFora(event) {
        if (event.target.classList.contains('modal-overlay')) {
            event.target.classList.add('hidden');
        }
    },

    // ==========================================
    // UTILITÁRIOS DE UI
    // ==========================================

    /**
     * Toggle visibilidade da senha
     */
    toggleSenha(inputId, btn) {
        const input = document.getElementById(inputId);
        if (!input) return;

        const isPassword = input.type === 'password';
        input.type = isPassword ? 'text' : 'password';

        // Troca ícone
        const icon = btn.querySelector('.login-eye-icon');
        if (icon) {
            icon.setAttribute('data-lucide', isPassword ? 'eye-off' : 'eye');
            if (window.lucide) window.lucide.createIcons();
        }
    },

    /**
     * Coloca botão em estado de loading
     */
    _setBtnLoading(btn, loading) {
        if (!btn) return;
        if (loading) {
            btn.dataset.originalText = btn.textContent;
            btn.innerHTML = '<span class="spinner" style="width:16px;height:16px;border-width:2px;border-color:var(--bg-base);border-top-color:var(--text-inverse);"></span>';
            btn.disabled = true;
            btn.style.pointerEvents = 'none';
        } else {
            btn.textContent = btn.dataset.originalText || 'Entrar';
            btn.disabled = false;
            btn.style.pointerEvents = '';
        }
    },

    /**
     * Mostra mensagem de erro
     */
    _mostrarErro(el, mensagem) {
        if (!el) return;
        el.textContent = mensagem;
        el.classList.remove('hidden');
    },

    /**
     * Mostra mensagem de sucesso
     */
    _mostrarSucesso(el, mensagem) {
        if (!el) return;
        el.textContent = mensagem;
        el.classList.remove('hidden');
    },

    /**
     * Esconde mensagem
     */
    _esconderMensagem(el) {
        if (!el) return;
        el.classList.add('hidden');
    }
};

// Expor globalmente
window.TelaLogin = TelaLogin;
