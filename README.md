# AURA BATTLE V5.153

AURA BATTLE es una arena 1v1 con cámara, WebRTC, Socket.IO, Firebase y análisis local de movimiento con MediaPipe Pose.

## Cambios de V5.153
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
