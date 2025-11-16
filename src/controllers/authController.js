// ============================================================================
// CONTROLADORES DE AUTENTICACIÓN
// ============================================================================

import * as userRepo from '../repositories/userRepository.js';
import * as authService from '../services/authService.js';

/**
 * Controlador para registro de usuario
 */
export async function register(pool, secret) {
  console.log('🔧 Creating register handler...');
  return async (req, res) => {
    console.log('📥 Register request received:', req.body);
    const { username, password, email, display_name, avatar_url, bio } = req.body;

    // Validación
    if (!username || !password) {
      console.log('❌ Validation failed: missing username or password');
      return res.status(400).json({ error: 'Username y password son requeridos' });
    }

    console.log('✅ Step 1: Basic validation passed');

    if (!authService.validateUsername(username)) {
      console.log('❌ Invalid username');
      return res.status(400).json({ 
        error: 'Username inválido. Debe tener entre 3-20 caracteres alfanuméricos' 
      });
    }

    console.log('✅ Step 2: Username validation passed');

    if (email && !authService.validateEmail(email)) {
      console.log('❌ Invalid email');
      return res.status(400).json({ error: 'Email inválido' });
    }

    console.log('✅ Step 3: Email validation passed');

    const passwordValidation = authService.validatePassword(password);
    console.log('✅ Step 4: Got password validation result:', passwordValidation);
    if (!passwordValidation.valid) {
      console.log('❌ Invalid password');
      return res.status(400).json({ 
        error: 'Contraseña inválida', 
        details: passwordValidation.errors 
      });
    }

    console.log('✅ Step 5: All validations passed, proceeding to DB');

    try {
      console.log('🔍 Step 6: Checking if user exists...');
      // Verificar si el usuario ya existe
      const existingUser = await userRepo.obtenerUsuarioPorUsername(pool, username);
      console.log('🔍 Step 7: Existing user check result:', existingUser ? 'exists' : 'not found');
      if (existingUser) {
        return res.status(409).json({ error: 'El username ya existe' });
      }

      console.log('🔐 Step 8: Hashing password...');
      // Hash de la contraseña
      const password_hash = await authService.hashPassword(password);
      console.log('✅ Step 9: Password hashed successfully');

      console.log('💾 Step 10: Creating user in DB...');
      // Crear usuario
      const newUser = await userRepo.crearUsuario(pool, {
        username,
        email,
        password_hash,
        display_name,
        avatar_url,
        bio
      });
      console.log('✅ Step 11: User created:', newUser.id);

      console.log('🎟️ Step 12: Generating token...');
      // Generar token
      const token = authService.generateToken(
        { userId: newUser.id, username: newUser.username },
        secret
      );
      console.log('✅ Step 13: Token generated');

      // Respuesta (sin enviar password_hash)
      const { password_hash: _, ...userWithoutPassword } = newUser;
      
      console.log('📤 Step 14: Sending response');
      res.status(201).json({
        message: 'Usuario creado exitosamente',
        token,
        user: userWithoutPassword
      });
      console.log('✅ Step 15: Response sent successfully');
    } catch (error) {
      console.error('❌ Error en registro:', error);
      console.error('❌ Error stack:', error.stack);
      
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
