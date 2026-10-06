# On-LineGym — instalación

## 1. Copiar archivos
Copia `App.js` a la raíz de tu proyecto y la carpeta `src/` encima de la tuya (reemplaza archivos).

## 2. Instalar dependencias
```
npx expo install expo-location expo-crypto react-native-webview expo-notifications expo-image-picker expo-video expo-image-manipulator @react-native-community/slider @react-native-async-storage/async-storage
npx expo start -c
```

## 3. Firebase (consola web)

### 3.1 Activar el login con usuario y contraseña
Authentication → Método de acceso → **Correo electrónico/contraseña** → Activar.
(La app crea por dentro un correo `usuario@onlinegym.app`; no se envía ningún correo real.)

### 3.2 Reglas de Firestore (Firestore Database → Reglas)
```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    function logueado() { return request.auth != null; }

    // Datos personales: los puede LEER cualquier usuario con sesión (así se ven las métricas de los
    // compañeros de sala) pero solo ESCRIBIR su dueño.
    match /usuarios/{u} {
      allow read: if logueado();
      allow create: if logueado() && request.resource.data.uid == request.auth.uid;
      allow update, delete: if logueado() && resource.data.uid == request.auth.uid;
      match /{sub}/{doc=**} {
        allow read: if logueado();
        allow write: if logueado()
          && get(/databases/$(database)/documents/usuarios/$(u)).data.uid == request.auth.uid;
      }
    }

    match /salas/{s} {
      allow read, write: if logueado();
      match /{path=**} { allow read, write: if logueado(); }
    }
  }
}
```

### 3.3 Storage para videos del chat (OPCIONAL: sin esto las imágenes ya funcionan)
Las imágenes se reducen y se guardan dentro del mensaje; no necesitas Storage para ellas.
Si algún día activas Storage, cambia `USAR_STORAGE` a `true` en `src/config/firebase.js`.
Compilación → **Storage** → Comenzar. En proyectos nuevos Firebase puede exigir el plan **Blaze**
(de pago por uso, con una cuota gratuita); revisa lo que te pida la consola. Luego, pestaña Reglas:
```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /salas/{sala}/{allPaths=**} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.resource.size < 50 * 1024 * 1024;
    }
  }
}
```
Sin Storage: las **imágenes** pequeñas siguen funcionando (se guardan dentro del mensaje); los **videos** no.

## 4. Teclado en Android
En `app.json`, dentro de `"android"`, deja:
```
"softwareKeyboardLayoutMode": "resize"
```
(es el valor por defecto, pero conviene dejarlo explícito).

## 5. Estructura de datos
```
usuarios/{usuario}            uid, nombre, creadoEn
  medidas/{id}                peso, altura, imc, fecha, ts
  cargas/{fecha_ejercicioId}  ejercicio, nombre, peso, reps, sets, fecha

salas/{salaId}
  nombre, passHash, creador, miembros[], activa, lat, lng, presencia{}, microfonos{}, musicaEstado{indice, reproduciendo}
  chat/{id}          tipo(texto|imagen|video), texto, url | b64, usuario, timestamp
  musica/{id}        link, usuario, timestamp                 (cola)
  playlists/{id}     nombre, creador, creadoEn
    canciones/{id}   link, usuario, timestamp
  rutinas/{id}       dia_YYYY-MM-DD | semanal_{0-6}
  progreso/{fecha}   completados{ usuario: { ejercicioId: bool } }
```
