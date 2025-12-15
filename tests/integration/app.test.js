import { describe, test, expect, jest, beforeAll } from '@jest/globals';
import request from 'supertest';
import { createApp } from '../../index.js';
import { hashPassword } from '../../src/services/authService.js';

describe('App Refactorizada - Tests de Integración Completos', () => {
  let app;
  let mockPool;
  const SECRET_KEY = 'test_secret_key';

  beforeAll(async () => {
    // Mock del pool de conexiones
    mockPool = {
      query: jest.fn(),
      end: jest.fn()
    };

    // Crear app con mock pool
    app = await createApp(mockPool, SECRET_KEY);
  });

  describe('Health Check', () => {
    test('GET /health debe retornar status ok', async () => {
      const response = await request(app).get('/health');

      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('database-service');
      expect(response.body.timestamp).toBeDefined();
    });
  });

  describe('Registro de usuarios', () => {
    test('POST /api/auth/register debe crear usuario válido', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] }) // No existe el usuario
        .mockResolvedValueOnce({ // Crear usuario
          rows: [{
            id: 1,
            username: 'newuser',
            email: 'new@test.com',
            password_hash: 'hashed',
            created_at: new Date()
          }]
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'newuser',
          password: 'password123',
          email: 'new@test.com'
        });

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('exitosamente');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('newuser');
      expect(response.body.user.password_hash).toBeUndefined();
    });

    test('POST /api/auth/register debe generar email por defecto', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockResolvedValueOnce({
          rows: [{
            id: 2,
            username: 'testuser2',
            email: 'testuser2@retrogamecloud.local',
            password_hash: 'hashed'
          }]
        });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser2',
          password: 'password123'
        });

      expect(response.status).toBe(201);
      expect(response.body.user.email).toBe('testuser2@retrogamecloud.local');
    });

    test('POST /api/auth/register debe rechazar sin username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'test123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('requeridos');
    });

    test('POST /api/auth/register debe rechazar sin password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'test' });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('requeridos');
    });

    test('POST /api/auth/register debe rechazar username inválido', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'ab', // muy corto
          password: 'password123'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('inválido');
    });

    test('POST /api/auth/register debe rechazar email inválido', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123',
          email: 'invalidemail'
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email inválido');
    });

    test('POST /api/auth/register debe rechazar contraseña corta', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: '12345' // menos de 6 caracteres
        });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Contraseña inválida');
      expect(response.body.details).toBeDefined();
    });

    test('POST /api/auth/register debe rechazar username duplicado', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{ id: 1, username: 'existing' }]
      });

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'existing',
          password: 'password123'
        });

      expect(response.status).toBe(409);
      expect(response.body.error).toContain('ya existe');
    });

    test('POST /api/auth/register debe manejar error de DB', async () => {
      mockPool.query
        .mockResolvedValueOnce({ rows: [] })
        .mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app)
        .post('/api/auth/register')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(500);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Login de usuarios', () => {
    test('POST /api/auth/login debe autenticar usuario válido', async () => {
      const hashedPassword = await hashPassword('correctpass');
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          password_hash: hashedPassword,
          is_active: true
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'correctpass'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('exitoso');
      expect(response.body.token).toBeDefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });

    test('POST /api/auth/login debe rechazar contraseña incorrecta', async () => {
      const hashedPassword = await hashPassword('correctpass');
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          password_hash: hashedPassword
        }]
      });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'wrongpass'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválidas');
    });

    test('POST /api/auth/login debe rechazar usuario inexistente', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'noexiste',
          password: 'password123'
        });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválidas');
    });

    test('POST /api/auth/login debe requerir username y password', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ password: 'test' });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test' });

      expect(response1.status).toBe(400);
      expect(response2.status).toBe(400);
    });

    test('POST /api/auth/login debe manejar error de DB', async () => {
      mockPool.query.mockRejectedValueOnce(new Error('DB Error'));

      const response = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'password123'
        });

      expect(response.status).toBe(500);
    });
  });

  describe('Perfil de usuario (protegido)', () => {
    let validToken;

    beforeAll(async () => {
      const hashedPassword = await hashPassword('testpass');
      
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          password_hash: hashedPassword
        }]
      });

      const loginResponse = await request(app)
        .post('/api/auth/login')
        .send({
          username: 'testuser',
          password: 'testpass'
        });

      validToken = loginResponse.body.token;
    });

    test('GET /api/auth/profile debe retornar perfil con token válido', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@test.com',
          display_name: 'Test User'
        }]
      });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('testuser');
      expect(response.body.user.password_hash).toBeUndefined();
    });

    test('GET /api/auth/profile debe rechazar sin token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
    });

    test('GET /api/auth/profile debe rechazar token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
    });

    test('GET /api/auth/profile debe manejar usuario no encontrado', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('no encontrado');
    });

    test('PUT /api/auth/profile debe actualizar perfil', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          username: 'testuser',
          display_name: 'Updated Name',
          bio: 'Updated bio'
        }]
      });

      const response = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`)
        .send({
          display_name: 'Updated Name',
          bio: 'Updated bio'
        });

      expect(response.status).toBe(200);
      expect(response.body.message).toContain('actualizado');
      expect(response.body.user.display_name).toBe('Updated Name');
    });

    test('PUT /api/auth/profile debe rechazar sin autenticación', async () => {
      const response = await request(app)
        .put('/api/auth/profile')
        .send({ display_name: 'Test' });

      expect(response.status).toBe(401);
    });
  });

  describe('Manejo de errores', () => {
    test('debe retornar 404 para rutas no encontradas', async () => {
      const response = await request(app).get('/ruta/inexistente');

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('no encontrada');
    });

    test('POST a ruta inexistente debe retornar 404', async () => {
      const response = await request(app)
        .post('/api/inexistente')
        .send({ data: 'test' });

      expect(response.status).toBe(404);
    });
  });
});
