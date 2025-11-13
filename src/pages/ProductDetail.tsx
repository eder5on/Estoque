import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useProductStore, Product, StockMovement } from '../stores/productStore';
import { useAuthStore } from '../stores/authStore';
import { ArrowLeft, Edit, Trash2, QrCode, Package, DollarSign, MapPin, User, Calendar, TrendingUp, TrendingDown, Minus } from 'lucide-react';
import { toast } from 'sonner';

const ProductDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentProduct,
    loading,
    fetchProduct,
    deleteProduct,
    fetchStockMovements,
  } = useProductStore();

  const [stockMovements, setStockMovements] = useState<StockMovement[]>([]);
  const [movementsLoading, setMovementsLoading] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
      loadStockMovements();
    }
  }, [id, fetchProduct]);

  const loadStockMovements = async () => {
    if (!id) return;
    
    setMovementsLoading(true);
    try {
      const movements = await fetchStockMovements(id);
      setStockMovements(movements);
    } catch (error) {
      toast.error('Erro ao carregar movimentações de estoque');
    } finally {
      setMovementsLoading(false);
    }
  };

  const handleDeleteProduct = async () => {
    if (!id) return;
    
    if (window.confirm('Tem certeza que deseja excluir este produto?')) {
      try {
        await deleteProduct(id);
        toast.success('Produto excluído com sucesso');
        navigate('/products');
      } catch (error) {
        toast.error('Erro ao excluir produto');
      }
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

  const getMovementTypeIcon = (type: string) => {
    switch (type) {
      case 'entrada': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'saida': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'transferencia': return <Minus className="h-4 w-4 text-blue-600" />;
      case 'venda': return <TrendingDown className="h-4 w-4 text-red-600" />;
      case 'aluguel': return <Minus className="h-4 w-4 text-blue-600" />;
      case 'devolucao': return <TrendingUp className="h-4 w-4 text-green-600" />;
      case 'ajuste': return <Minus className="h-4 w-4 text-gray-600" />;
      default: return <Minus className="h-4 w-4 text-gray-600" />;
    }
  };

  const getMovementTypeLabel = (type: string) => {
    switch (type) {
      case 'entrada': return 'Entrada';
      case 'saida': return 'Saída';
      case 'transferencia': return 'Transferência';
      case 'venda': return 'Venda';
      case 'aluguel': return 'Aluguel';
      case 'devolucao': return 'Devolução';
      case 'ajuste': return 'Ajuste';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!currentProduct) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="mx-auto h-12 w-12 text-gray-400" />
          <h3 className="mt-2 text-sm font-medium text-gray-900">Produto não encontrado</h3>
          <button
            onClick={() => navigate('/products')}
            className="mt-4 inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar para Produtos
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <button
                onClick={() => navigate('/products')}
                className="mr-4 p-2 text-gray-400 hover:text-gray-600"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <div>
                <h1 className="text-3xl font-bold text-gray-900">{currentProduct.name}</h1>
                <div className="mt-2 flex items-center space-x-4">
                  <span className="text-sm text-gray-500">SKU: {currentProduct.sku}</span>
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(currentProduct.status)}`}>
                    {getStatusLabel(currentProduct.status)}
                  </span>
                  {currentProduct.serial_number && (
                    <span className="text-sm text-gray-500">Série: {currentProduct.serial_number}</span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex space-x-3">
              {(user?.role === 'admin' || user?.role === 'manager') && (
                <>
                  <Link
                    to={`/products/${id}/edit`}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </Link>
                  <button
                    onClick={handleDeleteProduct}
                    className="inline-flex items-center px-4 py-2 border border-red-300 rounded-md shadow-sm text-sm font-medium text-red-700 bg-white hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Excluir
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Product Information */}
          <div className="lg:col-span-2 space-y-6">
            {/* Basic Information */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Categoria</label>
                  <p className="mt-1 text-sm text-gray-900">{currentProduct.category}</p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Unidade</label>
                  <p className="mt-1 text-sm text-gray-900">{currentProduct.unit}</p>
                </div>
                
                {currentProduct.location_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Localização</label>
                    <p className="mt-1 text-sm text-gray-900">{currentProduct.location_id}</p>
                  </div>
                )}
                
                {currentProduct.supplier_id && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Fornecedor</label>
                    <p className="mt-1 text-sm text-gray-900">{currentProduct.supplier_id}</p>
                  </div>
                )}
              </div>
              
              {currentProduct.description && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-500">Descrição</label>
                  <p className="mt-1 text-sm text-gray-900">{currentProduct.description}</p>
                </div>
              )}
              
              {currentProduct.notes && (
                <div className="mt-6">
                  <label className="block text-sm font-medium text-gray-500">Observações</label>
                  <p className="mt-1 text-sm text-gray-900">{currentProduct.notes}</p>
                </div>
              )}
            </div>

            {/* Stock Movements */}
            <div className="bg-white shadow rounded-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900 flex items-center">
                  <TrendingUp className="h-5 w-5 mr-2" />
                  Movimentações de Estoque
                </h3>
                <button
                  onClick={loadStockMovements}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Atualizar
                </button>
              </div>
              
              {movementsLoading ? (
                <div className="flex justify-center items-center py-8">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
                </div>
              ) : stockMovements.length === 0 ? (
                <div className="text-center py-8">
                  <Minus className="mx-auto h-12 w-12 text-gray-400" />
                  <p className="mt-2 text-sm text-gray-500">Nenhuma movimentação registrada</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {stockMovements.map((movement) => (
                    <div key={movement.id} className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
                      <div className="flex items-center space-x-3">
                        {getMovementTypeIcon(movement.type)}
                        <div>
                          <p className="text-sm font-medium text-gray-900">
                            {getMovementTypeLabel(movement.type)}
                          </p>
                          <p className="text-xs text-gray-500">
                            {new Date(movement.created_at).toLocaleDateString('pt-BR')} às {new Date(movement.created_at).toLocaleTimeString('pt-BR')}
                          </p>
                          {movement.notes && (
                            <p className="text-xs text-gray-600 mt-1">{movement.notes}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-sm font-medium ${
                          movement.type === 'entrada' || movement.type === 'devolucao' 
                            ? 'text-green-600' 
                            : movement.type === 'saida' || movement.type === 'venda'
                            ? 'text-red-600'
                            : 'text-blue-600'
                        }`}>
                          {movement.type === 'entrada' || movement.type === 'devolucao' ? '+' : 
                           movement.type === 'saida' || movement.type === 'venda' ? '-' : ''}
                          {movement.quantity} {currentProduct.unit}
                        </p>
                        {movement.from_location_id && movement.to_location_id && (
                          <p className="text-xs text-gray-500">
                            {movement.from_location_id} → {movement.to_location_id}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* QR Code */}
            {currentProduct.qr_code && (
              <div className="bg-white shadow rounded-lg p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                  <QrCode className="h-5 w-5 mr-2" />
                  QR Code
                </h3>
                <div className="flex justify-center">
                  <img
                    src={currentProduct.qr_code}
                    alt="QR Code do Produto"
                    className="w-48 h-48"
                  />
                </div>
                <p className="mt-4 text-xs text-gray-500 text-center">
                  Escaneie para acessar informações do produto
                </p>
              </div>
            )}

            {/* Pricing */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Preços
              </h3>
              
              <div className="space-y-4">
                {currentProduct.cost_price && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Preço de Custo</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      R$ {currentProduct.cost_price.toFixed(2)}
                    </p>
                  </div>
                )}
                
                {currentProduct.sale_price && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Preço de Venda</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      R$ {currentProduct.sale_price.toFixed(2)}
                    </p>
                  </div>
                )}
                
                {currentProduct.rental_price && (
                  <div>
                    <label className="block text-sm font-medium text-gray-500">Preço de Aluguel</label>
                    <p className="mt-1 text-lg font-semibold text-gray-900">
                      R$ {currentProduct.rental_price.toFixed(2)}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Stock Levels */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Níveis de Estoque
              </h3>
              
              <div className="space-y-4">
                {(currentProduct.min_stock || currentProduct.max_stock) && (
                  <>
                    {currentProduct.min_stock && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Estoque Mínimo</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {currentProduct.min_stock} {currentProduct.unit}
                        </p>
                      </div>
                    )}
                    
                    {currentProduct.max_stock && (
                      <div>
                        <label className="block text-sm font-medium text-gray-500">Estoque Máximo</label>
                        <p className="mt-1 text-sm text-gray-900">
                          {currentProduct.max_stock} {currentProduct.unit}
                        </p>
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>

            {/* Dates */}
            <div className="bg-white shadow rounded-lg p-6">
              <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center">
                <Calendar className="h-5 w-5 mr-2" />
                Datas Importantes
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-500">Criado em</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(currentProduct.created_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-500">Atualizado em</label>
                  <p className="mt-1 text-sm text-gray-900">
                    {new Date(currentProduct.updated_at).toLocaleDateString('pt-BR')}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductDetail;