// Financier App - v1.1.0 (SAC & Edit)
/**
 * Financier — Core Application Logic (Desktop Web)
 * SPA Router, Sidebar Navigation, and Global State Management
 */

const App = {
    usuarioAtual: null,

    /**
     * Inicializa a aplicação
     */
    async init() {
        console.log('Iniciando Financier App (Desktop)...');
        
        // Configura observador de autenticação
        Auth.onAuthStateChange((event, session) => {
            this.usuarioAtual = session ? session.user : null;
            this.atualizarShell();
            this.rotear();
        });

        // Eventos de navegação
        window.addEventListener('hashchange', () => this.rotear());

        // Atalhos de teclado globais
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
                    m.classList.add('hidden');
                });
            }
        });
        
        // Roteamento inicial
        this.rotear();
    },

    /**
     * Atualiza a estrutura do shell (sidebar + header)
     */
    atualizarShell() {
        const sidebar = document.getElementById('sidebar');
        const topHeader = document.getElementById('top-header');
        const body = document.body;

        if (Auth.isAutenticado()) {
            body.classList.remove('no-shell');
            sidebar.innerHTML = this.renderSidebar();
            topHeader.innerHTML = this.renderTopHeaderContent();
            if (window.lucide) window.lucide.createIcons();
        } else {
            body.classList.add('no-shell');
            sidebar.innerHTML = '';
            topHeader.innerHTML = '';
        }
    },

    /**
     * Roteador baseado em hash
     */
    rotear() {
        const hash = window.location.hash || '#/inicio';
        const partes = hash.slice(2).split('/');
        const rota = partes[0];
        const params = partes.slice(1);

        // Fecha modais ativos
        document.querySelectorAll('.modal-overlay:not(.hidden)').forEach(m => {
            m.classList.add('hidden');
        });

        // Verifica permissão
        const rotasPublicas = ['login'];
        if (!Auth.isAutenticado() && !rotasPublicas.includes(rota)) {
            window.location.hash = '#/login';
            return;
        }

        // Redireciona se autenticado na tela de login
        if (Auth.isAutenticado() && rota === 'login') {
            window.location.hash = '#/dashboard';
            return;
        }

        // Atualiza item ativo na sidebar
        this.atualizarSidebarAtiva(rota);

        // Renderiza a tela
        try {
            switch (rota) {
                case 'login':
                    TelaLogin.render();
                    break;
                case 'inicio':
                case 'dashboard':
                    this.atualizarHeaderTitulo('Dashboard');
                    TelaDashboard.render();
                    break;
                case 'devedores':
                    this.atualizarHeaderTitulo('Devedores');
                    TelaDevedores.render();
                    break;
                case 'devedor':
                    this.atualizarHeaderTitulo('Perfil do Devedor');
                    if (params[0]) TelaPerfilDevedor.render(params[0]);
                    else window.location.hash = '#/devedores';
                    break;
                case 'novo-emprestimo':
                    this.atualizarHeaderTitulo('Novo Empréstimo');
                    TelaNovoEmprestimo.render(params[0]);
                    break;
                case 'emprestimos':
                case 'emprestimo':
                case 'detalhe-emprestimo':
                case 'detalhes-emprestimo':
                    if (params[0]) {
                        this.atualizarHeaderTitulo('Detalhes do Empréstimo');
                        TelaDetalheEmprestimo.render(params[0]);
                    } else {
                        this.atualizarHeaderTitulo('Empréstimos');
                        TelaEmprestimos.render();
                    }
                    break;
                case 'pagamentos':
                case 'pagamento':
                    if (params[0]) {
                        this.atualizarHeaderTitulo('Registrar Recebimento');
                        TelaPagamento.render(params[0]);
                    } else {
                        this.atualizarHeaderTitulo('Painel de Pagamentos');
                        TelaPagamentos.render();
                    }
                    break;

                case 'avisos':
                    this.atualizarHeaderTitulo('Avisos');
                    TelaAvisos.render();
                    break;
                case 'relatorio-mensal':
                    this.atualizarHeaderTitulo('Relatório Mensal');
                    TelaRelatorioMensal.render();
                    break;
                case 'rentabilidade':
                    this.atualizarHeaderTitulo('Índice de Rentabilidade');
                    TelaRentabilidade.render();
                    break;
                case 'simulador':
                    this.atualizarHeaderTitulo('Simulador de Empréstimos');
                    TelaSimulador.render();
                    break;
                case 'exportar':
                    this.atualizarHeaderTitulo('Exportar Relatório');
                    TelaExportarPdf.render();
                    break;
                case 'configuracoes':
                    this.atualizarHeaderTitulo('Configurações');
                    App.showToast('Configurações em breve.', 'info');
                    break;
                default:
                    window.location.hash = '#/dashboard';
            }
        } catch (error) {
            console.error('Erro de roteamento:', error);
            const container = document.getElementById('conteudo-principal');
            if (container) {
                container.innerHTML = `
                    <div style="padding: 40px; text-align: center;">
                        <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
                        <h2 style="color: var(--text-primary);">Erro ao carregar a página</h2>
                        <p style="color: var(--text-secondary); margin-bottom: 24px;">${error.message}</p>
                        <button class="btn btn-primary" onclick="window.location.reload()">Recarregar App</button>
                    </div>
                `;
            }
        }
    },

    /**
     * Atualiza o título no top header
     */
    atualizarHeaderTitulo(titulo) {
        const el = document.getElementById('header-page-title');
        if (el) el.textContent = titulo;
    },

    /**
     * Atualiza o item ativo na sidebar
     */
    atualizarSidebarAtiva(rota) {
        const mapa = {
            'inicio': 'dashboard', 'dashboard': 'dashboard',
            'devedores': 'devedores', 'devedor': 'devedores',
            'novo-emprestimo': 'emprestimos', 'emprestimo': 'emprestimos',
            'pagamento': 'pagamentos',
            'avisos': 'avisos',
            'relatorio-mensal': 'relatorio-mensal',
            'rentabilidade': 'rentabilidade',
            'simulador': 'simulador',
            'exportar': 'exportar',
            'configuracoes': 'configuracoes'
        };
        const ativa = mapa[rota] || 'dashboard';

        document.querySelectorAll('.sidebar__item').forEach(item => {
            item.classList.toggle('sidebar__item--active', item.dataset.route === ativa);
        });
        
        // Atualiza badge de avisos na sidebar
        if (window.atualizarBadgeAvisos) {
            window.atualizarBadgeAvisos();
        }
    },

    /**
     * Renderiza o conteúdo da sidebar lateral
     */
    renderSidebar() {
        return `
            <div class="sidebar__logo">
                <div class="sidebar__logo-icon">
                    <i data-lucide="landmark"></i>
                </div>
                <span class="sidebar__logo-text">Financier</span>
            </div>
            <div class="sidebar__nav">
                <a href="#/dashboard" class="sidebar__item" data-route="dashboard">
                    <i data-lucide="layout-dashboard"></i>
                    <span>Dashboard</span>
                </a>
                <a href="#/devedores" class="sidebar__item" data-route="devedores">
                    <i data-lucide="users"></i>
                    <span>Devedores</span>
                </a>
                <a href="#/emprestimo" class="sidebar__item" data-route="emprestimos">
                    <i data-lucide="file-text"></i>
                    <span>Empréstimos</span>
                </a>
                <a href="#/pagamento" class="sidebar__item" data-route="pagamentos">
                    <i data-lucide="coins"></i>
                    <span>Pagamentos</span>
                </a>
                <a href="#/avisos" class="sidebar__item" data-route="avisos">
                    <i data-lucide="bell"></i>
                    <span style="flex:1;">Avisos</span>
                    <span class="nav-badge" id="badge-avisos" style="display:none;">0</span>
                </a>
                <a href="#/relatorio-mensal" class="sidebar__item" data-route="relatorio-mensal">
                    <i data-lucide="trending-up"></i>
                    <span>Relatório Mensal</span>
                </a>
                <a href="#/rentabilidade" class="sidebar__item" data-route="rentabilidade">
                    <i data-lucide="line-chart"></i>
                    <span>Rentabilidade</span>
                </a>
                <a href="#/simulador" class="sidebar__item" data-route="simulador">
                    <i data-lucide="calculator"></i>
                    <span>Simulador</span>
                </a>
                <a href="#/exportar" class="sidebar__item" data-route="exportar">
                    <i data-lucide="file-down"></i>
                    <span>Exportar Relatório</span>
                </a>
                <a href="#/configuracoes" class="sidebar__item" data-route="configuracoes">
                    <i data-lucide="settings"></i>
                    <span>Configurações</span>
                </a>
            </div>
            <div class="sidebar__footer">
                <div class="sidebar__profile">
                    <div class="sidebar__avatar">
                        ${Formatadores.obterInicial(this.usuarioAtual?.email)}
                    </div>
                    <div class="sidebar__profile-info">
                        <div class="sidebar__profile-name">${this.usuarioAtual?.email || 'Usuário'}</div>
                    </div>
                </div>
                <a href="#" class="sidebar__logout" onclick="App.handleLogout(); return false;">
                    <i data-lucide="log-out"></i>
                    <span>Sair</span>
                </a>
            </div>`;
    },

    /**
     * Renderiza o conteúdo do top header
     */
    renderTopHeaderContent() {
        const email = this.usuarioAtual?.email || 'Usuário';
        const inicial = Formatadores.obterInicial(email);
        return `
            <h2 id="header-page-title" class="top-header__title">Dashboard</h2>
            <div class="top-header__right">
                <div class="top-header__user">
                    <div class="top-header__avatar">${inicial}</div>
                    <span>${email}</span>
                </div>
                <button class="top-header__logout" onclick="App.handleLogout()" title="Sair da conta">
                    <i data-lucide="log-out" style="width:16px;height:16px;"></i>
                    <span>Sair</span>
                </button>
            </div>`;
    },

    /**
     * Trata o logout do usuário
     */
    async handleLogout() {
        await Auth.logout();
        window.location.hash = '#/login';
    },

    /**
     * Sistema de notificações (toast)
     */
    showToast(mensagem, tipo = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast--${tipo}`;
        toast.innerText = mensagem;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('toast--visible');
            setTimeout(() => {
                toast.classList.remove('toast--visible');
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }, 50);
    }
};

// Inicia aplicação quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => App.init());

window.App = App;

// =========================================================
// CAMADA 1.2 — Timeout automático por inatividade
// =========================================================
const TIMEOUT_INATIVIDADE = 10 * 60 * 1000;
let timerInatividade;

function resetarTimer() {
  clearTimeout(timerInatividade);
  timerInatividade = setTimeout(async () => {
    if (window.Auth && Auth.isAutenticado()) {
      await App.handleLogout();
      sessionStorage.clear();
      localStorage.clear();
      window.location.replace('/');
    }
  }, TIMEOUT_INATIVIDADE);
}

['click','keydown','mousemove','scroll','touchstart'].forEach(evento => {
  document.addEventListener(evento, resetarTimer, { passive: true });
});
resetarTimer();

// =========================================================
// CAMADA 3.3 — Bloquear ferramentas de inspeção
// =========================================================
(function() {
  if (window.location.hostname === 'localhost') return;

  const threshold = 160;
  function detectarDevTools() {
    const largura = window.outerWidth - window.innerWidth;
    const altura = window.outerHeight - window.innerHeight;
    if (largura > threshold || altura > threshold) {
      document.body.innerHTML = 
        '<div style="display:flex;align-items:center;' +
        'justify-content:center;height:100vh;' +
        'background:#060f07;color:#ef4444;font-size:18px;' +
        'font-family:sans-serif;">Sessão encerrada.</div>';
      if (window.FinancierDB) window.FinancierDB.auth.signOut();
    }
  }

  document.addEventListener('keydown', (e) => {
    if (
      e.key === 'F12' ||
      (e.ctrlKey && e.shiftKey && ['I','J','C'].includes(e.key)) ||
      (e.ctrlKey && e.key === 'U')
    ) {
      e.preventDefault();
      return false;
    }
  });

  document.addEventListener('contextmenu', (e) => {
    e.preventDefault();
    return false;
  });

  setInterval(detectarDevTools, 1000);
})();

// =========================================================
// CAMADA 3.4 — Limpar dados sensíveis da memória ao sair
// =========================================================
window.addEventListener('beforeunload', () => {
  sessionStorage.clear();
});

document.addEventListener('visibilitychange', () => {
  if (document.visibilityState === 'hidden') {
    sessionStorage.removeItem('_sess_token');
  }
});
