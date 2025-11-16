-- Esquema único para RetroGameCloud

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  username VARCHAR(50) UNIQUE NOT NULL,
  email VARCHAR(255) UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  display_name VARCHAR(100),
  avatar_url TEXT,
  bio TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS refresh_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token VARCHAR(500) UNIQUE NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_stats (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  total_games_played INTEGER DEFAULT 0,
  total_score INTEGER DEFAULT 0,
  highest_score INTEGER DEFAULT 0,
  favorite_game VARCHAR(100),
  last_played_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS games (
  id SERIAL PRIMARY KEY,
  slug VARCHAR(100) UNIQUE NOT NULL,
  name VARCHAR(100) NOT NULL,
  description TEXT,
  thumbnail TEXT,
  file_url TEXT,
  year INTEGER,
  developer VARCHAR(100),
  tags TEXT[],
  controls JSONB
);

CREATE TABLE IF NOT EXISTS scores (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  game_id INTEGER NOT NULL REFERENCES games(id) ON DELETE CASCADE,
  score BIGINT NOT NULL DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS score_history (
  id SERIAL PRIMARY KEY,
  score_id INTEGER NOT NULL REFERENCES scores(id) ON DELETE CASCADE,
  old_score BIGINT,
  new_score BIGINT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Insertar juegos disponibles
INSERT INTO games (slug, name, description, year, developer) VALUES
  ('doom', 'DOOM', 'Classic first-person shooter', 1993, 'id Software'),
  ('wolf', 'Wolfenstein 3D', 'The game that started it all', 1992, 'id Software'),
  ('duke3d', 'Duke Nukem 3D', 'Hail to the king, baby!', 1996, '3D Realms'),
  ('digger', 'Digger', 'Classic arcade game', 1983, 'Windmill Software'),
  ('tetris', 'Tetris', 'The ultimate puzzle game', 1984, 'Alexey Pajitnov'),
  ('dangerousdave2', 'Dangerous Dave 2', 'Platform adventure', 1990, 'John Romero'),
  ('lostvikings', 'The Lost Vikings', 'Puzzle platformer', 1992, 'Silicon & Synapse'),
  ('mortalkombat', 'Mortal Kombat', 'Fighting game', 1992, 'Midway Games'),
  ('streetfighter2', 'Street Fighter II', 'Fighting game classic', 1991, 'Capcom'),
  ('heroesofmightandmagic2', 'Heroes of Might and Magic II', 'Turn-based strategy', 1996, 'New World Computing')
ON CONFLICT (slug) DO NOTHING;
