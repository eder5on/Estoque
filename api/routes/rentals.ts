// Rotas de locações
import { Router } from 'express';
import { supabase } from '../server.js';
import { authenticateToken, authorizeRole, checkPermission } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Listar locações
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, customer, dateFrom, dateTo, status } = req.query;

    let query = supabase
      .from('rentals')
      .select(`
        *,
        customer:customers(*),
        items:rental_items(
          *,
          product:products(*, category:categories(*))
        )
      `, { count: 'exact' })
      .order('rental_date', { ascending: false })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    if (customer) query = query.eq('customer_id', customer);
    if (dateFrom) query = query.gte('rental_date', dateFrom);
    if (dateTo) query = query.lte('rental_date', dateTo);
    if (status) query = query.eq('status', status);

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

// Criar locação
router.post('/', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const { customer_id, rental_date, expected_return_date, items, deposit_amount = 0, notes } = req.body;

    if (!customer_id || !rental_date || !items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Dados da locação incompletos' });
    }

    // Calcular totais
    let total_amount = 0;
    const rentalItems = [];

    for (const item of items) {
      const { data: product } = await supabase
        .from('products')
        .select('rental_price')
        .eq('id', item.product_id)
        .single();

      if (!product) {
        return res.status(400).json({ error: `Produto ${item.product_id} não encontrado` });
      }

      const unit_price = item.unit_price || product.rental_price || 0;
      const total_price = unit_price * item.quantity;
      
      total_amount += total_price;
      
      rentalItems.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price,
        total_price,
        returned_quantity: 0
      });
    }

    // Criar locação
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .insert({
        customer_id,
        rental_date,
        expected_return_date,
        total_amount,
        deposit_amount,
        notes,
        created_by: req.user?.id
      })
      .select('*')
      .single();

    if (rentalError) throw rentalError;

    // Criar itens da locação
    const rentalItemsData = rentalItems.map(item => ({
      ...item,
      rental_id: rental.id
    }));

    const { error: itemsError } = await supabase
      .from('rental_items')
      .insert(rentalItemsData);

    if (itemsError) throw itemsError;

    // Atualizar estoque (reservar)
    for (const item of rentalItems) {
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', item.product_id)
        .single();

      if (inventory) {
        await supabase
          .from('inventory')
          .update({ 
            reserved_quantity: inventory.reserved_quantity + item.quantity 
          })
          .eq('id', inventory.id);

        // Registrar movimentação
        await supabase.from('stock_movements').insert({
          product_id: item.product_id,
          location_id: inventory.location_id,
          movement_type: 'locacao',
          quantity: item.quantity,
          reference_id: rental.id,
          reference_type: 'rental',
          created_by: req.user?.id
        });
      }
    }

    res.status(201).json({ message: 'Locação criada com sucesso', data: rental });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Devolução de itens
router.post('/:id/return', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const { id } = req.params;
    const { items, return_date = new Date().toISOString().split('T')[0] } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'Itens de devolução são obrigatórios' });
    }

    // Buscar locação
    const { data: rental, error: rentalError } = await supabase
      .from('rentals')
      .select('*')
      .eq('id', id)
      .single();

    if (rentalError || !rental) {
      return res.status(404).json({ error: 'Locação não encontrada' });
    }

    // Processar devolução de itens
    for (const item of items) {
      const { data: rentalItem } = await supabase
        .from('rental_items')
        .select('*')
        .eq('id', item.id)
        .eq('rental_id', id)
        .single();

      if (!rentalItem) {
        return res.status(404).json({ error: `Item ${item.id} não encontrado na locação` });
      }

      if (item.quantity > rentalItem.quantity - rentalItem.returned_quantity) {
        return res.status(400).json({ error: `Quantidade de devolução excede a quantidade locada` });
      }

      // Atualizar quantidade devolvida
      await supabase
        .from('rental_items')
        .update({ returned_quantity: rentalItem.returned_quantity + item.quantity })
        .eq('id', item.id);

      // Atualizar estoque
      const { data: inventory } = await supabase
        .from('inventory')
        .select('*')
        .eq('product_id', rentalItem.product_id)
        .single();

      if (inventory) {
        await supabase
          .from('inventory')
          .update({
            quantity: inventory.quantity + item.quantity,
            reserved_quantity: inventory.reserved_quantity - item.quantity
          })
          .eq('id', inventory.id);

        // Registrar movimentação
        await supabase.from('stock_movements').insert({
          product_id: rentalItem.product_id,
          location_id: inventory.location_id,
          movement_type: 'devolucao',
          quantity: item.quantity,
          reference_id: id,
          reference_type: 'rental',
          created_by: req.user?.id
        });
      }
    }

    // Verificar se todos os itens foram devolvidos
    const { data: allItems } = await supabase
      .from('rental_items')
      .select('*')
      .eq('rental_id', id);

    const allReturned = allItems.every(item => item.returned_quantity === item.quantity);

    if (allReturned) {
      await supabase
        .from('rentals')
        .update({ 
          status: 'returned',
          return_date 
        })
        .eq('id', id);
    }

    res.json({ message: 'Devolução registrada com sucesso' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;