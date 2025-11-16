// ============================================================================
// SERVICIO DE AUTENTICACIÓN
// ============================================================================

import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

const SALT_ROUNDS = 10;

/**
 * Hashea una contraseña
 * @param {string} password - Contraseña en texto plano
 * @returns {Promise<string>} Contraseña hasheada
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compara una contraseña con su hash
 * @param {string} password - Contraseña en texto plano
 * @param {string} hash - Hash almacenado
 * @returns {Promise<boolean>} True si coinciden
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash);
}

/**
 * Genera un token JWT
 * @param {Object} payload - Datos a incluir en el token
 * @param {string} secret - Clave secreta
 * @param {string} expiresIn - Tiempo de expiración
 * @returns {string} Token JWT
 */
export function generateToken(payload, secret, expiresIn = '7d') {
  return jwt.sign(payload, secret, { expiresIn });
}

/**
 * Verifica y decodifica un token JWT
 * @param {string} token - Token a verificar
 * @param {string} secret - Clave secreta
 * @returns {Object} Payload decodificado
 * @throws {Error} Si el token es inválido
 */
export function verifyToken(token, secret) {
  return jwt.verify(token, secret);
}

/**
 * Valida el formato de username
 * @param {string} username - Username a validar
 * @returns {boolean} True si es válido
 */
export function validateUsername(username) {
  if (!username || typeof username !== 'string') return false;
  if (username.length < 3 || username.length > 20) return false;
  return /^[a-zA-Z0-9_]+$/.test(username);
}

/**
 * Valida el formato de email
 * @param {string} email - Email a validar
 * @returns {boolean} True si es válido
 */
export function validateEmail(email) {
  if (!email || typeof email !== 'string') return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

/**
 * Valida la contraseña
 * @param {string} password - Contraseña a validar
 * @returns {Object} {valid: boolean, errors: string[]}
 */
export function validatePassword(password) {
  const errors = [];
  
  if (!password || typeof password !== 'string') {
    errors.push('La contraseña es requerida');
    return { valid: false, errors };
  }
  
  if (password.length < 6) {
    errors.push('La contraseña debe tener al menos 6 caracteres');
  }
  
  if (password.length > 100) {
    errors.push('La contraseña es demasiado larga');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}
