// Rotas auxiliares - Empresas
import { Router } from 'express';
import { supabase } from '../server.js';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar empresas
router.get('/', async (req, res) => {
  try {
    const { active = 'true' } = req.query;
    
    let query = supabase.from('companies').select('*').order('name');
    
    if (active === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query;

    if (error) throw error;

    res.json({ data: data || [] });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar empresa
router.post('/', authorizeRole(['admin']), async (req, res) => {
  try {
    const { name, cnpj, address, phone, email } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome da empresa é obrigatório' });
    }

    const { data, error } = await supabase
      .from('companies')
      .insert({ name, cnpj, address, phone, email })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Empresa criada com sucesso', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;