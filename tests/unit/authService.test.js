import { describe, test, expect } from '@jest/globals';
import {
  hashPassword,
  comparePassword,
  generateToken,
  verifyToken,
  validateUsername,
  validateEmail,
  validatePassword
} from '../../src/services/authService.js';

describe('Auth Service - Tests Completos', () => {
  
  describe('hashPassword', () => {
    test('debe hashear una contraseña correctamente', async () => {
      const password = 'mypassword123';
      const hash = await hashPassword(password);
      
      expect(hash).toBeTruthy();
      expect(hash).not.toBe(password);
      expect(hash.length).toBeGreaterThan(20);
    });

    test('hashes diferentes para la misma contraseña', async () => {
      const password = 'samepassword';
      const hash1 = await hashPassword(password);
      const hash2 = await hashPassword(password);
      
      expect(hash1).not.toBe(hash2); // Diferentes por el salt
    });
  });

  describe('comparePassword', () => {
    test('debe validar contraseña correcta', async () => {
      const password = 'testpass123';
      const hash = await hashPassword(password);
      const isValid = await comparePassword(password, hash);
      
      expect(isValid).toBe(true);
    });

    test('debe rechazar contraseña incorrecta', async () => {
      const password = 'correct';
      const hash = await hashPassword(password);
      const isValid = await comparePassword('wrong', hash);
      
      expect(isValid).toBe(false);
    });
  });

  describe('generateToken', () => {
    test('debe generar un token JWT válido', () => {
      const payload = { userId: 1, username: 'test' };
      const secret = 'test_secret';
      const token = generateToken(payload, secret);
      
      expect(token).toBeTruthy();
      expect(token.split('.')).toHaveLength(3);
    });

    test('debe incluir payload en el token', () => {
      const payload = { userId: 123, username: 'testuser' };
      const secret = 'test_secret';
      const token = generateToken(payload, secret);
      const decoded = verifyToken(token, secret);
      
      expect(decoded.userId).toBe(123);
      expect(decoded.username).toBe('testuser');
    });

    test('debe respetar tiempo de expiración', () => {
      const payload = { userId: 1 };
      const secret = 'test_secret';
      const token = generateToken(payload, secret, '1d');
      const decoded = verifyToken(token, secret);
      
      expect(decoded.exp).toBeDefined();
      expect(decoded.iat).toBeDefined();
    });
  });

  describe('verifyToken', () => {
    test('debe verificar token válido', () => {
      const payload = { userId: 1, username: 'test' };
      const secret = 'test_secret';
      const token = generateToken(payload, secret);
      const decoded = verifyToken(token, secret);
      
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe('test');
    });

    test('debe rechazar token inválido', () => {
      const secret = 'test_secret';
      
      expect(() => {
        verifyToken('invalid.token.here', secret);
      }).toThrow();
    });

    test('debe rechazar token con secret incorrecto', () => {
      const payload = { userId: 1 };
      const token = generateToken(payload, 'secret1');
      
      expect(() => {
        verifyToken(token, 'secret2');
      }).toThrow();
    });
  });

  describe('validateUsername', () => {
    test('debe validar usernames correctos', () => {
      expect(validateUsername('user123')).toBe(true);
      expect(validateUsername('john_doe')).toBe(true);
      expect(validateUsername('Player1')).toBe(true);
      expect(validateUsername('abc')).toBe(true); // mínimo 3
      expect(validateUsername('a'.repeat(20))).toBe(true); // máximo 20
    });

    test('debe rechazar usernames inválidos', () => {
      expect(validateUsername('')).toBe(false);
      expect(validateUsername('ab')).toBe(false); // muy corto
      expect(validateUsername('a'.repeat(21))).toBe(false); // muy largo
      expect(validateUsername('user-name')).toBe(false); // guión no permitido
      expect(validateUsername('user name')).toBe(false); // espacios
      expect(validateUsername('user@name')).toBe(false); // caracteres especiales
      expect(validateUsername(null)).toBe(false);
      expect(validateUsername(undefined)).toBe(false);
      expect(validateUsername(123)).toBe(false);
    });
  });

  describe('validateEmail', () => {
    test('debe validar emails correctos', () => {
      expect(validateEmail('test@example.com')).toBe(true);
      expect(validateEmail('user.name@domain.co.uk')).toBe(true);
      expect(validateEmail('user+tag@example.com')).toBe(true);
      expect(validateEmail('a@b.c')).toBe(true);
    });

    test('debe rechazar emails inválidos', () => {
      expect(validateEmail('')).toBe(false);
      expect(validateEmail('notanemail')).toBe(false);
      expect(validateEmail('@example.com')).toBe(false);
      expect(validateEmail('user@')).toBe(false);
      expect(validateEmail('user @example.com')).toBe(false);
      expect(validateEmail('user@domain')).toBe(false);
      expect(validateEmail(null)).toBe(false);
      expect(validateEmail(undefined)).toBe(false);
      expect(validateEmail(123)).toBe(false);
    });
  });

  describe('validatePassword', () => {
    test('debe validar contraseñas correctas', () => {
      const result1 = validatePassword('pass123');
      expect(result1.valid).toBe(true);
      expect(result1.errors).toHaveLength(0);

      const result2 = validatePassword('a'.repeat(50));
      expect(result2.valid).toBe(true);
    });

    test('debe rechazar contraseñas muy cortas', () => {
      const result = validatePassword('12345');
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La contraseña debe tener al menos 6 caracteres');
    });

    test('debe rechazar contraseñas muy largas', () => {
      const result = validatePassword('a'.repeat(101));
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('La contraseña es demasiado larga');
    });

    test('debe rechazar contraseñas vacías o null', () => {
      const result1 = validatePassword('');
      expect(result1.valid).toBe(false);
      expect(result1.errors).toContain('La contraseña es requerida');

      const result2 = validatePassword(null);
      expect(result2.valid).toBe(false);

      const result3 = validatePassword(undefined);
      expect(result3.valid).toBe(false);
    });

    test('debe rechazar tipos no string', () => {
      const result = validatePassword(123456);
      expect(result.valid).toBe(false);
    });
  });
});
