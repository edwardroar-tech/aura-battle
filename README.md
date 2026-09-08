# AURA BATTLE V4.5 — PRUEBAS MOBILE

Versión preparada para pruebas reales en teléfonos.

## Incluye
- Firebase Auth: iniciar sesión, crear cuenta y recuperación de contraseña.
- Navegación mobile-first: Inicio, Batallas, Amigos, Perfil y Más.
- Batallas 1v1 con Socket.IO + WebRTC.
- Fallback de cámara/micrófono para móviles.
- Manejo de candidatos ICE pendientes y recreación limpia de la conexión.
- Vídeo local y remoto con `playsInline` y reproducción explícita.
- Música original de AURA BATTLE durante la batalla.
- Ranking, Liga, Clanes, Chat, Amigos e IA Aura demo.
- Avatar retirado temporalmente de la interfaz y del registro.
- Imagen principal original de arena; no se usa la captura de GitHub.
- Diseño responsive para Android/iPhone.

## Render
Branch: `react-v4`
Root Directory: `.`
Build Command: `npm install && npm run build`
Start Command: `npm start`

## Prueba de dos teléfonos
1. Abre la URL de Render en dos teléfonos con cuentas distintas.
2. Teléfono A: crea una sala y comparte el código.
3. Teléfono B: introduce el código y se une.
4. Ambos activan cámara/micrófono y aceptan permisos.
5. Espera a “Ambas cámaras están listas”.
6. Inicia la batalla desde el teléfono anfitrión.
7. Comprueba vídeo local, vídeo remoto, audio, música, Aura y resultado.

Nota: IA Aura es todavía un motor visual de demostración; Premium no procesa pagos reales.

## Prueba móvil recomendada
1. Despliega esta versión en Render.
2. Abre la URL en dos teléfonos, preferiblemente Chrome Android y otro navegador/teléfono.
3. Registra/inicia sesión en cada uno.
4. Teléfono A: Batallas → Crear sala.
5. Teléfono B: Batallas → introduce el código → Unirme.
6. En ambos: Activar cámara.
7. Espera a que aparezca que ambas cámaras están listas.
8. Inicia la batalla y comprueba vídeo local, vídeo remoto, Aura y música.

Avatar está desactivado temporalmente en esta versión.


## Prueba inicial

Esta versión está preparada para desplegarse directamente desde la rama `main`. No requiere conservar las ramas anteriores.

Orden de prueba: registro/login → crear sala → segundo teléfono se une → permisos de cámara/micrófono → comprobar ambos vídeos → iniciar batalla → música → finalizar batalla.
