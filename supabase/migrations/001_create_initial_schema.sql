-- Sistema de Controle de Estoque - Totens de Pesquisa
-- Criação do schema inicial

-- Tipos de produtos (totens, insumos, peças, tablets, etc.)
CREATE TYPE product_type AS ENUM (
  'totem', 'tablet', 'insumo', 'peca_acrilico', 'wobbler', 
  'totem_eliptico', 'adesivo', 'placa', 'material_corte'
);

-- Status do produto
CREATE TYPE product_status AS ENUM (
  'novo', 'usado', 'rb', 'ativo', 'manutencao', 'descartado'
);

-- Tipos de movimentação de estoque
CREATE TYPE movement_type AS ENUM (
  'entrada', 'saida', 'transferencia', 'venda', 'locacao', 'devolucao', 'perda'
);

-- Categorias de fornecedores
CREATE TYPE supplier_category AS ENUM (
  'fabricante', 'distribuidor', 'servico', 'outro'
);

-- =====================================================
-- TABELAS PRINCIPAIS
-- =====================================================

-- Empresas/locais de estoque
CREATE TABLE companies (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE,
  address TEXT,
  phone VARCHAR(20),
  email VARCHAR(255),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categorias de produtos
CREATE TABLE categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  product_type product_type NOT NULL,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Produtos
CREATE TABLE products (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sku VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(255) NOT NULL,
  description TEXT,
  category_id UUID REFERENCES categories(id),
  product_type product_type NOT NULL,
  status product_status NOT NULL,
  barcode VARCHAR(255),
  qr_code TEXT,
  serial_number VARCHAR(255),
  unit VARCHAR(50) DEFAULT 'unidade',
  cost_price DECIMAL(10,2),
  sale_price DECIMAL(10,2),
  rental_price DECIMAL(10,2),
  minimum_stock INTEGER DEFAULT 0,
  maximum_stock INTEGER,
  weight DECIMAL(10,3),
  dimensions JSONB,
  specifications JSONB,
  images JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Fornecedores
CREATE TABLE suppliers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cnpj VARCHAR(14) UNIQUE,
  category supplier_category NOT NULL,
  contact_person VARCHAR(255),
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  payment_terms TEXT,
  delivery_time INTEGER,
  rating DECIMAL(3,2),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estoque por local
CREATE TABLE inventory_locations (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  company_id UUID REFERENCES companies(id),
  name VARCHAR(255) NOT NULL,
  description TEXT,
  address TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Estoque atual por produto e local
CREATE TABLE inventory (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  location_id UUID REFERENCES inventory_locations(id),
  quantity INTEGER NOT NULL DEFAULT 0,
  reserved_quantity INTEGER DEFAULT 0,
  available_quantity INTEGER GENERATED ALWAYS AS (quantity - reserved_quantity) STORED,
  last_movement_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, location_id)
);

-- Movimentações de estoque
CREATE TABLE stock_movements (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id UUID REFERENCES products(id),
  location_id UUID REFERENCES inventory_locations(id),
  movement_type movement_type NOT NULL,
  quantity INTEGER NOT NULL,
  unit_cost DECIMAL(10,2),
  total_cost DECIMAL(10,2),
  reference_id UUID, -- ID da venda, locação, etc.
  reference_type VARCHAR(50), -- 'sale', 'rental', 'transfer', etc.
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Transferências entre locais
CREATE TABLE stock_transfers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  from_location_id UUID REFERENCES inventory_locations(id),
  to_location_id UUID REFERENCES inventory_locations(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMP WITH TIME ZONE,
  received_by UUID REFERENCES auth.users(id),
  received_at TIMESTAMP WITH TIME ZONE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Clientes
CREATE TABLE customers (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  cpf_cnpj VARCHAR(14) UNIQUE,
  phone VARCHAR(20),
  email VARCHAR(255),
  address TEXT,
  customer_type VARCHAR(50) DEFAULT 'individual',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Vendas
CREATE TABLE sales (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  sale_date DATE NOT NULL,
  total_amount DECIMAL(10,2) NOT NULL,
  discount_amount DECIMAL(10,2) DEFAULT 0,
  payment_method VARCHAR(50),
  payment_status VARCHAR(50) DEFAULT 'pending',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens da venda
CREATE TABLE sale_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  sale_id UUID REFERENCES sales(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  discount DECIMAL(10,2) DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Locações
CREATE TABLE rentals (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  customer_id UUID REFERENCES customers(id),
  rental_date DATE NOT NULL,
  return_date DATE,
  expected_return_date DATE,
  total_amount DECIMAL(10,2) NOT NULL,
  deposit_amount DECIMAL(10,2) DEFAULT 0,
  status VARCHAR(50) DEFAULT 'active',
  notes TEXT,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Itens da locação
CREATE TABLE rental_items (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  rental_id UUID REFERENCES rentals(id),
  product_id UUID REFERENCES products(id),
  quantity INTEGER NOT NULL,
  unit_price DECIMAL(10,2) NOT NULL,
  total_price DECIMAL(10,2) NOT NULL,
  returned_quantity INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- =====================================================
-- ÍNDICES PARA PERFORMANCE
-- =====================================================

CREATE INDEX idx_products_sku ON products(sku);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_serial ON products(serial_number);
CREATE INDEX idx_products_type ON products(product_type);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_category ON products(category_id);

CREATE INDEX idx_inventory_product ON inventory(product_id);
CREATE INDEX idx_inventory_location ON inventory(location_id);
CREATE INDEX idx_inventory_quantity ON inventory(quantity);

CREATE INDEX idx_stock_movements_product ON stock_movements(product_id);
CREATE INDEX idx_stock_movements_location ON stock_movements(location_id);
CREATE INDEX idx_stock_movements_type ON stock_movements(movement_type);
CREATE INDEX idx_stock_movements_date ON stock_movements(created_at);

CREATE INDEX idx_sales_customer ON sales(customer_id);
CREATE INDEX idx_sales_date ON sales(sale_date);
CREATE INDEX idx_sales_status ON sales(payment_status);

CREATE INDEX idx_rentals_customer ON rentals(customer_id);
CREATE INDEX idx_rentals_status ON rentals(status);
CREATE INDEX idx_rentals_date ON rentals(rental_date);

-- =====================================================
-- DADOS INICIAIS
-- =====================================================

-- Empresa principal
INSERT INTO companies (name, cnpj, address, phone, email) VALUES 
('Empresa de Totens de Pesquisa', '12345678000195', 'Rua Principal, 123 - Centro', '113333-4444', 'contato@empresa.com');

-- Categorias principais
INSERT INTO categories (name, description, product_type) VALUES
('Totens Completos', 'Totens de pesquisa completos e montados', 'totem'),
('Tablets', 'Tablets para totens', 'tablet'),
('Insumos', 'Componentes e insumos para montagem', 'insumo'),
('Peças Acrílico', 'Peças fabricadas em acrílico', 'peca_acrilico'),
('Wobblers', 'Wobblers para comunicação visual', 'wobbler'),
('Totens Elípticos', 'Totens elípticos em PS', 'totem_eliptico'),
('Adesivos', 'Adesivos diversos', 'adesivo'),
('Placas', 'Placas de identificação e sinalização', 'placa'),
('Materiais Corte', 'Materiais para corte CNC', 'material_corte');

-- Local de estoque principal
INSERT INTO inventory_locations (company_id, name, description, address) VALUES 
((SELECT id FROM companies LIMIT 1), 'Depósito Principal', 'Depósito principal de estoque', 'Rua Principal, 123 - Centro');

-- Fornecedores de exemplo
INSERT INTO suppliers (name, cnpj, category, contact_person, phone, email) VALUES
('Fornecedor 1', '98765432000195', 'fabricante', 'João Silva', '112222-3333', 'joao@fornecedor1.com'),
('Fornecedor 2', '87654321000195', 'distribuidor', 'Maria Santos', '114444-5555', 'maria@fornecedor2.com');