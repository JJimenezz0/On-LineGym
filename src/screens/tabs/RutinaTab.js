import React, { useState, useEffect, useMemo } from 'react';
import { View, Text, TextInput, TouchableOpacity, ScrollView, Switch, Alert } from 'react-native';
import { useGym } from '../../context/GymContext';
import { st, C } from '../../styles/neonTheme';
import { toKey, fromKey, matrizMes, resolverRutina, DIAS, DIAS_CORTO, MESES } from '../../utils/helpers';

export default function RutinaTab() {
  const { username, rutinas, progreso, guardarDia, agregarEjercicio, eliminarEjercicio, toggleEjercicio } = useGym();

  const hoy = new Date();
  const [mes, setMes] = useState({ y: hoy.getFullYear(), m: hoy.getMonth() });
  const [fecha, setFecha] = useState(toKey(hoy));

  const [tit, setTit] = useState('');
  const [desc, setDesc] = useState('');
  const [rep, setRep] = useState(false);
  const [ex, setEx] = useState('');
  const [s, setS] = useState('');
  const [r, setR] = useState('');
  const [p, setP] = useState('');

  const rutina = useMemo(() => resolverRutina(fecha, rutinas), [fecha, rutinas]);
  const nombreDia = DIAS[fromKey(fecha).getDay()];
  const completados = progreso[fecha]?.completados || {};

  // Al cambiar de día (o si la rutina cambia desde otro teléfono) se recarga el formulario.
  useEffect(() => {
    setTit(rutina?.titulo || '');
    setDesc(rutina?.descripcion || '');
    setRep(rutina?.origen === 'semanal');
  }, [fecha, rutina?.refId, rutina?.titulo, rutina?.descripcion]);

  const celdas = useMemo(() => matrizMes(mes.y, mes.m), [mes]);

  const cambiarMes = (d) => {
    const n = new Date(mes.y, mes.m + d, 1);
    setMes({ y: n.getFullYear(), m: n.getMonth() });
  };

  const guardar = async () => {
    if (!tit.trim()) return Alert.alert('Falta el título', 'Escribe un título para el día (ej: Explosión de pierna).');
    try {
      await guardarDia(fecha, tit.trim(), desc.trim(), rep);
      Alert.alert('Sincronizado', rep ? `Aplicado a todos los ${nombreDia.toLowerCase()} desde esta fecha.` : 'Guardado solo para este día.');
    } catch (e) {
      Alert.alert('Error', 'No se pudo guardar. Revisa tu conexión.');
    }
  };

  const agregarEj = async () => {
    if (!ex.trim() || !s || !r) return Alert.alert('Faltan datos', 'Ejercicio, sets y reps son obligatorios.');
    try {
      await agregarEjercicio(fecha, { id: Date.now().toString(), nombre: ex.trim(), sets: s, reps: r, peso: p || '0' });
      setEx(''); setS(''); setR(''); setP('');
    } catch (e) {
      Alert.alert('Error', 'No se pudo añadir el ejercicio.');
    }
  };

  const hechosPorOtros = (ejId) =>
    Object.keys(completados).filter((u) => u !== username && completados[u]?.[ejId]);

  return (
    <ScrollView style={{ padding: 20 }} keyboardShouldPersistTaps="handled" keyboardDismissMode="on-drag">
      {/* Calendario */}
      <View style={st.box}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => cambiarMes(-1)}><Text style={{ color: C.verde, fontSize: 22, paddingHorizontal: 10 }}>‹</Text></TouchableOpacity>
          <Text style={{ color: '#FFF', fontWeight: '900' }}>{MESES[mes.m].toUpperCase()} {mes.y}</Text>
          <TouchableOpacity onPress={() => cambiarMes(1)}><Text style={{ color: C.verde, fontSize: 22, paddingHorizontal: 10 }}>›</Text></TouchableOpacity>
        </View>
        <View style={{ flexDirection: 'row' }}>
          {DIAS_CORTO.map((d, i) => (
            <View key={i} style={{ width: '14.285%', alignItems: 'center' }}>
              <Text style={{ color: '#555', fontSize: 10, fontWeight: 'bold' }}>{d}</Text>
            </View>
          ))}
        </View>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap' }}>
          {celdas.map((d, i) => {
            if (!d) return <View key={i} style={st.calCell} />;
            const k = toKey(d);
            const sel = k === fecha;
            const esHoy = k === toKey(hoy);
            const tiene = !!resolverRutina(k, rutinas);
            return (
              <TouchableOpacity key={i} style={st.calCell} onPress={() => setFecha(k)}>
                <View style={[
                  st.calDay,
                  esHoy && { borderWidth: 1, borderColor: C.azul },
                  sel && { backgroundColor: C.verde }
                ]}>
                  <Text style={{ color: sel ? C.oscuro : '#FFF', fontWeight: sel ? '900' : '400', fontSize: 12 }}>{d.getDate()}</Text>
                </View>
                {tiene && <View style={{ width: 5, height: 5, borderRadius: 3, backgroundColor: sel ? C.oscuro : C.verde, marginTop: -3 }} />}
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* Formulario del día */}
      <Text style={st.sectionTitle}>{nombreDia.toUpperCase()} {fromKey(fecha).getDate()} DE {MESES[fromKey(fecha).getMonth()].toUpperCase()}</Text>
      <View style={st.box}>
        <TextInput style={st.input} placeholder="Título del día (ej: Explosión de pierna)" placeholderTextColor="#444" value={tit} onChangeText={setTit} />
        <TextInput style={st.input} placeholder="Descripción / enfoque" placeholderTextColor="#444" value={desc} onChangeText={setDesc} />
        <View style={st.switchRow}>
          <Text style={{ color: '#FFF', fontSize: 12 }}>Aplicar para todos los {nombreDia.toLowerCase()}s</Text>
          <Switch value={rep} onValueChange={setRep} trackColor={{ false: '#222', true: C.verde }} />
        </View>
        {rutina?.origen === 'semanal' && (
          <Text style={{ color: C.azul, fontSize: 11 }}>🔁 Esta rutina viene de la plantilla semanal: los cambios afectan a todos los {nombreDia.toLowerCase()}s.</Text>
        )}
        <TouchableOpacity style={st.neonBtn} onPress={guardar}><Text style={st.neonBtnTxt}>GUARDAR DÍA</Text></TouchableOpacity>
      </View>

      {/* Ejercicios: se habilitan al guardar el encabezado */}
      {rutina ? (
        <>
          <View style={st.box}>
            <Text style={st.sectionTitle}>NUEVO EJERCICIO</Text>
            <TextInput style={st.input} placeholder="Nombre del ejercicio" placeholderTextColor="#444" value={ex} onChangeText={setEx} />
            <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
              <TextInput style={[st.input, { width: '30%' }]} placeholder="Sets" placeholderTextColor="#444" keyboardType="numeric" value={s} onChangeText={setS} />
              <TextInput style={[st.input, { width: '30%' }]} placeholder="Reps" placeholderTextColor="#444" keyboardType="numeric" value={r} onChangeText={setR} />
              <TextInput style={[st.input, { width: '30%' }]} placeholder="Peso kg" placeholderTextColor="#444" keyboardType="numeric" value={p} onChangeText={setP} />
            </View>
            <TouchableOpacity style={st.neonBtn} onPress={agregarEj}><Text style={st.neonBtnTxt}>AÑADIR EJERCICIO</Text></TouchableOpacity>
          </View>

          <Text style={st.sectionTitle}>CHECKLIST · {rutina.titulo}</Text>
          {(rutina.ejercicios || []).length === 0 && <Text style={{ color: '#555' }}>Aún no hay ejercicios.</Text>}
          {(rutina.ejercicios || []).map((e) => {
            const hecho = !!completados[username]?.[e.id];
            const otros = hechosPorOtros(e.id);
            return (
              <View key={e.id} style={st.smallCard}>
                <TouchableOpacity onPress={() => toggleEjercicio(fecha, e, !hecho)} style={{ flexDirection: 'row', flex: 1, alignItems: 'center' }}>
                  <View style={{ width: 22, height: 22, borderRadius: 6, borderWidth: 2, borderColor: C.verde, backgroundColor: hecho ? C.verde : 'transparent', marginRight: 10, justifyContent: 'center', alignItems: 'center' }}>
                    {hecho && <Text style={{ color: C.oscuro, fontWeight: '900', fontSize: 12 }}>✓</Text>}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={{ color: hecho ? '#555' : '#FFF', textDecorationLine: hecho ? 'line-through' : 'none' }}>
                      {e.nombre} ({e.sets}x{e.reps}) — {e.peso} kg
                    </Text>
                    {otros.length > 0 && <Text style={{ color: C.azul, fontSize: 10 }}>✓ también: {otros.join(', ')}</Text>}
                  </View>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => eliminarEjercicio(fecha, e.id)} style={{ padding: 6 }}>
                  <Text style={{ color: '#aa3355' }}>✕</Text>
                </TouchableOpacity>
              </View>
            );
          })}
        </>
      ) : (
        <Text style={{ color: '#555', fontSize: 12 }}>Guarda el título del día para habilitar los ejercicios.</Text>
      )}
      <View style={{ height: 40 }} />
    </ScrollView>
  );
}
