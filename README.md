# 🎧 MyPodcast

<p align="center">
  <img src="apps/desktop-sync/src/assets/icon.png" width="128" alt="MyPodcast Logo">
</p>

**MyPodcast** es un ecosistema completo y ultra-premium diseñado para simplificar la vida de los oyentes de podcasts. Te permite suscribirte a tus canales favoritos mediante RSS, gestionar una cola de reproducción bidireccional y **sincronizar automáticamente tus episodios a una unidad USB** de forma nativa e interactiva mediante una aplicación de escritorio de segundo plano, ideal para la reproducción directa en coches y dispositivos reproductores MP3.

---

## 🚀 Inicio Rápido (Desarrollo)

Este proyecto está gestionado mediante un **monorepositorio de Nx**.

### 1. Iniciar la base de datos (MongoDB)
```bash
docker-compose up -d
```

### 2. Arrancar la API del Backend (NestJS)
```bash
npx nx serve api
```

### 3. Arrancar la Interfaz Web (Angular 21 PWA)
```bash
npx nx serve web
```

### 4. Arrancar el Agente de Sincronización USB (Electron)
Si estás en Windows, puedes simplemente hacer doble clic en el archivo automatizado de la raíz:
👉 **[Arrancar-Agente.bat](file:///d:/Programacion/IA/mypodcast/Arrancar-Agente.bat)**

O correr manualmente por consola:
```bash
npx nx build desktop-sync
npx electron dist/apps/desktop-sync/main.js
```

---

## 📚 Documentación Completa

Para conocer en detalle la arquitectura del sistema, variables de entorno, diagramas conceptuales de sincronización USB y la estructura detallada de carpetas, por favor consulta la documentación técnica:

👉 **[DOCUMENTACION.md](file:///d:/Programacion/IA/mypodcast/DOCUMENTACION.md)**

---

## 🛠️ Tecnologías Empleadas

*   **Monorepo**: [Nx](https://nx.dev)
*   **Web Frontend**: Angular 21 (PWA con Service Workers & Tailwind/Custom HSL styling)
*   **Backend API**: NestJS, Mongoose, MongoDB
*   **Desktop App**: Electron (Native Tray, native notification UI, Powershell Disk Monitoring)
