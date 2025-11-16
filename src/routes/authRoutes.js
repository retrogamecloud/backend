// ============================================================================
// RUTAS DE AUTENTICACIÓN
// ============================================================================

import express from 'express';
import * as authController from '../controllers/authController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

/**
 * Crea las rutas de autenticación
 * @param {Object} pool - Pool de conexiones a la base de datos
 * @param {string} secret - Clave secreta para JWT
 * @returns {Router} Router de Express
 */
export function createAuthRoutes(pool, secret) {
  const router = express.Router();

  // Rutas públicas
  router.post('/register', authController.register(pool, secret));
  router.post('/login', authController.login(pool, secret));

  // Rutas protegidas
  router.get('/profile', authMiddleware(secret), authController.getProfile(pool));
  router.put('/profile', authMiddleware(secret), authController.updateProfile(pool));

  return router;
}
