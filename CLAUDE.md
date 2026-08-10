# 🤖 Guía para Agentes y Desarrolladores AI (CLAUDE.md / AGENT.md)

Este archivo proporciona contexto técnico inmediato y reglas operativas para agentes de IA y desarrolladores que trabajen en el proyecto **MyPodcast**.

---

## 🚀 Comandos Principales (Cheat Sheet)

### Desarrollo Local (Nx)
- **API (NestJS Backend)**: `npx nx serve api`
- **Web (Angular 21 PWA)**: `npx nx serve web`
- **Desktop Agent (Electron)**: 
  ```bash
  npx nx build desktop-sync
  npx electron dist/apps/desktop-sync/main.js
  ```
  *(O ejecutar el script `Arrancar-Agente.bat` en Windows)*

### Compilación y Builds
- **Compilar API**: `npx nx build api`
- **Compilar Web**: `npx nx build web`
- **Compilar Desktop Sync**: `npx nx build desktop-sync`
- **Empaquetar Installer de Escritorio**: 
  ```bash
  export APP_VERSION=1.13.27 # opcional
  npx nx run desktop-sync:package
  ```

### Pruebas de Regresión y Validación
- **Ejecutar Pruebas de la API**: `npx nx test api`
- **Ejecutar Pruebas de la Web**: `npx nx test web`
- **Ejecutar Todas las Pruebas del Monorepo**: `npx nx run-many -t test`

---

## 🏗️ Arquitectura del Sistema

El proyecto es un **Monorepositorio Nx**:

1. **`apps/api` (NestJS + Mongoose)**:
   - Rutas principales: `/api/auth`, `/api/library`, `/api/podcasts`, `/api/episodes`, `/api/proxy`.
   - Base de datos: MongoDB.
   - Schemas clave:
     - `User`: Credenciales y rol.
     - `SyncConfig`: Configuración del dispositivo USB y la cola activa (`queue: Types.ObjectId[]`).
     - `Episode` & `Podcast`: Metadatos de suscripciones e Ivoox/RSS.

2. **`apps/web` (Angular 21 PWA)**:
   - Estilos: Vanilla CSS + HSL design tokens (sin librerías utilitarias masivas como Tailwind).
   - Componente principal de navegación: `NavbarComponent` incluye indicador de versión en el logo/subtexto.

3. **`apps/desktop-sync` (Electron)**:
   - Proceso principal (`main.ts`): Gestión de configuración local (`config.json` con escrituras atómicas vía archivo `.tmp`), IPC handlers y autostart.
   - Sincronizador (`syncer.ts`): Descarga episodios en paralelo y mantiene el orden indexado (`[index]. [title].mp3`) en la unidad USB.
   - Manifiesto e instalador: Gestionado mediante `electron-builder` con la opción `-p always` para publicar `latest.yml` en GitHub Releases.

---

## ⚠️ Reglas Importantes de Código y Seguridad

1. **Escrituras de Configuración Local (`config.json`)**:
   - Toda modificación en `config.json` en Electron **DEBE** realizarse mediante escritura atómica (escribir a `.tmp` y renombrar con `fs.renameSync`).
   - Evitar escrituras redundantes si los valores del servidor no han cambiado.

2. **Vinculación de Dispositivos (Desktop Pairing)**:
   - El endpoint `pair/validate` en la API debe usar `authService.getUserById(userId)` para obtener la información del usuario **sin rotar o invalidar el refresh token de la sesión web**.

3. **Referencias a Base de Datos (Mongoose)**:
   - `SyncConfig.queue` almacena referencias a episodios mediante `Types.ObjectId`. Asegurar siempre la conversión/casting desde string al interactuar con MongoDB.

4. **Creación Obligatoria de Pruebas (TDD / Test Coverage)**:
   - **REGLA OBLIGATORIA:** Siempre que se añada una nueva funcionalidad, endpoint o servicio, se **DEBE** crear su archivo de pruebas unitarias correspondiente (`*.spec.ts`) en el proyecto respectivo (`apps/api`, `apps/web` o `apps/desktop-sync`).
   - Las pruebas deben ejecutarse y validarse con `npx nx run-many -t test` antes de realizar un commit o abrir un PR.

5. **Compatibilidad de Despliegue**:
   - Al publicar una versión en GitHub con tags `v*` (ej. `v1.13.27-stable`), se debe actualizar también la referencia de versión del `docker-compose.portainer.yml`.
