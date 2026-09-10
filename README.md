# Aura farming battles v5.167

Versión de diagnóstico y estabilización basada directamente en v5.167.0 estable.

- Chat privado conservado.
- Invitaciones de clan conservadas.
- Reglas Firestore incluidas.
- Diagnóstico de conexión Firebase en Ajustes.
- Preparación para separar correctamente la integración Android/FCM de la capa web.

## Despliegue
1. Publica el proyecto en Render.
2. Publica `firestore.rules` en Firebase; Render no lo hace automáticamente.
3. En la app, abre Ajustes → Probar Firebase.
4. Si Firestore responde correctamente, prueba Chat y Clanes.
5. La integración FCM nativa Android se realizará después sobre una capa Android real.
