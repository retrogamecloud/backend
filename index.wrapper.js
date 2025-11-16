// ============================================================================
// DATABASE SERVICE - RetroGameCloud (Wrapper para compatibilidad)
// Este archivo mantiene compatibilidad con el deployment actual
// El código refactorizado está en index.refactored.js
// ============================================================================

import { createApp } from './index.refactored.js';
import { createPool, testConnection } from './src/config/database.js';

const SECRET_KEY = process.env.JWT_SECRET || 'tu_clave_secreta_super_segura_cambiar_en_produccion';
const PORT = process.env.PORT || 3000;
const DATABASE_URL = process.env.DATABASE_URL;

// Crear pool de conexiones
const pool = createPool(DATABASE_URL);

// Verificar conexión antes de iniciar
testConnection(pool).then(async (connected) => {
  if (connected) {
    console.log('✅ Conexión a base de datos establecida');
    
    try {
      // Crear aplicación
      const app = await createApp(pool, SECRET_KEY);
      
      // Iniciar servidor
      const server = app.listen(PORT, () => {
        console.log(`✅ Database Service corriendo en puerto ${PORT}`);
        console.log(`📊 Health check: http://localhost:${PORT}/health`);
      });

      server.on('error', (error) => {
        console.error('❌ Error en el servidor:', error);
      });

      // Capturar errores no manejados
      process.on('uncaughtException', (error) => {
        console.error('❌ Uncaught Exception:', error);
      });

      process.on('unhandledRejection', (reason, promise) => {
        console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
      });
    } catch (error) {
      console.error('❌ Error al crear aplicación:', error);
      process.exit(1);
    }
  } else {
    console.error('❌ No se pudo conectar a la base de datos');
    process.exit(1);
  }
}).catch((error) => {
  console.error('❌ Error en testConnection:', error);
  process.exit(1);
});

// Manejo de cierre graceful
process.on('SIGTERM', async () => {
  console.log('SIGTERM recibido, cerrando servidor...');
  await pool.end();
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('SIGINT recibido, cerrando servidor...');
  await pool.end();
  process.exit(0);
});
