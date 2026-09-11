# Android FCM — siguiente integración

v5.170 implementa el registro FCM Web y el envío desde Firebase Admin. El repositorio actual no incluye un proyecto Android nativo (no hay carpeta `android/`).

Para un APK WebView, la siguiente etapa debe integrar Firebase Cloud Messaging nativo mediante Capacitor/Android, registrar el token nativo y solicitar `POST_NOTIFICATIONS` en Android 13+.

No se deben poner credenciales privadas de Firebase dentro del APK ni del repositorio.
