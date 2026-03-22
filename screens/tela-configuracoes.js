const TelaConfiguracoes = {
    async render() {
        const container = document.getElementById('conteudo-principal');
        container.innerHTML = `
            <div class="screen-header">
                <h2>Configurações do Sistema</h2>
            </div>
            <div class="settings-content" style="max-width: 800px; padding: 20px;">
                <div class="card" style="margin-bottom: 20px;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <div>
                            <h3>Auditoria Pessoal</h3>
                            <p style="color: #94a3b8; font-size: 14px; margin-top:5px;">Histórico de ações (Logins, Logout, Pagamentos, etc).</p>
                        </div>
                        <button id="btn-ver-logs" class="btn btn--secondary">Ver histórico de acessos</button>
                    </div>
                </div>

                <div id="logs-container" style="display: none; margin-top: 20px;" class="card">
                    <h3>Últimas Ações Registradas</h3>
                    <div class="table-container" style="margin-top:15px;">
                        <table class="table">
                            <thead>
                                <tr>
                                    <th>Data / Hora</th>
                                    <th>Ação Realizada</th>
                                    <th>Dispositivo (Hash)</th>
                                </tr>
                            </thead>
                            <tbody id="lista-logs">
                                <tr><td colspan="3" class="text-center" style="padding:20px;">Carregando dados com segurança...</td></tr>
                            </tbody>
                        </table>
                    </div>
                </div>
            </div>
        `;
        document.getElementById('btn-ver-logs').addEventListener('click', async () => {
            const el = document.getElementById('logs-container');
            if(el.style.display === 'none') {
                el.style.display = 'block';
                await this.carregarLogs();
            } else {
                el.style.display = 'none';
            }
        });
    },

    async carregarLogs() {
        const tbody = document.getElementById('lista-logs');
        try {
            const { data: { user } } = await window.FinancierDB.auth.getUser();
            if(!user) return;
            const { data, error } = await window.FinancierDB
                .from('log_acesso')
                .select('*')
                .eq('user_id', user.id)
                .order('created_at', { ascending: false })
                .limit(50);
                
            if (error) throw error;
            if(!data || data.length === 0) {
                tbody.innerHTML = '<tr><td colspan="3" class="text-center">Nenhum registro encontrado.</td></tr>';
                return;
            }
            
            tbody.innerHTML = data.map(log => {
                let badgeClass = 'badge--info';
                if(log.acao === 'LOGIN') badgeClass = 'badge--success';
                if(log.acao === 'LOGOUT') badgeClass = 'badge--warning';
                return `
                <tr>
                    <td>${new Date(log.created_at).toLocaleString('pt-BR')}</td>
                    <td><span class="badge ${badgeClass}">${log.acao}</span></td>
                    <td style="font-family: monospace; font-size: 12px; color:#94a3b8;">${log.user_agent_hash || '—'}</td>
                </tr>
            `}).join('');
        } catch (err) {
            console.error('Erro ao carregar logs:', err);
            tbody.innerHTML = '<tr><td colspan="3" class="text-center" style="color:#ef4444;">Erro ao carregar histórico de auditoria.</td></tr>';
        }
    }
};

window.TelaConfiguracoes = TelaConfiguracoes;
