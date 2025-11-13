// Tipos principais do sistema de controle de estoque

export type ProductType = 
  | 'totem' 
  | 'tablet' 
  | 'insumo' 
  | 'peca_acrilico' 
  | 'wobbler' 
  | 'totem_eliptico' 
  | 'adesivo' 
  | 'placa' 
  | 'material_corte';

export type ProductStatus = 
  | 'novo' 
  | 'usado' 
  | 'rb' 
  | 'ativo' 
  | 'manutencao' 
  | 'descartado';

export type MovementType = 
  | 'entrada' 
  | 'saida' 
  | 'transferencia' 
  | 'venda' 
  | 'locacao' 
  | 'devolucao' 
  | 'perda';

export type SupplierCategory = 
  | 'fabricante' 
  | 'distribuidor' 
  | 'servico' 
  | 'outro';

export type UserRole = 
  | 'admin' 
  | 'manager' 
  | 'operator' 
  | 'viewer';

// Interfaces principais
export interface BaseEntity {
  id: string;
  created_at: string;
  updated_at: string;
}

export interface Company extends BaseEntity {
  name: string;
  cnpj?: string;
  address?: string;
  phone?: string;
  email?: string;
  is_active: boolean;
}

export interface Category extends BaseEntity {
  name: string;
  description?: string;
  product_type: ProductType;
  is_active: boolean;
}

export interface Product extends BaseEntity {
  sku: string;
  name: string;
  description?: string;
  category_id: string;
  category?: Category;
  product_type: ProductType;
  status: ProductStatus;
  barcode?: string;
  qr_code?: string;
  serial_number?: string;
  unit: string;
  cost_price?: number;
  sale_price?: number;
  rental_price?: number;
  minimum_stock: number;
  maximum_stock?: number;
  weight?: number;
  dimensions?: Record<string, any>;
  specifications?: Record<string, any>;
  images?: string[];
  is_active: boolean;
}

export interface Supplier extends BaseEntity {
  name: string;
  cnpj?: string;
  category: SupplierCategory;
  contact_person?: string;
  phone?: string;
  email?: string;
  address?: string;
  payment_terms?: string;
  delivery_time?: number;
  rating?: number;
  is_active: boolean;
}

export interface InventoryLocation extends BaseEntity {
  company_id: string;
  company?: Company;
  name: string;
  description?: string;
  address?: string;
  is_active: boolean;
}

export interface Inventory extends BaseEntity {
  product_id: string;
  product?: Product;
  location_id: string;
  location?: InventoryLocation;
  quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  last_movement_at?: string;
}

export interface StockMovement extends BaseEntity {
  product_id: string;
  product?: Product;
  location_id: string;
  location?: InventoryLocation;
  movement_type: MovementType;
  quantity: number;
  unit_cost?: number;
  total_cost?: number;
  reference_id?: string;
  reference_type?: string;
  notes?: string;
  created_by?: string;
}

export interface StockTransfer extends BaseEntity {
  from_location_id: string;
  from_location?: InventoryLocation;
  to_location_id: string;
  to_location?: InventoryLocation;
  product_id: string;
  product?: Product;
  quantity: number;
  status: 'pending' | 'approved' | 'received' | 'cancelled';
  notes?: string;
  approved_by?: string;
  approved_at?: string;
  received_by?: string;
  received_at?: string;
  created_by?: string;
}

export interface Customer extends BaseEntity {
  name: string;
  cpf_cnpj?: string;
  phone?: string;
  email?: string;
  address?: string;
  customer_type: 'individual' | 'company';
  is_active: boolean;
}

export interface Sale extends BaseEntity {
  customer_id: string;
  customer?: Customer;
  sale_date: string;
  total_amount: number;
  discount_amount: number;
  payment_method?: string;
  payment_status: 'pending' | 'paid' | 'partial' | 'cancelled';
  notes?: string;
  items?: SaleItem[];
  created_by?: string;
}

export interface SaleItem extends BaseEntity {
  sale_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
  discount: number;
}

export interface Rental extends BaseEntity {
  customer_id: string;
  customer?: Customer;
  rental_date: string;
  return_date?: string;
  expected_return_date?: string;
  total_amount: number;
  deposit_amount: number;
  status: 'active' | 'returned' | 'overdue' | 'cancelled';
  notes?: string;
  items?: RentalItem[];
  created_by?: string;
}

export interface RentalItem extends BaseEntity {
  rental_id: string;
  product_id: string;
  product?: Product;
  quantity: number;
  unit_price: number;
  total_price: number;
  returned_quantity: number;
}

// Interfaces de autenticação
export interface User extends BaseEntity {
  email: string;
  name: string;
  role: UserRole;
  company_id?: string;
  is_active: boolean;
  last_login?: string;
}

export interface AuthResponse {
  user: User;
  token: string;
  refresh_token: string;
}

// Interfaces de requisição
export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface FilterOptions {
  search?: string;
  category?: string;
  status?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  location?: string;
}

// Interfaces de relatórios
export interface StockReport {
  product_id: string;
  product_name: string;
  sku: string;
  category_name: string;
  total_quantity: number;
  total_value: number;
  low_stock_products: number;
  out_of_stock_products: number;
}

export interface SalesReport {
  total_sales: number;
  total_amount: number;
  average_sale: number;
  sales_by_period: {
    date: string;
    amount: number;
    count: number;
  }[];
  top_products: {
    product_id: string;
    product_name: string;
    quantity: number;
    total_value: number;
  }[];
}

export interface MovementReport {
  total_entries: number;
  total_exits: number;
  total_transfers: number;
  movements_by_type: {
    type: MovementType;
    count: number;
    total_quantity: number;
    total_value: number;
  }[];
  top_moved_products: {
    product_id: string;
    product_name: string;
    total_quantity: number;
    movement_count: number;
  }[];
}

// Interfaces de importação/exportação
export interface ImportResult {
  success: boolean;
  imported: number;
  errors: number;
  warnings: string[];
  errors_details: string[];
}

export interface ExportOptions {
  format: 'csv' | 'xlsx' | 'pdf';
  dateFrom?: string;
  dateTo?: string;
  categories?: string[];
  locations?: string[];
  includeInactive?: boolean;
}

// Interfaces de configuração
export interface SystemConfig {
  company_name: string;
  company_logo?: string;
  default_currency: string;
  default_language: string;
  timezone: string;
  date_format: string;
  decimal_separator: string;
  low_stock_alert: boolean;
  low_stock_threshold: number;
  auto_backup_enabled: boolean;
  backup_frequency: string;
  qr_code_enabled: boolean;
  serial_number_required: boolean;
}

// Tipos de resposta de erro
export interface ApiError {
  error: string;
  message: string;
  code?: string;
  details?: any;
}

// Tipos de validação
export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}