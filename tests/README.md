# Tests - Backend Service

## Estructura de Tests

```
tests/
├── unit/           # Tests unitarios (funciones individuales)
│   └── auth.test.js
└── integration/    # Tests de integración (API endpoints)
    └── api.test.js
```

## Ejecutar Tests

### Todos los tests
```bash
npm test
```

### Solo tests unitarios
```bash
npm run test:unit
```

### Solo tests de integración
```bash
npm run test:integration
```

### Con reporte de cobertura
```bash
npm run test:coverage
```

### Modo watch (desarrollo)
```bash
npm run test:watch
```

## Cobertura de Tests

Los tests cubren:

### Tests Unitarios (`tests/unit/auth.test.js`)
- ✅ Hash de contraseñas con bcrypt
- ✅ Generación y verificación de JWT
- ✅ Validación de username
- ✅ Validación de email

### Tests de Integración (`tests/integration/api.test.js`)
- ✅ Health check endpoint
- ✅ Registro de usuarios (POST /api/auth/register)
- ✅ Login de usuarios (POST /api/auth/login)
- ✅ Validación de errores 400/401
- ✅ Manejo de datos faltantes

## CI/CD Integration

Los tests se ejecutan automáticamente en cada push a `main`:

1. **Test Job**: Ejecuta todos los tests antes de build
2. **Build Job**: Solo se ejecuta si los tests pasan
3. **Coverage Report**: Se sube a Codecov automáticamente

## Próximos Tests a Agregar

- [ ] Tests de usuarios (CRUD completo)
- [ ] Tests de juegos (CRUD)
- [ ] Tests de scores (crear, obtener rankings)
- [ ] Tests de achievement (desbloquear, verificar)
- [ ] Tests de base de datos (queries específicas)
- [ ] Tests E2E con base de datos real

## Configuración

### jest.config.json
- Ejecuta archivos `*.test.js` en carpeta `tests/`
- Coverage threshold: 50% (branches, functions, lines, statements)
- Genera reportes en formato: text, lcov, html

### Variables de Entorno para Tests
```bash
NODE_ENV=test
DATABASE_URL=postgresql://test:test@localhost:5432/testdb
JWT_SECRET=test_secret_key
```

## Buenas Prácticas

1. **Nombrar tests descriptivamente**: Usa `describe` y `test` con mensajes claros
2. **Arrange-Act-Assert**: Organiza cada test en 3 secciones
3. **Independencia**: Cada test debe poder ejecutarse solo
4. **Mocks**: Usa mocks para dependencias externas (DB, APIs)
5. **Coverage**: Mantener al menos 70% de cobertura en producción
