import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, R, TOP } from '../theme';

// Encabezado oscuro con esquinas redondeadas; admite contenido extra (buscador, chips…).
export default function Header({ titulo, subtitulo, derecha, children }) {
  return (
    <View style={s.wrap}>
      <View style={s.top}>
        <View style={{ flex: 1 }}>
          <Text style={s.h1}>{titulo}</Text>
          {!!subtitulo && <Text style={s.sub}>{subtitulo}</Text>}
        </View>
        {derecha}
      </View>
      {children}
    </View>
  );
}

const s = StyleSheet.create({
  wrap: { backgroundColor: C.brandDark, paddingTop: TOP, paddingHorizontal: 20, paddingBottom: 22, borderBottomLeftRadius: R.xl, borderBottomRightRadius: R.xl },
  top: { flexDirection: 'row', alignItems: 'flex-start', gap: 12 },
  h1: { color: '#fff', fontSize: 28, fontWeight: '800', letterSpacing: -0.5 },
  sub: { color: 'rgba(255,255,255,0.72)', fontSize: 14, marginTop: 4, lineHeight: 20 },
});
