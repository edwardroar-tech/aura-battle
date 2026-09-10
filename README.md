# Aura farming battles V5.164.3

Aura farming battles es una arena 1v1 con cámara, WebRTC, Socket.IO, Firebase y análisis local de movimiento con MediaPipe Pose.

## Cambios acumulados de V5.155
- 🧠 IA Aura: entrenamiento de 15 segundos con medidor de Aura en tiempo real.
- ⚡ Cada entrenamiento completado otorga +1 Aura y actualiza el perfil en Firestore.
- 🛡️ Filtro local de seguridad visual en batallas con NSFWJS/TensorFlow.js. Si detecta con alta confianza contenido sexual potencialmente no permitido, se apaga la cámara local y se cancela la batalla para ambos.
- 🗣️ En navegadores compatibles, moderación local de lenguaje durante la batalla mediante Web Speech API; una coincidencia de lenguaje inapropiado cancela la ronda y apaga la cámara.
- 👥 Se conserva el sistema de amigos, solicitudes, aceptación, eliminación y chat privado.
- ⚔️ Se conserva el botón ESTOY LISTO: la ronda empieza solo cuando ambos jugadores están listos.
- 🧠 Se conserva la puntuación de movimientos básicos de farmeo de Aura.

## Privacidad
El análisis de movimiento y el filtro visual se ejecutan en el navegador. El video no se envía al servidor para realizar el análisis. El servidor recibe únicamente el resultado de Aura para resolver la batalla.

La detección automática de contenido es una medida de seguridad y puede equivocarse; por eso usa umbrales conservadores y debe probarse antes de considerarla un sistema de moderación definitivo.

## Despliegue
- Build: `npm run build`
- Start: `npm start`
- Node: >=20

## Cambios de V5.160
- 🔔 Campana de notificaciones visible en Inicio.
- 💬 Muestra solicitudes de amistad y mensajes privados nuevos.
- 🔢 Badge con contador de notificaciones pendientes.
- 📱 Panel adaptado para móviles y navegación rápida al contenido pendiente.
- 👁️ Al abrir un chat privado, sus mensajes pendientes se marcan como vistos en ese dispositivo.


### v5.164.2.1
- Botón «⚔️ Invitar a batalla» dentro del chat privado de amigos.
- El invitado recibe la invitación en Notificaciones.
- Al aceptar, entra directamente a la sala sin introducir código.


## v5.164.2.1 — Creación y búsqueda de Clanes
- Nueva base visual y funcional de Clanes.
- Crear clan con nombre, etiqueta, descripción, emblema y privacidad.
- Crear clan cuesta 100 Aura.
- Buscar y filtrar clanes por nombre/etiqueta.
- Un usuario no puede crear otro clan mientras pertenezca a uno.
- No incluye todavía solicitudes de ingreso, roles, chat ni desafíos; se reservan para versiones posteriores.

### v5.164.2.1 — Miembros y solicitudes de ingreso
- Vista detallada de cada clan.
- Lista de miembros con Líder/Miembro.
- Botón “Solicitar unirme al clan”.
- Solicitudes únicas por jugador y clan.
- El Líder puede aceptar o rechazar solicitudes.
- Un miembro puede salir del clan.
- El Líder no puede salir todavía; la transferencia de liderazgo llegará en v5.164.2.


## V5.164.2 — Notificaciones de batalla y clanes
- ⚔️ Cuando existe una invitación de batalla pendiente de un amigo, aparece un aviso directamente arriba del cuadro de chat privado.
- ✅ Desde ese aviso se puede aceptar o rechazar la invitación sin salir del chat.
- 🛡️ Las solicitudes de ingreso a clanes generan notificaciones en la campana para el Líder y para el usuario indicado como Co-líder (`coLeader`).
- 🔔 Las solicitudes de clan se integran al contador de notificaciones existentes.
- 📱 Mantiene el diseño móvil y las funciones anteriores.


### v5.164.2.1 hotfix
- Limpieza de invitaciones de clan pendientes al expulsar un miembro.
- Evita que el botón muestre “📨 Enviada” por una invitación pendiente antigua después de una expulsión.


### V5.164.3 — Corrección visual de administración de clanes
- Eliminado el botón duplicado “Expulsar” en la tarjeta de miembros.
- La acción de expulsar aparece una sola vez para quien tenga permiso.

## v5.165 — Firebase Cloud Messaging preparado
- Añadido soporte web para Firebase Cloud Messaging (FCM).
- Service worker `public/firebase-messaging-sw.js` para notificaciones en segundo plano.
- Registro del dispositivo en `users/{uid}.fcmTokens`.
- Botón manual en Ajustes para pedir permiso y activar notificaciones.
- Recepción de mensajes FCM en primer plano.
- Variable `VITE_FIREBASE_VAPID_KEY` en `.env.example`.

Nota: para Web Push en producción se debe generar/configurar la clave pública VAPID del proyecto Firebase. Esta versión prepara el cliente FCM; la integración nativa de FCM del APK Android es un paso separado.
