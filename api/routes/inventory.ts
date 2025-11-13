import { Router } from 'express';
import { supabase } from '../supabase.ts';
import { authenticateToken, authorizeRole, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar inventário
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, location, product, low_stock } = req.query;

    let query = supabase
      .from('inventory')
      .select(`
        *,
        product:products(*, category:categories(*)),
        location:inventory_locations(*)
      `, { count: 'exact' })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (location) query = query.eq('location_id', location);
    if (product) query = query.eq('product_id', product);
    if (low_stock === 'true') {
  query = query.lt('available_quantity', (supabase as any).raw('products.minimum_stock'));
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

// Atualizar estoque
router.put('/:id', authorizeRole(['admin', 'manager']), checkPermission('update'), async (req, res) => {
  try {
    const { id } = req.params;
    const { quantity, reserved_quantity, notes } = req.body;

    const { data: current, error: fetchError } = await supabase
      .from('inventory')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchError) throw fetchError;

    const { data, error } = await supabase
      .from('inventory')
      .update({
        quantity,
        reserved_quantity: reserved_quantity || 0,
        last_movement_at: new Date().toISOString()
      })
      .eq('id', id)
      .select('*')
      .single();

    if (error) throw error;

    // Registrar movimentação
    const movementType = quantity > current.quantity ? 'entrada' : 'saida';
    await supabase.from('stock_movements').insert({
      product_id: data.product_id,
      location_id: data.location_id,
      movement_type: movementType,
      quantity: Math.abs(quantity - current.quantity),
      notes,
      created_by: req.user?.id
    });

    res.json({ message: 'Estoque atualizado com sucesso', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Criar entrada de estoque
router.post('/entry', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const { product_id, location_id, quantity, unit_cost, notes } = req.body;

    // Verificar se já existe inventário
    const { data: existing } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', product_id)
      .eq('location_id', location_id)
      .single();

    let result;
    if (existing) {
      // Atualizar quantidade existente
      const { data, error } = await supabase
        .from('inventory')
        .update({
          quantity: existing.quantity + quantity,
          last_movement_at: new Date().toISOString()
        })
        .eq('id', existing.id)
        .select('*')
        .single();
      
      if (error) throw error;
      result = data;
    } else {
      // Criar novo registro
      const { data, error } = await supabase
        .from('inventory')
        .insert({
          product_id,
          location_id,
          quantity,
          reserved_quantity: 0,
          last_movement_at: new Date().toISOString()
        })
        .select('*')
        .single();
      
      if (error) throw error;
      result = data;
    }

    // Registrar movimentação
    await supabase.from('stock_movements').insert({
      product_id,
      location_id,
      movement_type: 'entrada',
      quantity,
      unit_cost,
      total_cost: unit_cost ? unit_cost * quantity : null,
      notes,
      created_by: req.user?.id
    });

    res.json({ message: 'Entrada de estoque registrada com sucesso', data: result });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;