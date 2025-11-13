import { Request, Response, NextFunction } from 'express';
import { supabase } from '../server.js';
import { User, UserRole } from '../types/index.js';

// Estender a interface Request do Express para incluir user
export interface AuthenticatedRequest extends Request {
  user?: User;
}

/**
 * Middleware de autenticação JWT
 */
export const authenticateToken = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    // Extrair token do header Authorization
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token de autenticação não fornecido'
      });
    }

    // Verificar token com Supabase
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado'
      });
    }

    // Buscar informações adicionais do usuário no banco
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não encontrado no sistema'
      });
    }

    // Adicionar usuário ao request
    req.user = userData as User;
    next();
  } catch (error) {
    console.error('Erro na autenticação:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar autenticação'
    });
  }
};

/**
 * Middleware de autorização por role
 */
export const authorizeRole = (allowedRoles: UserRole[]) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado'
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Você não tem permissão para acessar este recurso'
      });
    }

    next();
  };
};

/**
 * Middleware de autorização por empresa
 */
export const authorizeCompany = (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  if (!req.user) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Usuário não autenticado'
    });
  }

  // Administradores podem acessar qualquer empresa
  if (req.user.role === 'admin') {
    return next();
  }

  // Verificar se o usuário tem company_id
  if (!req.user.company_id) {
    return res.status(403).json({
      error: 'Forbidden',
      message: 'Usuário não está associado a uma empresa'
    });
  }

  next();
};

/**
 * Middleware para validar permissões específicas
 */
export const checkPermission = (permission: string) => {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Usuário não autenticado'
      });
    }

    // Administradores têm todas as permissões
    if (req.user.role === 'admin') {
      return next();
    }

    // Verificar permissões baseadas no role
    const rolePermissions: Record<UserRole, string[]> = {
      admin: ['*'],
      manager: ['read', 'write', 'update', 'delete_inventory', 'manage_sales', 'manage_rentals'],
      operator: ['read', 'write', 'manage_sales', 'manage_rentals'],
      viewer: ['read']
    };

    const userPermissions = rolePermissions[req.user.role] || [];

    if (!userPermissions.includes(permission) && !userPermissions.includes('*')) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Você não tem permissão para esta ação'
      });
    }

    next();
  };
};

/**
 * Middleware para validar se o usuário pode acessar um recurso específico
 */
export const authorizeResource = (resourceType: 'product' | 'inventory' | 'sale' | 'rental') => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    try {
      if (!req.user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Usuário não autenticado'
        });
      }

      // Administradores podem acessar qualquer recurso
      if (req.user.role === 'admin') {
        return next();
      }

      const resourceId = req.params.id;
      let hasAccess = false;

      switch (resourceType) {
        case 'product':
          // Verificar se o produto pertence à empresa do usuário
          const { data: product } = await supabase
            .from('products')
            .select('id')
            .eq('id', resourceId)
            .single();
          
          hasAccess = !!product;
          break;

        case 'inventory':
          // Verificar se o estoque pertence à empresa do usuário
          const { data: inventory } = await supabase
            .from('inventory')
            .select('location_id')
            .eq('id', resourceId)
            .single();
          
          if (inventory && req.user.company_id) {
            const { data: location } = await supabase
              .from('inventory_locations')
              .select('company_id')
              .eq('id', inventory.location_id)
              .single();
            
            hasAccess = location?.company_id === req.user.company_id;
          }
          break;

        case 'sale':
        case 'rental':
          // Verificar se a venda/locação pertence à empresa do usuário
          const table = resourceType === 'sale' ? 'sales' : 'rentals';
          const { data: transaction } = await supabase
            .from(table)
            .select('id')
            .eq('id', resourceId)
            .single();
          
          hasAccess = !!transaction;
          break;
      }

      if (!hasAccess) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Você não tem acesso a este recurso'
        });
      }

      next();
    } catch (error) {
      console.error('Erro ao verificar autorização de recurso:', error);
      return res.status(500).json({
        error: 'Internal server error',
        message: 'Erro ao verificar permissões'
      });
    }
  };
};

/**
 * Middleware para validar API key (para integrações)
 */
export const validateApiKey = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const apiKey = req.headers['x-api-key'];

    if (!apiKey) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key não fornecida'
      });
    }

    // Verificar API key no banco de dados
    const { data: apiKeyData, error } = await supabase
      .from('api_keys')
      .select('*')
      .eq('key', apiKey)
      .eq('is_active', true)
      .single();

    if (error || !apiKeyData) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key inválida'
      });
    }

    // Verificar se a API key não expirou
    if (apiKeyData.expires_at && new Date(apiKeyData.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'API key expirada'
      });
    }

    // Registrar uso da API key
    await supabase
      .from('api_keys')
      .update({ last_used_at: new Date().toISOString() })
      .eq('id', apiKeyData.id);

    next();
  } catch (error) {
    console.error('Erro ao validar API key:', error);
    return res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao validar API key'
    });
  }
};