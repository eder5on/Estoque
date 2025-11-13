import { Router } from 'express';
import { supabase } from '../supabase.ts';
import { authenticateToken, authorizeRole, checkPermission } from '../middleware/auth.js';
import { Product, ProductStatus, ProductType } from '../types/index.js';
import QRCode from 'qrcode';

const router = Router();

// Aplicar autenticação em todas as rotas
router.use(authenticateToken);

/**
 * @route   GET /api/products
 * @desc    Listar produtos com filtros e paginação
 * @access  Privado
 */
router.get('/', async (req, res) => {
  try {
    const {
      page = 1,
      limit = 10,
      search,
      category,
      status,
      type,
      location,
      includeInactive = false
    } = req.query;

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory:inventory(
          *,
          location:inventory_locations(*)
        )
      `, { count: 'exact' })
      .range((Number(page) - 1) * Number(limit), Number(page) * Number(limit) - 1);

    // Aplicar filtros
    if (search) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%,description.ilike.%${search}%`);
    }

    if (category) {
      query = query.eq('category_id', category);
    }

    if (status) {
      query = query.eq('status', status);
    }

    if (type) {
      query = query.eq('product_type', type);
    }

    if (!includeInactive || includeInactive === 'false') {
      query = query.eq('is_active', true);
    }

    if (location) {
      query = query.eq('inventory.location_id', location);
    }

    const { data, error, count } = await query;

    if (error) {
      return res.status(400).json({
        error: 'Database error',
        message: error.message
      });
    }

    res.json({
      data: data || [],
      total: count || 0,
      page: Number(page),
      limit: Number(limit),
      totalPages: Math.ceil((count || 0) / Number(limit))
    });
  } catch (error) {
    console.error('Erro ao listar produtos:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao listar produtos'
    });
  }
});

/**
 * @route   GET /api/products/:id
 * @desc    Obter produto por ID
 * @access  Privado
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory:inventory(
          *,
          location:inventory_locations(*)
        ),
        stock_movements:stock_movements(
          *,
          location:inventory_locations(*)
        )
      `)
      .eq('id', id)
      .single();

    if (error) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Produto não encontrado'
      });
    }

    res.json({ data });
  } catch (error) {
    console.error('Erro ao obter produto:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao obter produto'
    });
  }
});

/**
 * @route   POST /api/products
 * @desc    Criar novo produto
 * @access  Privado (Admin/Manager)
 */
router.post('/', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const {
      sku,
      name,
      description,
      category_id,
      product_type,
      status,
      barcode,
      serial_number,
      unit = 'unidade',
      cost_price,
      sale_price,
      rental_price,
      minimum_stock = 0,
      maximum_stock,
      weight,
      dimensions,
      specifications,
      images
    } = req.body;

    // Validação básica
    if (!sku || !name || !category_id || !product_type || !status) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'SKU, nome, categoria, tipo e status são obrigatórios'
      });
    }

    // Verificar se SKU já existe
    const { data: existingProduct } = await supabase
      .from('products')
      .select('id')
      .eq('sku', sku)
      .single();

    if (existingProduct) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'SKU já cadastrado'
      });
    }

    // Gerar QR code
    let qr_code;
    try {
      qr_code = await QRCode.toDataURL(sku);
    } catch (qrError) {
      console.error('Erro ao gerar QR code:', qrError);
      qr_code = null;
    }

    // Criar produto
    const { data, error } = await supabase
      .from('products')
      .insert({
        sku,
        name,
        description,
        category_id,
        product_type,
        status,
        barcode,
        qr_code,
        serial_number,
        unit,
        cost_price,
        sale_price,
        rental_price,
        minimum_stock,
        maximum_stock,
        weight,
        dimensions,
        specifications,
        images
      })
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Database error',
        message: error.message
      });
    }

    // Criar entrada de estoque inicial (se especificado)
    if (req.body.initial_stock && req.body.location_id) {
      await supabase
        .from('inventory')
        .insert({
          product_id: data.id,
          location_id: req.body.location_id,
          quantity: req.body.initial_stock,
          reserved_quantity: 0
        });
    }

    res.status(201).json({
      message: 'Produto criado com sucesso',
      data
    });
  } catch (error) {
    console.error('Erro ao criar produto:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao criar produto'
    });
  }
});

/**
 * @route   PUT /api/products/:id
 * @desc    Atualizar produto
 * @access  Privado (Admin/Manager)
 */
router.put('/:id', authorizeRole(['admin', 'manager']), checkPermission('update'), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    // Remover campos que não podem ser atualizados
    delete updates.id;
    delete updates.created_at;
    delete updates.qr_code; // QR code não pode ser alterado manualmente

    // Verificar se SKU já existe (se estiver sendo alterado)
    if (updates.sku) {
      const { data: existingProduct } = await supabase
        .from('products')
        .select('id')
        .eq('sku', updates.sku)
        .neq('id', id)
        .single();

      if (existingProduct) {
        return res.status(400).json({
          error: 'Validation error',
          message: 'SKU já cadastrado para outro produto'
        });
      }
    }

    const { data, error } = await supabase
      .from('products')
      .update(updates)
      .eq('id', id)
      .select(`
        *,
        category:categories(*)
      `)
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Database error',
        message: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Produto não encontrado'
      });
    }

    res.json({
      message: 'Produto atualizado com sucesso',
      data
    });
  } catch (error) {
    console.error('Erro ao atualizar produto:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao atualizar produto'
    });
  }
});

/**
 * @route   DELETE /api/products/:id
 * @desc    Desativar produto (soft delete)
 * @access  Privado (Admin)
 */
router.delete('/:id', authorizeRole(['admin']), checkPermission('delete'), async (req, res) => {
  try {
    const { id } = req.params;

    const { data, error } = await supabase
      .from('products')
      .update({ is_active: false })
      .eq('id', id)
      .select()
      .single();

    if (error) {
      return res.status(400).json({
        error: 'Database error',
        message: error.message
      });
    }

    if (!data) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Produto não encontrado'
      });
    }

    res.json({
      message: 'Produto desativado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao desativar produto:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao desativar produto'
    });
  }
});

/**
 * @route   GET /api/products/:id/qr-code
 * @desc    Gerar QR code para produto
 * @access  Privado
 */
router.get('/:id/qr-code', async (req, res) => {
  try {
    const { id } = req.params;
    const { size = 200 } = req.query;

    // Buscar produto
    const { data: product, error } = await supabase
      .from('products')
      .select('sku, name, qr_code')
      .eq('id', id)
      .single();

    if (error || !product) {
      return res.status(404).json({
        error: 'Not found',
        message: 'Produto não encontrado'
      });
    }

    // Se já existe QR code, retornar ele
    if (product.qr_code) {
      return res.json({
        qr_code: product.qr_code,
        sku: product.sku,
        name: product.name
      });
    }

    // Gerar novo QR code
    try {
      const qr_code = await QRCode.toDataURL(product.sku, {
        width: Number(size),
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Salvar QR code no banco
      await supabase
        .from('products')
        .update({ qr_code })
        .eq('id', id);

      res.json({
        qr_code,
        sku: product.sku,
        name: product.name
      });
    } catch (qrError) {
      console.error('Erro ao gerar QR code:', qrError);
      return res.status(500).json({
        error: 'QR Code error',
        message: 'Erro ao gerar QR code'
      });
    }
  } catch (error) {
    console.error('Erro ao gerar QR code:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar QR code'
    });
  }
});

/**
 * @route   POST /api/products/bulk-import
 * @desc    Importar produtos em massa
 * @access  Privado (Admin/Manager)
 */
router.post('/bulk-import', authorizeRole(['admin', 'manager']), checkPermission('write'), async (req, res) => {
  try {
    const { products } = req.body;

    if (!Array.isArray(products) || products.length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Lista de produtos é obrigatória'
      });
    }

    if (products.length > 1000) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Máximo de 1000 produtos por importação'
      });
    }

    const results = {
      success: 0,
      errors: 0,
      warnings: [],
      errors_details: []
    };

    // Processar produtos em lotes
    const batchSize = 50;
    for (let i = 0; i < products.length; i += batchSize) {
      const batch = products.slice(i, i + batchSize);
      
      for (const product of batch) {
        try {
          // Validar produto
          if (!product.sku || !product.name || !product.category_id || !product.product_type || !product.status) {
            results.errors++;
            results.errors_details.push(`Produto ${product.sku || 'sem SKU'}: campos obrigatórios faltando`);
            continue;
          }

          // Verificar SKU duplicado
          const { data: existing } = await supabase
            .from('products')
            .select('id')
            .eq('sku', product.sku)
            .single();

          if (existing) {
            results.warnings.push(`SKU duplicado ignorado: ${product.sku}`);
            continue;
          }

          // Gerar QR code
          if (!product.qr_code) {
            try {
              product.qr_code = await QRCode.toDataURL(product.sku);
            } catch (qrError) {
              console.warn(`Erro ao gerar QR code para ${product.sku}:`, qrError);
            }
          }

          // Inserir produto
          const { error } = await supabase
            .from('products')
            .insert(product);

          if (error) {
            results.errors++;
            results.errors_details.push(`Produto ${product.sku}: ${error.message}`);
          } else {
            results.success++;
          }
        } catch (error) {
          results.errors++;
          results.errors_details.push(`Produto ${product.sku || 'desconhecido'}: ${error.message}`);
        }
      }
    }

    res.json({
      message: 'Importação concluída',
      ...results
    });
  } catch (error) {
    console.error('Erro ao importar produtos:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar importação de produtos'
    });
  }
});

/**
 * @route   GET /api/products/low-stock
 * @desc    Listar produtos com estoque baixo
 * @access  Privado
 */
router.get('/reports/low-stock', async (req, res) => {
  try {
    const { location, limit = 50 } = req.query;

    let query = supabase
      .from('products')
      .select(`
        *,
        category:categories(*),
        inventory:inventory(
          *,
          location:inventory_locations(*)
        )
      `)
      .eq('is_active', true)
    .lt('inventory.available_quantity', (supabase as any).raw('products.minimum_stock'));

    if (location) {
      query = query.eq('inventory.location_id', location);
    }

    const { data, error } = await query.limit(Number(limit));

    if (error) {
      return res.status(400).json({
        error: 'Database error',
        message: error.message
      });
    }

    res.json({
      data: data || [],
      count: data?.length || 0
    });
  } catch (error) {
    console.error('Erro ao listar produtos com estoque baixo:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao listar produtos com estoque baixo'
    });
  }
});

export default router;