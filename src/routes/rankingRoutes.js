// ============================================================================
// RUTAS DE RANKINGS
// ============================================================================

import express from 'express';
import * as rankingController from '../controllers/rankingController.js';

/**
 * Crea las rutas de rankings
 */
export function createRankingRoutes(pool) {
  const router = express.Router();

  // Ranking global
  router.get('/rankings', rankingController.getGlobalRanking(pool));
  
  // Ranking por juego
  router.get('/rankings/games/:gameId', rankingController.getRankingByGame(pool));

  return router;
}
