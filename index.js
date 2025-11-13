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
// ENDPOINTS DE AUTENTICACIÓN
// ============================================================================

// Login de usuario (compatibilidad Kong directo)
app.post('/api/auth/login', async (req, res) => {
  const { username, password_hash } = req.body;
  console.log('Login attempt:', { username });
  try {
    const user = await obtenerUsuarioPorUsername(username);
    if (!user) {
      console.log('Usuario no encontrado:', username);
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const passwordMatch = await bcrypt.compare(password_hash, user.password_hash);
    console.log('Password match:', passwordMatch);
    if (!passwordMatch) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      accessToken: token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// Registro de usuario (compatibilidad Kong directo)
app.post('/api/auth/register', async (req, res) => {
  try {
    const { username, password_hash, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password_hash, 10);
    const user = await crearUsuario({ username, password_hash: hashedPassword, ...rest });
    res.status(201).json(user);
  } catch (err) {
    console.error('Error en registro:', err.message);
    if (err.message.includes('duplicate key') || err.code === '23505') {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Registro directo (compatibilidad Kong)
app.post('/register', async (req, res) => {
  try {
    const { username, password_hash, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password_hash, 10);
    const user = await crearUsuario({ username, password_hash: hashedPassword, ...rest });
    res.status(201).json(user);
  } catch (err) {
    console.error('Error en registro:', err.message);
    if (err.message.includes('duplicate key') || err.code === '23505') {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Consultar usuario por username
app.get('/users/:username', async (req, res) => {
  try {
    const user = await obtenerUsuarioPorUsername(req.params.username);
    if (user) res.json(user);
    else res.status(404).json({ error: 'Usuario no encontrado' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Registro de usuario (compatibilidad frontend antiguo)
app.post('/auth/register', async (req, res) => {
  try {
    const { username, password_hash, ...rest } = req.body;
    const hashedPassword = await bcrypt.hash(password_hash, 10);
    const user = await crearUsuario({ username, password_hash: hashedPassword, ...rest });
    res.status(201).json(user);
  } catch (err) {
    console.error('Error en registro:', err.message);
    if (err.message.includes('duplicate key') || err.code === '23505') {
      return res.status(409).json({ error: 'El usuario ya existe' });
    }
    res.status(500).json({ error: err.message });
  }
});

// Login de usuario (compatibilidad Kong y frontend)
app.post('/auth/login', async (req, res) => {
  const { username, password_hash } = req.body;
  console.log('Login attempt:', { username });
  try {
    const user = await obtenerUsuarioPorUsername(username);
    if (!user) {
      console.log('Usuario no encontrado:', username);
      return res.status(401).json({ error: 'Usuario no encontrado' });
    }
    
    const passwordMatch = await bcrypt.compare(password_hash, user.password_hash);
    console.log('Password match:', passwordMatch);
    if (!passwordMatch) {
      console.log('Contraseña incorrecta');
      return res.status(401).json({ error: 'Contraseña incorrecta' });
    }
    
    // Generar token JWT
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      SECRET_KEY,
      { expiresIn: '24h' }
    );
    
    res.json({ 
      accessToken: token,
      user: {
        id: user.id,
        username: user.username
      }
    });
  } catch (err) {
    console.error('Error en login:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// ENDPOINTS DE SALUD Y UTILIDADES
// ============================================================================

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'database-service' });
});

// ============================================================================
// ENDPOINTS DE RANKINGS
// ============================================================================

// Ranking por juego
app.get('/games/:gameId', async (req, res) => {
  try {
    const query = `
      SELECT u.username, s.score, s.created_at 
      FROM scores s
      JOIN users u ON s.user_id = u.id
      JOIN games g ON s.game_id = g.id
      WHERE g.name = $1
      ORDER BY s.score DESC
      LIMIT 10
    `;
    const { rows } = await pool.query(query, [req.params.gameId]);
    res.json(rows);
  } catch (err) {
    console.error('Error en rankings:', err.message);
    res.json([]);
  }
});

// ============================================================================
// ENDPOINTS DE PUNTUACIONES
// ============================================================================

// Guardar puntuación (protegido con JWT)
app.post('/', authMiddleware, async (req, res) => {
  try {
    console.log('📥 POST / recibido');
    console.log('📦 Body:', req.body);
    console.log('🔑 User from token:', req.user);
    
    const { game, score } = req.body;
    const userId = req.user.userId;
    
    // Buscar o crear el juego
    let gameRecord = await pool.query('SELECT id FROM games WHERE name = $1', [game]);
    if (gameRecord.rows.length === 0) {
      console.log(`🎮 Creando nuevo juego: ${game}`);
      const slug = game.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      const newGame = await pool.query(
        'INSERT INTO games (slug, name, description) VALUES ($1, $2, $3) RETURNING id',
        [slug, game, `Juego ${game}`]
      );
      gameRecord = newGame;
    }
    
    const gameId = gameRecord.rows[0].id;
    console.log(`🎮 Game ID: ${gameId}`);
    
    // Guardar o actualizar la puntuación
    const existingScore = await pool.query(
      'SELECT id, score FROM scores WHERE user_id = $1 AND game_id = $2',
      [userId, gameId]
    );
    
    if (existingScore.rows.length > 0) {
      console.log(`📊 Puntuación existente: ${existingScore.rows[0].score}, nueva: ${score}`);
      if (score > existingScore.rows[0].score) {
        await pool.query(
          'UPDATE scores SET score = $1, updated_at = NOW() WHERE id = $2',
          [score, existingScore.rows[0].id]
        );
        console.log(`✅ Puntuación actualizada`);
        res.json({ message: 'Puntuación actualizada', score });
      } else {
        console.log(`ℹ️ Puntuación existente es mayor`);
        res.json({ message: 'Puntuación existente es mayor', score: existingScore.rows[0].score });
      }
    } else {
      console.log(`✨ Creando nueva puntuación`);
      await pool.query(
        'INSERT INTO scores (user_id, game_id, score) VALUES ($1, $2, $3)',
        [userId, gameId, score]
      );
      console.log(`✅ Puntuación guardada`);
      res.json({ message: 'Puntuación guardada', score });
    }
  } catch (err) {
    console.error('❌ Error al guardar puntuación:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ============================================================================
// INICIAR SERVIDOR
// ============================================================================

app.listen(PORT, () => {
  console.log(`🚀 Database service escuchando en el puerto ${PORT}`);
});
