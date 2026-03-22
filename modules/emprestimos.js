// ============================================================
// Empréstimos Module — Supabase CRUD
// ============================================================

const Emprestimos = {
    /**
     * Lista todos os empréstimos ativos com dados do devedor
     */
    async listarAtivos() {
        try {
            const { data, error } = await window.FinancierDB
                .from('emprestimos')
                .select('*, devedores(nome, contato)')
                .eq('status', 'ativo')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao listar empréstimos ativos:', err);
            return [];
        }
    },

    /**
     * Lista todos os empréstimos (qualquer status)
     */
    async listarTodos() {
        try {
            const { data, error } = await window.FinancierDB
                .from('emprestimos')
                .select('*, devedores(nome, contato)')
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao listar empréstimos:', err);
            return [];
        }
    },

    /**
     * Busca empréstimos de um devedor específico
     */
    async listarPorDevedor(devedorId) {
        try {
            const { data, error } = await window.FinancierDB
                .from('emprestimos')
                .select('*')
                .eq('devedor_id', devedorId)
                .order('created_at', { ascending: false });

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao listar empréstimos do devedor:', err);
            return [];
        }
    },

    /**
     * Calcula o total de saldos devedores ativos
     */
    async calcularTotalEmprestado() {
        try {
            const { data, error } = await window.FinancierDB
                .from('emprestimos')
                .select('saldo_devedor')
                .eq('status', 'ativo');

            if (error) throw error;
            return (data || []).reduce((acc, curr) => acc + Number(curr.saldo_devedor || 0), 0);
        } catch (err) {
            console.error('Erro ao calcular total emprestado:', err);
            return 0;
        }
    },

    /**
     * Conta empréstimos ativos
     */
    async contarAtivos() {
        try {
            const { count, error } = await window.FinancierDB
                .from('emprestimos')
                .select('*', { count: 'exact', head: true })
                .eq('status', 'ativo');

            if (error) throw error;
            return count || 0;
        } catch (err) {
            console.error('Erro ao contar empréstimos ativos:', err);
            return 0;
        }
    },

    /**
     * Busca um empréstimo por ID com dados do devedor
     */
    async buscarPorId(id) {
        try {
            const { data, error } = await window.FinancierDB
                .from('emprestimos')
                .select('*, devedores(*)')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Erro ao buscar empréstimo:', err);
            return null;
        }
    },

    /**
     * Cria um novo empréstimo
     */
    async criar(dados) {
        try {
            const { data: { user } } = await window.FinancierDB.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { data, error } = await window.FinancierDB
                .from('emprestimos')
                .insert([{ ...dados, user_id: user.id }])
                .select()
                .single();

            if (error) throw error;
            if (window.registrarAcao) window.registrarAcao('NOVO_EMPRESTIMO');
            return data;
        } catch (err) {
            console.error('Erro ao criar empréstimo:', err);
            return null;
        }
    },

    /**
     * Atualiza um empréstimo
     */
    async atualizar(id, dados) {
        try {
            const { data, error } = await window.FinancierDB
                .from('emprestimos')
                .update(dados)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Erro ao atualizar empréstimo:', err);
            return null;
        }
    }
};

window.Emprestimos = Emprestimos;
