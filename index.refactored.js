// ============================================================================
// DATABASE SERVICE - RetroGameCloud
// Servicio centralizado de base de datos con autenticación JWT (REFACTORIZADO)
// ============================================================================

import express from 'express';
import cors from 'cors';
import { createPool, testConnection } from './src/config/database.js';
import { createAuthRoutes } from './src/routes/authRoutes.js';
import { createRankingRoutes } from './src/routes/rankingRoutes.js';
import { createScoreRoutes } from './src/routes/scoreRoutes.js';

// ============================================================================
// CONFIGURACIÓN
// ============================================================================

const SECRET_KEY = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiar_en_produccion';
const PORT = process.env.PORT || 3000;

// ============================================================================
// CREAR APLICACIÓN
// ============================================================================

export async function createApp(pool, secret) {
  const app = express();
  
  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check
  app.get('/health', (req, res) => {
    res.json({ 
      status: 'ok', 
      service: 'database-service',
      timestamp: new Date().toISOString()
    });
  });

  // Rutas de autenticación
  app.use('/api/auth', createAuthRoutes(pool, secret));

  // Rutas de rankings
  app.use('/api', createRankingRoutes(pool));

  // Rutas de scores
  app.use('/api', createScoreRoutes(pool, secret));

  // Manejo de rutas no encontradas
  app.use((req, res) => {
    res.status(404).json({ error: 'Ruta no encontrada' });
  });

  // Manejo de errores global
  app.use((err, req, res, next) => {
    console.error('Error no manejado:', err);
    res.status(500).json({ error: 'Error interno del servidor' });
  });

  return app;
}

// ============================================================================
// INICIAR SERVIDOR (solo si se ejecuta directamente)
// ============================================================================

if (import.meta.url === `file://${process.argv[1]}`) {
  const pool = createPool(process.env.DATABASE_URL);
  const app = await createApp(pool, SECRET_KEY);

  // Verificar conexión antes de iniciar
  testConnection(pool).then(connected => {
    if (connected) {
      app.listen(PORT, () => {
        console.log(`✅ Database Service corriendo en puerto ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
      });
    } else {
      console.error('❌ No se pudo conectar a la base de datos');
      process.exit(1);
    }
  });

  // Manejo de cierre graceful
  process.on('SIGTERM', async () => {
    console.log('SIGTERM recibido, cerrando servidor...');
    await pool.end();
    process.exit(0);
  });
}

export { createPool, testConnection };
