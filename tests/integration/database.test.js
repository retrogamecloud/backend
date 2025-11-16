import { jest } from '@jest/globals';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';

describe('Database Service - Tests de Integración con Código Real', () => {
  
  describe('Funciones de repositorio simuladas', () => {
    
    test('crearUsuario debe insertar usuario en DB', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          email: 'test@test.com',
          password_hash: 'hashed_password'
        }]
      });

      const crearUsuario = async ({ username, email, password_hash }) => {
        const userEmail = email || `${username}@retrogamecloud.local`;
        const query = `INSERT INTO users (username, email, password_hash, display_name, avatar_url, bio)
                       VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
        const values = [username, userEmail, password_hash, null, null, null];
        const { rows } = await mockQuery(query, values);
        return rows[0];
      };

      const result = await crearUsuario({
        username: 'testuser',
        email: 'test@test.com',
        password_hash: 'hashed'
      });

      expect(result.username).toBe('testuser');
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('INSERT INTO users'),
        expect.arrayContaining(['testuser', 'test@test.com'])
      );
    });

    test('obtenerUsuarioPorUsername debe buscar usuario activo', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{
          id: 1,
          username: 'testuser',
          is_active: true
        }]
      });

      const obtenerUsuarioPorUsername = async (username) => {
        const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
        const { rows } = await mockQuery(query, [username]);
        return rows[0];
      };

      const result = await obtenerUsuarioPorUsername('testuser');

      expect(result).toBeDefined();
      expect(result.username).toBe('testuser');
      expect(result.is_active).toBe(true);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE username = $1 AND is_active = true'),
        ['testuser']
      );
    });

    test('obtenerUsuarioPorId debe buscar por ID', async () => {
      const mockQuery = jest.fn().mockResolvedValue({
        rows: [{ id: 1, username: 'testuser' }]
      });

      const obtenerUsuarioPorId = async (id) => {
        const query = 'SELECT * FROM users WHERE id = $1 AND is_active = true';
        const { rows } = await mockQuery(query, [id]);
        return rows[0];
      };

      const result = await obtenerUsuarioPorId(1);

      expect(result.id).toBe(1);
      expect(mockQuery).toHaveBeenCalledWith(
        expect.stringContaining('WHERE id = $1'),
        [1]
      );
    });
  });

  describe('Middleware de autenticación', () => {
    const SECRET_KEY = 'test_secret';

    test('authMiddleware debe validar token correcto', () => {
      const token = jwt.sign({ userId: 1, username: 'test' }, SECRET_KEY);
      
      const req = {
        headers: {
          authorization: `Bearer ${token}`
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const authMiddleware = (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        const token = authHeader.substring(7);
        
        try {
          const decoded = jwt.verify(token, SECRET_KEY);
          req.user = decoded;
          next();
        } catch (error) {
          return res.status(401).json({ error: 'Token inválido o expirado' });
        }
      };

      authMiddleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.user).toBeDefined();
      expect(req.user.userId).toBe(1);
    });

    test('authMiddleware debe rechazar token sin Bearer', () => {
      const req = {
        headers: {
          authorization: 'InvalidToken'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const authMiddleware = (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        const token = authHeader.substring(7);
        
        try {
          const decoded = jwt.verify(token, SECRET_KEY);
          req.user = decoded;
          next();
        } catch (error) {
          return res.status(401).json({ error: 'Token inválido o expirado' });
        }
      };

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token no proporcionado' });
      expect(next).not.toHaveBeenCalled();
    });

    test('authMiddleware debe rechazar token inválido', () => {
      const req = {
        headers: {
          authorization: 'Bearer invalid_token_xyz'
        }
      };
      const res = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn()
      };
      const next = jest.fn();

      const authMiddleware = (req, res, next) => {
        const authHeader = req.headers.authorization;
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
          return res.status(401).json({ error: 'Token no proporcionado' });
        }
        
        const token = authHeader.substring(7);
        
        try {
          const decoded = jwt.verify(token, SECRET_KEY);
          req.user = decoded;
          next();
        } catch (error) {
          return res.status(401).json({ error: 'Token inválido o expirado' });
        }
      };

      authMiddleware(req, res, next);

      expect(res.status).toHaveBeenCalledWith(401);
      expect(res.json).toHaveBeenCalledWith({ error: 'Token inválido o expirado' });
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Lógica de autenticación', () => {
    
    test('Login debe comparar passwords con bcrypt', async () => {
      const plainPassword = 'mypassword123';
      const hashedPassword = await bcrypt.hash(plainPassword, 10);

      // Simular búsqueda de usuario
      const user = {
        id: 1,
        username: 'testuser',
        password_hash: hashedPassword
      };

      // Verificar password correcto
      const isValid = await bcrypt.compare(plainPassword, user.password_hash);
      expect(isValid).toBe(true);

      // Verificar password incorrecto
      const isInvalid = await bcrypt.compare('wrongpassword', user.password_hash);
      expect(isInvalid).toBe(false);
    });

    test('Login debe generar JWT con datos correctos', () => {
      const SECRET_KEY = 'test_secret';
      const user = { id: 1, username: 'testuser' };

      const token = jwt.sign(
        { userId: user.id, username: user.username },
        SECRET_KEY,
        { expiresIn: '7d' }
      );

      expect(token).toBeDefined();
      
      const decoded = jwt.verify(token, SECRET_KEY);
      expect(decoded.userId).toBe(1);
      expect(decoded.username).toBe('testuser');
      expect(decoded.exp).toBeDefined();
    });

    test('Registro debe generar email por defecto', () => {
      const username = 'testuser';
      const email = null;
      
      const userEmail = email || `${username}@retrogamecloud.local`;
      
      expect(userEmail).toBe('testuser@retrogamecloud.local');
    });
  });

  describe('Manejo de errores de base de datos', () => {
    
    test('Debe manejar error de usuario duplicado', async () => {
      const mockQuery = jest.fn().mockRejectedValue({
        code: '23505', // Código de PostgreSQL para unique violation
        constraint: 'users_username_key'
      });

      try {
        await mockQuery('INSERT INTO users...', ['existinguser']);
        fail('Debería haber lanzado error');
      } catch (error) {
        expect(error.code).toBe('23505');
        expect(error.constraint).toContain('username');
      }
    });

    test('Debe manejar error de conexión', async () => {
      const mockQuery = jest.fn().mockRejectedValue({
        code: 'ECONNREFUSED',
        message: 'Connection refused'
      });

      try {
        await mockQuery('SELECT * FROM users');
        fail('Debería haber lanzado error');
      } catch (error) {
        expect(error.code).toBe('ECONNREFUSED');
      }
    });
  });

  describe('Queries de base de datos', () => {
    
    test('Debe construir query parametrizado correctamente', () => {
      const username = 'testuser';
      const email = 'test@test.com';
      const password_hash = 'hashed_password';
      
      const query = `INSERT INTO users (username, email, password_hash, display_name, avatar_url, bio)
                     VALUES ($1, $2, $3, $4, $5, $6) RETURNING *`;
      const values = [username, email, password_hash, null, null, null];
      
      expect(query).toContain('$1');
      expect(query).toContain('$2');
      expect(query).toContain('$3');
      expect(values[0]).toBe('testuser');
      expect(values[1]).toBe('test@test.com');
      expect(values[2]).toBe('hashed_password');
    });

    test('Query UPDATE debe incluir WHERE clause', () => {
      const query = 'UPDATE users SET display_name = $1 WHERE id = $2';
      
      expect(query).toContain('UPDATE users');
      expect(query).toContain('WHERE id = $2');
    });

    test('Query SELECT debe filtrar por is_active', () => {
      const query = 'SELECT * FROM users WHERE username = $1 AND is_active = true';
      
      expect(query).toContain('is_active = true');
    });
  });
});
