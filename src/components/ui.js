import React, { useEffect, useRef } from 'react';
import { Animated, Pressable, Text, View, ActivityIndicator, StyleSheet } from 'react-native';
import { C, R } from '../theme';

const VARIANTES = {
  primary: { bg: C.brand, fg: '#fff' },
  soft: { bg: C.brandSoft, fg: C.brand },
  ghost: { bg: 'transparent', fg: C.brand, border: C.line },
  danger: { bg: C.dangerSoft, fg: C.danger },
  glass: { bg: 'rgba(255,255,255,0.16)', fg: '#fff' },
};

export function Button({ title, onPress, variant = 'primary', icon, disabled, loading, small, style }) {
  const v = VARIANTES[variant];
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={title}
      onPress={onPress}
      disabled={disabled || loading}
      style={({ pressed }) => [
        s.btn,
        small && s.btnSm,
        { backgroundColor: v.bg, borderColor: v.border ?? 'transparent', borderWidth: v.border ? 1 : 0 },
        disabled && { opacity: 0.45 },
        pressed && { opacity: 0.85, transform: [{ scale: 0.98 }] },
        style,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={v.fg} size="small" />
      ) : (
        <>
          {icon ? <Text style={[s.btnIco, { color: v.fg }]}>{icon}</Text> : null}
          <Text style={[s.btnTxt, small && s.btnTxtSm, { color: v.fg }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const TONOS = {
  neutral: { bg: C.chip, fg: C.sub },
  brand: { bg: C.brandSoft, fg: C.brand },
  ok: { bg: C.okSoft, fg: C.ok },
  warn: { bg: C.warnSoft, fg: C.warn },
  danger: { bg: C.dangerSoft, fg: C.danger },
  glass: { bg: 'rgba(255,255,255,0.14)', fg: '#fff' },
};

export function Chip({ label, icon, tone = 'neutral', onPress, style }) {
  const t = TONOS[tone];
  const body = (
    <View style={[s.chip, { backgroundColor: t.bg }, style]}>
      {icon ? <Text style={[s.chipTxt, { color: t.fg }]}>{icon} </Text> : null}
      <Text style={[s.chipTxt, { color: t.fg }]} numberOfLines={1}>{label}</Text>
    </View>
  );
  return onPress ? (
    <Pressable onPress={onPress} accessibilityRole="button" style={({ pressed }) => pressed && { opacity: 0.7 }}>
      {body}
    </Pressable>
  ) : body;
}

// Bloque gris pulsante para estados de carga.
export function Skeleton({ w = '100%', h = 14, style }) {
  const a = useRef(new Animated.Value(0.35)).current;
  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(a, { toValue: 0.85, duration: 700, useNativeDriver: true }),
        Animated.timing(a, { toValue: 0.35, duration: 700, useNativeDriver: true }),
      ])
    );
    loop.start();
    return () => loop.stop();
  }, [a]);
  return <Animated.View style={[{ width: w, height: h, borderRadius: 8, backgroundColor: '#D7DEEC', opacity: a }, style]} />;
}

export function Fila({ k, v }) {
  return (
    <View style={s.fila}>
      <Text style={s.filaK}>{k}</Text>
      <Text style={s.filaV} numberOfLines={2}>{v}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  btn: { minHeight: 46, borderRadius: R.md, paddingHorizontal: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8 },
  btnSm: { minHeight: 36, paddingHorizontal: 14, borderRadius: R.sm },
  btnTxt: { fontSize: 15, fontWeight: '700' },
  btnTxtSm: { fontSize: 13 },
  btnIco: { fontSize: 16 },
  chip: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 11, paddingVertical: 6, borderRadius: R.pill, alignSelf: 'flex-start' },
  chipTxt: { fontSize: 12.5, fontWeight: '600' },
  fila: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 9, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.line, gap: 16 },
  filaK: { color: C.sub, fontSize: 14 },
  filaV: { color: C.ink, fontSize: 14, fontWeight: '600', flexShrink: 1, textAlign: 'right' },
});
