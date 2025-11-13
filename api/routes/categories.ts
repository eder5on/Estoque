// Rotas auxiliares - Categorias
import { Router } from 'express';
import { supabase } from '../server.js';
import { authenticateToken } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar categorias
router.get('/', async (req, res) => {
  try {
    const { active = 'true' } = req.query;
    
    let query = supabase.from('categories').select('*').order('name');
    
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

// Criar categoria
router.post('/', async (req, res) => {
  try {
    const { name, description, product_type } = req.body;

    if (!name || !product_type) {
      return res.status(400).json({ error: 'Nome e tipo de produto são obrigatórios' });
    }

    const { data, error } = await supabase
      .from('categories')
      .insert({ name, description, product_type })
      .select()
      .single();

    if (error) throw error;

    res.status(201).json({ message: 'Categoria criada com sucesso', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;