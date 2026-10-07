// Complementa a app.json: busca el icono adaptativo con cualquiera de los nombres posibles.
// Así el build no falla si el archivo se llama "adaptativeicon.png" en vez de "adaptiveicon.png".
// (Linux, donde corre EAS, distingue mayúsculas y la ortografía; Windows no.)
const fs = require('fs');
const path = require('path');

const imagen = (...nombres) => {
  const base = path.join(__dirname, 'src', 'img');
  for (const n of nombres) {
    if (fs.existsSync(path.join(base, n))) return `./src/img/${n}`;
  }
  return './src/img/icon.png'; // último recurso: el icono normal
};

module.exports = ({ config }) => {
  const foreground = imagen(
    'adaptiveicon.png', 'adaptativeicon.png', 'adaptive-icon.png', 'adaptiveIcon.png', 'adaptativeIcon.png'
  );
  return {
    ...config,
    android: {
      ...config.android,
      adaptiveIcon: { ...(config.android && config.android.adaptiveIcon), foregroundImage: foreground }
    },
    plugins: (config.plugins || []).map((p) =>
      Array.isArray(p) && p[0] === 'expo-splash-screen' ? [p[0], { ...p[1], image: foreground }] : p
    )
  };
};
