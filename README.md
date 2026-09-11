# Aura farming battles v5.174

## Fase 3 — Notificaciones

Preparación de notificaciones con Firebase Cloud Messaging:
- Registro de token FCM Web por usuario.
- Service Worker para mensajes en segundo plano en navegadores compatibles.
- Recepción de mensajes en primer plano.
- Envío autenticado desde Express mediante Firebase Admin.
- Eventos: amistad, chat privado, invitación de batalla, invitación de clan, solicitud de ingreso y chat de clan.
- Botón de activación en Ajustes.

### Importante
Para enviar push desde Render se necesita `FIREBASE_SERVICE_ACCOUNT_JSON` como secreto de entorno. No debe guardarse en GitHub.

El proyecto actual no contiene todavía la capa Android nativa; la recepción nativa en un APK WebView cerrado requiere esa integración como parte de la siguiente iteración de Android.


## Fase 5 — Batallas de cámara
Cámaras verticales lado a lado, medidor de Aura bajo cada cámara y cuenta regresiva autoritativa de 5 segundos antes de los 15 segundos de batalla.


## v5.174 — Fase 5
Batallas de cámara con dos feeds verticales lado a lado, medidores de Aura en vivo y cuenta regresiva de 5 segundos antes de los 15 segundos de combate.
