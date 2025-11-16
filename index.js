// ============================================================================
// DATABASE SERVICE - RetroGameCloud
// Servicio centralizado de base de datos con autenticación JWT
// ============================================================================

import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import cors from 'cors';
import pg from 'pg';
const { Pool } = pg;

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const app = express();
const SECRET_KEY = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiar_en_produccion';
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());

// Pool de conexiones PostgreSQL
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});

// ============================================================================
// REPOSITORIO DE USUARIOS
// ============================================================================

async function crearUsuario({ username, email, password_hash, display_name, avatar_url, bio }) {
  const userEmail = email || `${username}@retrogamecloud.local`;
  const query = `INSERT INTO users (username, email, password_hash, display_name, avatar_url, bio)
                 VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
  const values = [username, userEmail, password_hash, display_name, avatar_url, bio];
  const { rows } = await pool.query(query, values);
  return rows[0];
}

async function obtenerUsuarioPorUsername(username) {
  const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
  const { rows } = await pool.query(query, [username]);
  return rows[0];
}

async function obtenerUsuarioPorId(id) {
  const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
  const { rows } = await pool.query(query, [id]);
  return rows[0];
}

// ============================================================================
// MIDDLEWARE DE AUTENTICACIÓN JWT
// ============================================================================

const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;
  
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }
  
  const token = authHeader.substring(7);
  
  try {
    const decoded = jwt.verify(token, SECRET_KEY);
    req.user = decoded; // { userId, username }
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

// ============================================================================
// FUNCIONES HELPER DE AUTENTICACIÓN
// ============================================================================

// Wrapper para manejo de errores centralizado
const asyncHandler = (fn) => (req, res, next) => {
  Promise.resolve(fn(req, res, next)).catch((err) => {
    console.error('Error:', err.message);
    
    if (err.status) {
      return res.status(err.status).json({ error: err.message });
    }
    
    if (err.message?.includes('duplicate key') || err.code === '23505') {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    
    res.status(500).json({ error: err.message });
  });
};

// Función helper para procesar login de usuario
async function procesarLoginUsuario(username, password) {
  const user = await obtenerUsuarioPorUsername(username);
  if (!user) {
    throw { status: 401, message: 'Usuario no encontrado' };
  }
  
  const passwordMatch = await bcrypt.compare(password, user.password_hash);
  if (!passwordMatch) {
    throw { status: 401, message: 'Contraseña incorrecta' };
  }
  
  const token = jwt.sign(
    { userId: user.id, username: user.username },
    SECRET_KEY,
    { expiresIn: '24h' }
  );
  
  return { 
    accessToken: token,
    user: {
      id: user.id,
      username: user.username
    }
  };
}

// Función helper para procesar registro de usuario
async function procesarRegistroUsuario(username, password, extraData = {}) {
  const hashedPassword = await bcrypt.hash(password, 10);
  const user = await crearUsuario({ username, password_hash: hashedPassword, ...extraData });
  return user;
}

// ============================================================================
// ENDPOINTS DE AUTENTICACIÓN
// ============================================================================

// Login de usuario (compatibilidad Kong directo)
app.post('/api/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });
  const result = await procesarLoginUsuario(username, password);
  res.json(result);
}));

// Registro de usuario (compatibilidad Kong directo)
app.post('/api/auth/register', asyncHandler(async (req, res) => {
  const { username, password, ...rest } = req.body;
  const user = await procesarRegistroUsuario(username, password, rest);
  res.status(201).json(user);
}));

// Registro directo (compatibilidad Kong)
app.post('/register', asyncHandler(async (req, res) => {
  const { username, password, ...rest } = req.body;
  const user = await procesarRegistroUsuario(username, password, rest);
  res.status(201).json(user);
}));

// Consultar usuario por username
app.get('/users/:username', asyncHandler(async (req, res) => {
  const user = await obtenerUsuarioPorUsername(req.params.username);
  if (user) res.json(user);
  else res.status(404).json({ error: 'Usuario no encontrado' });
}));

// Registro de usuario (compatibilidad frontend antiguo)
app.post('/auth/register', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  const user = await procesarRegistroUsuario(username, password);
  res.status(201).json(user);
}));

// Login de usuario (compatibilidad Kong y frontend)
app.post('/auth/login', asyncHandler(async (req, res) => {
  const { username, password } = req.body;
  console.log('Login attempt:', { username });
  const result = await procesarLoginUsuario(username, password);
  res.json(result);
}));

// ============================================================================
// ENDPOINTS DE SALUD Y UTILIDADES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'database-service' });
});

// ============================================================================
// ENDPOINTS DE RANKINGS
// ============================================================================

// Función helper para obtener ranking por juego
async function obtenerRankingPorJuego(gameId) {
  const gameSlug = gameId.toLowerCase().replace(/[^a-z0-9]+/g, '');
  const query = `
    SELECT u.username, s.score, s.created_at 
    FROM scores s
    JOIN users u ON s.user_id = u.id
    JOIN games g ON s.game_id = g.id
    WHERE g.slug = $1
    ORDER BY s.score DESC
    LIMIT 10
  `;
  const { rows } = await pool.query(query, [gameSlug]);
  return rows;
}

// Ranking por juego
app.get('/games/:gameId', asyncHandler(async (req, res) => {
  const ranking = await obtenerRankingPorJuego(req.params.gameId);
  res.json(ranking);
}));

// Alias para compatibilidad con frontend - Rankings por juego
app.get('/api/rankings/games/:gameId', asyncHandler(async (req, res) => {
  const ranking = await obtenerRankingPorJuego(req.params.gameId);
  res.json(ranking);
}));

// ============================================================================
// ENDPOINTS DE PUNTUACIONES
// ============================================================================

// Función helper para guardar puntuación
async function guardarPuntuacion(userId, gameName, score) {
  console.log(`🎯 Guardando puntuación para: ${gameName}`);
  
  // Normalizar el nombre del juego a slug
  const gameSlug = gameName.toLowerCase().replace(/[^a-z0-9]+/g, '');
  
  // Buscar el juego por slug
  let gameRecord = await pool.query('SELECT id FROM games WHERE slug = $1', [gameSlug]);
  if (gameRecord.rows.length === 0) {
    throw { status: 404, message: `Juego no encontrado: ${gameName}` };
  }
  
  const gameId = gameRecord.rows[0].id;
  
  // Guardar o actualizar la puntuación
  const existingScore = await pool.query(
    'SELECT id, score FROM scores WHERE user_id = $1 AND game_id = $2',
    [userId, gameId]
  );
  
  if (existingScore.rows.length > 0) {
    if (score > existingScore.rows[0].score) {
      await pool.query(
        'UPDATE scores SET score = $1, updated_at = NOW() WHERE id = $2',
        [score, existingScore.rows[0].id]
      );
      console.log(`✅ Puntuación actualizada`);
      return { message: 'Puntuación actualizada', score };
    } else {
      console.log(`ℹ️ Puntuación existente es mayor`);
      return { message: 'Puntuación existente es mayor', score: existingScore.rows[0].score };
    }
  } else {
    await pool.query(
      'INSERT INTO scores (user_id, game_id, score) VALUES ($1, $2, $3)',
      [userId, gameId, score]
    );
    console.log(`✅ Puntuación guardada`);
    return { message: 'Puntuación guardada', score };
  }
}

// Guardar puntuación (protegido con JWT)
app.post('/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('📥 POST / recibido');
  const { game, score } = req.body;
  const result = await guardarPuntuacion(req.user.userId, game, score);
  res.json(result);
}));

// Alias para compatibilidad con frontend
app.post('/api/scores/', authMiddleware, asyncHandler(async (req, res) => {
  console.log('📥 POST /api/scores/ recibido');
  const { game, score } = req.body;
  const result = await guardarPuntuacion(req.user.userId, game, score);
  res.json(result);
}));

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Database service escuchando en el puerto ${PORT}`);
});
