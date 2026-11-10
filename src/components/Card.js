import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { C, R, shadow } from '../theme';
import { Button, Skeleton } from './ui';

// Tarjeta con estados: cargando (esqueleto) / error (con reintento) / contenido.
// Sin la prop "estado" es un simple contenedor con título.
export default function Card({ titulo, icono, estado, onReintentar, lineas = 3, derecha, style, children }) {
  return (
    <View style={[s.card, style]}>
      {(titulo || derecha) && (
        <View style={s.head}>
          {icono ? <View style={s.ico}><Text style={{ fontSize: 16 }}>{icono}</Text></View> : null}
          <Text style={s.titulo} numberOfLines={1}>{titulo}</Text>
          {derecha}
        </View>
      )}

      {estado?.cargando && (
        <View style={{ gap: 10 }}>
          <Skeleton h={22} w="55%" />
          {Array.from({ length: lineas }).map((_, i) => <Skeleton key={i} w={i % 2 ? '70%' : '92%'} />)}
        </View>
      )}

      {estado && !estado.cargando && estado.error && (
        <View style={s.err}>
          <Text style={s.errTxt}>⚠️  {estado.error}</Text>
          {onReintentar && <Button title="Reintentar" icon="↻" variant="soft" small onPress={onReintentar} style={{ alignSelf: 'flex-start', marginTop: 10 }} />}
        </View>
      )}

      {(!estado || (!estado.cargando && !estado.error && estado.data)) && children}
    </View>
  );
}

const s = StyleSheet.create({
  card: { backgroundColor: C.surface, borderRadius: R.lg, padding: 18, marginBottom: 14, ...shadow },
  head: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 14 },
  ico: { width: 32, height: 32, borderRadius: 10, backgroundColor: C.brandSoft, alignItems: 'center', justifyContent: 'center' },
  titulo: { flex: 1, fontSize: 15, fontWeight: '700', color: C.ink },
  err: { backgroundColor: C.dangerSoft, borderRadius: R.md, padding: 14 },
  errTxt: { color: C.danger, fontSize: 14, lineHeight: 20 },
});
