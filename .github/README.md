# Workflows CI/CD

Este documento describe los workflows ubicados en `.github/workflows`, organizados en tres apartados: `cicd.yml`, `rollback-backend.yml` y `dependabot.yml`. Para más detalle operacional, revisa cada archivo en el repositorio.

## cicd.yml
### Descripción del workflow
Archivo: [.github/workflows/cicd.yml](https://github.com/retrogamecloud/backend/blob/main/.github/workflows/cicd.yml) 
  - Ejecuta linting (ESLint/Prettier), detecta si hay cambios que requieren pruebas, corre tests unitarios e integración, genera cobertura y ejecuta análisis SonarCloud (si está configurado).
  - Compila la imagen Docker del servicio (backend), escanea vulnerabilidades con Snyk (si está habilitado y el repo es público) y publica en Docker Hub y GHCR.
  - Actualiza los manifiestos de Kubernetes y ArgoCD en el repo `retrogamecloud/kubernetes` creando una rama y una Pull Request automática.
  - Notifica fallos en Slack si `ENABLE_SLACK_NOTIFICATIONS=true` y existe `SLACK_WEBHOOK_URL`.

### Casos de ejecución y posibilidades
  - **on: push** a `main` (ignora cambios solo en `*.md` y `.gitignore`). Si es un push con tag `v*.*.*` actúa como release usando el tag.
  - **on: pull_request** hacia `main` (mismas exclusiones de paths).
  - **on: workflow_dispatch** con input opcional `tag` para fijar la versión de imagen.
  - **Salto de tests por mensaje de commit:** si el último commit contiene `[no-test]` o `[skip-tests]`, el job de tests se omite.
  - **Detección de cambios:** si solo hay documentación/archivos triviales (md, txt, LICENSE, ignores, etc.), se omiten tests.
  - **Publicación:** solo se hace en eventos distintos de PR y si no se detectaron vulnerabilidades críticas/altas.
  - **Actualización de manifiestos:** crea/usa rama `auto/<servicio>-<tag>` en `retrogamecloud/kubernetes`, aplica `sed` para actualizar `02-backend.yaml` y `argocd/base/backend-deployment.yaml`, y abre una PR única.

### Variables relevantes
    - `ENABLE_SNYK`: habilita/inhabilita escaneo con Snyk.
    - `ENABLE_SLACK_NOTIFICATIONS`: habilita notificaciones en Slack.
    - `DOCKERHUB_ORG`, `REGISTRY_GHCR`, `REGISTRY_DOCKERHUB`.
    - `K8S_REPO`, `K8S_MANIFEST_FILE`, `ARGOCD_REPO`, `ARGOCD_MANIFEST_FILE`.

### Secrets requeridos
    - `GITHUB_TOKEN` (automático), `SONAR_TOKEN` (opcional), `SNYK_TOKEN` (opcional), `DOCKERHUB_USERNAME`, `DOCKERHUB_TOKEN`, `K8S_UPDATE_TOKEN`, `SLACK_WEBHOOK_URL`.

### Estructura de jobs (resumen)
   - `eslint-prettier`: ejecuta lint/format y resume resultados sin bloquear el pipeline.
   - `check-changes`: decide si correr tests basándose en archivos modificados y mensaje de commit.
   - `tests`: unit, integration, coverage, SonarCloud y Codecov.
   - `build`: build local de imagen, metadatos, verificación de imagen, Snyk (condicional) y resumen.
   - `push`: publica la imagen a Docker Hub y GHCR con tag y `latest`.
   - `create-update-branch`: prepara rama en repo K8S `auto/<servicio>-<tag>`.
   - `update-kubernetes-manifest` y `update-argocd-manifest`: actualizan imagen y comentario de versión.
   - `create-update-pr`: abre PR única en repo K8S si hay cambios.
   - `notify-slack`: envía alerta si alguno de los jobs clave falla.
 - **Ejemplos de ejecución manual (`workflow_dispatch`):**
   - Con tag de release específico:
     - Input `tag`: `v1.0.75` → construye y publica imagen `retrogamehub/backend:v1.0.75`, actualiza manifiestos y crea PR.
   - Sin tag (usa SHA corto del commit):
     - Deja `tag` vacío → usa `sha-<short_sha>` como versión e imagen.
 - **Comportamiento ante fallos:**
   - Snyk: si detecta vulnerabilidades `high/critical`, marca `has-vulnerabilities=true` y bloquea `push`.
   - SonarCloud: si falla y hay `SONAR_TOKEN`, el job de `tests` falla.
   - Slack: si está habilitado, envía resumen con jobs fallidos y link al run.

## rollback-backend.yml
### Descripción del workflow
Archivo: [.github/workflows/rollback-backend.yml](https://github.com/retrogamecloud/backend/blob/main/.github/workflows/rollback-backend.yml)
  - Pensado para revertir rápidamente el despliegue del backend a una versión de imagen previa conocida en Kubernetes/ArgoCD.
  - Normalmente actualiza el manifiesto del backend (`02-backend.yaml` y/o `argocd/base/backend-deployment.yaml`) apuntando a un tag anterior y crea la PR correspondiente en `retrogamecloud/kubernetes` para que ArgoCD sincronice.

### Casos de ejecución y posibilidades
  - **on: workflow_dispatch** con inputs como `image_tag` o `version` para seleccionar la imagen destino del rollback.
  - **Validaciones posibles:** comprobar que la imagen existe en Docker Hub/GHCR antes de proponer el cambio.
  - **Salida:** crear rama `auto/rollback-<servicio>-<tag>` en `retrogamecloud/kubernetes`, actualizar manifest(s), empujar cambios y abrir PR.
  - **Notificaciones:** podría enviar aviso a Slack si se integra con el mismo mecanismo del CI/CD.

### Secrets esperados
    - `K8S_UPDATE_TOKEN`, `GITHUB_TOKEN`, y opcionalmente `SLACK_WEBHOOK_URL`.

### Ejemplos de ejecución manual (`workflow_dispatch`)
   - Input `image_tag`: `v1.0.70` → cambia imagen del backend a `retrogamehub/backend:v1.0.70` en `02-backend.yaml` y `argocd/base/backend-deployment.yaml` y abre PR.
   - Input `image_tag`: `sha-abc1234` → rollback a imagen construida por SHA.

### Buenas prácticas de rollback
   - Verificar que la imagen existe en GHCR/Docker Hub (`docker pull`/`crane ls`).
   - Confirmar en Kubernetes/ArgoCD el estado después del merge y sync.
   - Registrar motivo y ticket en el cuerpo de la PR para trazabilidad.

## dependabot.yml
### Descripción del workflow
Archivo: [.github/dependabot.yml](https://github.com/retrogamecloud/backend/blob/main/.github/dependabot.yml)
  - Archivo de configuración de Dependabot para escanear y proponer actualizaciones automáticas de dependencias (npm, Docker, GitHub Actions, etc.).
  - Crea Pull Requests con bumps de versión, incluye asignaciones/labels y programación de ejecución.

### Casos de ejecución y posibilidades
  - **Programación:** Dependabot corre según el `schedule` configurado (diario/semanal) por ecosistema.
  - **Targets:** puede configurarse para `package.json`/`package-lock.json`, `Dockerfile`, `.github/workflows/*`.
  - **Políticas:** se puede limitar el número de PRs abiertas, ignorar paquetes, agrupar actualizaciones y requerir revisiones.
  - **Integración:** las PRs de Dependabot dispararán el `cicd.yml` (en PRs a `main`), validando lint, tests y build.

### Ejemplos de configuración frecuente
   - `package-ecosystem: npm` sobre `/backend` con `schedule.interval: weekly`, `versioning-strategy: increase`, `open-pull-requests-limit: 10`.
   - `package-ecosystem: docker` sobre `/backend/Dockerfile` con `schedule.interval: daily`.
   - `package-ecosystem: github-actions` sobre `/.github/workflows` con `schedule.interval: weekly`.

### Recomendaciones
   - Activar auto-merge solo para parches menores tras pasar CI.
   - Etiquetar PRs (`dependencies`, `security`) y asignar revisores.
   - Usar agrupaciones para reducir ruido en repos con muchas libs.

---

### Notas operativas
- Para lanzamientos manuales con versión controlada, usa `workflow_dispatch` en `cicd.yml` con `tag` (ej: `v1.2.3`).
- Para revertir rápidamente, invoca el workflow de rollback con el `image_tag` previamente publicado.
- Asegúrate de tener configurados los secrets requeridos en el repositorio y acceso al repo `retrogamecloud/kubernetes`.
 - Cuando el repositorio es privado o `ENABLE_SNYK=false`, el paso de Snyk se omite y no bloquea la publicación.
 - SonarCloud requiere `SONAR_TOKEN`; si no está, el análisis se salta y se agrega aviso en el resumen.
 - Las PRs creadas en `retrogamecloud/kubernetes` quedan bajo la rama `auto/<servicio>-<tag>` y contienen el detalle de versión, tag e ID de commit de origen.