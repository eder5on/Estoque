import { Router } from 'express';
import { supabase } from '../server.js';
import { authenticateToken, authorizeRole, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar movimentações
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 50, product, location, type, dateFrom, dateTo } = req.query;

    let query = supabase
      .from('stock_movements')
      .select(`
        *,
        product:products(*, category:categories(*)),
        location:inventory_locations(*)
      `, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (product) query = query.eq('product_id', product);
    if (location) query = query.eq('location_id', location);
    if (type) query = query.eq('movement_type', type);
    if (dateFrom) query = query.gte('created_at', dateFrom);
    if (dateTo) query = query.lte('created_at', dateTo);

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

// Criar movimentação
router.post('/', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const {
      product_id,
      location_id,
      movement_type,
      quantity,
      unit_cost,
      total_cost,
      reference_id,
      reference_type,
      notes
    } = req.body;

    // Validar movimentação
    if (!['entrada', 'saida', 'transferencia', 'venda', 'locacao', 'devolucao', 'perda'].includes(movement_type)) {
      return res.status(400).json({ error: 'Tipo de movimentação inválido' });
    }

    if (quantity <= 0) {
      return res.status(400).json({ error: 'Quantidade deve ser maior que zero' });
    }

    // Verificar estoque disponível para saídas
    if (['saida', 'venda', 'perda'].includes(movement_type)) {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('quantity')
        .eq('product_id', product_id)
        .eq('location_id', location_id)
        .single();

      if (!inventory || inventory.quantity < quantity) {
        return res.status(400).json({ error: 'Estoque insuficiente' });
      }
    }

    // Criar movimentação
    const { data, error } = await supabase
      .from('stock_movements')
      .insert({
        product_id,
        location_id,
        movement_type,
        quantity,
        unit_cost,
        total_cost,
        reference_id,
        reference_type,
        notes,
        created_by: req.user?.id
      })
      .select(`
        *,
        product:products(*, category:categories(*)),
        location:inventory_locations(*)
      `)
      .single();

    if (error) throw error;

    // Atualizar estoque
    const { data: inventory } = await supabase
      .from('inventory')
      .select('*')
      .eq('product_id', product_id)
      .eq('location_id', location_id)
      .single();

    if (inventory) {
      const newQuantity = movement_type === 'entrada' 
        ? inventory.quantity + quantity
        : inventory.quantity - quantity;

      await supabase
        .from('inventory')
        .update({
          quantity: newQuantity,
          last_movement_at: new Date().toISOString()
        })
        .eq('id', inventory.id);
    }

    res.json({ message: 'Movimentação registrada com sucesso', data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;