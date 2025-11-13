import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export interface Product {
  id: string;
  sku: string;
  name: string;
  description?: string;
  category: string;
  status: 'novo' | 'usado' | 'rb' | 'ativo' | 'manutencao' | 'descartado';
  qr_code?: string;
  serial_number?: string;
  cost_price?: number;
  sale_price?: number;
  rental_price?: number;
  min_stock?: number;
  max_stock?: number;
  unit: string;
  location_id?: string;
  supplier_id?: string;
  notes?: string;
  images?: string[];
  created_at: string;
  updated_at: string;
}

export interface StockMovement {
  id: string;
  product_id: string;
  type: 'entrada' | 'saida' | 'transferencia' | 'venda' | 'aluguel' | 'devolucao' | 'ajuste';
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  reference_id?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
}

interface ProductState {
  products: Product[];
  currentProduct: Product | null;
  loading: boolean;
  error: string | null;
  filters: {
    search: string;
    category: string;
    status: string;
    location: string;
  };
  
  // Actions
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setFilters: (filters: Partial<ProductState['filters']>) => void;
  setCurrentProduct: (product: Product | null) => void;
  
  // CRUD Operations
  fetchProducts: () => Promise<void>;
  fetchProduct: (id: string) => Promise<void>;
  createProduct: (product: Omit<Product, 'id' | 'created_at' | 'updated_at'>) => Promise<void>;
  updateProduct: (id: string, product: Partial<Product>) => Promise<void>;
  deleteProduct: (id: string) => Promise<void>;
  
  // Stock Operations
  fetchStockMovements: (productId: string) => Promise<StockMovement[]>;
  addStockMovement: (movement: Omit<StockMovement, 'id' | 'created_at'>) => Promise<void>;
  
  // QR Code
  generateQRCode: (productId: string) => Promise<string>;
  
  // Import/Export
  importProducts: (file: File) => Promise<void>;
  exportProducts: () => Promise<Blob>;
}

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const useProductStore = create<ProductState>()(
  persist(
    (set, get) => ({
      products: [],
      currentProduct: null,
      loading: false,
      error: null,
      filters: {
        search: '',
        category: '',
        status: '',
        location: '',
      },

      setLoading: (loading) => set({ loading }),
      setError: (error) => set({ error }),
      setFilters: (filters) => set((state) => ({ 
        filters: { ...state.filters, ...filters } 
      })),
      setCurrentProduct: (product) => set({ currentProduct: product }),

      fetchProducts: async () => {
        const { setLoading, setError } = get();
        setLoading(true);
        setError(null);
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/products`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Erro ao buscar produtos');
          }
          
          const data = await response.json();
          set({ products: data.products });
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao buscar produtos');
        } finally {
          setLoading(false);
        }
      },

      fetchProduct: async (id) => {
        const { setLoading, setError } = get();
        setLoading(true);
        setError(null);
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Erro ao buscar produto');
          }
          
          const data = await response.json();
          set({ currentProduct: data.product });
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao buscar produto');
        } finally {
          setLoading(false);
        }
      },

      createProduct: async (product) => {
        const { setLoading, setError, fetchProducts } = get();
        setLoading(true);
        setError(null);
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/products`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(product),
          });
          
          if (!response.ok) {
            throw new Error('Erro ao criar produto');
          }
          
          await fetchProducts();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao criar produto');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      updateProduct: async (id, product) => {
        const { setLoading, setError, fetchProducts } = get();
        setLoading(true);
        setError(null);
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'PUT',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(product),
          });
          
          if (!response.ok) {
            throw new Error('Erro ao atualizar produto');
          }
          
          await fetchProducts();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao atualizar produto');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      deleteProduct: async (id) => {
        const { setLoading, setError, fetchProducts } = get();
        setLoading(true);
        setError(null);
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/products/${id}`, {
            method: 'DELETE',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Erro ao excluir produto');
          }
          
          await fetchProducts();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao excluir produto');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      fetchStockMovements: async (productId) => {
        const { setError } = get();
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/inventory/movements?product_id=${productId}`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Erro ao buscar movimentações');
          }
          
          const data = await response.json();
          return data.movements;
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao buscar movimentações');
          return [];
        }
      },

      addStockMovement: async (movement) => {
        const { setError } = get();
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/inventory/movements`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(movement),
          });
          
          if (!response.ok) {
            throw new Error('Erro ao adicionar movimentação');
          }
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao adicionar movimentação');
          throw error;
        }
      },

      generateQRCode: async (productId) => {
        const { setError } = get();
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/products/${productId}/qr-code`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Erro ao gerar QR code');
          }
          
          const data = await response.json();
          return data.qr_code;
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao gerar QR code');
          throw error;
        }
      },

      importProducts: async (file) => {
        const { setLoading, setError, fetchProducts } = get();
        setLoading(true);
        setError(null);
        
        try {
          const token = localStorage.getItem('token');
          const formData = new FormData();
          formData.append('file', file);
          
          const response = await fetch(`${API_BASE_URL}/products/bulk-import`, {
            method: 'POST',
            headers: {
              'Authorization': `Bearer ${token}`,
            },
            body: formData,
          });
          
          if (!response.ok) {
            throw new Error('Erro ao importar produtos');
          }
          
          await fetchProducts();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao importar produtos');
          throw error;
        } finally {
          setLoading(false);
        }
      },

      exportProducts: async () => {
        const { setError } = get();
        
        try {
          const token = localStorage.getItem('token');
          const response = await fetch(`${API_BASE_URL}/products/export`, {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json',
            },
          });
          
          if (!response.ok) {
            throw new Error('Erro ao exportar produtos');
          }
          
          return await response.blob();
        } catch (error) {
          setError(error instanceof Error ? error.message : 'Erro ao exportar produtos');
          throw error;
        }
      },
    }),
    {
      name: 'product-store',
      partialize: (state) => ({
        filters: state.filters,
      }),
    }
  )
);