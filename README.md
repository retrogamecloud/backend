# 🗄️ RetroGameCloud - Servicio Backend Unificado

Servicio backend unificado para RetroGameCloud. Consolida autenticación, usuarios, puntuaciones y rankings en una única base de datos PostgreSQL. Implementa JWT Bearer tokens, bcrypt, y auto-inicialización del esquema.

## 📋 Arquitectura del Sistema

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND                              │
│                    (Puerto 8081)                             │
│         HTML/CSS/JS + localStorage para tokens               │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ HTTP/REST
                   ▼
┌─────────────────────────────────────────────────────────────┐
│                    KONG API GATEWAY                          │
│                      (Puerto 8000)                           │
│         Enrutamiento + CORS + Rate Limiting                  │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ /api/auth/*
                   │ /api/scores/*
                   │ /api/rankings/*
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              DATABASE SERVICE (Puerto 3000)                  │
│                    Node.js + Express                         │
│                                                              │
│  ┌────────────────────────────────────────────────────┐    │
│  │  • Autenticación (JWT + bcrypt)                    │    │
│  │  • Gestión de Usuarios                             │    │
│  │  • Registro de Puntuaciones                        │    │
│  │  • Rankings y Estadísticas                         │    │
│  │  • Catálogo de Juegos                              │    │
│  └────────────────────────────────────────────────────┘    │
└──────────────────┬──────────────────────────────────────────┘
                   │
                   │ PostgreSQL Protocol
                   ▼
┌─────────────────────────────────────────────────────────────┐
│              POSTGRESQL DATABASE                             │
│                   (Puerto 5432)                              │
│                                                              │
│  Tablas:                                                     │
│  ├── users (autenticación y perfiles)                       │
│  ├── games (catálogo de juegos)                             │
│  ├── scores (puntuaciones actuales)                         │
│  ├── score_history (historial de cambios)                   │
│  ├── user_stats (estadísticas agregadas)                    │
│  └── refresh_tokens (gestión de sesiones)                   │
│                                                              │
│  🔧 Auto-inicialización de esquema al primer arranque       │
└─────────────────────────────────────────────────────────────┘
```

## 🚀 Despliegue Rápido

### Prerequisitos

- Docker Engine 20.10+
- Docker Compose 2.0+
- Git

### Paso 1: Clonar el repositorio

```bash
git clone https://github.com/retrogamecloud/database.git
git clone https://github.com/retrogamecloud/frontend.git
git clone https://github.com/retrogamecloud/infrastructure.git
git clone https://github.com/retrogamecloud/kong.git
cd database
```

### Paso 2: Configurar variables de entorno

```bash
cp .env.example .env
```

Edita el archivo `.env` y configura:
- `JWT_SECRET`: Cambia a una clave segura para producción
- `DATABASE_URL`: URL de conexión a PostgreSQL (por defecto ya configurada)

### Paso 3: Levantar el sistema

```bash
docker-compose up -d
```

Esto iniciará automáticamente:
- ✅ PostgreSQL (con inicialización automática del esquema)
- ✅ Database Service (Node.js/Express)
- ✅ Kong API Gateway
- ✅ Frontend (interfaz web)
- ✅ Games CDN (servidor de archivos estáticos)

### Paso 4: Verificar el despliegue

```bash
docker-compose ps
```

Deberías ver todos los servicios como `Up` y `healthy`:

```
NAME                       STATUS
gamehub-postgres-db        Up (healthy)
gamehub-database-service   Up
gamehub-kong               Up (healthy)
gamehub-frontend           Up
gamehub-games-cdn          Up
```

### Paso 5: Acceder al sistema

- **Aplicación Web**: http://localhost:8000
- **API Gateway**: http://localhost:8000/api
- **Frontend Directo**: http://localhost:8081
- **Database Service**: http://localhost:3000

## 📡 Endpoints de la API

### Autenticación

```bash
# Registro de usuario
POST http://localhost:8000/api/auth/register
Content-Type: application/json

{
  "username": "player1",
  "email": "player1@retrogamecloud.local",
  "password_hash": "securepassword"
}

# Login
POST http://localhost:8000/api/auth/login
Content-Type: application/json

{
  "username": "player1",
  "password_hash": "securepassword"
}

# Respuesta
{
  "accessToken": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": 1,
    "username": "player1"
  }
}
```

### Puntuaciones (requiere autenticación)

```bash
# Guardar puntuación
POST http://localhost:8000/api/scores
Authorization: Bearer <accessToken>
Content-Type: application/json

{
  "game": "DOOM",
  "score": 15000
}

# Obtener rankings de un juego
GET http://localhost:8000/api/rankings/games/doom
```

## 🗄️ Esquema de Base de Datos

### Tabla: users
```sql
id              SERIAL PRIMARY KEY
username        VARCHAR(50) UNIQUE NOT NULL
email           VARCHAR(255) UNIQUE
password_hash   VARCHAR(255) NOT NULL (bcrypt)
display_name    VARCHAR(100)
avatar_url      TEXT
created_at      TIMESTAMP
```

### Tabla: scores
```sql
id              SERIAL PRIMARY KEY
user_id         INTEGER REFERENCES users(id)
game_id         INTEGER REFERENCES games(id)
score           BIGINT NOT NULL
metadata        JSONB
created_at      TIMESTAMP
```

### Tabla: games
```sql
id              SERIAL PRIMARY KEY
slug            VARCHAR(100) UNIQUE NOT NULL
name            VARCHAR(100) NOT NULL
description     TEXT
year            INTEGER
developer       VARCHAR(100)
```

## 🔧 Mantenimiento

### Ver logs

```bash
# Logs del servicio de base de datos
docker logs gamehub-database-service

# Logs de PostgreSQL
docker logs gamehub-postgres-db

# Logs de Kong
docker logs gamehub-kong
```

### Limpiar y reconstruir

```bash
# Detener y eliminar volúmenes
docker-compose down -v

# Limpiar sistema Docker
docker system prune -af --volumes

# Reconstruir desde cero
docker-compose build --no-cache
docker-compose up -d
```

### Acceder a la base de datos

```bash
docker exec -it gamehub-postgres-db psql -U gamecloud -d retrogamecloud

# Comandos útiles:
# \dt           - Listar tablas
# \d users      - Describir tabla users
# SELECT COUNT(*) FROM users;
```

## 🔐 Seguridad

### Configuración de Producción

1. **Cambiar JWT_SECRET** en `.env`:
   ```bash
   JWT_SECRET=$(openssl rand -base64 32)
   ```

2. **Cambiar credenciales de PostgreSQL** en `docker-compose.yml`:
   ```yaml
   POSTGRES_PASSWORD: <password-fuerte>
   ```

3. **Configurar rate limiting** en Kong para prevenir ataques

4. **Usar HTTPS** con certificados SSL en producción

### Tokens JWT

- **Expiración**: 24 horas por defecto
- **Algoritmo**: HS256
- **Payload**: `{ userId, username }`
- **Header**: `Authorization: Bearer <token>`

## 📦 Estructura del Proyecto

```
database/
├── .github/
│   └── workflows/
│       └── docker-publish.yml    # CI/CD para publicar imagen
├── init-db/
│   └── 01-schema.sql            # Esquema auto-inicializable
├── index.js                     # Servicio principal (319 líneas)
├── package.json                 # Dependencias Node.js
├── Dockerfile                   # Imagen del servicio
├── docker-compose.yml           # Orquestación completa
├── .env.example                 # Variables de entorno
└── README.md                    # Esta documentación
```

## 🛠️ Tecnologías

- **Node.js 20 Alpine** - Runtime JavaScript
- **Express 4.18** - Framework web
- **PostgreSQL 15 Alpine** - Base de datos relacional
- **jsonwebtoken 9.0** - Autenticación JWT
- **bcrypt 5.1** - Hashing de contraseñas
- **Kong 3.3 Alpine** - API Gateway
- **Docker & Docker Compose** - Contenedorización

## 📚 Migración desde Microservicios

Este servicio unifica lo que antes eran 5 microservicios independientes:
- `auth-service` → JWT + bcrypt integrado
- `user-service` → Gestión de usuarios
- `score-service` → Registro de puntuaciones
- `ranking-service` → Cálculo de rankings
- `game-catalog-service` → Catálogo de juegos

**Ventajas de la unificación:**
- ✅ Menor complejidad operacional
- ✅ Transacciones atómicas entre entidades
- ✅ Reducción de latencia (sin llamadas entre servicios)
- ✅ Base de datos única con esquema coherente
- ✅ Despliegue simplificado


# Test workflow trigger
# Execute workflow NOW
# Run workflow
# Test pipeline
