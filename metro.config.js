const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Firebase (JS SDK) en Expo: con la resolución por "exports" Metro puede cargar dos copias distintas de
// @firebase/app (una ESM y otra CJS). Auth se registra en una y se busca en la otra, y sale
// "Component auth has not been registered yet". Desactivarla (como indica la guía de Expo) lo evita.
config.resolver.sourceExts.push('cjs');
config.resolver.unstable_enablePackageExports = false;

// Además, "firebase/auth" debe cargar el build de React Native (trae la persistencia de sesión).
const authRN = path.join(__dirname, 'node_modules', '@firebase', 'auth', 'dist', 'rn', 'index.js');
const original = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === 'firebase/auth' && platform !== 'web' && fs.existsSync(authRN)) {
    return { type: 'sourceFile', filePath: authRN };
  }
  return original
    ? original(context, moduleName, platform)
    : context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
