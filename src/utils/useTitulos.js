import { useEffect, useRef, useState } from 'react';
import { tipoLink } from './helpers';

// Busca el título real de cada link (oEmbed de YouTube / Spotify). Si falla, se muestra el link.
export function useTitulos(links) {
  const [titulos, setTitulos] = useState({});
  const pedidos = useRef(new Set());
  const clave = (links || []).join('|');

  useEffect(() => {
    (links || []).forEach((l) => {
      const t = tipoLink(l);
      if (!t || pedidos.current.has(l)) return;
      pedidos.current.add(l);
      const base = t === 'youtube'
        ? 'https://www.youtube.com/oembed?format=json&url='
        : 'https://open.spotify.com/oembed?url=';
      fetch(base + encodeURIComponent(l))
        .then((r) => r.json())
        .then((j) => j?.title && setTitulos((x) => ({ ...x, [l]: j.title })))
        .catch(() => {});
    });
  }, [clave]);

  return titulos;
}
