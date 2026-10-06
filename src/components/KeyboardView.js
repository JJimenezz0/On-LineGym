import React, { useEffect, useState } from 'react';
import { KeyboardAvoidingView, Keyboard, Platform } from 'react-native';

// Mejores prácticas (guía de Expo): KeyboardAvoidingView con "padding" en iOS y sin comportamiento
// en Android, donde la ventana ya se redimensiona sola (softwareKeyboardLayoutMode "resize").
// Se usa en la raíz de cada pantalla/modal con campos de texto, para que el contenido se mueva
// por encima del teclado en lugar de quedar tapado.
export function KeyboardView({ children, style }) {
  return (
    <KeyboardAvoidingView
      style={[{ flex: 1 }, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {children}
    </KeyboardAvoidingView>
  );
}

// true mientras el teclado está abierto: sirve para ocultar barras que le roban espacio.
export function useKeyboardVisible() {
  const [visible, setVisible] = useState(false);
  useEffect(() => {
    const ios = Platform.OS === 'ios';
    const a = Keyboard.addListener(ios ? 'keyboardWillShow' : 'keyboardDidShow', () => setVisible(true));
    const b = Keyboard.addListener(ios ? 'keyboardWillHide' : 'keyboardDidHide', () => setVisible(false));
    return () => { a.remove(); b.remove(); };
  }, []);
  return visible;
}
