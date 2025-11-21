// ============================================================================
// CONFIGURACIÓN DE BASE DE DATOS
// ============================================================================

import pg from 'pg';
const { Pool } = pg;

/**
 * Crea el pool de conexiones PostgreSQL
 * @param {string} connectionString - URL de conexión a PostgreSQL
 * @returns {Pool} Pool de conexiones
 */
export function createPool(connectionString) {
  return new Pool({
    connectionString: connectionString || process.env.DATABASE_URL,
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 2000,
  });
}

/**
 * Verifica la conexión a la base de datos
 * @param {Pool} pool - Pool de conexiones
 * @returns {Promise<boolean>}
 */
export async function testConnection(pool) {
  try {
    await pool.query('SELECT 1');
    return true;
  } catch (error) {
    console.error('Error conectando a la base de datos:', error);
    return false;
  }
}
// CI/CD test
console.log('test');
