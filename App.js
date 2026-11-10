import React, { useState } from 'react';
import { View, Text, Pressable, StyleSheet, Platform } from 'react-native';
import { StatusBar } from 'expo-status-bar';
import DestinosScreen from './src/screens/DestinosScreen';
import IncidenciasScreen from './src/screens/IncidenciasScreen';
import { C, R, shadow } from './src/theme';

const TABS = [
  { id: 'destinos', icono: '🌎', label: 'Destinos', Screen: DestinosScreen },
  { id: 'incidencias', icono: '📝', label: 'Incidencias', Screen: IncidenciasScreen },
];

export default function App() {
  const [tab, setTab] = useState('destinos');
  return (
    <View style={s.root}>
      <StatusBar style="light" />
      {/* Ambas pantallas se mantienen montadas para conservar su estado al cambiar de pestaña */}
      {TABS.map(({ id, Screen }) => (
        <View key={id} style={[s.screen, tab !== id && s.hidden]}>
          <Screen />
        </View>
      ))}
      <View style={s.bar}>
        {TABS.map(({ id, icono, label }) => {
          const activa = tab === id;
          return (
            <Pressable key={id} onPress={() => setTab(id)} accessibilityRole="tab" accessibilityState={{ selected: activa }} style={s.tab}>
              <View style={[s.pill, activa && s.pillOn]}>
                <Text style={s.ico}>{icono}</Text>
                <Text style={[s.txt, activa && s.txtOn]}>{label}</Text>
              </View>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  root: { flex: 1, backgroundColor: C.bg },
  screen: { flex: 1 },
  hidden: { display: 'none' },
  bar: {
    flexDirection: 'row', backgroundColor: C.surface, paddingTop: 8, paddingBottom: Platform.OS === 'ios' ? 26 : 14,
    paddingHorizontal: 12, borderTopLeftRadius: R.xl, borderTopRightRadius: R.xl, ...shadow, shadowOffset: { width: 0, height: -4 },
  },
  tab: { flex: 1, alignItems: 'center' },
  pill: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingHorizontal: 18, paddingVertical: 10, borderRadius: R.pill },
  pillOn: { backgroundColor: C.brandSoft },
  ico: { fontSize: 18 },
  txt: { color: C.mute, fontWeight: '700', fontSize: 14 },
  txtOn: { color: C.brand },
});
