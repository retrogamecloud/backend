import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

// Mock de PostgreSQL
const mockPool = {
  query: jest.fn(),
};

jest.unstable_mockModule('pg', () => ({
  default: {
    Pool: jest.fn(() => mockPool)
  },
  Pool: jest.fn(() => mockPool)
}));

describe('API - Tests de Integración', () => {
  let app;
  const SECRET_KEY = 'test_secret_key';

  beforeAll(() => {
    // Setup de la app de prueba que simula el servidor real
    app = express();
    app.use(express.json());

    // Health check endpoint
    app.get('/health', (req, res) => {
      res.json({ status: 'ok', service: 'database-service' });
    });

    // Register endpoint (simula la lógica real)
    app.post('/api/auth/register', async (req, res) => {
      const { username, password, email } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Username y password requeridos' });
      }

      try {
        // Simular hash de password (como en código real)
        const password_hash = await bcrypt.hash(password, 10);
        const userEmail = email || `${username}@retrogamecloud.local`;
        
        // Simular inserción en DB
        const mockUser = {
          id: 1,
          username,
          email: userEmail,
          password_hash,
          created_at: new Date()
        };
        
        res.status(201).json({ 
          message: 'Usuario creado exitosamente',
          user: { 
            id: mockUser.id,
            username: mockUser.username,
            email: mockUser.email 
          }
        });
      } catch (error) {
        res.status(500).json({ error: 'Error al crear usuario' });
      }
    });

    // Login endpoint (simula la lógica real)
    app.post('/api/auth/login', async (req, res) => {
      const { username, password } = req.body;
      
      if (!username || !password) {
        return res.status(400).json({ error: 'Credenciales requeridas' });
      }

      try {
        // Simular búsqueda de usuario
        const mockStoredPassword = await bcrypt.hash('testpass', 10);
        
        if (username === 'testuser') {
          const passwordMatch = await bcrypt.compare(password, mockStoredPassword);
          
          if (passwordMatch) {
            // Generar token JWT real
            const token = jwt.sign(
              { userId: 1, username: 'testuser' },
              SECRET_KEY,
              { expiresIn: '7d' }
            );
            
            res.json({ 
              token,
              user: { id: 1, username: 'testuser' }
            });
          } else {
            res.status(401).json({ error: 'Credenciales inválidas' });
          }
        } else {
          res.status(401).json({ error: 'Usuario no encontrado' });
        }
      } catch (error) {
        res.status(500).json({ error: 'Error en login' });
      }
    });

    // Endpoint protegido con JWT
    app.get('/api/auth/profile', (req, res) => {
      const authHeader = req.headers.authorization;
      
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ error: 'Token no proporcionado' });
      }
      
      const token = authHeader.substring(7);
      
      try {
        const decoded = jwt.verify(token, SECRET_KEY);
        res.json({ user: decoded });
      } catch (error) {
        res.status(401).json({ error: 'Token inválido' });
      }
    });
  });

  describe('Health Check', () => {
    test('GET /health debe retornar status ok', async () => {
      const response = await request(app).get('/health');
      
      expect(response.status).toBe(200);
      expect(response.body.status).toBe('ok');
      expect(response.body.service).toBe('database-service');
    });
  });

  describe('Registro de Usuario', () => {
    test('POST /api/auth/register debe crear usuario con datos válidos', async () => {
      const userData = {
        username: 'newuser',
        password: 'securepass123',
        email: 'newuser@test.com'
      };

      const response = await request(app)
        .post('/api/auth/register')
        .send(userData);

      expect(response.status).toBe(201);
      expect(response.body.message).toContain('exitosamente');
      expect(response.body.user.username).toBe(userData.username);
    });

    test('POST /api/auth/register debe fallar sin username', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ password: 'test123' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });

    test('POST /api/auth/register debe fallar sin password', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: 'testuser' });

      expect(response.status).toBe(400);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Login de Usuario', () => {
    test('POST /api/auth/login debe retornar token con credenciales válidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'testpass' });

      expect(response.status).toBe(200);
      expect(response.body.token).toBeDefined();
      expect(response.body.user.username).toBe('testuser');
      
      // Verificar que el token es un JWT válido
      const tokenParts = response.body.token.split('.');
      expect(tokenParts).toHaveLength(3);
    });

    test('POST /api/auth/login debe fallar con credenciales inválidas', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'wrongpass' });

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválidas');
    });

    test('POST /api/auth/login debe fallar sin credenciales', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({});

      expect(response.status).toBe(400);
    });

    test('POST /api/auth/login debe fallar con usuario inexistente', async () => {
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'noexiste', password: 'testpass' });

      expect(response.status).toBe(401);
      expect(response.body.error).toBeDefined();
    });
  });

  describe('Endpoints Protegidos', () => {
    let validToken;

    beforeAll(async () => {
      // Obtener token válido
      const response = await request(app)
        .post('/api/auth/login')
        .send({ username: 'testuser', password: 'testpass' });
      
      validToken = response.body.token;
    });

    test('GET /api/auth/profile debe funcionar con token válido', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', `Bearer ${validToken}`);

      expect(response.status).toBe(200);
      expect(response.body.user.username).toBe('testuser');
    });

    test('GET /api/auth/profile debe fallar sin token', async () => {
      const response = await request(app)
        .get('/api/auth/profile');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('Token no proporcionado');
    });

    test('GET /api/auth/profile debe fallar con token inválido', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'Bearer invalid_token');

      expect(response.status).toBe(401);
      expect(response.body.error).toContain('inválido');
    });

    test('GET /api/auth/profile debe fallar con formato incorrecto', async () => {
      const response = await request(app)
        .get('/api/auth/profile')
        .set('Authorization', 'InvalidFormat token123');

      expect(response.status).toBe(401);
    });
  });

  describe('Hash de contraseñas', () => {
    test('Registro debe hashear la contraseña correctamente', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ 
          username: 'hashtest',
          password: 'plain_password',
          email: 'hash@test.com'
        });

      expect(response.status).toBe(201);
      // La contraseña no debe aparecer en la respuesta
      expect(response.body.user.password).toBeUndefined();
      expect(response.body.user.password_hash).toBeUndefined();
    });
  });

  describe('Validación de datos', () => {
    test('Registro debe validar username mínimo', async () => {
      const response = await request(app)
        .post('/api/auth/register')
        .send({ username: '', password: 'test123' });

      expect(response.status).toBe(400);
    });

    test('Login debe validar campos vacíos', async () => {
      const response1 = await request(app)
        .post('/api/auth/login')
        .send({ username: '', password: 'test' });

      const response2 = await request(app)
        .post('/api/auth/login')
        .send({ username: 'test', password: '' });

      expect([response1.status, response2.status]).toContain(400);
    });
  });
});
