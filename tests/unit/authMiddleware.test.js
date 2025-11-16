import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import { authMiddleware, extractToken } from '../../src/middleware/authMiddleware.js';
import { generateToken } from '../../src/services/authService.js';

describe('Auth Middleware - Tests Completos', () => {
  const SECRET_KEY = 'test_secret';

  describe('authMiddleware', () => {
    let req, res, next;

    beforeEach(() => {
      req = {
        headers: {}
      };
      res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      next = jest.fn();
    });

    test('debe permitir request con token válido', () => {
      const token = generateToken({ userId: 1, username: 'test' }, SECRET_KEY);
      req.headers.authorization = `Bearer ${token}`;

      const middleware = authMiddleware(SECRET_KEY);
      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
      expect(req.user.username).toBe('test');
      expect(res.status).not.toHaveBeenCalled();
    });

    test('debe rechazar request sin header Authorization', () => {
      const middleware = authMiddleware(SECRET_KEY);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token no proporcionado' });
      expect(next).not.toHaveBeenCalled();
    });

    test('debe rechazar header sin Bearer prefix', () => {
      req.headers.authorization = 'InvalidToken';

      const middleware = authMiddleware(SECRET_KEY);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token no proporcionado' });
      expect(next).not.toHaveBeenCalled();
    });

    test('debe rechazar token inválido', () => {
      req.headers.authorization = 'Bearer invalid_token_xyz';

      const middleware = authMiddleware(SECRET_KEY);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
      expect(next).not.toHaveBeenCalled();
    });

    test('debe rechazar token expirado', () => {
      // Crear token con expiración inmediata
      const expiredToken = generateToken({ userId: 1 }, SECRET_KEY, '0s');
      req.headers.authorization = `Bearer ${expiredToken}`;

      // Esperar un momento para que expire
      setTimeout(() => {
        const middleware = authMiddleware(SECRET_KEY);
        middleware(req, res, next);

        expect(res.status).toHaveBeenCalledWith(401);
        expect(next).not.toHaveBeenCalled();
      }, 100);
    });

    test('debe rechazar token con secret incorrecto', () => {
      const token = generateToken({ userId: 1 }, 'wrong_secret');
      req.headers.authorization = `Bearer ${token}`;

      const middleware = authMiddleware(SECRET_KEY);
      middleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
      expect(next).not.toHaveBeenCalled();
    });

    test('debe extraer payload completo del token', () => {
      const payload = {
        userId: 123,
        username: 'testuser',
        role: 'admin'
      };
      const token = generateToken(payload, SECRET_KEY);
      req.headers.authorization = `Bearer ${token}`;

      const middleware = authMiddleware(SECRET_KEY);
      middleware(req, res, next);

      expect(req.user.userId).toBe(123);
      expect(req.user.username).toBe('testuser');
      expect(req.user.role).toBe('admin');
    });
  });

  describe('extractToken', () => {
    test('debe extraer token del header Bearer', () => {
      const req = {
        headers: {
          authorization: 'Bearer abc123xyz'
        }
      };

      const token = extractToken(req);

      expect(token).toBe('abc123xyz');
    });

    test('debe retornar null si no hay header Authorization', () => {
      const req = {
        headers: {}
      };

      const token = extractToken(req);

      expect(token).toBeNull();
    });

    test('debe retornar null si header no tiene Bearer', () => {
      const req = {
        headers: {
          authorization: 'InvalidToken'
        }
      };

      const token = extractToken(req);

      expect(token).toBeNull();
    });

    test('debe manejar token con espacios correctamente', () => {
      const req = {
        headers: {
          authorization: 'Bearer   token_with_spaces'
        }
      };

      const token = extractToken(req);

      expect(token).toBe('  token_with_spaces');
    });

    test('debe extraer tokens largos', () => {
      const longToken = 'a'.repeat(500);
      const req = {
        headers: {
          authorization: `Bearer ${longToken}`
        }
      };

      const token = extractToken(req);

      expect(token).toBe(longToken);
      expect(token.length).toBe(500);
    });
  });
});
