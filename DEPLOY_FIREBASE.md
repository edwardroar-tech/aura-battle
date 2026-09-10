# Aura farming battles v5.167 — Firebase

## Importante
Render publica el frontend/servidor, pero **no publica automáticamente `firestore.rules`** en Firebase.

Antes de probar Chat y Clanes, publica el archivo `firestore.rules` incluido en esta versión en el proyecto Firebase `aura-battle-3ced4`.

### Opción A — Firebase Console
1. Abre Firebase Console y selecciona `aura-battle-3ced4`.
2. Entra a Firestore Database → Rules.
3. Reemplaza las reglas por el contenido de `firestore.rules` de este ZIP.
4. Pulsa Publish.

### Opción B — Firebase CLI
Desde la raíz del proyecto:

```bash
firebase login
firebase use aura-battle-3ced4
firebase deploy --only firestore:rules
```

## Diagnóstico dentro de la app
En Ajustes → Diagnóstico de conexión → Probar Firebase.

Si aparece `permission-denied`, las reglas todavía no están publicadas en el proyecto correcto o la cuenta no tiene permisos.

## Android / FCM
Esta versión no afirma que el APK tenga FCM nativo. El proyecto actual es React/Web + servidor y no contiene un proyecto Android nativo. La integración FCM nativa del APK será una fase separada después de confirmar Firestore.
