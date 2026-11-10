import React, { useState, useRef, useEffect } from 'react';
import {
  ScrollView, View, Text, TextInput, Pressable, Switch, Image, Linking, Share, StyleSheet, Keyboard,
} from 'react-native';
import Header from '../components/Header';
import Card from '../components/Card';
import { Button, Chip, Fila } from '../components/ui';
import { C, R } from '../theme';
import { buscarCiudad } from '../services/geocoding';
import { obtenerClima } from '../services/weather';
import { obtenerPais } from '../services/country';
import { leerRecientes, guardarReciente, borrarRecientes } from '../services/history';
import { miles, diaCorto, redondear } from '../utils/format';

const VACIO = { cargando: false, error: null, data: null };
const SERVICIOS = ['osm', 'clima', 'pais'];
const ETIQUETAS = { osm: 'OpenStreetMap', clima: 'Open-Meteo', pais: 'REST Countries' };
const SUGERENCIAS = ['Toluca', 'Ciudad de México', 'Madrid', 'Tokyo', 'París'];

export default function DestinosScreen() {
  const [ciudad, setCiudad] = useState('');
  const [consulta, setConsulta] = useState('');
  const [geo, setGeo] = useState(VACIO);
  const [clima, setClima] = useState(VACIO);
  const [pais, setPais] = useState(VACIO);
  const [recientes, setRecientes] = useState([]);
  const [panelPrueba, setPanelPrueba] = useState(false);
  // Modo prueba: permite simular la caída de cada API (ON = esa API "no responde").
  const [caidas, setCaidas] = useState({ osm: false, clima: false, pais: false });
  const reqId = useRef(0); // ignora respuestas de búsquedas antiguas

  useEffect(() => { leerRecientes().then(setRecientes); }, []);

  const cargarClima = async (lat, lon, sim, id) => {
    setClima({ cargando: true, error: null, data: null });
    try {
      const data = await obtenerClima(lat, lon, { simulateFailure: sim.clima });
      if (id === reqId.current) setClima({ cargando: false, error: null, data });
    } catch (e) {
      if (id === reqId.current) setClima({ cargando: false, error: e.message, data: null });
    }
  };

  const cargarPais = async (codigo, sim, id, nombre) => {
    setPais({ cargando: true, error: null, data: null });
    try {
      const data = await obtenerPais(codigo, { simulateFailure: sim.pais, nombre });
      if (id === reqId.current) setPais({ cargando: false, error: null, data });
    } catch (e) {
      if (id === reqId.current) setPais({ cargando: false, error: e.message, data: null });
    }
  };

  const buscar = async (texto = ciudad, sim = caidas) => {
    const q = String(texto ?? '').trim();
    if (!q) return;
    Keyboard.dismiss();
    const id = ++reqId.current;
    setCiudad(q);
    setConsulta(q);
    setClima(VACIO);
    setPais(VACIO);
    setGeo({ cargando: true, error: null, data: null });
    try {
      // 1) API 1 → coordenadas y código de país
      const lugar = await buscarCiudad(q, { simulateFailure: sim.osm });
      if (id !== reqId.current) return;
      setGeo({ cargando: false, error: null, data: lugar });
      guardarReciente(lugar.nombre || q).then(setRecientes);
      // 2) y 3) APIs dependientes, en paralelo e independientes entre sí:
      // si una falla, la otra se sigue mostrando.
      cargarClima(lugar.lat, lugar.lon, sim, id);
      if (lugar.paisCodigo) cargarPais(lugar.paisCodigo, sim, id, lugar.paisNombre);
      else setPais({ cargando: false, error: 'No se pudo determinar el país.', data: null });
    } catch (e) {
      if (id === reqId.current) setGeo({ cargando: false, error: e.message, data: null });
    }
  };

  // Al reintentar se apaga la simulación de ese servicio, para demostrar la recuperación.
  const apagar = (k) => {
    const sim = { ...caidas, [k]: false };
    setCaidas(sim);
    return sim;
  };
  const reintentarGeo = () => buscar(consulta, apagar('osm'));
  const reintentarClima = () => g && cargarClima(g.lat, g.lon, apagar('clima'), reqId.current);
  const reintentarPais = () => g?.paisCodigo && cargarPais(g.paisCodigo, apagar('pais'), reqId.current, g.paisNombre);

  const g = geo.data;
  const c = clima.data;
  const p = pais.data;
  const hayAlgo = geo.cargando || geo.error || g;
  const simActivas = SERVICIOS.filter((k) => caidas[k]);

  const compartir = () => {
    const lineas = [`📍 ${g.nombre}${g.paisNombre ? `, ${g.paisNombre}` : ''}`];
    if (c) lineas.push(`${c.actual.icono} ${redondear(c.actual.temp)}${c.unidades.temp} · ${c.actual.descripcion}`);
    if (p) lineas.push(`🏙️ ${[p.capital && `Capital: ${p.capital}`, p.poblacion != null && `Población: ${miles(p.poblacion)}`].filter(Boolean).join(' · ')}`);
    lineas.push(g.osmUrl);
    Share.share({ message: lineas.join('\n') }).catch(() => {});
  };

  return (
    <ScrollView
      style={{ flex: 1 }}
      contentContainerStyle={{ paddingBottom: 28 }}
      keyboardShouldPersistTaps="handled"
      automaticallyAdjustKeyboardInsets
    >
      <Header titulo="Guía de destinos" subtitulo="Ubicación, clima y datos del país en un solo lugar.">
        <View style={s.search}>
          <Text style={s.lupa}>🔍</Text>
          <TextInput
            style={s.input}
            placeholder="Busca una ciudad…"
            placeholderTextColor={C.mute}
            value={ciudad}
            onChangeText={setCiudad}
            onSubmitEditing={() => buscar()}
            returnKeyType="search"
            autoCorrect={false}
          />
          {!!ciudad && (
            <Pressable onPress={() => setCiudad('')} hitSlop={10} accessibilityLabel="Borrar texto">
              <Text style={s.clear}>✕</Text>
            </Pressable>
          )}
          <Pressable style={s.go} onPress={() => buscar()} accessibilityRole="button" accessibilityLabel="Buscar">
            <Text style={s.goTxt}>Buscar</Text>
          </Pressable>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={s.chips} keyboardShouldPersistTaps="handled">
          {(recientes.length ? recientes : SUGERENCIAS).map((t) => (
            <Chip key={t} label={t} icon={recientes.length ? '🕘' : '✨'} tone="glass" onPress={() => buscar(t)} />
          ))}
        </ScrollView>
      </Header>

      <View style={s.body}>
        {simActivas.length > 0 && (
          <View style={s.simBanner}>
            <Text style={s.simTxt}>🧪 Simulación activa: {simActivas.map((k) => ETIQUETAS[k]).join(', ')}</Text>
          </View>
        )}

        {!hayAlgo && (
          <View style={s.vacio}>
            <Text style={s.vacioIco}>🧭</Text>
            <Text style={s.vacioT}>¿A dónde vamos?</Text>
            <Text style={s.vacioS}>Escribe una ciudad o toca una sugerencia para ver su ubicación, el clima de los próximos días y datos del país.</Text>
            {recientes.length > 0 && (
              <Button title="Borrar historial" variant="ghost" small style={{ marginTop: 12 }} onPress={() => borrarRecientes().then(setRecientes)} />
            )}
          </View>
        )}

        {hayAlgo && (
          <Card titulo="Ubicación" icono="📍" estado={geo} onReintentar={reintentarGeo} lineas={2}
                derecha={g ? <Chip label={g.fuente} tone={g.fuente === 'OpenStreetMap' ? 'brand' : 'warn'} /> : null}>
            {g && (
              <>
                <Text style={s.big}>{g.nombre}</Text>
                <Text style={s.dir} numberOfLines={2}>{g.direccion}</Text>
                <View style={s.wrapRow}>
                  {g.estado && <Chip label={g.estado} icon="🗺️" />}
                  {g.paisNombre && <Chip label={g.paisNombre} icon="🏳️" />}
                  <Chip label={`${g.lat.toFixed(3)}, ${g.lon.toFixed(3)}`} icon="🎯" />
                </View>
                <View style={s.acciones}>
                  <Button title="Abrir mapa" icon="🗺️" small style={{ flex: 1 }} onPress={() => Linking.openURL(g.osmUrl)} />
                  <Button title="Compartir" icon="📤" variant="soft" small style={{ flex: 1 }} onPress={compartir} />
                </View>
              </>
            )}
          </Card>
        )}

        {(g || clima.cargando || clima.error) && (
          <Card titulo={`Clima en ${g?.nombre ?? ''}`} icono="⛅" estado={clima} onReintentar={reintentarClima} derecha={<Chip label="Open-Meteo" tone="neutral" />}>
            {c && (
              <>
                <View style={s.climaTop}>
                  <Text style={s.climaIco}>{c.actual.icono}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.temp}>{redondear(c.actual.temp)}{c.unidades.temp}</Text>
                    <Text style={s.climaDesc}>{c.actual.descripcion}</Text>
                  </View>
                </View>
                <View style={s.wrapRow}>
                  <Chip label={`Sensación ${redondear(c.actual.sensacion)}${c.unidades.temp}`} icon="🌡️" />
                  <Chip label={`Humedad ${c.actual.humedad}%`} icon="💧" />
                  <Chip label={`Viento ${redondear(c.actual.viento)} ${c.unidades.viento}`} icon="🌬️" />
                </View>
                <View style={s.dias}>
                  {c.pronostico.map((d, i) => (
                    <View key={d.fecha} style={[s.dia, i === 0 && s.diaHoy]}>
                      <Text style={[s.diaN, i === 0 && { color: C.brand }]}>{i === 0 ? 'hoy' : diaCorto(d.fecha)}</Text>
                      <Text style={s.diaIco}>{d.icono}</Text>
                      <Text style={s.diaMax}>{redondear(d.max)}°</Text>
                      <Text style={s.diaMin}>{redondear(d.min)}°</Text>
                      {d.lluvia != null && <Text style={s.diaLluvia}>💧 {d.lluvia}%</Text>}
                    </View>
                  ))}
                </View>
              </>
            )}
          </Card>
        )}

        {(g || pais.cargando || pais.error) && (
          <Card titulo="País" icono="🏳️" estado={pais} onReintentar={reintentarPais} derecha={<Chip label="REST Countries" tone="neutral" />}>
            {p && (
              <>
                <View style={s.paisTop}>
                  {p.bandera && <Image source={{ uri: p.bandera }} style={s.flag} resizeMode="cover" />}
                  <View style={{ flex: 1 }}>
                    <Text style={s.big}>{p.nombre}</Text>
                    {p.region && <Text style={s.dir}>{p.region}</Text>}
                  </View>
                </View>
                {p.capital && <Fila k="Capital" v={p.capital} />}
                {p.poblacion != null && <Fila k="Población" v={miles(p.poblacion)} />}
                <View style={[s.wrapRow, { marginTop: 14 }]}>
                  {p.idiomas.map((i) => <Chip key={i} label={i} icon="💬" tone="brand" />)}
                  {p.monedas.map((m) => <Chip key={m} label={m} icon="💰" tone="ok" />)}
                </View>
              </>
            )}
          </Card>
        )}

        <Card style={{ backgroundColor: C.warnSoft, shadowOpacity: 0 }}>
          <Pressable style={s.testHead} onPress={() => setPanelPrueba((v) => !v)} accessibilityRole="button">
            <Text style={s.testTitle}>🧪 Modo prueba</Text>
            <Text style={s.chev}>{panelPrueba ? '▲' : '▼'}</Text>
          </Pressable>
          {panelPrueba && (
            <View style={{ marginTop: 10 }}>
              <Text style={s.testHint}>Activa un interruptor para simular que esa API está caída y luego busca. Todos apagados = funcionamiento normal.</Text>
              {SERVICIOS.map((k) => (
                <View key={k} style={s.testRow}>
                  <Text style={s.testLbl}>{ETIQUETAS[k]}</Text>
                  <Switch value={caidas[k]} onValueChange={(v) => setCaidas((x) => ({ ...x, [k]: v }))} trackColor={{ true: C.warn }} />
                </View>
              ))}
              {simActivas.length > 0 && (
                <Button title="Apagar todas" variant="ghost" small style={{ alignSelf: 'flex-start', marginTop: 8 }}
                        onPress={() => setCaidas({ osm: false, clima: false, pais: false })} />
              )}
            </View>
          )}
        </Card>
      </View>
    </ScrollView>
  );
}

const s = StyleSheet.create({
  search: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: R.lg, paddingLeft: 14, paddingRight: 6, height: 54, marginTop: 20, gap: 8 },
  lupa: { fontSize: 16 },
  input: { flex: 1, fontSize: 16, color: C.ink, height: 54 },
  clear: { color: C.mute, fontSize: 16, paddingHorizontal: 4 },
  go: { backgroundColor: C.brand, borderRadius: R.md, paddingHorizontal: 16, height: 42, justifyContent: 'center' },
  goTxt: { color: '#fff', fontWeight: '700' },
  chips: { gap: 8, paddingTop: 14, paddingRight: 8 },
  body: { padding: 16, paddingTop: 18 },
  simBanner: { backgroundColor: C.warnSoft, borderRadius: R.md, padding: 12, marginBottom: 14 },
  simTxt: { color: C.warn, fontWeight: '700', fontSize: 13 },
  vacio: { alignItems: 'center', paddingVertical: 36, paddingHorizontal: 20 },
  vacioIco: { fontSize: 54 },
  vacioT: { fontSize: 20, fontWeight: '800', color: C.ink, marginTop: 10 },
  vacioS: { color: C.sub, textAlign: 'center', marginTop: 6, lineHeight: 21 },
  big: { fontSize: 22, fontWeight: '800', color: C.ink, letterSpacing: -0.3 },
  dir: { color: C.sub, marginTop: 4, lineHeight: 20 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  acciones: { flexDirection: 'row', gap: 10, marginTop: 16 },
  climaTop: { flexDirection: 'row', alignItems: 'center', gap: 14 },
  climaIco: { fontSize: 56 },
  temp: { fontSize: 44, fontWeight: '800', color: C.ink, letterSpacing: -1.5, lineHeight: 50 },
  climaDesc: { color: C.sub, fontSize: 15, fontWeight: '600' },
  dias: { flexDirection: 'row', gap: 10, marginTop: 16 },
  dia: { flex: 1, alignItems: 'center', backgroundColor: C.chip, borderRadius: R.md, paddingVertical: 12 },
  diaHoy: { backgroundColor: C.brandSoft },
  diaN: { color: C.sub, fontWeight: '700', fontSize: 13, textTransform: 'capitalize' },
  diaIco: { fontSize: 26, marginVertical: 4 },
  diaMax: { fontWeight: '800', color: C.ink, fontSize: 16 },
  diaMin: { color: C.sub, fontSize: 13 },
  diaLluvia: { color: C.brand, fontSize: 11, marginTop: 4, fontWeight: '600' },
  paisTop: { flexDirection: 'row', alignItems: 'center', gap: 14, marginBottom: 8 },
  flag: { width: 72, height: 48, borderRadius: 8, backgroundColor: C.chip },
  testHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testTitle: { fontWeight: '800', color: C.warn, fontSize: 15 },
  chev: { color: C.warn, fontSize: 12 },
  testHint: { color: C.warn, lineHeight: 19, marginBottom: 6, fontSize: 13 },
  testRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  testLbl: { color: C.ink, fontWeight: '600' },
});
