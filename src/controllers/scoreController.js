// ============================================================================
// CONTROLADOR DE SCORES
// ============================================================================

import * as scoreRepository from '../repositories/scoreRepository.js';

/**
 * POST /api/scores - Guardar una nueva puntuación
 */
export function saveScore(pool) {
  return async (req, res) => {
    try {
      const { game, score, metadata } = req.body;
      const userId = req.user.userId; // viene del middleware de autenticación - token tiene userId

      // Validaciones
      if (!game || score === undefined || score === null) {
        return res.status(400).json({ 
          error: 'El campo game y score son obligatorios' 
        });
      }

      if (typeof score !== 'number' || score < 0) {
        return res.status(400).json({ 
          error: 'El score debe ser un número positivo' 
        });
      }

      // Buscar el juego por slug
      const gameQuery = 'SELECT id FROM games WHERE slug = $1';
      const { rows: gameRows } = await pool.query(gameQuery, [game]);
      
      if (gameRows.length === 0) {
        return res.status(404).json({ 
          error: `Juego '${game}' no encontrado` 
        });
      }

      const gameId = gameRows[0].id;

      // Verificar si ya existe un score para este usuario y juego
      const existingScore = await scoreRepository.obtenerScorePorUsuarioYJuego(
        pool, 
        userId, 
        gameId
      );

      let savedScore;

      if (existingScore) {
        // Si el nuevo score es mejor, actualizarlo
        if (score > existingScore.score) {
          savedScore = await scoreRepository.actualizarScore(
            pool, 
            existingScore.id, 
            score
          );
          
          // Guardar en historial
          await pool.query(
            'INSERT INTO score_history (score_id, old_score, new_score) VALUES ($1, $2, $3)',
            [existingScore.id, existingScore.score, score]
          );
        } else {
          // Score no es mejor, devolver el existente
          savedScore = existingScore;
        }
      } else {
        // Crear nuevo score
        savedScore = await scoreRepository.crearScore(pool, {
          user_id: userId,
          game_id: gameId,
          score,
          metadata: metadata || {}
        });
      }

      // Obtener el ranking actualizado del juego
      const ranking = await scoreRepository.obtenerRankingPorJuego(pool, game, 10);
      
      // Encontrar la posición del usuario en el ranking
      const userRank = ranking.findIndex(r => r.user_id === userId) + 1;

      res.status(201).json({
        success: true,
        score: savedScore,
        rank: userRank || null,
        totalPlayers: ranking.length,
        isNewHighScore: !existingScore || score > existingScore.score
      });

    } catch (error) {
      console.error('Error guardando score:', error);
      res.status(500).json({ 
        error: 'Error al guardar la puntuación',
        details: error.message 
      });
    }
  };
}

/**
 * GET /api/scores/user/:userId - Obtener scores de un usuario
 */
export function getUserScores(pool) {
  return async (req, res) => {
    try {
      const userId = parseInt(req.params.userId);
      
      if (isNaN(userId)) {
        return res.status(400).json({ error: 'ID de usuario inválido' });
      }

      const query = `
        SELECT 
          s.id,
          s.score,
          s.created_at,
          s.updated_at,
          g.slug as game_slug,
          g.name as game_name,
          g.year as game_year
        FROM scores s
        JOIN games g ON s.game_id = g.id
        WHERE s.user_id = $1
        ORDER BY s.score DESC
      `;
      
      const { rows } = await pool.query(query, [userId]);
      
      res.json({
        userId,
        scores: rows,
        totalGames: rows.length
      });

    } catch (error) {
      console.error('Error obteniendo scores del usuario:', error);
      res.status(500).json({ 
        error: 'Error al obtener puntuaciones del usuario',
        details: error.message 
      });
    }
  };
}

/**
 * GET /api/scores/game/:gameSlug - Obtener scores de un juego específico
 */
export function getGameScores(pool) {
  return async (req, res) => {
    try {
      const { gameSlug } = req.params;
      const limit = req.query.limit ? parseInt(req.query.limit) : 10;

      if (limit < 1 || limit > 100) {
        return res.status(400).json({ 
          error: 'El límite debe estar entre 1 y 100' 
        });
      }

      const scores = await scoreRepository.obtenerRankingPorJuego(
        pool, 
        gameSlug, 
        limit
      );

      if (scores.length === 0) {
        return res.json({
          game: gameSlug,
          scores: [],
          message: 'No hay puntuaciones para este juego aún'
        });
      }

      res.json({
        game: gameSlug,
        scores: scores.map(s => ({
          rank: parseInt(s.rank),
          username: s.username,
          displayName: s.display_name,
          avatarUrl: s.avatar_url,
          score: s.score,
          date: s.created_at
        })),
        total: scores.length
      });

    } catch (error) {
      console.error('Error obteniendo scores del juego:', error);
      res.status(500).json({ 
        error: 'Error al obtener puntuaciones del juego',
        details: error.message 
      });
    }
  };
}
