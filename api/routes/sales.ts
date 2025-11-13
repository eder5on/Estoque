// Rotas de vendas
import { Router } from 'express';
import { supabase } from '../server.js';
import { authenticateToken, authorizeRole, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar vendas
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, customer, dateFrom, dateTo, status } = req.query;

    let query = supabase
      .from('sales')
      .select(`
        *,
        customer:customers(*),
        items:sale_items(
          *,
          product:products(*, category:categories(*))
        )
      `, { count: 'exact' })
      .order('sale_date', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (customer) query = query.eq('customer_id', customer);
    if (dateFrom) query = query.gte('sale_date', dateFrom);
    if (dateTo) query = query.lte('sale_date', dateTo);
    if (status) query = query.eq('payment_status', status);

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

// Criar venda
router.post('/', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const { customer_id, sale_date, items, payment_method, notes } = req.body;

    if (!customer_id || !sale_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Dados da venda incompletos' });
    }

    // Calcular totais
    let total_amount = 0;
    const saleItems = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('sale_price')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return res.status(400).json({ error: `Produto ${item.product_id} não encontrado` });
      }

      const unit_price = item.unit_price || product.sale_price || 0;
      const total_price = unit_price * item.quantity;
      
      total_amount += total_price;
      
      saleItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price,
        total_price,
        discount: item.discount || 0
      });
    }

    // Criar venda
    const { data: sale, error: saleError } = await supabase
      .from('sales')
      .insert({
        customer_id,
        sale_date,
        total_amount,
        payment_method,
        notes,
        created_by: req.user?.id
      })
      .select('*')
      .single();

    if (saleError) throw saleError;

    // Criar itens da venda
    const saleItemsData = saleItems.map(item => ({
      ...item,
      sale_id: sale.id
    }));

    const { error: itemsError } = await supabase
      .from('sale_items')
      .insert(saleItemsData);

    if (itemsError) throw itemsError;

    // Atualizar estoque
    for (const item of saleItems) {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', item.product_id)
        .single();

      if (inventory) {
        await supabase
          .from('inventory')
          .update({ quantity: inventory.quantity - item.quantity })
          .eq('id', inventory.id);

        // Registrar movimentação
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          location_id: inventory.location_id,
          movement_type: 'venda',
          quantity: item.quantity,
          reference_id: sale.id,
          reference_type: 'sale',
          created_by: req.user?.id
        });
      }
    }

    res.status(201).json({ message: 'Venda criada com sucesso', data: sale });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;