# 🗄️ RetroGameCloud - Backend Service

[![CI/CD Pipeline](https://github.com/retrogamecloud/backend/actions/workflows/docker-publish-and-update-k8s.yml/badge.svg)](https://github.com/retrogamecloud/backend/actions/workflows/docker-publish-and-update-k8s.yml)
[![Docker Hub](https://img.shields.io/docker/v/retrogamehub/backend?label=Docker%20Hub&logo=docker)](https://hub.docker.com/r/retrogamehub/backend)
[![GHCR](https://img.shields.io/badge/GHCR-latest-blue?logo=github)](https://github.com/retrogamecloud/backend/pkgs/container/backend)
[![codecov](https://codecov.io/gh/retrogamecloud/backend/branch/main/graph/badge.svg)](https://codecov.io/gh/retrogamecloud/backend)
[![SonarCloud Quality Gate](https://sonarcloud.io/api/project_badges/measure?project=retrogamecloud_backend&metric=alert_status)](https://sonarcloud.io/dashboard?id=retrogamecloud_backend)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)

API REST centralizada para RetroGameCloud. Servicio monolítico que consolida autenticación, usuarios, puntuaciones y rankings en una única base de datos PostgreSQL. Implementa JWT Bearer tokens, bcrypt para seguridad, y auto-inicialización del esquema.

**Documentación General:** 📖 [Ir al README Principal](./../README.md)  
**Documentación Profesional:** 📚 [Acceder a docs.retrogamehub.games](https://docs.retrogamehub.games)

---

## 📋 Tabla de Contenidos

- [Descripción del Repositorio](#descripción-del-repositorio)
- [Funcionalidad Principal](#funcionalidad-principal)
- [Stack Tecnológico](#stack-tecnológico)
- [Instalación Local](#instalación-local)
- [Configuración](#configuración)
- [Despliegue con Docker](#despliegue-con-docker)
- [NPM Scripts](#npm-scripts)
- [Endpoints de la API](#endpoints-de-la-api)
- [Estructura del Proyecto](#estructura-del-proyecto)
- [Testing](#testing)
- [Troubleshooting](#troubleshooting)
- [Rollback & Limpieza](#rollback--limpieza)

---

## 📖 Descripción del Repositorio

Este repositorio contiene el **servicio backend unificado** de RetroGameCloud. Es la API central que:

- ✅ Autentica usuarios con JWT + bcrypt
- ✅ Gestiona perfiles y datos de usuarios
- ✅ Registra y valida puntuaciones
- ✅ Calcula rankings y estadísticas
- ✅ Proporciona catálogo de juegos disponibles
- ✅ Maneja refresh tokens para sesiones seguras

**Antes de esta unificación**, existían 5 microservicios independientes (auth-service, user-service, score-service, ranking-service, game-catalog-service). Este servicio consolida todo en una base de código monolítica, más fácil de operar y mantener.

---

## 🎯 Funcionalidad Principal

### 1. Autenticación de Usuarios

```
POST /api/auth/register
POST /api/auth/login
POST /api/auth/logout
POST /api/auth/refresh
GET /api/auth/verify
```

**Características:**
- Registro sin confirmación de email (opcional)
- Login con username/password
- Tokens JWT con 24h expiración
- Refresh tokens para renovación automática
- Logout que invalida sesiones

### 2. Gestión de Usuarios

```
GET /api/users/{id}
PUT /api/users/{id}
GET /api/users/{id}/profile
GET /api/users/{id}/stats
```

**Características:**
- Perfiles personalizables (display_name, avatar_url, bio)
- Estadísticas automáticas (juegos jugados, score total, etc.)
- Historial de cambios auditable
- Búsqueda y filtros

### 3. Sistema de Puntuaciones

```
POST /api/scores
GET /api/scores?user_id=1&game_id=1
GET /api/scores/leaderboard
```

**Características:**
- Validación de puntuaciones (no permitir valores imposibles)
- Historial de cambios (score_history table)
- Metadatos personalizables (nivel completado, tiempo, etc.)
- Deduplicación automática

### 4. Rankings y Estadísticas

```
GET /api/rankings/global
GET /api/rankings/games/{game_id}
GET /api/rankings/users/{user_id}
```

**Características:**
- Rankings globales y por juego
- Top 100 automático
- Posición actual del usuario
- Tendencias (mejorando/bajando)

### 5. Catálogo de Juegos

```
GET /api/games
GET /api/games/{game_id}
POST /api/games (admin)
```

**Características:**
- Listado de juegos con metadatos
- Thumbnails y descripciones
- Año, desarrollador, tags
- Control de juegos (admin only)

---

## 📦 Stack Tecnológico

### Infraestructura

| Componente | Versión | Descripción |
|---|---|---|
| **Runtime** | Node.js 20.19.5 (LTS) | Servidor JavaScript |
| **Framework** | Express.js 4.18.2 | API REST minimalista |
| **Base de Datos** | PostgreSQL 15-alpine | BD relacional con auto-init |
| **Autenticación** | jsonwebtoken 9.0.2 | Firmado de JWTs (HS256) |
| **Hashing** | bcrypt 5.1.1 | Encriptación de contraseñas |
| **CORS** | cors 2.8.5 | Cross-Origin Resource Sharing |
| **Connection Pool** | pg 8.11.1 | Pool de conexiones PostgreSQL |

### Development & Quality

| Herramienta | Versión | Propósito |
|---|---|---|
| **Testing** | Jest 29.7.0 | Test runner principal |
| **HTTP Testing** | Supertest 6.3.3 | Tests de endpoints |
| **Linting** | ESLint 9.39.1 | Análisis estático de código |
| **Formatting** | Prettier 3.6.2 | Formato automático |
| **Quality** | SonarQube | Calidad de código (badges) |
| **Coverage** | Jest Coverage | Cobertura mínima 70% |

### Integración Externa

- **GitHub Actions:** CI/CD para tests y builds
- **SonarCloud:** Quality gates automatizados
- **Codecov:** Reporte de cobertura
- **GHCR:** Container Registry (GitHub)
- **Docker Hub:** Publicación de imágenes (opcional)

---

## 🚀 Instalación Local

### Requisitos Previos

- **Node.js 20+** ([Descargar](https://nodejs.org/))
- **PostgreSQL 15+** ([Descargar](https://www.postgresql.org/download/)) O usar Docker
- **Git** ([Descargar](https://git-scm.com/))

### Paso 1: Clonar el Repositorio

```bash
git clone https://github.com/retrogamecloud/backend.git
cd backend
```

### Paso 2: Instalar Dependencias

```bash
npm install

# Instalar dependencias de dev si prefieres
npm install --save-dev
```

### Paso 3: Configurar Variables de Entorno

```bash
# Copiar template
cp .env.example .env.local

# Editar con valores locales
nano .env.local  # o usar tu editor favorito
```

**Variables requeridas:**

```bash
# .env.local
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://gamecloud:gamecloud@localhost:5432/retrogamecloud
JWT_SECRET=$(openssl rand -base64 32)
```

### Paso 4: Crear Base de Datos

```bash
# Opción A: Si PostgreSQL está instalado localmente
createdb -U postgres retrogamecloud

# Opción B: Usar Docker
docker run -d \
  --name postgres-dev \
  -e POSTGRES_DB=retrogamecloud \
  -e POSTGRES_USER=gamecloud \
  -e POSTGRES_PASSWORD=gamecloud \
  -p 5432:5432 \
  postgres:15-alpine
```

### Paso 5: Ejecutar Migraciones (Auto)

```bash
# El servicio las ejecuta automáticamente al arrancar
# Pero puedes verificar manualmente:
psql -U gamecloud -d retrogamecloud -f init-db/01-schema.sql
```

### Paso 6: Iniciar el Servicio

```bash
# Modo desarrollo (con nodemon)
npm run dev  # si existe

# O modo normal
npm start

# Deberías ver:
# ✅ Server listening on http://localhost:3000
# ✅ Database connected
```

### Verificar Instalación

```bash
# Testear API
curl http://localhost:3000/health

# Esperado:
# {"status":"ok","timestamp":"2025-12-01T..."}
```

---

## ⚙️ Configuración

### Variables de Entorno

```bash
# Desarrollo
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://gamecloud:gamecloud@localhost:5432/retrogamecloud
JWT_SECRET=tu-secret-key-aqui (generar con: openssl rand -base64 32)

# Producción
NODE_ENV=production
PORT=3000
DATABASE_URL=postgresql://user:pass@aws-rds-endpoint:5432/db
JWT_SECRET=<usar AWS Secrets Manager o similar>
```

Ver **[`SECRETS-STRATEGY.md`](../.github/docs/SECRETS-STRATEGY.md)** para manejo seguro de secretos.

### Ubicación de Configuración

- **Runtime:** `process.env.*`
- **Base de datos:** `.env` → `process.env.DATABASE_URL`
- **JWT:** `.env` → `process.env.JWT_SECRET`
- **Puerto:** `.env` → `process.env.PORT`

---

## 🐳 Despliegue con Docker

### Opción A: Docker Compose (Recomendado para desarrollo)

```bash
# Desde root del proyecto
docker-compose up -d

# Verificar
docker-compose ps

# Logs
docker-compose logs -f backend

# Detener
docker-compose down
```

**Incluye automáticamente:**
- PostgreSQL (con auto-init)
- Backend
- Kong Gateway
- Frontend
- Games CDN

### Opción B: Docker Standalone

```bash
# Construir imagen
docker build -t retrogamehub/backend:latest .

# Ejecutar con BD externa
docker run -d \
  --name backend \
  -p 3000:3000 \
  -e DATABASE_URL="postgresql://user:pass@db-host:5432/db" \
  -e JWT_SECRET="tu-secret" \
  retrogamehub/backend:latest

# Ver logs
docker logs -f backend

# Detener
docker stop backend
docker rm backend
```

### Verificar Despliegue

```bash
# Health check
curl http://localhost:3000/health

# Respuesta esperada:
# {"status":"ok"}
```

---

## 📝 NPM Scripts

### Ejecución

| Script | Comando | Descripción |
|--------|---------|-------------|
| `start` | `node index.js` | Inicia el servicio normalmente |
| `start:refactored` | `node index.wrapper.js` | Inicia versión refactorizada (si existe) |
| `dev` | `nodemon index.js` | Modo desarrollo (con auto-reload) |

### Testing

| Script | Comando | Descripción |
|--------|---------|-------------|
| `test` | `jest` | Ejecuta todos los tests |
| `test:unit` | `jest tests/unit` | Solo tests unitarios |
| `test:integration` | `jest tests/integration` | Solo tests de integración |
| `test:coverage` | `jest --coverage` | Con reporte de cobertura |
| `test:watch` | `jest --watch` | Modo watch (desarrollo) |

### Calidad de Código

| Script | Comando | Descripción |
|--------|---------|-------------|
| `lint` | `eslint .` | Analizar código |
| `lint:fix` | `eslint . --fix` | Arreglar automáticamente |
| `format` | `prettier --write .` | Formatear código |
| `format:check` | `prettier --check .` | Verificar formato |

### Ejemplo de Uso

```bash
# Ejecutar tests antes de commit
npm test

# Arreglar problemas de lint
npm run lint:fix

# Ver cobertura
npm run test:coverage

# Modo desarrollo (watch)
npm run test:watch
```

---

## 📡 Endpoints de la API

### Autenticación (/api/auth/*)

```bash
# Registro
POST /api/auth/register
Content-Type: application/json

{
  "username": "player1",
  "password": "securepass123",
  "email": "player@example.com"
}

Respuesta:
{
  "user": {
    "id": 1,
    "username": "player1",
    "email": "player@example.com"
  }
}

---

# Login
POST /api/auth/login
Content-Type: application/json

{
  "username": "player1",
  "password": "securepass123"
}

Respuesta:
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refreshToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "player1"
  }
}

---

# Logout
POST /api/auth/logout
Authorization: Bearer <accessToken>

Respuesta: 204 No Content

---

# Refresh Token
POST /api/auth/refresh
Content-Type: application/json

{
  "refreshToken": "<token>"
}

Respuesta:
{
  "accessToken": "new-token...",
  "refreshToken": "new-refresh-token..."
}

---

# Verificar Token
GET /api/auth/verify
Authorization: Bearer <accessToken>

Respuesta: { "valid": true, "user": {...} }
```

### Usuarios (/api/users/*)

```bash
# Obtener perfil
GET /api/users/:userId
Authorization: Bearer <accessToken>

# Respuesta
{
  "id": 1,
  "username": "player1",
  "display_name": "Player One",
  "avatar_url": "https://...",
  "bio": "Gamer retro",
  "created_at": "2025-12-01T..."
}

---

# Actualizar perfil
PUT /api/users/:userId
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "display_name": "Updated Name",
  "avatar_url": "https://new-avatar.jpg",
  "bio": "New bio"
}

---

# Obtener estadísticas
GET /api/users/:userId/stats
Authorization: Bearer <accessToken>

# Respuesta
{
  "total_games_played": 42,
  "total_score": 1500000,
  "highest_score": 250000,
  "favorite_game": "DOOM",
  "last_played_at": "2025-12-01T..."
}
```

### Puntuaciones (/api/scores/*)

```bash
# Guardar puntuación
POST /api/scores
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "game_id": 1,
  "score": 25000,
  "metadata": {
    "level": 5,
    "time_played": 300
  }
}

Respuesta:
{
  "id": 123,
  "user_id": 1,
  "game_id": 1,
  "score": 25000,
  "created_at": "2025-12-01T..."
}

---

# Obtener scores del usuario
GET /api/scores?user_id=1&game_id=1
Authorization: Bearer <accessToken>

# Respuesta
[
  {
    "id": 123,
    "user_id": 1,
    "game_id": 1,
    "score": 25000,
    "created_at": "2025-12-01T..."
  }
]
```

### Rankings (/api/rankings/*)

```bash
# Rankings globales
GET /api/rankings/global

Respuesta:
{
  "rankings": [
    {
      "rank": 1,
      "user_id": 5,
      "username": "TopPlayer",
      "score": 5000000
    },
    {
      "rank": 2,
      "user_id": 3,
      "username": "SecondPlace",
      "score": 4500000
    }
  ]
}

---

# Rankings por juego
GET /api/rankings/games/:gameId

# Respuesta (igual formato, solo para ese juego)

---

# Posición actual del usuario
GET /api/rankings/users/:userId/position

Respuesta:
{
  "rank": 42,
  "total_players": 1000,
  "user_score": 500000,
  "next_rank_score": 510000
}
```

### Juegos (/api/games/*)

```bash
# Listar todos los juegos
GET /api/games

Respuesta:
[
  {
    "id": 1,
    "slug": "doom",
    "name": "DOOM",
    "description": "Classic first-person shooter",
    "year": 1993,
    "developer": "id Software",
    "tags": ["shooter", "classic"],
    "thumbnail": "https://..."
  }
]

---

# Obtener juego específico
GET /api/games/:gameId

---

# Crear juego (admin only)
POST /api/games
Authorization: Bearer <adminToken>
Content-Type: application/json

{
  "slug": "newgame",
  "name": "New Game",
  "description": "...",
  "year": 2000,
  "developer": "...",
  "tags": ["action"]
}
```

---

## 📂 Estructura del Proyecto

```
backend/
├── index.js                      # Punto de entrada (305 líneas)
├── index.refactored.js          # Versión refactorizada
├── index.wrapper.js             # Wrapper para testing
├── package.json                 # Dependencias
├── package-lock.json            # Lockfile
├── Dockerfile                   # Imagen Docker
├── docker-compose.yml           # Orquestación local
├── jest.config.json             # Config de Jest
├── eslint.config.js             # Config de ESLint
├── sonar-project.properties     # Config de SonarQube
├── .env.example                 # Variables de ejemplo
├── README.md                    # Este archivo
│
├── init-db/
│   └── 01-schema.sql           # Esquema SQL auto-ejecutable
│
├── src/
│   ├── config/
│   │   └── database.js          # Configuración de BD
│   ├── controllers/
│   │   ├── authController.js    # Lógica de autenticación
│   │   ├── scoreController.js   # Lógica de puntuaciones
│   │   └── rankingController.js # Lógica de rankings
│   ├── middleware/
│   │   └── authMiddleware.js    # Verificación de JWT
│   ├── repositories/
│   │   ├── userRepository.js    # DB queries para users
│   │   └── scoreRepository.js   # DB queries para scores
│   ├── services/
│   │   ├── authService.js       # Lógica de negocio
│   │   └── rankingService.js    # Cálculos de rankings
│   └── routes/
│       └── routes.js            # Definición de rutas
│
├── tests/
│   ├── README.md                # Guía de testing
│   ├── unit/
│   │   ├── auth.test.js
│   │   ├── authService.test.js
│   │   ├── database.test.js
│   │   └── ...
│   └── integration/
│       ├── api.test.js
│       ├── rankings.test.js
│       ├── scores.test.js
│       └── ...
│
├── coverage/
│   ├── index.html               # Reporte HTML (generado)
│   └── lcov.info                # Datos de cobertura
│
└── .github/
    └── workflows/
        └── ci.yml               # Pipeline de CI/CD
```

---

## 🧪 Testing

### Cobertura de Tests

La cobertura mínima es **70%**. Se valida en CI/CD:

```bash
# Ver reporte de cobertura
npm run test:coverage

# Generates:
# coverage/index.html (abrir en navegador)
# coverage/lcov.info (para CodeCov)
```

**Requisitos:**
- Líneas (Statements): ≥ 70%
- Funciones (Functions): ≥ 70%
- Branches: ≥ 70%
- Sentencias (Lines): ≥ 70%

### Ejecutar Tests

```bash
# Todos
npm test

# Solo unitarios
npm run test:unit

# Solo integración
npm run test:integration

# Con cobertura
npm run test:coverage

# Modo watch (desarrollo)
npm run test:watch
```

### Archivos de Test

```
tests/
├── unit/
│   ├── auth.test.js              # Test de autenticación
│   ├── authMiddleware.test.js    # Middleware de JWT
│   ├── authService.test.js       # Servicio de auth
│   ├── database.test.js          # Conexión BD
│   ├── repository.test.js        # Queries
│   ├── service.test.js           # Lógica de negocio
│   ├── userRepository.test.js    # CRUD de usuarios
│   └── utils.test.js             # Funciones auxiliares
└── integration/
    ├── api.test.js               # Tests de endpoints
    ├── app.test.js               # Startup de app
    ├── database.test.js          # Integración con BD
    ├── rankings.test.js          # Endpoints de rankings
    └── scores.test.js            # Endpoints de scores
```

---

## ⚠️ Troubleshooting

### Error: Cannot find module 'express'

```bash
# Reinstalar dependencias
rm -rf node_modules package-lock.json
npm install
```

### Error: ECONNREFUSED (PostgreSQL)

```bash
# PostgreSQL no está corriendo
# Opción 1: Iniciar Docker
docker-compose up -d postgres-db

# Opción 2: Verificar conectividad
psql -h localhost -U gamecloud -d retrogamecloud

# Opción 3: Revisar DATABASE_URL
echo $DATABASE_URL
```

### Error: JWT_SECRET not configured

```bash
# Generar valor
openssl rand -base64 32

# Agregar a .env.local
echo "JWT_SECRET=$(openssl rand -base64 32)" >> .env.local
```

### Error: Port 3000 already in use

```bash
# Encontrar proceso
lsof -i :3000  # macOS/Linux
netstat -ano | findstr :3000  # Windows

# Matar proceso
kill -9 <PID>  # macOS/Linux
taskkill /PID <PID> /F  # Windows

# O usar puerto diferente
PORT=3001 npm start
```

### Error: Tests fail

```bash
# Ver logs detallados
npm test -- --verbose

# Ejecutar test específico
npm test -- auth.test.js

# En modo debug
node --inspect-brk ./node_modules/.bin/jest
```

---

## 🔄 Rollback & Limpieza

### Rollback de Cambios

```bash
# Ver commit history
git log --oneline -10

# Volver a commit anterior
git reset --hard <commit-hash>

# O crear revert commit
git revert <commit-hash>
git push origin main
```

### Limpiar Base de Datos

```bash
# Borrar volumen de Docker
docker-compose down -v

# Reconstruir desde cero
docker-compose build --no-cache
docker-compose up -d

# Verificar
docker-compose ps
```

### Limpiar Node Modules

```bash
# Borrar cache de npm
npm cache clean --force

# Reinstalar
rm -rf node_modules package-lock.json
npm install
```

### Resetear a Estado Inicial

```bash
# Limpiar todo
docker-compose down -v
rm -rf node_modules
rm -rf coverage

# Reinstalar
npm install
npm run lint:fix

# Levantar
docker-compose up -d
npm start
```

---

## 🔐 Seguridad y Secretos

### Manejo de Secretos

**⚠️ CRÍTICO:** Nunca commitear secretos a Git.

Reglas:
- ✅ Usar `.env.local` para desarrollo (ignorado en Git)
- ✅ Usar AWS Secrets Manager para producción
- ✅ Validar secretos en startup
- ✅ Rotarlos cada 90 días

**Ver:** [SECRETS-STRATEGY.md](../.github/docs/SECRETS-STRATEGY.md)

### JWT Security

```javascript
// Validación en middleware
const verifyJWT = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    // Token inválido, expirado o corrompido
    throw new Error('Invalid token');
  }
};

// Expiration: 24 horas
const expiresIn = '24h';

// Algoritmo: HS256 (HMAC)
```

### Bcrypt Configuration

```javascript
// Hash rounds: 10 (balance seguridad/performance)
const saltRounds = 10;
const hashedPassword = await bcrypt.hash(password, saltRounds);

// Verificación
const isValid = await bcrypt.compare(inputPassword, hashedPassword);
```

### CORS Configuration

```javascript
app.use(cors({
  origin: process.env.CORS_ORIGIN || 'http://localhost:8081',
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  credentials: true
}));
```

---

## 📊 Monitoreo

### Health Check

```bash
# Verificar servicio está corriendo
curl http://localhost:3000/health

# Respuesta:
# {"status":"ok","timestamp":"2025-12-01T...","uptime":1234}
```

### Logs

```bash
# Ver logs en tiempo real
npm start  # Salen por stdout

# Con Docker
docker logs -f gamehub-database-service

# Con Docker Compose
docker-compose logs -f backend
```

### Métricas (con Prometheus opcional)

Si está configurado:
```bash
curl http://localhost:3000/metrics
```

---

## 🏗️ Migración desde Microservicios

Este servicio **consolida** lo que antes eran 5 microservicios:

| Antes | Ahora |
|-------|-------|
| `auth-service` | `/src/services/authService.js` |
| `user-service` | `/src/services/userService.js` |
| `score-service` | `/src/services/scoreService.js` |
| `ranking-service` | `/src/services/rankingService.js` |
| `game-catalog-service` | `/src/services/gameService.js` |

**Ventajas:**
- ✅ Menor complejidad operacional
- ✅ Transacciones ACID entre servicios
- ✅ Reducción de latencia (sin llamadas HTTP)
- ✅ Base de datos única y coherente
- ✅ Deployment simplificado

---

## 📚 Enlaces Útiles

- **Documentación General:** [/README.md](/../README.md)
- **Documentación Profesional:** [docs.retrogamehub.games](https://docs.retrogamehub.games)
- **Testing Guide:** [tests/README.md](./tests/README.md)
- **Secretos & Security:** [SECRETS-STRATEGY.md](../.github/docs/SECRETS-STRATEGY.md)
- **Express.js Docs:** https://expressjs.com/
- **PostgreSQL Docs:** https://www.postgresql.org/docs/
- **JWT.io:** https://jwt.io/
- **Bcrypt:** https://www.npmjs.com/package/bcrypt

---

**Última actualización:** 1 de diciembre de 2025  
**Versión:** 1.0.0  
**Mantenedor:** RetroGameCloud Team
