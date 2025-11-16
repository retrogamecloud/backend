// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN
// ============================================================================

import { verifyToken } from '../services/authService.js';

/**
 * Middleware para verificar JWT
 * @param {string} secret - Clave secreta para verificar el token
 * @returns {Function} Middleware function
 */
export function authMiddleware(secret) {
  return (req, res, next) => {
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'Token no proporcionado' });
    }
    
    const token = authHeader.substring(7);
    
    try {
      const decoded = verifyToken(token, secret);
      req.user = decoded; // { userId, username }
      next();
    } catch (error) {
      return res.status(401).json({ error: 'Token inválido o expirado' });
    }
  };
}

/**
 * Extrae el token del header Authorization
 * @param {Object} req - Request object
 * @returns {string|null} Token extraído o null
 */
export function extractToken(req) {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return null;
  }
  
  return authHeader.substring(7);
}
