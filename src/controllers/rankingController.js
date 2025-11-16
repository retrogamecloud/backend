// ============================================================================
// CONTROLADOR DE RANKINGS
// ============================================================================

import * as scoreRepo from '../repositories/scoreRepository.js';

/**
 * Obtiene el ranking de un juego específico
 */
export function getRankingByGame(pool) {
  return async (req, res) => {
    const { gameId } = req.params;
    const limit = parseInt(req.query.limit) || 10;
    
    try {
      const ranking = await scoreRepo.obtenerRankingPorJuego(pool, gameId, limit);
      res.json(ranking);
    } catch (error) {
      console.error('Error obteniendo ranking por juego:', error);
      res.status(500).json({ error: 'Error al obtener ranking' });
    }
  };
}

/**
 * Obtiene el ranking global
 */
export function getGlobalRanking(pool) {
  return async (req, res) => {
    const limit = parseInt(req.query.limit) || 10;
    
    try {
      const ranking = await scoreRepo.obtenerRankingGlobal(pool, limit);
      res.json(ranking);
    } catch (error) {
      console.error('Error obteniendo ranking global:', error);
      res.status(500).json({ error: 'Error al obtener ranking' });
    }
  };
}
