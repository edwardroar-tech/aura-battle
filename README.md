# Aura farming battles v5.174.3-render-fix2

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


## v5.174.3-render-fix2 — Fase 5
Batallas de cámara con dos feeds verticales lado a lado, medidores de Aura en vivo y cuenta regresiva de 5 segundos antes de los 15 segundos de combate.


## v5.176.8 — Rivales y granjeros ficticios
- 25 rivales ficticios integrados como oponentes de práctica, separados de los usuarios reales y del contador de jugadores online.
- Buscador de rivales con búsqueda de jugadores reales y acceso rápido a los bots.
- Batallas contra bots con cuenta regresiva de 5 segundos, ronda de 15 segundos, dificultad y Aura simulada.
- Los resultados contra bots actualizan victorias, derrotas, empates, batallas, racha, nivel y Aura del perfil.
- Se conserva el sistema de salas/cámaras para batallas entre personas.


## v5.176.8
- Cámaras de batalla en tarjetas 9:16 tipo videollamada móvil.
- Sin giro automático de la señal; se respeta la orientación real del stream.
- `object-fit: cover` para llenar el cuadro sin franjas negras.
- Batallas contra bots sin dependencia de WebRTC/socket para iniciar.
- Botón LISTO y controles de batalla con el mismo estilo premium del menú.
