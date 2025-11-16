// ============================================================================
// REPOSITORIO DE SCORES
// ============================================================================

/**
 * Obtiene el score más alto de un usuario para un juego específico
 */
export async function obtenerScorePorUsuarioYJuego(pool, userId, gameId) {
  const query = `
    SELECT * FROM scores 
    WHERE user_id = $1 AND game_id = $2 
    ORDER BY score DESC 
    LIMIT 1
  `;
  const { rows } = await pool.query(query, [userId, gameId]);
  return rows[0];
}

/**
 * Crea un nuevo score
 */
export async function crearScore(pool, { user_id, game_id, score, metadata }) {
  const query = `
    INSERT INTO scores (user_id, game_id, score, metadata)
    VALUES ($1, $2, $3, $4)
    RETURNING *
  `;
  const { rows } = await pool.query(query, [user_id, game_id, score, metadata || {}]);
  return rows[0];
}

/**
 * Actualiza un score existente
 */
export async function actualizarScore(pool, scoreId, newScore) {
  const query = `
    UPDATE scores 
    SET score = $1, updated_at = NOW()
    WHERE id = $2
    RETURNING *
  `;
  const { rows } = await pool.query(query, [newScore, scoreId]);
  return rows[0];
}

/**
 * Obtiene el ranking de un juego (top scores)
 */
export async function obtenerRankingPorJuego(pool, gameSlug, limit = 10) {
  const query = `
    SELECT 
      s.id,
      s.score,
      s.created_at,
      s.updated_at,
      u.id as user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      g.slug as game_slug,
      g.name as game_name,
      ROW_NUMBER() OVER (ORDER BY s.score DESC) as rank
    FROM scores s
    JOIN users u ON s.user_id = u.id
    JOIN games g ON s.game_id = g.id
    WHERE g.slug = $1 AND u.is_active = true
    ORDER BY s.score DESC
    LIMIT $2
  `;
  const { rows } = await pool.query(query, [gameSlug, limit]);
  return rows;
}

/**
 * Obtiene el ranking global (todos los juegos)
 */
export async function obtenerRankingGlobal(pool, limit = 10) {
  const query = `
    SELECT 
      u.id as user_id,
      u.username,
      u.display_name,
      u.avatar_url,
      SUM(s.score) as total_score,
      COUNT(DISTINCT s.game_id) as games_played,
      MAX(s.score) as highest_score,
      ROW_NUMBER() OVER (ORDER BY SUM(s.score) DESC) as rank
    FROM scores s
    JOIN users u ON s.user_id = u.id
    WHERE u.is_active = true
    GROUP BY u.id, u.username, u.display_name, u.avatar_url
    ORDER BY total_score DESC
    LIMIT $1
  `;
  const { rows } = await pool.query(query, [limit]);
  return rows;
}
