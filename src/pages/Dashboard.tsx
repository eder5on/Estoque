import { useEffect, useState } from 'react';
import { useAuthStore } from '../stores/authStore';
import { Package, DollarSign, TrendingUp, Users, AlertTriangle, BarChart3 } from 'lucide-react';
import { apiRequest } from '../stores/authStore';

interface DashboardData {
  totalProducts: number;
  totalInventoryValue: number;
  lowStockCount: number;
  activeRentals: number;
  periodSales: {
    total: number;
    count: number;
  };
}

export default function Dashboard() {
  const { user, logout } = useAuthStore();
  const [dashboardData, setDashboardData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const data = await apiRequest('/reports/dashboard');
      setDashboardData(data.dashboard);
    } catch (error) {
      console.error('Erro ao carregar dados do dashboard:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL',
    }).format(value);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Carregando dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                Bem-vindo, {user?.name}! Último acesso: {user?.last_login ? new Date(user.last_login).toLocaleString('pt-BR') : 'Nunca'}
              </p>
            </div>
            <button
              onClick={logout}
              className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              Sair
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {/* Total de Produtos */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Package className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Total de Produtos
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.totalProducts || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Valor do Estoque */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <DollarSign className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Valor do Estoque
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {formatCurrency(dashboardData?.totalInventoryValue || 0)}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Produtos com Estoque Baixo */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <AlertTriangle className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Estoque Baixo
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.lowStockCount || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>

          {/* Locações Ativas */}
          <div className="bg-white overflow-hidden shadow rounded-lg">
            <div className="p-5">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <Users className="h-6 w-6 text-purple-600" />
                </div>
                <div className="ml-5 w-0 flex-1">
                  <dl>
                    <dt className="text-sm font-medium text-gray-500 truncate">
                      Locações Ativas
                    </dt>
                    <dd className="text-lg font-medium text-gray-900">
                      {dashboardData?.activeRentals || 0}
                    </dd>
                  </dl>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Vendas do Período */}
        <div className="bg-white shadow rounded-lg mb-8">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Vendas dos Últimos 30 Dias
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-sm text-gray-500">Total de Vendas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(dashboardData?.periodSales.total || 0)}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Número de Vendas</p>
                <p className="text-2xl font-bold text-gray-900">
                  {dashboardData?.periodSales.count || 0}
                </p>
              </div>
              <div className="text-center">
                <p className="text-sm text-gray-500">Ticket Médio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(
                    dashboardData?.periodSales.count 
                      ? dashboardData.periodSales.total / dashboardData.periodSales.count 
                      : 0
                  )}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="bg-white shadow rounded-lg">
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg leading-6 font-medium text-gray-900">
              Ações Rápidas
            </h3>
          </div>
          <div className="px-6 py-4">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <a
                href="/products"
                className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Package className="h-6 w-6 text-blue-600 mr-2" />
                <span className="text-sm font-medium">Produtos</span>
              </a>
              <a
                href="/inventory"
                className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <BarChart3 className="h-6 w-6 text-green-600 mr-2" />
                <span className="text-sm font-medium">Estoque</span>
              </a>
              <a
                href="/sales"
                className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <TrendingUp className="h-6 w-6 text-purple-600 mr-2" />
                <span className="text-sm font-medium">Vendas</span>
              </a>
              <a
                href="/rentals"
                className="flex items-center justify-center p-4 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors"
              >
                <Users className="h-6 w-6 text-orange-600 mr-2" />
                <span className="text-sm font-medium">Locações</span>
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}