import { jest } from '@jest/globals';
import request from 'supertest';
import express from 'express';

// Mock de PostgreSQL
const mockPool = {
  query: jest.fn(),
};

describe('Scores API - Tests de Integración', () => {
  let app;
  const mockUser = { userId: 1, username: 'testuser' };
  const mockAuthMiddleware = (req, res, next) => {
    req.user = mockUser;
    next();
  };

  beforeAll(async () => {
    const scoreController = await import('../../src/controllers/scoreController.js');
    
    app = express();
    app.use(express.json());

    app.post('/api/scores', mockAuthMiddleware, scoreController.saveScore(mockPool));
    app.get('/api/scores/user/:userId', scoreController.getUserScores(mockPool));
    app.get('/api/scores/game/:gameSlug', scoreController.getGameScores(mockPool));
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('POST /api/scores - Guardar score', () => {
    it('debe rechazar request sin game', async () => {
      const response = await request(app)
        .post('/api/scores')
        .send({ score: 50000 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('obligatorios');
    });

    it('debe rechazar request sin score', async () => {
      const response = await request(app)
        .post('/api/scores')
        .send({ game: 'doom' });

      expect(response.status).toBe(400);
    });

    it('debe rechazar score negativo', async () => {
      const response = await request(app)
        .post('/api/scores')
        .send({ game: 'doom', score: -100 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('positivo');
    });

    it('debe rechazar juego inexistente', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] }); // Juego no existe

      const response = await request(app)
        .post('/api/scores')
        .send({ game: 'juegoinexistente123', score: 50000 });

      expect(response.status).toBe(404);
      expect(response.body.error).toContain('no encontrado');
    });
  });

  describe('GET /api/scores/user/:userId', () => {
    it('debe rechazar userId inválido', async () => {
      const response = await request(app)
        .get('/api/scores/user/invalid');

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('inválido');
    });

    it('debe retornar scores del usuario', async () => {
      mockPool.query.mockResolvedValueOnce({
        rows: [{
          id: 1,
          score: 50000,
          game_slug: 'doom',
          game_name: 'DOOM',
          game_year: 1993,
          created_at: new Date(),
          updated_at: new Date()
        }]
      });

      const response = await request(app)
        .get('/api/scores/user/1');

      expect(response.status).toBe(200);
      expect(response.body).toHaveProperty('userId', 1);
      expect(response.body).toHaveProperty('scores');
      expect(response.body.scores).toHaveLength(1);
    });

    it('debe retornar array vacío para usuario sin scores', async () => {
      mockPool.query.mockResolvedValueOnce({ rows: [] });

      const response = await request(app)
        .get('/api/scores/user/999999');

      expect(response.status).toBe(200);
      expect(response.body.scores).toHaveLength(0);
      expect(response.body.totalGames).toBe(0);
    });
  });

  describe('GET /api/scores/game/:gameSlug', () => {
    it('debe rechazar limit mayor a 100', async () => {
      const response = await request(app)
        .get('/api/scores/game/doom')
        .query({ limit: 200 });

      expect(response.status).toBe(400);
      expect(response.body.error).toContain('entre 1 y 100');
    });

    it('debe rechazar limit menor a 1', async () => {
      const response = await request(app)
        .get('/api/scores/game/doom')
        .query({ limit: 0 });

      expect(response.status).toBe(400);
    });
  });
});
