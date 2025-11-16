// ============================================================================
// REPOSITORIO DE USUARIOS
// ============================================================================

/**
 * Crea un nuevo usuario en la base de datos
 * @param {Object} pool - Pool de conexiones
 * @param {Object} userData - Datos del usuario
 * @returns {Promise<Object>} Usuario creado
 */
export async function crearUsuario(pool, { username, email, password_hash, display_name, avatar_url, bio }) {
  const userEmail = email || `${username}@retrogamecloud.local`;
  const query = `INSERT INTO users (username, email, password_hash, display_name, avatar_url, bio)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
  const values = [username, userEmail, password_hash, display_name, avatar_url, bio];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

/**
 * Obtiene un usuario por su username
 * @param {Object} pool - Pool de conexiones
 * @param {string} username - Nombre de usuario
 * @returns {Promise<Object|undefined>} Usuario encontrado
 */
export async function obtenerUsuarioPorUsername(pool, username) {
  const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
  const { rows } = await pool.query(query, [username]);
  return rows[0];
}

/**
 * Obtiene un usuario por su ID
 * @param {Object} pool - Pool de conexiones
 * @param {number} id - ID del usuario
 * @returns {Promise<Object|undefined>} Usuario encontrado
 */
export async function obtenerUsuarioPorId(pool, id) {
  const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

/**
 * Actualiza la información de un usuario
 * @param {Object} pool - Pool de conexiones
 * @param {number} userId - ID del usuario
 * @param {Object} updates - Campos a actualizar
 * @returns {Promise<Object>} Usuario actualizado
 */
export async function actualizarUsuario(pool, userId, updates) {
  const { display_name, avatar_url, bio } = updates;
  const query = `UPDATE users 
                 SET display_name = COALESCE($1, display_name),
                     avatar_url = COALESCE($2, avatar_url),
                     bio = COALESCE($3, bio),
                     updated_at = NOW()
                 WHERE id = $4 AND is_active = true
                 RETURNING *`;
  const values = [display_name, avatar_url, bio, userId];
  const { rows } = await pool.query(query, values);
  return rows[0];
}
