import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useProductStore } from '../stores/productStore';
import { useAuthStore } from '../stores/authStore';
import { ArrowLeft, Save, QrCode, Upload, Package, DollarSign, Hash, MapPin, User, FileText } from 'lucide-react';
import type { Product } from '../stores/productStore';
import { toast } from 'sonner';

const ProductForm: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const {
    currentProduct,
    loading,
    fetchProduct,
    createProduct,
    updateProduct,
    generateQRCode,
  } = useProductStore();

  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
  status: 'novo',
    serial_number: '',
    cost_price: '',
    sale_price: '',
    rental_price: '',
    min_stock: '',
    max_stock: '',
    unit: 'unidade',
    location_id: '',
    supplier_id: '',
    notes: '',
  });

  const [submitting, setSubmitting] = useState(false);
  const [generatingQR, setGeneratingQR] = useState(false);

  useEffect(() => {
    if (id) {
      fetchProduct(id);
    }
  }, [id, fetchProduct]);

  useEffect(() => {
    if (id && currentProduct) {
      setFormData({
        sku: currentProduct.sku,
        name: currentProduct.name,
        description: currentProduct.description || '',
        category: currentProduct.category,
        status: currentProduct.status,
        serial_number: currentProduct.serial_number || '',
        cost_price: currentProduct.cost_price?.toString() || '',
        sale_price: currentProduct.sale_price?.toString() || '',
        rental_price: currentProduct.rental_price?.toString() || '',
        min_stock: currentProduct.min_stock?.toString() || '',
        max_stock: currentProduct.max_stock?.toString() || '',
        unit: currentProduct.unit,
        location_id: currentProduct.location_id || '',
        supplier_id: currentProduct.supplier_id || '',
        notes: currentProduct.notes || '',
      });
    }
  }, [id, currentProduct]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const productData = {
        ...formData,
        cost_price: formData.cost_price ? parseFloat(formData.cost_price) : undefined,
        sale_price: formData.sale_price ? parseFloat(formData.sale_price) : undefined,
        rental_price: formData.rental_price ? parseFloat(formData.rental_price) : undefined,
        min_stock: formData.min_stock ? parseInt(formData.min_stock) : undefined,
        max_stock: formData.max_stock ? parseInt(formData.max_stock) : undefined,
        // ensure status has correct union type
      } as Omit<Product, 'id' | 'created_at' | 'updated_at'>;

      if (id) {
        await updateProduct(id, productData);
        toast.success('Produto atualizado com sucesso');
      } else {
        await createProduct(productData);
        toast.success('Produto criado com sucesso');
      }
      
      navigate('/products');
    } catch (error) {
      toast.error(id ? 'Erro ao atualizar produto' : 'Erro ao criar produto');
    } finally {
      setSubmitting(false);
    }
  };

  const handleGenerateQRCode = async () => {
    if (!id) {
      toast.error('Salve o produto primeiro para gerar o QR Code');
      return;
    }

    setGeneratingQR(true);
    try {
      await generateQRCode(id);
      toast.success('QR Code gerado com sucesso');
    } catch (error) {
      toast.error('Erro ao gerar QR Code');
    } finally {
      setGeneratingQR(false);
    }
  };

  const categories = [
    'Totem de Pesquisa',
    'Tablet',
    'Peça Acrílica',
    'Impressão PS Board',
    'Wobbler',
    'Totem Elíptico',
    'Adesivo',
    'Placa',
    'Material CNC',
    'Acessório',
    'Outro'
  ];

  const units = [
    'unidade',
    'metro',
    'centímetro',
    'milímetro',
    'litro',
    'quilograma',
    'grama',
    'peça',
    'conjunto'
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
                <h1 className="text-3xl font-bold text-gray-900">
                  {id ? 'Editar Produto' : 'Novo Produto'}
                </h1>
                <p className="mt-1 text-sm text-gray-600">
                  {id ? 'Atualize as informações do produto' : 'Cadastre um novo produto no sistema'}
                </p>
              </div>
            </div>
            {id && (
              <button
                onClick={handleGenerateQRCode}
                disabled={generatingQR}
                className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                <QrCode className="h-4 w-4 mr-2" />
                {generatingQR ? 'Gerando...' : 'Gerar QR Code'}
              </button>
            )}
          </div>
        </div>

        {/* Form */}
        <div className="bg-white shadow rounded-lg">
          <form onSubmit={handleSubmit} className="p-6 space-y-6">
            {/* Basic Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Informações Básicas
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="sku" className="block text-sm font-medium text-gray-700">
                    SKU *
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Hash className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="sku"
                      name="sku"
                      required
                      value={formData.sku}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Código único do produto"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                    Nome *
                  </label>
                  <input
                    type="text"
                    id="name"
                    name="name"
                    required
                    value={formData.name}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="Nome do produto"
                  />
                </div>
              </div>

              <div>
                <label htmlFor="description" className="block text-sm font-medium text-gray-700">
                  Descrição
                </label>
                <textarea
                  id="description"
                  name="description"
                  rows={3}
                  value={formData.description}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Descrição detalhada do produto"
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="category" className="block text-sm font-medium text-gray-700">
                    Categoria *
                  </label>
                  <select
                    id="category"
                    name="category"
                    required
                    value={formData.category}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Selecione uma categoria</option>
                    {categories.map(category => (
                      <option key={category} value={category}>{category}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="status" className="block text-sm font-medium text-gray-700">
                    Status *
                  </label>
                  <select
                    id="status"
                    name="status"
                    required
                    value={formData.status}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="novo">Novo</option>
                    <option value="usado">Usado</option>
                    <option value="rb">RB (Refurbished)</option>
                    <option value="ativo">Ativo (Imobilizado)</option>
                    <option value="manutencao">Manutenção</option>
                    <option value="descartado">Descartado</option>
                  </select>
                </div>
              </div>

              <div>
                <label htmlFor="serial_number" className="block text-sm font-medium text-gray-700">
                  Número de Série
                </label>
                <input
                  type="text"
                  id="serial_number"
                  name="serial_number"
                  value={formData.serial_number}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Número de série do produto"
                />
              </div>
            </div>

            {/* Pricing */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Preços
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="cost_price" className="block text-sm font-medium text-gray-700">
                    Preço de Custo
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      id="cost_price"
                      name="cost_price"
                      step="0.01"
                      min="0"
                      value={formData.cost_price}
                      onChange={handleInputChange}
                      className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="sale_price" className="block text-sm font-medium text-gray-700">
                    Preço de Venda
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      id="sale_price"
                      name="sale_price"
                      step="0.01"
                      min="0"
                      value={formData.sale_price}
                      onChange={handleInputChange}
                      className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="rental_price" className="block text-sm font-medium text-gray-700">
                    Preço de Aluguel
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <span className="text-gray-500 sm:text-sm">R$</span>
                    </div>
                    <input
                      type="number"
                      id="rental_price"
                      name="rental_price"
                      step="0.01"
                      min="0"
                      value={formData.rental_price}
                      onChange={handleInputChange}
                      className="pl-8 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="0,00"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Stock */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Estoque
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label htmlFor="unit" className="block text-sm font-medium text-gray-700">
                    Unidade de Medida *
                  </label>
                  <select
                    id="unit"
                    name="unit"
                    required
                    value={formData.unit}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  >
                    {units.map(unit => (
                      <option key={unit} value={unit}>{unit}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label htmlFor="min_stock" className="block text-sm font-medium text-gray-700">
                    Estoque Mínimo
                  </label>
                  <input
                    type="number"
                    id="min_stock"
                    name="min_stock"
                    min="0"
                    value={formData.min_stock}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>

                <div>
                  <label htmlFor="max_stock" className="block text-sm font-medium text-gray-700">
                    Estoque Máximo
                  </label>
                  <input
                    type="number"
                    id="max_stock"
                    name="max_stock"
                    min="0"
                    value={formData.max_stock}
                    onChange={handleInputChange}
                    className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0"
                  />
                </div>
              </div>
            </div>

            {/* Location and Supplier */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <MapPin className="h-5 w-5 mr-2" />
                Localização e Fornecedor
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="location_id" className="block text-sm font-medium text-gray-700">
                    Localização
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <MapPin className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="location_id"
                      name="location_id"
                      value={formData.location_id}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Local do produto"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="supplier_id" className="block text-sm font-medium text-gray-700">
                    Fornecedor
                  </label>
                  <div className="mt-1 relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <User className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      id="supplier_id"
                      name="supplier_id"
                      value={formData.supplier_id}
                      onChange={handleInputChange}
                      className="pl-10 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                      placeholder="ID do fornecedor"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Notes */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-gray-900 flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Observações
              </h3>
              
              <div>
                <label htmlFor="notes" className="block text-sm font-medium text-gray-700">
                  Notas
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  value={formData.notes}
                  onChange={handleInputChange}
                  className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Observações adicionais sobre o produto"
                />
              </div>
            </div>

            {/* Actions */}
            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-200">
              <button
                type="button"
                onClick={() => navigate('/products')}
                className="px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 disabled:opacity-50 flex items-center"
              >
                <Save className="h-4 w-4 mr-2" />
                {submitting ? 'Salvando...' : 'Salvar'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ProductForm;