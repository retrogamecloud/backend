// ============================================================================
// CONTROLADORES DE AUTENTICACIÓN
// ============================================================================

import * as userRepo from '../repositories/userRepository.js';
import * as authService from '../services/authService.js';

/**
 * Controlador para registro de usuario
 * @description Permite registrar un nuevo usuario en el sistema con validación completa.
 * Este endpoint implementa un sistema de registro seguro con:
 * - Validación de username (alfanumérico, 3-20 caracteres)
 * - Validación de email (formato RFC 5322)
 * - Hash seguro de contraseñas con bcrypt (10 rounds)
 * - Generación automática de JWT con expiración de 24h
 * - Validación de unicidad de username/email
 * - Campos opcionales: display_name, avatar_url, bio
 * 
 * @param {Object} pool - Pool de conexiones de PostgreSQL
 * @param {string} secret - Secreto JWT para firma de tokens (HS256)
 * @returns {Function} Middleware de Express para manejar el registro
 * 
 * @example
 * // Uso en rutas
 * router.post('/register', register(pool, JWT_SECRET));
 * 
 * @example
 * // Ejemplo de request body
 * POST /api/auth/register
 * {
 *   "username": "player1",
 *   "password": "SecurePass123!",
 *   "email": "player1@retrogame.cloud",
 *   "display_name": "Master Player",
 *   "avatar_url": "https://cdn.retrogame.cloud/avatars/1.png",
 *   "bio": "Retro gaming enthusiast"
 * }
 * 
 * @throws {400} Username o password faltantes
 * @throws {400} Username inválido (longitud o caracteres no permitidos)
 * @throws {400} Email inválido (formato)
 * @throws {409} Username ya existe en la base de datos
 * @throws {409} Email ya registrado
 * @throws {500} Error interno del servidor
 */
export function register(pool, secret) {
  return async (req, res) => {
    const { username, password, email, display_name, avatar_url, bio } = req.body;

    // Validación
    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    if (!authService.validateUsername(username)) {
      return res.status(400).json({ 
        error: 'Username inválido. Debe tener entre 3-20 caracteres alfanuméricos' 
      });
    }

    if (email && !authService.validateEmail(email)) {
      return res.status(400).json({ error: 'Email inválido' });
    }

    const passwordValidation = authService.validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({ 
        error: 'Contraseña inválida', 
        details: passwordValidation.errors 
      });
    }

    try {
      // Verificar si el usuario ya existe
      const existingUser = await userRepo.obtenerUsuarioPorUsername(pool, username);
      if (existingUser) {
        return res.status(409).json({ error: 'El username ya existe' });
      }

      // Hash de la contraseña
      const password_hash = await authService.hashPassword(password);

      // Crear usuario
      const newUser = await userRepo.crearUsuario(pool, {
        username,
        email,
        password_hash,
        display_name,
        avatar_url,
        bio
      });

      // Generar token
      const token = authService.generateToken(
        { userId: newUser.id, username: newUser.username },
        secret
      );

      // Respuesta (sin enviar password_hash)
      const { password_hash: _, ...userWithoutPassword } = newUser;
      
      res.status(201).json({
        message: 'Usuario creado exitosamente',
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error en registro:', error);
      
      if (error.code === '23505') { // Unique violation
        return res.status(409).json({ error: 'El username o email ya existe' });
      }
      
      res.status(500).json({ error: 'Error al crear usuario' });
    }
  };
}

/**
 * Controlador para login de usuario
 */
export function login(pool, secret) {
  return async (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    try {
      // Buscar usuario
      const user = await userRepo.obtenerUsuarioPorUsername(pool, username);
      
      if (!user) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Verificar contraseña
      const passwordMatch = await authService.comparePassword(password, user.password_hash);
      
      if (!passwordMatch) {
        return res.status(401).json({ error: 'Credenciales inválidas' });
      }

      // Generar token
      const token = authService.generateToken(
        { userId: user.id, username: user.username },
        secret
      );

      // Respuesta
      const { password_hash: _, ...userWithoutPassword } = user;
      
      res.json({
        message: 'Login exitoso',
        token,
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error en login:', error);
      res.status(500).json({ error: 'Error al iniciar sesión' });
    }
  };
}

/**
 * Controlador para obtener perfil de usuario
 */
export function getProfile(pool) {
  return async (req, res) => {
    try {
      const userId = req.user.userId;
      const user = await userRepo.obtenerUsuarioPorId(pool, userId);
      
      if (!user) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { password_hash: _, ...userWithoutPassword } = user;
      res.json({ user: userWithoutPassword });
    } catch (error) {
      console.error('Error obteniendo perfil:', error);
      res.status(500).json({ error: 'Error al obtener perfil' });
    }
  };
}

/**
 * Controlador para actualizar perfil
 */
export function updateProfile(pool) {
  return async (req, res) => {
    try {
      const userId = req.user.userId;
      const { display_name, avatar_url, bio } = req.body;

      const updatedUser = await userRepo.actualizarUsuario(pool, userId, {
        display_name,
        avatar_url,
        bio
      });

      if (!updatedUser) {
        return res.status(404).json({ error: 'Usuario no encontrado' });
      }

      const { password_hash: _, ...userWithoutPassword } = updatedUser;
      res.json({
        message: 'Perfil actualizado exitosamente',
        user: userWithoutPassword
      });
    } catch (error) {
      console.error('Error actualizando perfil:', error);
      res.status(500).json({ error: 'Error al actualizar perfil' });
    }
  };
}
