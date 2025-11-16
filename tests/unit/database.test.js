import { describe, test, expect, jest } from '@jest/globals';
import { testConnection } from '../../src/config/database.js';

describe('Database Configuration', () => {
  describe('testConnection', () => {
    test('debe retornar true si la conexión es exitosa', async () => {
      const mockPool = {
        query: jest.fn().mockResolvedValue({ rows: [{ result: 1 }] })
      };

      const result = await testConnection(mockPool);

      expect(result).toBe(true);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
    });

    test('debe retornar false si la conexión falla', async () => {
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('Connection failed'))
      };

      // Mockear console.error para evitar ruido en tests
      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testConnection(mockPool);

      expect(result).toBe(false);
      expect(mockPool.query).toHaveBeenCalledWith('SELECT 1');
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        'Error conectando a la base de datos:',
        expect.any(Error)
      );

      consoleErrorSpy.mockRestore();
    });

    test('debe manejar errores de timeout', async () => {
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('Connection timeout'))
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testConnection(mockPool);

      expect(result).toBe(false);
      expect(consoleErrorSpy).toHaveBeenCalled();

      consoleErrorSpy.mockRestore();
    });

    test('debe manejar errores de autenticación', async () => {
      const mockPool = {
        query: jest.fn().mockRejectedValue(new Error('password authentication failed'))
      };

      const consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

      const result = await testConnection(mockPool);

      expect(result).toBe(false);

      consoleErrorSpy.mockRestore();
    });
  });
});
