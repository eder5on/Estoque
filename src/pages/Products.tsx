import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useProductStore, Product } from '../stores/productStore';
import { useAuthStore } from '../stores/authStore';
import { Search, Plus, Filter, Download, Upload, Edit, Trash2, Eye, QrCode, Package } from 'lucide-react';
import { toast } from 'sonner';

const Products: React.FC = () => {
  const { user } = useAuthStore();
  const {
    products,
    loading,
    error,
    filters,
    fetchProducts,
    deleteProduct,
    exportProducts,
    importProducts,
    setFilters,
  } = useProductStore();

  const [searchTerm, setSearchTerm] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesCategory = !filters.category || product.category === filters.category;
    const matchesStatus = !filters.status || product.status === filters.status;
    const matchesLocation = !filters.location || product.location_id === filters.location;
    
    return matchesSearch && matchesCategory && matchesStatus && matchesLocation;
  });

  const handleDeleteProduct = async (id: string) => {
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteProduct(id);
        toast.success('Produto excluído com sucesso');
      } catch (error) {
        toast.error('Erro ao excluir produto');
      }
    }
  };

  const handleExportProducts = async () => {
    try {
      const blob = await exportProducts();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `produtos_${new Date().toISOString().split('T')[0]}.xlsx`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
      toast.success('Produtos exportados com sucesso');
    } catch (error) {
      toast.error('Erro ao exportar produtos');
    }
  };

  const handleImportProducts = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    try {
      await importProducts(file);
      toast.success('Produtos importados com sucesso');
    } catch (error) {
      toast.error('Erro ao importar produtos');
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'novo': return 'bg-green-100 text-green-800';
      case 'usado': return 'bg-yellow-100 text-yellow-800';
      case 'rb': return 'bg-blue-100 text-blue-800';
      case 'ativo': return 'bg-purple-100 text-purple-800';
      case 'manutencao': return 'bg-orange-100 text-orange-800';
      case 'descartado': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'novo': return 'Novo';
      case 'usado': return 'Usado';
      case 'rb': return 'RB';
      case 'ativo': return 'Ativo';
      case 'manutencao': return 'Manutenção';
      case 'descartado': return 'Descartado';
      default: return status;
    }
  };

  const categories = [...new Set(products.map(p => p.category))];
  const locations = [...new Set(products.map(p => p.location_id).filter(Boolean))];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Produtos</h1>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie seu catálogo de produtos e controle de estoque
              </p>
            </div>
            <div className="flex space-x-3">
              {user?.role === 'admin' || user?.role === 'manager' ? (
                <>
                  <label className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 cursor-pointer">
                    <Upload className="h-4 w-4 mr-2" />
                    Importar
                    <input
                      type="file"
                      accept=".xlsx,.xls,.csv"
                      className="sr-only"
                      onChange={handleImportProducts}
                    />
                  </label>
                  <button
                    onClick={handleExportProducts}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Exportar
                  </button>
                  <Link
                    to="/products/new"
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Novo Produto
                  </Link>
                </>
              ) : null}
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Buscar por nome, SKU ou descrição..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              <Filter className="h-4 w-4 mr-2" />
              Filtros
            </button>
          </div>

          {showFilters && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Categoria
                  </label>
                  <select
                    value={filters.category}
                    onChange={(e) => setFilters({ category: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todas</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Status
                  </label>
                  <select
                    value={filters.status}
                    onChange={(e) => setFilters({ status: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todos</option>
                    <option value="novo">Novo</option>
                    <option value="usado">Usado</option>
                    <option value="rb">RB</option>
                    <option value="ativo">Ativo</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localização
                  </label>
                  <select
                    value={filters.location}
                    onChange={(e) => setFilters({ location: e.target.value })}
                    className="w-full border border-gray-300 rounded-md px-3 py-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Todas</option>
                    {locations.map(location => (
                      <option key={location} value={location}>{location}</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Products Table */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : error ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Erro ao carregar produtos</h3>
              <p className="mt-1 text-sm text-gray-500">{error}</p>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm || filters.category || filters.status || filters.location
                  ? 'Tente ajustar os filtros de busca'
                  : 'Comece criando seu primeiro produto'}
              </p>
              <div className="mt-6">
                <Link
                  to="/products/new"
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Novo Produto
                </Link>
              </div>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Produto
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      SKU
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Categoria
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Preços
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Ações
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredProducts.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            {product.qr_code ? (
                              <img
                                src={product.qr_code}
                                alt="QR Code"
                                className="h-10 w-10 rounded"
                              />
                            ) : (
                              <div className="h-10 w-10 bg-gray-200 rounded flex items-center justify-center">
                                <Package className="h-5 w-5 text-gray-400" />
                              </div>
                            )}
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                            {product.description && (
                              <div className="text-sm text-gray-500">{product.description}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {product.sku}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {product.category}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(product.status)}`}>
                          {getStatusLabel(product.status)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <div>
                          {product.cost_price && (
                            <div>Custo: R$ {product.cost_price.toFixed(2)}</div>
                          )}
                          {product.sale_price && (
                            <div>Venda: R$ {product.sale_price.toFixed(2)}</div>
                          )}
                          {product.rental_price && (
                            <div>Aluguel: R$ {product.rental_price.toFixed(2)}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            to={`/products/${product.id}`}
                            className="text-blue-600 hover:text-blue-900"
                          >
                            <Eye className="h-4 w-4" />
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'manager') && (
                            <>
                              <Link
                                to={`/products/${product.id}/edit`}
                                className="text-green-600 hover:text-green-900"
                              >
                                <Edit className="h-4 w-4" />
                              </Link>
                              <button
                                onClick={() => handleDeleteProduct(product.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={async () => {
                                  try {
                                    const qrCode = await useProductStore.getState().generateQRCode(product.id);
                                    toast.success('QR Code gerado com sucesso');
                                  } catch (error) {
                                    toast.error('Erro ao gerar QR Code');
                                  }
                                }}
                                className="text-purple-600 hover:text-purple-900"
                              >
                                <QrCode className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Products;