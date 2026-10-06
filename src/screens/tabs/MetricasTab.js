import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Alert, Modal } from 'react-native';
import { useGym } from '../../context/GymContext';
import { st, C } from '../../styles/neonTheme';
import { calcIMC, categoriaIMC, progresion, toKey } from '../../utils/helpers';

const flecha = (act, prev) => (act > prev ? '▲' : act < prev ? '▼' : '＝');
const color = (act, prev) => (act > prev ? C.verde : act < prev ? '#ff4d6d' : '#888');

export default function MetricasTab() {
  const {
    medidas, cargas, guardarMedida,
    editarMedida, eliminarMedida, editarCarga, eliminarCarga
  } = useGym();
  const [w, setW] = useState('');
  const [h, setH] = useState('');

  // Edición de una medida
  const [eMed, setEMed] = useState(null); // { id, peso, altura, fecha }
  // Edición de una carga
  const [eCar, setECar] = useState(null); // { id, nombre, fecha, peso, reps, sets }

  // Precarga la última medida guardada
  useEffect(() => {
    if (medidas.length && !w && !h) {
      setW(String(medidas[0].peso));
      setH(String(medidas[0].altura));
    }
  }, [medidas.length]);

  const imc = calcIMC(w, h); // en tiempo real, mientras escribes
  const prog = useMemo(() => progresion(cargas, toKey(new Date())), [cargas]);
  const cargasOrdenadas = useMemo(
    () => [...cargas].sort((a, b) => (b.fecha === a.fecha ? b.ts - a.ts : b.fecha.localeCompare(a.fecha))).slice(0, 20),
    [cargas]
  );
  const imcEdit = eMed ? calcIMC(eMed.peso, eMed.altura) : null;

  const guardar = async () => {
    const ok = await guardarMedida(w, h);
    if (!ok) return Alert.alert('Datos inválidos', 'Escribe peso (kg) y altura (cm).');
    Alert.alert('Guardado', 'Medida añadida a tu historial.');
  };

  const guardarEdicionMedida = async () => {
    const ok = await editarMedida(eMed.id, eMed.peso, eMed.altura, eMed.fecha.trim());
    if (!ok) return Alert.alert('Datos inválidos', 'Revisa peso, altura y que la fecha tenga el formato AAAA-MM-DD.');
    setEMed(null);
  };

  const guardarEdicionCarga = async () => {
    const ok = await editarCarga(eCar.id, eCar.peso, eCar.reps, eCar.sets);
    if (!ok) return Alert.alert('Datos inválidos', 'El peso debe ser un número.');
    setECar(null);
  };

  const confirmar = (titulo, fn) =>
    Alert.alert(titulo, 'Esta acción no se puede deshacer.', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: fn }
    ]);

  return (
    <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled">
      <Text style={st.sectionTitle}>MIS DATOS BIOMÉTRICOS</Text>
      <TextInput style={st.input} placeholder="Peso corporal (kg)" placeholderTextColor="#444" keyboardType="numeric" value={w} onChangeText={setW} />
      <TextInput style={st.input} placeholder="Altura (cm)" placeholderTextColor="#444" keyboardType="numeric" value={h} onChangeText={setH} />

      {imc && (
        <View style={st.imcCard}>
          <Text style={{ color: C.oscuro, fontSize: 11, fontWeight: '900' }}>TU IMC ACTUAL</Text>
          <Text style={{ color: C.oscuro, fontSize: 40, fontWeight: '900' }}>{imc.toFixed(1)}</Text>
          <Text style={{ color: C.oscuro, fontWeight: '900' }}>{categoriaIMC(imc).toUpperCase()}</Text>
        </View>
      )}
      <TouchableOpacity style={st.neonBtnAlt} onPress={guardar}><Text style={st.neonBtnTxt}>GUARDAR EN MI HISTORIAL</Text></TouchableOpacity>

      <Text style={[st.sectionTitle, { marginTop: 25 }]}>PROGRESIÓN DE CARGAS · ESTA SEMANA VS LA ANTERIOR</Text>
      {prog.length === 0 && (
        <Text style={{ color: '#555', fontSize: 12 }}>
          Aún no hay datos. Marca ejercicios como completados en la pestaña RUTINA y aquí verás tu progreso.
        </Text>
      )}
      {prog.map((g) => (
        <View key={g.nombre} style={[st.smallCard, { flexDirection: 'column', alignItems: 'flex-start' }]}>
          <Text style={{ color: '#FFF', fontWeight: 'bold', textTransform: 'capitalize' }}>{g.nombre}</Text>
          {g.prev.n === 0 ? (
            <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              Esta semana: {g.act.peso} kg × {g.act.reps} reps · sin datos de la semana pasada
            </Text>
          ) : g.act.n === 0 ? (
            <Text style={{ color: '#888', fontSize: 12, marginTop: 4 }}>
              Semana pasada: {g.prev.peso} kg × {g.prev.reps} · sin registros esta semana
            </Text>
          ) : (
            <View style={{ marginTop: 4 }}>
              <Text style={{ color: color(g.act.peso, g.prev.peso), fontSize: 12 }}>
                {flecha(g.act.peso, g.prev.peso)} Peso: {g.prev.peso} → {g.act.peso} kg ({g.act.peso - g.prev.peso >= 0 ? '+' : ''}{(g.act.peso - g.prev.peso).toFixed(1)})
              </Text>
              <Text style={{ color: color(g.act.reps, g.prev.reps), fontSize: 12 }}>
                {flecha(g.act.reps, g.prev.reps)} Reps: {g.prev.reps} → {g.act.reps} ({g.act.reps - g.prev.reps >= 0 ? '+' : ''}{g.act.reps - g.prev.reps})
              </Text>
            </View>
          )}
        </View>
      ))}

      <Text style={[st.sectionTitle, { marginTop: 25 }]}>REGISTROS DE CARGAS (TOCA ✎ PARA EDITAR)</Text>
      {cargasOrdenadas.length === 0 && <Text style={{ color: '#555', fontSize: 12 }}>Sin registros todavía.</Text>}
      {cargasOrdenadas.map((c) => (
        <View key={c.id} style={st.smallCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF', textTransform: 'capitalize' }} numberOfLines={1}>{c.nombre}</Text>
            <Text style={{ color: '#888', fontSize: 11 }}>{c.fecha} · {c.sets}x{c.reps} · {c.peso} kg</Text>
          </View>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => setECar({ id: c.id, nombre: c.nombre, fecha: c.fecha, peso: String(c.peso), reps: String(c.reps), sets: String(c.sets) })}
          >
            <Text style={{ color: C.azul, fontSize: 16 }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => confirmar('Eliminar registro', () => eliminarCarga(c.id))}>
            <Text style={{ color: '#ff4d6d', fontSize: 16 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      ))}

      <Text style={[st.sectionTitle, { marginTop: 25 }]}>HISTORIAL DE MEDIDAS (TOCA ✎ PARA EDITAR)</Text>
      {medidas.length === 0 && <Text style={{ color: '#555', fontSize: 12 }}>Sin medidas guardadas.</Text>}
      {medidas.slice(0, 15).map((m) => (
        <View key={m.id} style={st.smallCard}>
          <View style={{ flex: 1 }}>
            <Text style={{ color: '#FFF' }}>{m.peso} kg · {m.altura} cm</Text>
            <Text style={{ color: '#888', fontSize: 11 }}>{m.fecha}</Text>
          </View>
          <Text style={{ color: C.verde, fontWeight: '900', marginRight: 4 }}>IMC {m.imc}</Text>
          <TouchableOpacity
            style={{ padding: 8 }}
            onPress={() => setEMed({ id: m.id, peso: String(m.peso), altura: String(m.altura), fecha: m.fecha })}
          >
            <Text style={{ color: C.azul, fontSize: 16 }}>✎</Text>
          </TouchableOpacity>
          <TouchableOpacity style={{ padding: 8 }} onPress={() => confirmar('Eliminar medida', () => eliminarMedida(m.id))}>
            <Text style={{ color: '#ff4d6d', fontSize: 16 }}>🗑</Text>
          </TouchableOpacity>
        </View>
      ))}
      <View style={{ height: 40 }} />

      {/* Modal: editar medida */}
      <Modal visible={!!eMed} animationType="fade" transparent onRequestClose={() => setEMed(null)}>
        <View style={st.overlay}>
          <View style={st.modalBox}>
            <Text style={st.modalTitle}>EDITAR MEDIDA</Text>
            {eMed && (
              <>
                <Text style={st.label}>PESO (KG)</Text>
                <TextInput style={st.input} keyboardType="numeric" value={eMed.peso} onChangeText={(v) => setEMed({ ...eMed, peso: v })} />
                <Text style={st.label}>ALTURA (CM)</Text>
                <TextInput style={st.input} keyboardType="numeric" value={eMed.altura} onChangeText={(v) => setEMed({ ...eMed, altura: v })} />
                <Text style={st.label}>FECHA (AAAA-MM-DD)</Text>
                <TextInput style={st.input} value={eMed.fecha} onChangeText={(v) => setEMed({ ...eMed, fecha: v })} autoCapitalize="none" />
                {imcEdit && <Text style={{ color: C.verde, fontWeight: '900', marginBottom: 6 }}>IMC resultante: {imcEdit.toFixed(1)} · {categoriaIMC(imcEdit)}</Text>}
              </>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={{ padding: 10 }} onPress={() => setEMed(null)}><Text style={{ color: '#FFF' }}>CANCELAR</Text></TouchableOpacity>
              <TouchableOpacity style={st.miniBtn} onPress={guardarEdicionMedida}><Text style={{ color: C.oscuro, fontWeight: '900' }}>GUARDAR</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal: editar carga */}
      <Modal visible={!!eCar} animationType="fade" transparent onRequestClose={() => setECar(null)}>
        <View style={st.overlay}>
          <View style={st.modalBox}>
            <Text style={st.modalTitle}>EDITAR REGISTRO</Text>
            {eCar && (
              <>
                <Text style={{ color: '#FFF', fontWeight: 'bold', textTransform: 'capitalize' }}>{eCar.nombre}</Text>
                <Text style={{ color: '#888', fontSize: 11, marginBottom: 12 }}>{eCar.fecha}</Text>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                  <View style={{ width: '30%' }}>
                    <Text style={st.label}>SETS</Text>
                    <TextInput style={st.input} keyboardType="numeric" value={eCar.sets} onChangeText={(v) => setECar({ ...eCar, sets: v })} />
                  </View>
                  <View style={{ width: '30%' }}>
                    <Text style={st.label}>REPS</Text>
                    <TextInput style={st.input} keyboardType="numeric" value={eCar.reps} onChangeText={(v) => setECar({ ...eCar, reps: v })} />
                  </View>
                  <View style={{ width: '30%' }}>
                    <Text style={st.label}>PESO KG</Text>
                    <TextInput style={st.input} keyboardType="numeric" value={eCar.peso} onChangeText={(v) => setECar({ ...eCar, peso: v })} />
                  </View>
                </View>
              </>
            )}
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 10 }}>
              <TouchableOpacity style={{ padding: 10 }} onPress={() => setECar(null)}><Text style={{ color: '#FFF' }}>CANCELAR</Text></TouchableOpacity>
              <TouchableOpacity style={st.miniBtn} onPress={guardarEdicionCarga}><Text style={{ color: C.oscuro, fontWeight: '900' }}>GUARDAR</Text></TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </ScrollView>
  );
}
