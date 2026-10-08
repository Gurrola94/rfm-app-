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

```
src/
├── App.tsx                 Estado general y navegación entre pantallas
├── main.tsx                Punto de entrada
├── index.css               Estilos globales y tema de Tailwind
├── assets/                 Imágenes (logo)
├── lib/
│   └── firebase.ts         Configuración de Firebase
├── types/                  Tipos de TypeScript (reportes, material, usuarios, pantallas)
├── constants/              Áreas, categorías, prioridades y colores
├── data/
│   └── demo.ts             Datos de ejemplo del modo demostración
├── hooks/
│   ├── useFirebaseSync.ts  Escucha en tiempo real a Firebase
│   └── useNative.ts        Barra de estado y botón "atrás" de Android
├── utils/                  Formato de fechas y compresión de fotos
├── components/
│   └── layout/             Shell, NavHeader y TabBar (estructura común)
└── features/               Una carpeta por módulo de la app
    ├── auth/               Splash, inicio de sesión y perfil
    ├── reportes/           Crear, ver, dar seguimiento e historial de reportes
    │   └── components/     AvancesList
    ├── material/           Solicitudes de material y apoyo externo (admin)
    ├── usuarios/           Directorio y alta de usuarios (admin)
    │   └── components/     UserList
    └── admin/              Panel principal del administrador
```

## Aplicación móvil (Android y iPhone)

La app se empaqueta con [Capacitor](https://capacitorjs.com). Los proyectos nativos ya están
generados en `android/` y `ios/`; el identificador de la app es `mx.buhsab.rfm`
(se define en `capacitor.config.ts` y **no se puede cambiar después de publicar**).

```
android/               Proyecto de Android Studio
ios/                   Proyecto de Xcode
assets/                Imágenes fuente del ícono y del splash nativos
capacitor.config.ts    Nombre, identificador y ajustes de la app
```

Cada vez que cambies código de la app, regenera la versión web y sincroniza los proyectos:

```bash
npm run cap:sync
```

### Android (Windows, Mac o Linux)

1. Instala [Android Studio](https://developer.android.com/studio).
2. Ejecuta `npm run android` (compila, sincroniza y abre el proyecto en Android Studio).
3. Para probar: conecta un celular con depuración USB o usa un emulador y presiona **Run**.
4. Para Play Store: **Build → Generate Signed Bundle / APK → Android App Bundle** y crea tu *keystore*.
   Guarda y respalda el keystore; si lo pierdes no podrás actualizar la app. Nunca lo subas a GitHub.

### iPhone (requiere una Mac)

1. Necesitas una Mac con Xcode y una cuenta de Apple Developer (99 USD al año) para publicar en App Store.
2. Ejecuta `npm run ios` (abre el proyecto en Xcode).
3. En Xcode, selecciona tu equipo en **Signing & Capabilities**, elige un iPhone o simulador y presiona **Run**.
4. Para App Store: **Product → Archive** y súbela con el Organizer.

### Íconos y splash

Los originales están en `assets/`. Si los cambias (idealmente `icon-only.png` y `icon-foreground.png`
de 1024×1024 y `splash.png` de 2732×2732), ejecuta `npm run assets` y luego `npm run cap:sync`.

### Permisos

La cámara se usa para las fotos de reportes y evidencia. Los textos de permiso para iPhone están en
`ios/App/App/Info.plist` y el permiso de Android en `android/app/src/main/AndroidManifest.xml`.

## Reglas de Firestore

Además de `reports`, `materialRequests`, `users` y `notifications`, la app usa las
colecciones `counters` (folio consecutivo) y `spaces` (espacios agregados por el admin).
Deben tener permiso de lectura y escritura para los usuarios autenticados.
