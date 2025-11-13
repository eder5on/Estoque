// Rotas auxiliares - Clientes
import { Router } from 'express';
import { supabase } from '../supabase.ts';
import { authenticateToken, authorizeRole, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar clientes
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, search, active = 'true' } = req.query;

    let query = supabase
      .from('customers')
      .select('*', { count: 'exact' })
      .order('name')
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (search) {
      query = query.or(`name.ilike.%${search}%,cpf_cnpj.ilike.%${search}%`);
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

// Criar cliente
router.post('/', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const { name, cpf_cnpj, phone, email, address, customer_type = 'individual' } = req.body;

    if (!name) {
      return res.status(400).json({ error: 'Nome do cliente é obrigatório' });
    }

    const { data, error } = await supabase
      .from('customers')
      .insert({
        name,
        cpf_cnpj,
        phone,
        email,
        address,
        customer_type
      })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Cliente criado com sucesso', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;