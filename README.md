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
