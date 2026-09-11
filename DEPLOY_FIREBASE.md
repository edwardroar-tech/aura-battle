# Aura farming battles v5.170 — Fase 3

## Firestore
Publica `firestore.rules` en Firebase. Debe incluir `users/{userId}/pushTokens/{tokenId}`.

## Render
Configura la variable secreta `FIREBASE_SERVICE_ACCOUNT_JSON` con el JSON de la cuenta de servicio de Firebase Admin. No la publiques en GitHub.

## Web Push
La app registra el token FCM desde Ajustes → Notificaciones. La clave pública VAPID está incluida en `src/lib/notifications.ts`.

## Android
Esta versión deja FCM Web y el servidor de envío preparados. El repositorio todavía no contiene un proyecto Android nativo/Capacitor; por eso el push nativo de un APK WebView con la app totalmente cerrada requiere la siguiente integración Android.
