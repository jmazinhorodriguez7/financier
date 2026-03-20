// ============================================================
// Devedores Module — Stub (Phase 4)
// ============================================================

const Devedores = {
    /**
     * Lista todos os devedores do usuário logado
     */
    async listar() {
        try {
            const { data, error } = await window.FinancierDB
                .from('devedores')
                .select('*')
                .order('nome');

            if (error) throw error;
            return data || [];
        } catch (err) {
            console.error('Erro ao listar devedores:', err);
            return [];
        }
    },

    /**
     * Busca um devedor pelo ID
     */
    async buscarPorId(id) {
        try {
            const { data, error } = await window.FinancierDB
                .from('devedores')
                .select('*')
                .eq('id', id)
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Erro ao buscar devedor:', err);
            return null;
        }
    },

    /**
     * Cria um novo devedor
     */
    async criar(dados) {
        try {
            const { data: { user } } = await window.FinancierDB.auth.getUser();
            if (!user) throw new Error('Usuário não autenticado');

            const { data, error } = await window.FinancierDB
                .from('devedores')
                .insert([{ ...dados, user_id: user.id }])
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Erro ao criar devedor:', err);
            return null;
        }
    },

    /**
     * Atualiza dados de um devedor
     */
    async atualizar(id, dados) {
        try {
            const { data, error } = await window.FinancierDB
                .from('devedores')
                .update(dados)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return data;
        } catch (err) {
            console.error('Erro ao atualizar devedor:', err);
            return null;
        }
    },

    /**
     * Conta o total de devedores
     */
    async contar() {
        try {
            const { count, error } = await window.FinancierDB
                .from('devedores')
                .select('*', { count: 'exact', head: true });

            if (error) throw error;
            return count || 0;
        } catch (err) {
            console.error('Erro ao contar devedores:', err);
            return 0;
        }
    },
    async excluir(id) {
        try {
            const { error } = await window.FinancierDB
                .from('devedores')
                .delete()
                .eq('id', id);

            if (error) throw error;
            return true;
        } catch (err) {
            console.error('Erro ao excluir devedor:', err);
            return false;
        }
    }
};

window.Devedores = Devedores;
