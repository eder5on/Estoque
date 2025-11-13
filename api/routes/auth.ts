import { Router } from 'express';
import { supabase } from '../server.js';
import { User } from '../types/index.js';

const router = Router();

/**
 * @route   POST /api/auth/register
 * @desc    Registrar novo usuário
 * @access  Público
 */
router.post('/register', async (req, res) => {
  try {
    const { email, password, name, role = 'viewer', company_id } = req.body;

    // Validação básica
    if (!email || !password || !name) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email, senha e nome são obrigatórios'
      });
    }

    // Criar usuário no Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          name,
          role,
          company_id
        }
      }
    });

    if (authError) {
      return res.status(400).json({
        error: 'Registration error',
        message: authError.message
      });
    }

    if (!authData.user) {
      return res.status(500).json({
        error: 'Registration error',
        message: 'Erro ao criar usuário'
      });
    }

    // Criar registro na tabela users
    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: authData.user.id,
        email,
        name,
        role,
        company_id,
        is_active: true
      });

    if (userError) {
      // Se falhar ao criar na tabela users, remover do auth
      await supabase.auth.admin.deleteUser(authData.user.id);
      return res.status(500).json({
        error: 'Database error',
        message: 'Erro ao salvar informações do usuário'
      });
    }

    res.status(201).json({
      message: 'Usuário criado com sucesso',
      user: {
        id: authData.user.id,
        email: authData.user.email,
        name,
        role
      }
    });
  } catch (error) {
    console.error('Erro ao registrar usuário:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar registro'
    });
  }
});

/**
 * @route   POST /api/auth/login
 * @desc    Fazer login
 * @access  Público
 */
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    // Validação básica
    if (!email || !password) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Email e senha são obrigatórios'
      });
    }

    // Fazer login no Supabase
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({
        error: 'Authentication error',
        message: 'Email ou senha incorretos'
      });
    }

    if (!authData.user || !authData.session) {
      return res.status(500).json({
        error: 'Authentication error',
        message: 'Erro ao autenticar'
      });
    }

    // Buscar informações adicionais do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', authData.user.id)
      .single();

    if (userError || !userData) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Erro ao buscar informações do usuário'
      });
    }

    // Verificar se o usuário está ativo
    if (!userData.is_active) {
      return res.status(401).json({
        error: 'Authentication error',
        message: 'Usuário desativado'
      });
    }

    // Atualizar último login
    await supabase
      .from('users')
      .update({ last_login: new Date().toISOString() })
      .eq('id', authData.user.id);

    res.json({
      message: 'Login realizado com sucesso',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        company_id: userData.company_id
      },
      token: authData.session.access_token,
      refresh_token: authData.session.refresh_token,
      expires_at: authData.session.expires_at
    });
  } catch (error) {
    console.error('Erro ao fazer login:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar login'
    });
  }
});

/**
 * @route   POST /api/auth/logout
 * @desc    Fazer logout
 * @access  Privado
 */
router.post('/logout', async (req, res) => {
  try {
    const { error } = await supabase.auth.signOut();
    
    if (error) {
      return res.status(400).json({
        error: 'Logout error',
        message: error.message
      });
    }

    res.json({
      message: 'Logout realizado com sucesso'
    });
  } catch (error) {
    console.error('Erro ao fazer logout:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar logout'
    });
  }
});

/**
 * @route   POST /api/auth/refresh
 * @desc    Renovar token
 * @access  Público
 */
router.post('/refresh', async (req, res) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Refresh token é obrigatório'
      });
    }

    const { data, error } = await supabase.auth.refreshSession({
      refresh_token
    });

    if (error) {
      return res.status(401).json({
        error: 'Refresh error',
        message: 'Refresh token inválido ou expirado'
      });
    }

    if (!data.session) {
      return res.status(500).json({
        error: 'Refresh error',
        message: 'Erro ao renovar sessão'
      });
    }

    res.json({
      token: data.session.access_token,
      refresh_token: data.session.refresh_token,
      expires_at: data.session.expires_at
    });
  } catch (error) {
    console.error('Erro ao renovar token:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar renovação de token'
    });
  }
});

/**
 * @route   GET /api/auth/me
 * @desc    Obter informações do usuário atual
 * @access  Privado
 */
router.get('/me', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token não fornecido'
      });
    }

    // Verificar token e obter usuário
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado'
      });
    }

    // Buscar informações completas do usuário
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single();

    if (userError || !userData) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Erro ao buscar informações do usuário'
      });
    }

    res.json({
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role,
        company_id: userData.company_id,
        is_active: userData.is_active,
        last_login: userData.last_login,
        created_at: userData.created_at
      }
    });
  } catch (error) {
    console.error('Erro ao obter informações do usuário:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar informações do usuário'
    });
  }
});

/**
 * @route   PUT /api/auth/profile
 * @desc    Atualizar perfil do usuário
 * @access  Privado
 */
router.put('/profile', async (req, res) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    const { name, email } = req.body;

    if (!token) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token não fornecido'
      });
    }

    // Verificar token e obter usuário
    const { data: { user }, error } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        error: 'Unauthorized',
        message: 'Token inválido ou expirado'
      });
    }

    // Atualizar informações do usuário
    const updates: any = {};
    if (name) updates.name = name;
    if (email) updates.email = email;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({
        error: 'Validation error',
        message: 'Nenhuma informação para atualizar'
      });
    }

    // Atualizar no Supabase Auth
    const { error: authError } = await supabase.auth.updateUser({
      data: { name: updates.name },
      email: updates.email
    });

    if (authError) {
      return res.status(400).json({
        error: 'Update error',
        message: authError.message
      });
    }

    // Atualizar no banco de dados
    const { data: userData, error: userError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', user.id)
      .select()
      .single();

    if (userError) {
      return res.status(500).json({
        error: 'Database error',
        message: 'Erro ao atualizar perfil'
      });
    }

    res.json({
      message: 'Perfil atualizado com sucesso',
      user: {
        id: userData.id,
        email: userData.email,
        name: userData.name,
        role: userData.role
      }
    });
  } catch (error) {
    console.error('Erro ao atualizar perfil:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Erro ao processar atualização de perfil'
    });
  }
});

export default router;