// Rotas de relatórios e dashboards
import { Router } from 'express';
import { supabase } from '../supabase.ts';
import { authenticateToken, authorizeRole } from '../middleware/auth.js';

const router = Router();

router.use(authenticateToken);

// Dashboard - Resumo geral
router.get('/dashboard', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // Total de produtos
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    // Valor total do estoque
    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('quantity, product:products(cost_price)');

    const totalInventoryValue = inventoryData?.reduce((total, item) => {
      // Supabase may return related rows as arrays; normalize access safely
      const cost = (item.product as any)?.cost_price ?? (Array.isArray(item.product) ? item.product[0]?.cost_price : undefined) ?? 0;
      return total + (item.quantity * cost);
    }, 0) || 0;

    // Produtos com estoque baixo
    const { data: lowStockProducts } = await supabase
      .from('products')
      .select('*, inventory:inventory(quantity)')
      .eq('is_active', true)
    .lt('inventory.quantity', (supabase as any).raw('products.minimum_stock'));

    // Vendas do período
    const { data: periodSales } = await supabase
      .from('sales')
      .select('total_amount, sale_date')
      .gte('sale_date', startDate.toISOString().split('T')[0])
      .order('sale_date', { ascending: true });

    const totalSales = periodSales?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

    // Locações ativas
    const { count: activeRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    res.json({
      dashboard: {
        totalProducts,
        totalInventoryValue,
        lowStockCount: lowStockProducts?.length || 0,
        periodSales: {
          total: totalSales,
          count: periodSales?.length || 0
        },
        activeRentals
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// KPIs principais
router.get('/kpis', async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const days = Number(period);
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    // KPIs de estoque
    const { count: totalProducts } = await supabase
      .from('products')
      .select('*', { count: 'exact', head: true })
      .eq('is_active', true);

    const { data: inventoryData } = await supabase
      .from('inventory')
      .select('quantity, reserved_quantity');

    const totalStock = inventoryData?.reduce((sum, item) => sum + item.quantity, 0) || 0;
    const totalReserved = inventoryData?.reduce((sum, item) => sum + item.reserved_quantity, 0) || 0;

    // KPIs de vendas
    const { data: salesData } = await supabase
      .from('sales')
      .select('total_amount, sale_date')
      .gte('sale_date', startDate.toISOString().split('T')[0]);

    const totalSales = salesData?.reduce((sum, sale) => sum + sale.total_amount, 0) || 0;

    // KPIs de locações
    const { count: activeRentals } = await supabase
      .from('rentals')
      .select('*', { count: 'exact', head: true })
      .eq('status', 'active');

    res.json({
      kpis: {
        inventory: {
          totalProducts,
          totalStock,
          totalReserved,
          availableStock: totalStock - totalReserved
        },
        sales: {
          totalSales,
          salesCount: salesData?.length || 0
        },
        rentals: {
          activeRentals
        }
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;