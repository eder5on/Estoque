import React, { useState } from 'react';
import { useProductStore } from '../stores/productStore';
import { Search, Plus, Package, ArrowRight, ArrowLeft, RefreshCw, MapPin, User, FileText } from 'lucide-react';
import { toast } from 'sonner';

interface StockMovementForm {
  product_id: string;
  type: 'entrada' | 'saida' | 'transferencia' | 'venda' | 'aluguel' | 'devolucao' | 'ajuste';
  quantity: number;
  from_location_id?: string;
  to_location_id?: string;
  reference_id?: string;
  notes?: string;
}

const Inventory: React.FC = () => {
  const { products, loading, addStockMovement } = useProductStore();
  const [showForm, setShowForm] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedProduct, setSelectedProduct] = useState('');
  
  const [formData, setFormData] = useState<StockMovementForm>({
    product_id: '',
    type: 'entrada',
    quantity: 0,
    from_location_id: '',
    to_location_id: '',
    reference_id: '',
    notes: '',
  });

  const filteredProducts = products.filter((product) => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.sku.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.product_id || formData.quantity <= 0) {
      toast.error('Por favor, preencha todos os campos obrigatórios');
      return;
    }

    if (formData.type === 'transferencia' && (!formData.from_location_id || !formData.to_location_id)) {
      toast.error('Para transferências, informe ambas as localizações');
      return;
    }

    try {
      await addStockMovement(formData);
      toast.success('Movimentação de estoque registrada com sucesso');
      setShowForm(false);
      setFormData({
        product_id: '',
        type: 'entrada',
        quantity: 0,
        from_location_id: '',
        to_location_id: '',
        reference_id: '',
        notes: '',
      });
    } catch (error) {
      toast.error('Erro ao registrar movimentação');
    }
  };

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <ArrowRight className="h-4 w-4 text-green-600" />;
      case 'saida': return <ArrowLeft className="h-4 w-4 text-red-600" />;
      case 'transferencia': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'venda': return <ArrowLeft className="h-4 w-4 text-red-600" />;
      case 'aluguel': return <RefreshCw className="h-4 w-4 text-blue-600" />;
      case 'devolucao': return <ArrowRight className="h-4 w-4 text-green-600" />;
      case 'ajuste': return <RefreshCw className="h-4 w-4 text-gray-600" />;
      default: return <RefreshCw className="h-4 w-4 text-gray-600" />;
    }
  };

  const movementTypes = [
    { value: 'entrada', label: 'Entrada' },
    { value: 'saida', label: 'Saída' },
    { value: 'transferencia', label: 'Transferência' },
    { value: 'venda', label: 'Venda' },
    { value: 'aluguel', label: 'Aluguel' },
    { value: 'devolucao', label: 'Devolução' },
    { value: 'ajuste', label: 'Ajuste' },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Controle de Estoque</h1>
              <p className="mt-1 text-sm text-gray-600">
                Gerencie movimentações de estoque e transferências entre localizações
              </p>
            </div>
            <button
              onClick={() => setShowForm(true)}
              className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700"
            >
              <Plus className="h-4 w-4 mr-2" />
              Nova Movimentação
            </button>
          </div>
        </div>

        {/* Stock Movement Form Modal */}
        {showForm && (
          <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-6">
                  <h2 className="text-xl font-semibold text-gray-900">
                    Nova Movimentação de Estoque
                  </h2>
                  <button
                    onClick={() => setShowForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <span className="sr-only">Fechar</span>
                    ×
                  </button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Product Selection */}
                  <div>
                    <label htmlFor="product_id" className="block text-sm font-medium text-gray-700">
                      Produto *
                    </label>
                    <select
                      id="product_id"
                      name="product_id"
                      required
                      value={formData.product_id}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Selecione um produto</option>
                      {filteredProducts.map(product => (
                        <option key={product.id} value={product.id}>
                          {product.name} ({product.sku})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Movement Type */}
                  <div>
                    <label htmlFor="type" className="block text-sm font-medium text-gray-700">
                      Tipo de Movimentação *
                    </label>
                    <select
                      id="type"
                      name="type"
                      required
                      value={formData.type}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                      {movementTypes.map(type => (
                        <option key={type.value} value={type.value}>
                          {type.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Quantity */}
                  <div>
                    <label htmlFor="quantity" className="block text-sm font-medium text-gray-700">
                      Quantidade *
                    </label>
                    <input
                      type="number"
                      id="quantity"
                      name="quantity"
                      required
                      min="1"
                      value={formData.quantity}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0"
                    />
                  </div>

                  {/* Locations for Transfer */}
                  {formData.type === 'transferencia' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label htmlFor="from_location_id" className="block text-sm font-medium text-gray-700">
                          Origem *
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="from_location_id"
                            name="from_location_id"
                            required
                            value={formData.from_location_id}
                            onChange={handleInputChange}
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Local de origem"
                          />
                        </div>
                      </div>
                      
                      <div>
                        <label htmlFor="to_location_id" className="block text-sm font-medium text-gray-700">
                          Destino *
                        </label>
                        <div className="mt-1 relative">
                          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                            <MapPin className="h-5 w-5 text-gray-400" />
                          </div>
                          <input
                            type="text"
                            id="to_location_id"
                            name="to_location_id"
                            required
                            value={formData.to_location_id}
                            onChange={handleInputChange}
                            className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            placeholder="Local de destino"
                          />
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Reference ID */}
                  <div>
                    <label htmlFor="reference_id" className="block text-sm font-medium text-gray-700">
                      Referência (Venda/Aluguel)
                    </label>
                    <div className="mt-1 relative">
                      <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <FileText className="h-5 w-5 text-gray-400" />
                      </div>
                      <input
                        type="text"
                        id="reference_id"
                        name="reference_id"
                        value={formData.reference_id}
                        onChange={handleInputChange}
                        className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="ID da venda ou aluguel"
                      />
                    </div>
                  </div>

                  {/* Notes */}
                  <div>
                    <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                      Observações
                    </label>
                    <textarea
                      id="notes"
                      name="notes"
                      rows={3}
                      value={formData.notes}
                      onChange={handleInputChange}
                      className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Observações sobre a movimentação"
                    />
                  </div>

                  {/* Actions */}
                  <div className="flex justify-end space-x-3 pt-4 border-t border-gray-200">
                    <button
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 flex items-center"
                    >
                      <Package className="h-4 w-4 mr-2" />
                      Registrar Movimentação
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Search */}
        <div className="bg-white shadow rounded-lg p-6 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
                <input
                  type="text"
                  placeholder="Buscar produtos..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 pr-4 py-2 w-full border border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Products Grid */}
        <div className="bg-white shadow rounded-lg overflow-hidden">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredProducts.length === 0 ? (
            <div className="text-center py-12">
              <Package className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">Nenhum produto encontrado</h3>
              <p className="mt-1 text-sm text-gray-500">
                {searchTerm ? 'Tente ajustar sua busca' : 'Cadastre produtos para gerenciar o estoque'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredProducts.map((product) => (
                <div key={product.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{product.name}</h3>
                      <p className="text-xs text-gray-500">SKU: {product.sku}</p>
                    </div>
                    <Package className="h-8 w-8 text-gray-400" />
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-500">Categoria:</span>
                      <span className="text-gray-900">{product.category}</span>
                    </div>
                    
                    <div className="flex justify-between">
                      <span className="text-gray-500">Status:</span>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${
                        product.status === 'novo' ? 'bg-green-100 text-green-800' :
                        product.status === 'usado' ? 'bg-yellow-100 text-yellow-800' :
                        product.status === 'rb' ? 'bg-blue-100 text-blue-800' :
                        product.status === 'ativo' ? 'bg-purple-100 text-purple-800' :
                        product.status === 'manutencao' ? 'bg-orange-100 text-orange-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {product.status === 'novo' ? 'Novo' :
                         product.status === 'usado' ? 'Usado' :
                         product.status === 'rb' ? 'RB' :
                         product.status === 'ativo' ? 'Ativo' :
                         product.status === 'manutencao' ? 'Manutenção' :
                         'Descartado'}
                      </span>
                    </div>
                    
                    {product.location_id && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Localização:</span>
                        <span className="text-gray-900">{product.location_id}</span>
                      </div>
                    )}
                    
                    {product.cost_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Custo:</span>
                        <span className="text-gray-900">R$ {product.cost_price.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {product.sale_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Venda:</span>
                        <span className="text-gray-900">R$ {product.sale_price.toFixed(2)}</span>
                      </div>
                    )}
                    
                    {product.rental_price && (
                      <div className="flex justify-between">
                        <span className="text-gray-500">Aluguel:</span>
                        <span className="text-gray-900">R$ {product.rental_price.toFixed(2)}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 pt-3 border-t border-gray-200">
                    <button
                      onClick={() => {
                        setSelectedProduct(product.id);
                        setFormData(prev => ({ ...prev, product_id: product.id }));
                        setShowForm(true);
                      }}
                      className="w-full inline-flex items-center justify-center px-3 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                    >
                      {getMovementTypeIcon(formData.type)}
                      <span className="ml-2">Registrar Movimentação</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Inventory;