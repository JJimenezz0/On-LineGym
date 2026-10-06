import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { ImageManipulator, SaveFormat } from 'expo-image-manipulator';
import { storage } from '../config/firebase';

// En React Native, fetch(uri).blob() falla con Firebase Storage; este XHR es el método fiable.
const aBlob = (uri) =>
  new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.onload = () => resolve(xhr.response);
    xhr.onerror = () => reject(new Error('No se pudo leer el archivo'));
    xhr.responseType = 'blob';
    xhr.open('GET', uri, true);
    xhr.send(null);
  });

export async function subirArchivo({ uri, ruta, mime, onProgress }) {
  const blob = await aBlob(uri);
  const r = ref(storage, ruta);
  const task = uploadBytesResumable(r, blob, { contentType: mime });
  await new Promise((resolve, reject) => {
    task.on(
      'state_changed',
      (s) => onProgress && s.totalBytes && onProgress(s.bytesTransferred / s.totalBytes),
      reject,
      resolve
    );
  });
  if (blob && blob.close) blob.close();
  return getDownloadURL(r);
}

// Reduce la imagen (800 px de ancho, JPEG 50 %) para que quepa dentro de un mensaje de Firestore.
export async function imagenPequena(uri) {
  const ctx = ImageManipulator.manipulate(uri);
  ctx.resize({ width: 800 });
  const img = await ctx.renderAsync();
  const res = await img.saveAsync({ compress: 0.5, format: SaveFormat.JPEG, base64: true });
  return `data:image/jpeg;base64,${res.base64}`;
}

export const extDeMime = (mime) => {
  const sub = (mime || '').split('/')[1] || 'bin';
  return sub === 'quicktime' ? 'mov' : sub === 'jpeg' ? 'jpg' : sub;
};
