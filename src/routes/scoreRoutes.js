// ============================================================================
// RUTAS DE SCORES
// ============================================================================

import express from 'express';
import * as scoreController from '../controllers/scoreController.js';
import { authMiddleware } from '../middleware/authMiddleware.js';

export function createScoreRoutes(pool, secret) {
  const router = express.Router();

  // POST /api/scores - Guardar puntuación (requiere autenticación)
  router.post('/scores', authMiddleware(secret), scoreController.saveScore(pool));

  // GET /api/scores/user/:userId - Obtener scores de un usuario
  router.get('/scores/user/:userId', scoreController.getUserScores(pool));

  // GET /api/scores/game/:gameSlug - Obtener scores de un juego
  router.get('/scores/game/:gameSlug', scoreController.getGameScores(pool));

  return router;
}
