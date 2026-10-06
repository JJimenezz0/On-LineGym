# On-LineGym — cómo instalar estos archivos

## 1. Copiar archivos
Copia `App.js` a la raíz de tu proyecto y la carpeta `src/` encima de la tuya (reemplaza archivos).
Estructura final:

```
App.js
src/
  config/firebase.js
  utils/helpers.js
  context/GymContext.js
  navigation/AppNavigator.js
  styles/neonTheme.js
  components/MusicPlayer.js
  screens/LoginScreen.js
  screens/RoomsScreen.js
  screens/SalaTabs.js
  screens/tabs/{ChatTab,MusicTab,RutinaTab,MetricasTab}.js
```
Borra tus `loginscreen.js` / `LoginScreen.js` viejos de `src/screens` para que no queden duplicados.

## 2. Instalar dependencias nuevas
```
npx expo install expo-location expo-crypto react-native-webview
npx expo start -c
```

## 3. Reglas de Firestore (Firebase Console → Firestore → Reglas)
Para desarrollo (sin login real, cualquiera con la app puede leer/escribir):
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} { allow read, write: if true; }
  }
}
```
Antes de publicar la app hay que añadir Firebase Authentication y reglas por usuario.

## 4. Estructura de datos en Firestore
```
salas/{salaId}
  nombre, passHash (SHA-256), creador, activa, lat, lng, creadoEn
  presencia: { <usuario>: <timestamp último latido> }
  musicaEstado: { indice, reproduciendo }
  chat/{msgId}        usuario, texto, timestamp
  musica/{trackId}    link, usuario, timestamp           (cola, solo se añade)
  rutinas/{id}
     dia_YYYY-MM-DD   titulo, descripcion, ejercicios[], aislado:true   (solo ese día)
     semanal_{0-6}    titulo, descripcion, ejercicios[], desde          (todos los mismos días de la semana desde "desde")
  progreso/{YYYY-MM-DD}  completados: { <usuario>: { <ejercicioId>: true|false } }

usuarios/{usuario}
  medidas/{id}   peso, altura, imc, fecha, ts
  cargas/{fecha_ejercicioId}   ejercicio, nombre, peso, reps, sets, fecha
```
Por qué no hay conflictos: chat y cola son subcolecciones que solo reciben documentos nuevos; el estado
del reproductor es un único campo pequeño; la repetición semanal es UN documento (no copias), así que
editar un martes modifica la plantilla para todos; y el checklist vive aparte, por usuario y fecha.
