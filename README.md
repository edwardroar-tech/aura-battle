# AURA BATTLE V4.4 — Community Launch

Versión de lanzamiento comunitario preparada para comenzar a atraer usuarios y probar el producto real.

## Incluye
- Firebase Authentication + perfiles persistentes
- Confirmación de contraseña
- Avatar completo con personalización y guardado en Firestore
- Batallas 1v1 con salas por código, cámara, micrófono, Socket.IO y WebRTC
- Señalización oferta/respuesta ICE
- Medidor de Aura visual local
- Ranking global desde Firestore
- Chat global persistente
- Búsqueda de jugadores y amigos
- Clanes: crear, explorar y unirse
- Liga y progresión básica
- Premium visual preparado para pagos futuros
- Publicidad preparada
- 10 idiomas iniciales
- Diseño responsive móvil/PC
- Servidor Express + Socket.IO
- Health check `/health`
- `public/assets` con recursos visuales

## Render
- Branch: `react-v4`
- Root Directory: `.`
- Build: `npm install && npm run build`
- Start: `npm start`

## Firebase
Activa Authentication > Email/Password y Firestore Database en el proyecto usado por `src/lib/firebase.ts`.
Si administras Firebase CLI, publica las reglas con `firebase deploy --only firestore:rules` desde esta carpeta.

## Importante
La puntuación de Aura actual es un motor visual de demostración en navegador; no es una IA médica ni un detector científico de aura. Premium no cobra dinero todavía. Antes de publicidad/pagos reales hay que configurar proveedores, políticas y controles legales.


## V4.5 Mobile First
Esta versión prioriza teléfonos: navegación inferior, menú secundario, controles táctiles grandes, layout de batalla vertical, avatar adaptado y recuperación de contraseña. Incluye resultado de batalla con actualización de Aura/victorias/derrotas.

**Importante:** WebRTC requiere probar cámara/micrófono en dos dispositivos reales y HTTPS. Los sistemas de pagos, moderación avanzada y un modelo ML real de Aura siguen siendo etapas posteriores.
