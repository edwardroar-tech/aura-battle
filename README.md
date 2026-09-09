# AURA BATTLE v5.133

Versión basada en v5.132 con inicio de sesión mediante Google.

## Cambio principal
- Botón **Continuar con Google** en la pantalla de iniciar sesión.
- Usa Firebase Authentication con `GoogleAuthProvider`.
- En móviles utiliza el flujo de redirección recomendado por Firebase.
- Mantiene el inicio de sesión existente con correo y contraseña.
- Conserva la imagen de AURA BATTLE en la pantalla de inicio de sesión.
- No modifica las funciones de batalla, cámaras, IA Aura ni chat privado.

## Configuración de Firebase
En Firebase Console:
1. Authentication → Sign-in method.
2. Activar **Google**.
3. Guardar.
4. Comprobar que el dominio de producción de AURA BATTLE esté autorizado.

Documentación oficial: https://firebase.google.com/docs/auth/web/google-signin


## v5.148 — IA de movimiento
La batalla usa MediaPipe Pose Landmarker en el dispositivo para detectar puntos del cuerpo y convertir el movimiento observado durante los 15 segundos en una puntuación 0-100. El video no se envía a un servidor para el análisis; se emite únicamente la puntuación al servidor de batalla.


### Reconocimiento de movimientos básicos
La IA de v5.148 usa MediaPipe Pose para detectar patrones aproximados de: Mewing, Six-Seven, Siuuu, Aura Walk, gestos de brazos y Pose de Aura. Cada patrón válido aporta un bono limitado al Aura, mientras el movimiento general aporta la puntuación base. La detección es heurística y se ejecuta en el dispositivo; no se envía el video al servidor.
