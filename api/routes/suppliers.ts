// Rotas auxiliares - Fornecedores
import { Router } from 'express';
import { supabase } from '../server.js';
import { authenticateToken, authorizeRole, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar fornecedores
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, active = 'true' } = req.query;

    let query = supabase
      .from('suppliers')
      .select('*', { count: 'exact' })
      .order('name')
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,contact_person.ilike.%${search}%`);
    }

    if (active === 'true') {
      query = query.eq('is_active', true);
    }

    const { data, error, count } = await query;

    if (error) throw error;

    res.json({
      data: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit))
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar fornecedor
router.post('/', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const { name, cnpj, category, contact_person, phone, email, address } = req.body;

    if (!name || !category) {
      return res.status(400).json({ error: 'Nome e categoria são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        name,
        cnpj,
        category,
        contact_person,
        phone,
        email,
        address
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Fornecedor criado com sucesso', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;