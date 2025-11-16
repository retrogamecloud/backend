import { describe, test, expect, jest, beforeEach } from '@jest/globals';
import {
  crearUsuario,
  obtenerUsuarioPorUsername,
  obtenerUsuarioPorId,
  actualizarUsuario
} from '../../src/repositories/userRepository.js';

describe('User Repository - Tests Completos', () => {
  let mockPool;

  beforeEach(() => {
    mockPool = {
      query: jest.fn()
    };
  });

  describe('crearUsuario', () => {
    test('debe crear usuario con todos los datos', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hashed',
        display_name: 'Test User',
        avatar_url: 'http://example.com/avatar.jpg',
        bio: 'Test bio'
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await crearUsuario(mockPool, {
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hashed',
        display_name: 'Test User',
        avatar_url: 'http://example.com/avatar.jpg',
        bio: 'Test bio'
      });

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['testuser', 'test@test.com', 'hashed'])
      );
    });

    test('debe generar email por defecto si no se proporciona', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ id: 1, username: 'testuser', email: 'testuser@retrogamecloud.local' }] 
      });

      await crearUsuario(mockPool, {
        username: 'testuser',
        email: null,
        password_hash: 'hashed'
      });

      const callArgs = mockPool.query.mock.calls[0][1];
      expect(callArgs[1]).toBe('testuser@retrogamecloud.local');
    });

    test('debe manejar valores null en campos opcionales', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ id: 1, username: 'testuser' }] 
      });

      await crearUsuario(mockPool, {
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hashed',
        display_name: null,
        avatar_url: null,
        bio: null
      });

      const callArgs = mockPool.query.mock.calls[0][1];
      expect(callArgs[3]).toBeNull(); // display_name
      expect(callArgs[4]).toBeNull(); // avatar_url
      expect(callArgs[5]).toBeNull(); // bio
    });
  });

  describe('obtenerUsuarioPorUsername', () => {
    test('debe encontrar usuario existente', async () => {
      const mockUser = {
        id: 1,
        username: 'testuser',
        is_active: true
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await obtenerUsuarioPorUsername(mockPool, 'testuser');

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE username = $1 AND is_active = true'),
        ['testuser']
      );
    });

    test('debe retornar undefined si usuario no existe', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await obtenerUsuarioPorUsername(mockPool, 'noexiste');

      expect(result).toBeUndefined();
    });

    test('debe filtrar usuarios inactivos', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await obtenerUsuarioPorUsername(mockPool, 'inactiveuser');

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        expect.anything()
      );
    });
  });

  describe('obtenerUsuarioPorId', () => {
    test('debe encontrar usuario por ID', async () => {
      const mockUser = {
        id: 123,
        username: 'testuser'
      };

      mockPool.query.mockResolvedValue({ rows: [mockUser] });

      const result = await obtenerUsuarioPorId(mockPool, 123);

      expect(result).toEqual(mockUser);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [123]
      );
    });

    test('debe retornar undefined si ID no existe', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await obtenerUsuarioPorId(mockPool, 999);

      expect(result).toBeUndefined();
    });

    test('debe filtrar usuarios inactivos por ID', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await obtenerUsuarioPorId(mockPool, 1);

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        expect.anything()
      );
    });
  });

  describe('actualizarUsuario', () => {
    test('debe actualizar todos los campos proporcionados', async () => {
      const mockUpdated = {
        id: 1,
        username: 'testuser',
        display_name: 'New Name',
        avatar_url: 'http://new.url',
        bio: 'New bio'
      };

      mockPool.query.mockResolvedValue({ rows: [mockUpdated] });

      const result = await actualizarUsuario(mockPool, 1, {
        display_name: 'New Name',
        avatar_url: 'http://new.url',
        bio: 'New bio'
      });

      expect(result).toEqual(mockUpdated);
      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('UPDATE users'),
        expect.arrayContaining(['New Name', 'http://new.url', 'New bio', 1])
      );
    });

    test('debe actualizar solo campos específicos', async () => {
      mockPool.query.mockResolvedValue({ 
        rows: [{ id: 1, display_name: 'Only This Changed' }] 
      });

      await actualizarUsuario(mockPool, 1, {
        display_name: 'Only This Changed'
      });

      const callArgs = mockPool.query.mock.calls[0][1];
      expect(callArgs[0]).toBe('Only This Changed');
      expect(callArgs[3]).toBe(1); // userId
    });

    test('debe usar COALESCE para mantener valores existentes', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await actualizarUsuario(mockPool, 1, {});

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('COALESCE'),
        expect.anything()
      );
    });

    test('debe actualizar timestamp updated_at', async () => {
      mockPool.query.mockResolvedValue({ rows: [{ id: 1 }] });

      await actualizarUsuario(mockPool, 1, { display_name: 'Test' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('updated_at = NOW()'),
        expect.anything()
      );
    });

    test('debe retornar undefined si usuario no existe', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      const result = await actualizarUsuario(mockPool, 999, {
        display_name: 'Test'
      });

      expect(result).toBeUndefined();
    });

    test('debe solo actualizar usuarios activos', async () => {
      mockPool.query.mockResolvedValue({ rows: [] });

      await actualizarUsuario(mockPool, 1, { bio: 'test' });

      expect(mockPool.query).toHaveBeenCalledWith(
        expect.stringContaining('is_active = true'),
        expect.anything()
      );
    });
  });
});
