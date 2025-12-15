# 🧪 Testing Strategy - Backend Service

[![Jest](https://img.shields.io/badge/Jest-29.7-green?logo=jest)](https://jestjs.io/)
[![Coverage](https://img.shields.io/badge/Coverage-70%25-brightgreen)](https://github.com/retrogamecloud/backend)

Documentación completa de testing para Backend API. Cubre setup, ejecución, debugging y cobertura con Jest.

---

## 📋 Tabla de Contenidos

- [Estructura de Tests](#estructura-de-tests)
- [Setup & Dependencias](#setup--dependencias)
- [Ejecutar Tests](#ejecutar-tests)
- [Escribir Tests](#escribir-tests)
- [Mocking & Fixtures](#mocking--fixtures)
- [Cobertura](#cobertura)
- [CI/CD Integration](#cicd-integration)
- [Debugging](#debugging)
- [Troubleshooting](#troubleshooting)

---

## 📁 Estructura de Tests

```
tests/
├── README.md                  # Este archivo
├── unit/                      # Tests unitarios (funciones, servicios)
│   ├── auth.test.js          # JWT, bcrypt, validación
│   ├── validation.test.js    # Input validation
│   ├── utils.test.js         # Helper functions
│   └── repositories.test.js  # Database queries (mocked)
├── integration/               # Tests de integración (API endpoints)
│   ├── api.test.js           # Endpoints principales
│   ├── auth.test.js          # POST /auth/register, login, logout
│   ├── users.test.js         # GET/PUT /users
│   ├── scores.test.js        # POST/GET /scores
│   ├── rankings.test.js      # GET /rankings
│   └── games.test.js         # GET /games
├── fixtures/                  # Datos de prueba (mock data)
│   ├── users.json            # Usuarios de prueba
│   ├── games.json            # Juegos de prueba
│   ├── scores.json           # Scores de prueba
│   └── tokens.json           # JWT tokens válidos/inválidos
└── utils/                     # Utilidades de testing
    ├── test-server.js        # Instancia del servidor para tests
    ├── db-setup.js           # Inicializar DB de prueba
    └── helpers.js            # Funciones auxiliares
```

---

## ⚙️ Setup & Dependencias

### Dependencias de Testing (package.json)

```json
{
  "devDependencies": {
    "jest": "^29.7.0",
    "supertest": "^6.3.3",
    "@testing-library/node": "^20.0.0",
    "jest-mock-extended": "^3.0.5",
    "jest-postgresql": "^2.0.0"
  }
}
```

### Jest Configuration (jest.config.json)

```json
{
  "testEnvironment": "node",
  "collectCoverageFrom": [
    "src/**/*.js",
    "!src/index.js",
    "!src/config/*.js"
  ],
  "coverageThreshold": {
    "global": {
      "branches": 70,
      "functions": 70,
      "lines": 70,
      "statements": 70
    }
  },
  "testMatch": ["**/tests/**/*.test.js"],
  "coverageDirectory": "coverage",
  "coverageReporters": ["text", "lcov", "html"]
}
```

### Setup Inicial

```bash
# Instalar dependencias
npm install

# Crear .env.test
cat > .env.test << EOF
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/retrogame_test
JWT_SECRET=test_jwt_secret_key_1234567890abcdef
JWT_EXPIRES_IN=1h
BCRYPT_ROUNDS=10
LOG_LEVEL=error
EOF

# Crear base de datos de prueba
createdb -U test retrogame_test

# Inicializar schema
psql -U test retrogame_test < init-db/01-schema.sql
```

---

## 🧪 Ejecutar Tests

### Todos los Tests

```bash
npm test
```

**Output esperado:**
```
PASS tests/unit/auth.test.js
PASS tests/unit/validation.test.js
PASS tests/integration/api.test.js
PASS tests/integration/auth.test.js
...

Test Suites: 6 passed, 6 total
Tests: 42 passed, 42 total
Snapshots: 0 total
Time: 5.234 s
```

### Tests Específicos

```bash
# Solo unitarios
npm run test:unit

# Solo integración
npm run test:integration

# Específico archivo
npm test auth.test.js

# Con pattern
npm test -- --testNamePattern="login"

# Por carpeta
npm test tests/unit/
```

### Con Cobertura

```bash
npm run test:coverage
```

**Genera reporte en:** `coverage/index.html`

```
======== Coverage Summary ========
Statements: 75.2% (150/199)
Branches: 72.1% (103/143)
Functions: 78.5% (41/52)
Lines: 76.1% (145/190)
==============================
```

### Modo Watch (Desarrollo)

```bash
npm run test:watch
```

- Re-ejecuta tests cuando archivos cambian
- Permite filtrar por test name interactivamente
- Útil durante desarrollo

### Modo Debug

```bash
node --inspect-brk node_modules/.bin/jest --runInBand tests/unit/auth.test.js
```

- Abre Chrome DevTools en `chrome://inspect`
- Permite breakpoints, stack traces, etc.

---

## 📝 Escribir Tests

### Patrón Arrange-Act-Assert

```javascript
describe('bcryptService', () => {
  test('debe hashear una contraseña correctamente', async () => {
    // ARRANGE - Preparar datos
    const password = 'SecurePassword123!';
    const expectedHashLength = 60; // bcrypt always produces 60 char hashes

    // ACT - Ejecutar la función
    const hashedPassword = await bcryptService.hash(password);

    // ASSERT - Verificar resultado
    expect(hashedPassword).toHaveLength(expectedHashLength);
    expect(hashedPassword).not.toBe(password);
    expect(await bcryptService.compare(password, hashedPassword)).toBe(true);
  });
});
```

### Tests Unitarios

```javascript
describe('authService', () => {
  describe('generateJWT', () => {
    test('debe generar un JWT válido', () => {
      const payload = { userId: 1, username: 'user@test.com' };
      const token = authService.generateJWT(payload);

      expect(token).toBeDefined();
      expect(token.split('.')).toHaveLength(3); // Header.Payload.Signature
    });

    test('debe incluir el payload en el token', () => {
      const payload = { userId: 42, username: 'admin' };
      const token = authService.generateJWT(payload);
      const decoded = authService.verifyJWT(token);

      expect(decoded.userId).toBe(42);
      expect(decoded.username).toBe('admin');
    });

    test('debe expirar después del tiempo especificado', () => {
      const payload = { userId: 1 };
      const token = authService.generateJWT(payload, { expiresIn: '1s' });
      
      // Inmediatamente válido
      expect(() => authService.verifyJWT(token)).not.toThrow();
      
      // Después de 2 segundos, expirado
      return new Promise(resolve => {
        setTimeout(() => {
          expect(() => authService.verifyJWT(token)).toThrow(/expired/);
          resolve();
        }, 2000);
      });
    });
  });
});
```

### Tests de Integración

```javascript
const request = require('supertest');
const app = require('../index');

describe('POST /api/auth/register', () => {
  test('debe registrar un nuevo usuario', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'newuser',
        email: 'newuser@test.com',
        password: 'SecurePassword123!'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toMatchObject({
      username: 'newuser',
      email: 'newuser@test.com'
    });
  });

  test('debe rechazar email duplicado', async () => {
    // Primero, registrar un usuario
    await request(app).post('/api/auth/register').send({
      username: 'user1',
      email: 'duplicate@test.com',
      password: 'Password123!'
    });

    // Intentar registrar con mismo email
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'user2',
        email: 'duplicate@test.com',
        password: 'Password123!'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/already exists/i);
  });

  test('debe validar formato de email', async () => {
    const response = await request(app)
      .post('/api/auth/register')
      .send({
        username: 'testuser',
        email: 'invalid-email',
        password: 'Password123!'
      });

    expect(response.status).toBe(400);
    expect(response.body.error).toMatch(/email/i);
  });
});
```

---

## 🎭 Mocking & Fixtures

### Mocking Database

```javascript
jest.mock('../src/repositories/userRepository');
const userRepository = require('../src/repositories/userRepository');

beforeEach(() => {
  userRepository.findByEmail.mockReset();
  userRepository.create.mockReset();
});

test('debe crear un usuario', async () => {
  const mockUser = {
    id: 1,
    username: 'testuser',
    email: 'test@test.com',
    createdAt: new Date()
  };

  userRepository.create.mockResolvedValue(mockUser);

  const result = await authService.register('testuser', 'test@test.com', 'password');

  expect(userRepository.create).toHaveBeenCalledWith({
    username: 'testuser',
    email: 'test@test.com',
    passwordHash: expect.any(String)
  });
  expect(result).toEqual(mockUser);
});
```

### Fixtures de Prueba

```javascript
// fixtures/users.json
[
  {
    id: 1,
    username: 'admin',
    email: 'admin@test.com',
    passwordHash: '$2b$10$...', // bcrypt hash
    role: 'admin',
    createdAt: '2025-01-01T00:00:00Z'
  },
  {
    id: 2,
    username: 'player',
    email: 'player@test.com',
    passwordHash: '$2b$10$...',
    role: 'user',
    createdAt: '2025-01-02T00:00:00Z'
  }
]
```

---

## 📊 Cobertura

### Objetivo: 70% Mínimo

```bash
npm run test:coverage
```

**Coverage por archivo:**

```
src/
  ├── services/
  │   ├── authService.js         89% ✅
  │   ├── userService.js         76% ✅
  │   └── scoreService.js        52% ❌ (Necesita más tests)
  ├── repositories/
  │   ├── userRepository.js      85% ✅
  │   └── scoreRepository.js     68% ✅ (Apenas suficiente)
  └── controllers/
      └── authController.js      72% ✅
```

### Mejorar Cobertura

```bash
# Ver qué líneas NO están cubiertas
npm run test:coverage -- --collectCoverageFrom="src/services/scoreService.js"

# Genera HTML interactivo
open coverage/index.html
```

---

## 🔄 CI/CD Integration

### GitHub Actions

```yaml
# .github/workflows/test.yml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    services:
      postgres:
        image: postgres:15-alpine
        env:
          POSTGRES_USER: test
          POSTGRES_PASSWORD: test
          POSTGRES_DB: retrogame_test
        options: >-
          --health-cmd pg_isready
          --health-interval 10s
          --health-timeout 5s
          --health-retries 5
        ports:
          - 5432:5432

    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20.19'
        cache: 'npm'
    
    - name: Install dependencies
      run: npm ci
    
    - name: Run tests
      run: npm test -- --coverage
      env:
        DATABASE_URL: postgresql://test:test@localhost:5432/retrogame_test
    
    - name: Upload coverage
      uses: codecov/codecov-action@v3
      with:
        files: ./coverage/lcov.info
```

---

## 🐛 Debugging

### Ejecutar Test Individual con Debug

```bash
# 1. Agregar debugger en el test
test('mi test', () => {
  debugger; // Se detiene aquí
  // ... test code
});

# 2. Ejecutar con inspect
node --inspect-brk node_modules/.bin/jest --runInBand mytest.test.js

# 3. Abrir Chrome DevTools
# chrome://inspect
```

### Ver Logs During Tests

```javascript
// En el test
beforeEach(() => {
  // Mostrar logs (normalmente están silenciados)
  jest.spyOn(console, 'log').mockImplementation();
});

test('debe imprimir algo', () => {
  console.log('This will be captured');
  authService.register('user', 'email', 'password');
  expect(console.log).toHaveBeenCalled();
});
```

### Inspeccionar Estados

```javascript
test('debug example', async () => {
  const response = await request(app)
    .post('/api/auth/login')
    .send({ email: 'test@test.com', password: 'wrong' });
  
  // Imprimir toda la respuesta
  console.log(JSON.stringify(response.body, null, 2));
  
  expect(response.status).toBe(401);
});
```

---

## 🚨 Troubleshooting

### Error: "Cannot find module"

```bash
# Verificar path de require es correcto
# En tests/unit/auth.test.js:
require('../../src/services/authService');
//        ↑↑ Contar carpetas hacia arriba

# O usar path absoluto
const authService = require(path.join(__dirname, '../../src/services/authService'));
```

### Error: "Timeout - Async callback was not invoked"

```javascript
// ❌ Problema: Promesa nunca se resuelve
test('async test', (done) => {
  someAsyncFunction();
  // Falta: done() o return
});

// ✅ Solución 1: Retornar Promise
test('async test', () => {
  return authService.register(...).then(user => {
    expect(user).toBeDefined();
  });
});

// ✅ Solución 2: async/await
test('async test', async () => {
  const user = await authService.register(...);
  expect(user).toBeDefined();
});
```

### Error: "Database connection refused"

```bash
# Verificar que PostgreSQL está corriendo
psql -U test retrogame_test

# Si no existe la DB:
createdb -U test retrogame_test

# Verificar .env.test
cat .env.test | grep DATABASE_URL

# Limpiar después de tests
npm run test:cleanup
```

### Tests Pasan Localmente pero Fallan en CI

```bash
# 1. Correr tests en modo strict
npm test -- --no-coverage --bail

# 2. Verificar variables de entorno en CI
# En .github/workflows/test.yml, ver env vars

# 3. Usar misma versión Node que CI
node --version # Debe ser v20.19.5
```

---

## 📚 Recursos

- [Jest Documentation](https://jestjs.io/docs/getting-started)
- [Supertest](https://github.com/visionmedia/supertest)
- [Testing Best Practices](https://github.com/goldbergyoni/javascript-testing-best-practices)

---

**Última actualización:** 1 de diciembre de 2025  
**Versión:** 2.0  
**Mantenedor:** RetroGameCloud Backend Team
