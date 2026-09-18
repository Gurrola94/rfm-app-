# RFM BUHSAB

Aplicación web para registrar solicitudes de mantenimiento y dar seguimiento a su estado.

## Tecnologías

- React 19 + TypeScript
- Vite
- Tailwind CSS v4
- Firebase (Authentication y Firestore)

## Cómo ejecutarlo

```bash
npm install
npm run dev
```

Para generar la versión de producción:

```bash
npm run build
```

## Variables de entorno

Copia `.env.example` a `.env` y llena los valores de tu proyecto de Firebase.
Si no se configuran, la app funciona en modo demostración con datos de ejemplo.

## Estructura

- `src/App.tsx` – componente principal de la aplicación
- `src/firebase.ts` – configuración de Firebase
- `src/assets/` – imágenes (logo)
- `src/index.css` – estilos globales y tema de Tailwind
