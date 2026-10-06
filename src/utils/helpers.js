// ---------- Fechas ----------
export const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];
export const DIAS_CORTO = ['D', 'L', 'M', 'X', 'J', 'V', 'S'];
export const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export const toKey = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export const fromKey = (k) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

// Devuelve una lista plana de celdas (Date | null) para pintar el mes, empezando en domingo.
export function matrizMes(year, month) {
  const primero = new Date(year, month, 1).getDay();
  const total = new Date(year, month + 1, 0).getDate();
  const celdas = [];
  for (let i = 0; i < primero; i++) celdas.push(null);
  for (let d = 1; d <= total; d++) celdas.push(new Date(year, month, d));
  while (celdas.length % 7 !== 0) celdas.push(null);
  return celdas;
}

// ---------- Usuario ----------
// Id seguro para usar como id de documento en Firestore.
export const userKey = (nombre) => encodeURIComponent((nombre || '').trim().toLowerCase());

// ---------- Proximidad ----------
export const RADIO_METROS = 300;

export function distanciaMetros(a, b) {
  const R = 6371000;
  const rad = (x) => (x * Math.PI) / 180;
  const dLat = rad(b.lat - a.lat);
  const dLng = rad(b.lng - a.lng);
  const h =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

// ---------- Música ----------
export function youtubeId(url) {
  const m = (url || '').match(/(?:youtu\.be\/|v=|embed\/|shorts\/)([\w-]{11})/);
  return m ? m[1] : null;
}

// Acepta links de open.spotify.com (track, album, playlist, episode, show, artist).
// Los links cortos spotify.link no se pueden convertir, hay que pegar el link completo.
export function spotifyInfo(url) {
  const m = (url || '').match(/spotify\.com\/(?:intl-[a-z-]+\/)?(?:embed\/)?(track|album|playlist|episode|show|artist)\/([A-Za-z0-9]+)/);
  return m ? { kind: m[1], id: m[2] } : null;
}

export function tipoLink(url) {
  const u = (url || '').trim();
  if (!/^https?:\/\//i.test(u)) return null;
  if (youtubeId(u)) return 'youtube';
  if (spotifyInfo(u)) return 'spotify';
  return null;
}

// ---------- Rutinas ----------
// Una rutina efectiva para una fecha:
//  1) si hay un documento propio del día (aislado) manda ese
//  2) si no, aplica la plantilla semanal de ese día de la semana (desde su fecha de inicio)
export function resolverRutina(fecha, rutinas) {
  const dia = rutinas.find((r) => r.id === `dia_${fecha}`);
  if (dia && dia.aislado) return { ...dia, origen: 'dia', refId: dia.id };
  const dow = fromKey(fecha).getDay();
  const sem = rutinas.find((r) => r.id === `semanal_${dow}`);
  if (sem && fecha >= (sem.desde || '0000-00-00')) return { ...sem, origen: 'semanal', refId: sem.id };
  return null;
}

// ---------- Métricas ----------
export function calcIMC(kg, cm) {
  const p = parseFloat(String(kg).replace(',', '.'));
  const a = parseFloat(String(cm).replace(',', '.')) / 100;
  if (!p || !a || p <= 0 || a <= 0) return null;
  return p / (a * a);
}

export function categoriaIMC(imc) {
  if (imc < 18.5) return 'Bajo peso';
  if (imc < 25) return 'Peso normal';
  if (imc < 30) return 'Sobrepeso';
  return 'Obesidad';
}

// Compara el mejor peso/reps de los últimos 7 días contra los 7 anteriores, por ejercicio.
export function progresion(cargas, hoyKey) {
  const hoy = fromKey(hoyKey);
  const dias = (f) => Math.round((hoy - fromKey(f)) / 86400000);
  const grupos = {};
  cargas.forEach((c) => {
    const d = dias(c.fecha);
    const g =
      grupos[c.ejercicio] ||
      (grupos[c.ejercicio] = { nombre: c.nombre, act: { peso: 0, reps: 0, n: 0 }, prev: { peso: 0, reps: 0, n: 0 } });
    const b = d >= 0 && d < 7 ? g.act : d >= 7 && d < 14 ? g.prev : null;
    if (b) {
      b.peso = Math.max(b.peso, c.peso || 0);
      b.reps = Math.max(b.reps, c.reps || 0);
      b.n++;
    }
  });
  return Object.values(grupos).filter((g) => g.act.n || g.prev.n);
}
