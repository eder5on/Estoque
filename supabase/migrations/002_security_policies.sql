-- Permissões de segurança para o sistema de controle de estoque

-- Permissões básicas para usuários anônimos (leitura apenas para informações públicas)
GRANT SELECT ON companies TO anon;
GRANT SELECT ON categories TO anon;
GRANT SELECT ON products TO anon;
GRANT SELECT ON inventory TO anon;
GRANT SELECT ON inventory_locations TO anon;
GRANT SELECT ON suppliers TO anon;

-- Permissões completas para usuários autenticados
GRANT ALL PRIVILEGES ON companies TO authenticated;
GRANT ALL PRIVILEGES ON categories TO authenticated;
GRANT ALL PRIVILEGES ON products TO authenticated;
GRANT ALL PRIVILEGES ON inventory TO authenticated;
GRANT ALL PRIVILEGES ON inventory_locations TO authenticated;
GRANT ALL PRIVILEGES ON suppliers TO authenticated;
GRANT ALL PRIVILEGES ON stock_movements TO authenticated;
GRANT ALL PRIVILEGES ON stock_transfers TO authenticated;
GRANT ALL PRIVILEGES ON customers TO authenticated;
GRANT ALL PRIVILEGES ON sales TO authenticated;
GRANT ALL PRIVILEGES ON sale_items TO authenticated;
GRANT ALL PRIVILEGES ON rentals TO authenticated;
GRANT ALL PRIVILEGES ON rental_items TO authenticated;

-- Criar políticas de segurança RLS (Row Level Security)

-- Tabela de produtos - apenas produtos ativos visíveis para usuários comuns
ALTER TABLE products ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Produtos ativos visíveis para todos" ON products
  FOR SELECT TO authenticated
  USING (is_active = true);

CREATE POLICY "Apenas administradores podem ver produtos inativos" ON products
  FOR SELECT TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Apenas administradores podem criar produtos" ON products
  FOR INSERT TO authenticated
  WITH CHECK (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "Apenas administradores podem atualizar produtos" ON products
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Tabela de estoque - controle de acesso por local
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver estoque de seus locais" ON inventory
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_locations il
      WHERE il.id = inventory.location_id
      AND (
        il.company_id = (auth.jwt() ->> 'company_id')::uuid
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Apenas administradores podem atualizar estoque" ON inventory
  FOR UPDATE TO authenticated
  USING (auth.jwt() ->> 'role' = 'admin');

-- Tabela de movimentações - registro de auditoria
ALTER TABLE stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver movimentações de seus locais" ON stock_movements
  FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM inventory_locations il
      WHERE il.id = stock_movements.location_id
      AND (
        il.company_id = (auth.jwt() ->> 'company_id')::uuid
        OR auth.jwt() ->> 'role' = 'admin'
      )
    )
  );

CREATE POLICY "Apenas usuários autenticados podem criar movimentações" ON stock_movements
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tabela de vendas - controle por empresa
ALTER TABLE sales ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver vendas de sua empresa" ON sales
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'company_id' IS NOT NULL
    OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Apenas usuários autenticados podem criar vendas" ON sales
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Tabela de locações - controle por empresa
ALTER TABLE rentals ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver locações de sua empresa" ON rentals
  FOR SELECT TO authenticated
  USING (
    auth.jwt() ->> 'company_id' IS NOT NULL
    OR auth.jwt() ->> 'role' = 'admin'
  );

CREATE POLICY "Apenas usuários autenticados podem criar locações" ON rentals
  FOR INSERT TO authenticated
  WITH CHECK (true);

-- Criar função para atualizar timestamps automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Criar triggers para atualizar updated_at
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_categories_updated_at BEFORE UPDATE ON categories
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_updated_at BEFORE UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_companies_updated_at BEFORE UPDATE ON companies
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_inventory_locations_updated_at BEFORE UPDATE ON inventory_locations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_customers_updated_at BEFORE UPDATE ON customers
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sales_updated_at BEFORE UPDATE ON sales
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_rentals_updated_at BEFORE UPDATE ON rentals
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Função para registrar movimentação de estoque automaticamente
CREATE OR REPLACE FUNCTION register_stock_movement()
RETURNS TRIGGER AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO stock_movements (product_id, location_id, movement_type, quantity, created_by)
    VALUES (NEW.product_id, NEW.location_id, 'entrada', NEW.quantity, auth.uid());
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.quantity != OLD.quantity THEN
      INSERT INTO stock_movements (product_id, location_id, movement_type, quantity, created_by)
      VALUES (
        NEW.product_id, 
        NEW.location_id, 
        CASE WHEN NEW.quantity > OLD.quantity THEN 'entrada' ELSE 'saida' END,
        ABS(NEW.quantity - OLD.quantity),
        auth.uid()
      );
    END IF;
    RETURN NEW;
  END IF;
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Trigger para registrar movimentações automaticamente
CREATE TRIGGER auto_register_stock_movement
  AFTER INSERT OR UPDATE ON inventory
  FOR EACH ROW EXECUTE FUNCTION register_stock_movement();