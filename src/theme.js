import { Platform, StatusBar } from 'react-native';

export const C = {
  bg: '#F3F5FA',
  surface: '#FFFFFF',
  ink: '#0F172A',
  sub: '#475569',
  mute: '#94A3B8',
  line: '#E5E9F2',
  brand: '#2457F5',
  brandDark: '#0B1F52',
  brandSoft: '#E8EEFF',
  teal: '#0EA5A4',
  danger: '#D92D20',
  dangerSoft: '#FEF0EE',
  ok: '#12805C',
  okSoft: '#E3F6EE',
  warn: '#B54708',
  warnSoft: '#FFF4E0',
  chip: '#EEF2F8',
};

export const R = { sm: 10, md: 16, lg: 22, xl: 28, pill: 999 };

export const shadow = {
  shadowColor: '#0B1F52',
  shadowOpacity: 0.08,
  shadowRadius: 14,
  shadowOffset: { width: 0, height: 6 },
  elevation: 3,
};

// Espacio superior para no quedar debajo de la barra de estado.
export const TOP = Platform.select({
  ios: 56,
  default: Math.max(StatusBar.currentHeight || 0, 28) + 14,
});
