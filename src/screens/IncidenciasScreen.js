import React, { useState, useEffect, useCallback } from 'react';
import {
  ScrollView, View, Text, TextInput, Pressable, Image, Alert, Modal,
  ActivityIndicator, RefreshControl, StyleSheet, Keyboard,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import Header from '../components/Header';
import Card from '../components/Card';
import { Button, Chip } from '../components/ui';
import { C, R } from '../theme';
import { SUPABASE_CONFIGURADO, SUPABASE_URL, SUPABASE_ANON_KEY, BUCKET, CONFIG_FALTANTE } from '../config';
import { subirImagenBase64, subirBytes, urlFirmada } from '../services/storage';
import { crearIncidencia, listarIncidencias, eliminarIncidencia } from '../services/incidencias';
import { diagnosticar } from '../services/diagnostico';
import { validateImage } from '../utils/validation';
import { base64ToBytes } from '../utils/base64';
import { hace } from '../utils/format';

const OPCIONES_PICKER = { mediaTypes: ['images'], quality: 0.7, base64: true };

export default function IncidenciasScreen() {
  const [usuario, setUsuario] = useState(null);
  const [pasos, setPasos] = useState([]);
  const [comprobando, setComprobando] = useState(false);
  const [titulo, setTitulo] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [imagen, setImagen] = useState(null); // asset del picker (con base64)
  const [envio, setEnvio] = useState({ fase: 'idle', mensaje: null, resultado: null });
  const [lista, setLista] = useState({ cargando: false, error: null, data: [] });
  const [pruebas, setPruebas] = useState([]);
  const [panelPrueba, setPanelPrueba] = useState(false);
  const [visor, setVisor] = useState(null);

  const listo = pasos.length > 0 && pasos.every((p) => p.ok);

  const cargarLista = useCallback(async () => {
    setLista((p) => ({ ...p, cargando: true, error: null }));
    try {
      setLista({ cargando: false, error: null, data: await listarIncidencias() });
    } catch (e) {
      setLista((p) => ({ ...p, cargando: false, error: e.message }));
    }
  }, []);

  const comprobar = useCallback(async () => {
    setComprobando(true);
    const r = await diagnosticar();
    setUsuario(r.usuario);
    setPasos(r.pasos);
    setComprobando(false);
  }, []);

  useEffect(() => { if (SUPABASE_CONFIGURADO) comprobar(); }, [comprobar]);
  useEffect(() => { if (listo) cargarLista(); }, [listo, cargarLista]);

  // ---------- Selección de imagen ----------
  const elegir = async (origen) => {
    try {
      let res;
      if (origen === 'camara') {
        const perm = await ImagePicker.requestCameraPermissionsAsync();
        if (!perm.granted) return Alert.alert('Permiso denegado', 'Activa el permiso de cámara para tomar la foto.');
        res = await ImagePicker.launchCameraAsync(OPCIONES_PICKER);
      } else {
        res = await ImagePicker.launchImageLibraryAsync(OPCIONES_PICKER);
      }
      if (res.canceled) return;
      const asset = res.assets[0];
      const size = asset.base64 ? base64ToBytes(asset.base64).length : asset.fileSize;
      const v = validateImage({ mimeType: asset.mimeType, fileName: asset.fileName || asset.uri, size });
      if (!v.ok) {
        setImagen(null);
        return Alert.alert('Archivo no válido', v.error);
      }
      setImagen({ ...asset, mime: v.mime, size });
      setEnvio({ fase: 'idle', mensaje: null, resultado: null });
    } catch (e) {
      Alert.alert('Error', 'No se pudo abrir la cámara o la galería.');
    }
  };

  // ---------- Envío ----------
  const enviar = async () => {
    Keyboard.dismiss();
    if (titulo.trim().length < 3) return Alert.alert('Falta información', 'Escribe un título de al menos 3 caracteres.');
    try {
      let ref = null;
      if (imagen) {
        setEnvio({ fase: 'subiendo', mensaje: 'Subiendo imagen a la nube…', resultado: null });
        ref = await subirImagenBase64(imagen.base64, imagen.mime, usuario.id);
      }
      setEnvio({ fase: 'guardando', mensaje: 'Guardando incidencia…', resultado: null });
      const fila = await crearIncidencia({ titulo, descripcion, imagen: ref });
      const url = ref ? await urlFirmada(ref.path) : null;
      setEnvio({
        fase: 'ok',
        mensaje: 'Incidencia registrada correctamente.',
        resultado: { id: fila.id, path: ref?.path, size: ref?.size, mime: ref?.mime, url },
      });
      setTitulo(''); setDescripcion(''); setImagen(null);
      cargarLista();
    } catch (e) {
      // Se conserva el formulario para poder reintentar sin perder la foto.
      setEnvio({ fase: 'error', mensaje: e.message, resultado: null });
    }
  };

  const borrar = (r) =>
    Alert.alert('Eliminar incidencia', `¿Eliminar "${r.titulo}"? Esta acción no se puede deshacer.`, [
      { text: 'Cancelar', style: 'cancel' },
      {
        text: 'Eliminar', style: 'destructive',
        onPress: async () => {
          try {
            await eliminarIncidencia(r);
            setLista((p) => ({ ...p, data: p.data.filter((x) => x.id !== r.id) }));
          } catch (e) {
            Alert.alert('No se pudo eliminar', e.message);
          }
        },
      },
    ]);

  // ---------- Pruebas de seguridad ----------
  const log = (txt) => setPruebas((p) => [txt, ...p].slice(0, 8));
  const ultimaRuta = lista.data.find((r) => r.image_path)?.image_path;

  const pruebaFormatoLocal = () => {
    const v = validateImage({ mimeType: 'text/plain', fileName: 'notas.txt', size: 20 });
    log(`1) Formato .txt con validación local → ${v.ok ? 'ACEPTADO ✗' : 'BLOQUEADO ✓: ' + v.error}`);
  };
  const pruebaFormatoServidor = async () => {
    try {
      const bytes = Uint8Array.from('esto no es una imagen', (ch) => ch.charCodeAt(0));
      await subirBytes(bytes, 'text/plain', usuario.id, `${usuario.id}/prueba-${Date.now()}.txt`);
      log('2) .txt saltando validación local → ACEPTADO por el servidor ✗ (revisa allowed_mime_types)');
    } catch (e) {
      log(`2) .txt saltando validación local → RECHAZADO por el servidor ✓: ${e.message}`);
    }
  };
  const pruebaPublica = async () => {
    if (!ultimaRuta) return log('3) Primero registra una incidencia con foto.');
    try {
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/public/${BUCKET}/${ultimaRuta}`);
      log(`3) URL pública sin firma → HTTP ${r.status} ${r.ok ? 'ACCESIBLE ✗' : 'DENEGADO ✓'}`);
    } catch { log('3) Sin conexión: no se pudo probar.'); }
  };
  const pruebaSinSesion = async () => {
    if (!ultimaRuta) return log('4) Primero registra una incidencia con foto.');
    try {
      // Solo la anon key, sin la sesión del usuario → rol "anon", sin permisos sobre el bucket.
      const r = await fetch(`${SUPABASE_URL}/storage/v1/object/${BUCKET}/${ultimaRuta}`, {
        headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      });
      log(`4) Lectura sin sesión de usuario → HTTP ${r.status} ${r.ok ? 'ACCESIBLE ✗' : 'DENEGADO ✓'}`);
    } catch { log('4) Sin conexión: no se pudo probar.'); }
  };
  const pruebaAjena = async () => {
    try {
      await urlFirmada('00000000-0000-0000-0000-000000000000/ajena.jpg');
      log('5) Firmar archivo de otro usuario → PERMITIDO ✗');
    } catch (e) {
      log(`5) Firmar archivo de otro usuario → DENEGADO ✓: ${e.message}`);
    }
  };

  // ---------- Falta .env ----------
  if (!SUPABASE_CONFIGURADO) {
    return (
      <View style={{ flex: 1 }}>
        <Header titulo="Incidencias" subtitulo="Reporta problemas con foto, guardados en la nube." />
        <View style={{ padding: 16 }}>
          <Card titulo="Falta configurar Supabase" icono="🔧" style={{ backgroundColor: C.warnSoft }}>
            <Text style={s.paso}>1. Copia <Text style={s.code}>.env.example</Text> a <Text style={s.code}>.env</Text></Text>
            <Text style={s.paso}>2. Pega tu Project URL y tu anon key en estas variables:</Text>
            <Text style={s.codeBlock}>EXPO_PUBLIC_SUPABASE_URL{'\n'}EXPO_PUBLIC_SUPABASE_ANON_KEY</Text>
            <Text style={s.paso}>3. Reinicia con <Text style={s.code}>npx expo start -c</Text></Text>
            {CONFIG_FALTANTE.length > 0 && (
              <Text style={s.error}>No se detectó: {CONFIG_FALTANTE.join(', ')}. Ojo: el prefijo debe ser EXPO_PUBLIC_ (NEXT_PUBLIC_ no funciona en Expo).</Text>
            )}
          </Card>
        </View>
      </View>
    );
  }

  const ocupado = envio.fase === 'subiendo' || envio.fase === 'guardando';
  const puedeEnviar = listo && !ocupado && !!usuario;

  return (
    <>
      <ScrollView
        style={{ flex: 1 }}
        contentContainerStyle={{ paddingBottom: 28 }}
        keyboardShouldPersistTaps="handled"
        automaticallyAdjustKeyboardInsets
        refreshControl={<RefreshControl refreshing={lista.cargando} onRefresh={listo ? cargarLista : comprobar} />}
      >
        <Header
          titulo="Incidencias"
          subtitulo="Reporta problemas con foto, guardados en la nube."
          derecha={comprobando ? <ActivityIndicator color="#fff" style={{ marginTop: 8 }} />
            : listo ? <Chip label="Conectado" icon="☁️" tone="glass" style={{ marginTop: 6 }} /> : null}
        />

        <View style={s.body}>
          {/* Diagnóstico: solo aparece mientras algo falte */}
          {!listo && pasos.length > 0 && (
            <Card titulo="Configuración de Supabase" icono="🔧" style={{ backgroundColor: C.warnSoft }}>
              {pasos.map((p) => (
                <View key={p.id} style={s.diagFila}>
                  <Text style={s.diagIco}>{p.ok ? '✅' : '❌'}</Text>
                  <View style={{ flex: 1 }}>
                    <Text style={s.diagLbl}>{p.label}</Text>
                    {!p.ok && <Text style={s.diagDet}>{p.detalle}</Text>}
                  </View>
                </View>
              ))}
              <Button title="Volver a comprobar" icon="↻" variant="soft" small loading={comprobando} onPress={comprobar} style={{ alignSelf: 'flex-start', marginTop: 12 }} />
            </Card>
          )}

          <Card titulo="Nuevo reporte" icono="✍️">
            <TextInput style={s.input} placeholder="Título (ej. Fuga de agua en baño 2)" placeholderTextColor={C.mute}
                       value={titulo} onChangeText={setTitulo} maxLength={120} />
            <TextInput style={[s.input, s.multi]} placeholder="Describe lo que pasó…" placeholderTextColor={C.mute}
                       value={descripcion} onChangeText={setDescripcion} multiline maxLength={1000} />
            <Text style={s.contador}>{descripcion.length}/1000</Text>

            {imagen ? (
              <View style={s.previewBox}>
                <Image source={{ uri: imagen.uri }} style={s.img} resizeMode="cover" />
                <View style={s.previewBar}>
                  <Chip label={`${imagen.mime.replace('image/', '').toUpperCase()} · ${(imagen.size / 1024).toFixed(0)} KB`} icon="🖼️" />
                  <Button title="Quitar" variant="danger" small onPress={() => setImagen(null)} />
                </View>
              </View>
            ) : (
              <View style={s.adjuntar}>
                <Text style={s.adjuntarT}>📎 Adjuntar foto (opcional)</Text>
                <View style={s.row}>
                  <Button title="Galería" icon="🖼️" variant="soft" style={{ flex: 1 }} onPress={() => elegir('galeria')} />
                  <Button title="Cámara" icon="📷" variant="soft" style={{ flex: 1 }} onPress={() => elegir('camara')} />
                </View>
                <Text style={s.nota}>JPG, PNG o WebP · máx. 5 MB</Text>
              </View>
            )}

            <Button title={ocupado ? envio.mensaje : 'Enviar incidencia'} icon={ocupado ? undefined : '🚀'} loading={ocupado}
                    disabled={!puedeEnviar} onPress={enviar} style={{ marginTop: 14 }} />
            {!listo && pasos.length > 0 && <Text style={s.nota}>Completa la configuración de arriba para poder enviar.</Text>}

            {envio.fase === 'error' && (
              <View style={s.errBox}>
                <Text style={s.errTxt}>⚠️  {envio.mensaje}</Text>
                <Text style={s.nota}>Tus datos y tu foto se conservaron. Pulsa "Enviar" para reintentar.</Text>
              </View>
            )}
            {envio.fase === 'ok' && envio.resultado && (
              <View style={s.okBox}>
                <Text style={s.okTxt}>✅  {envio.mensaje}</Text>
                {envio.resultado.path && (
                  <>
                    <Text style={s.mono}>Ruta guardada: {envio.resultado.path}</Text>
                    <Text style={s.nota}>{envio.resultado.mime} · {(envio.resultado.size / 1024).toFixed(0)} KB · URL temporal (1 h)</Text>
                  </>
                )}
              </View>
            )}
          </Card>

          <View style={s.listaHead}>
            <Text style={s.h2}>Mis incidencias</Text>
            {lista.data.length > 0 && <Chip label={String(lista.data.length)} tone="brand" />}
          </View>

          {lista.cargando && !lista.data.length && <ActivityIndicator style={{ marginVertical: 16 }} />}
          {lista.error && (
            <Card style={{ backgroundColor: C.dangerSoft }}>
              <Text style={s.errTxt}>⚠️  {lista.error}</Text>
              <Button title="Reintentar" icon="↻" variant="soft" small onPress={cargarLista} style={{ alignSelf: 'flex-start', marginTop: 10 }} />
            </Card>
          )}
          {listo && !lista.cargando && !lista.error && lista.data.length === 0 && (
            <View style={s.vacio}>
              <Text style={{ fontSize: 40 }}>📭</Text>
              <Text style={s.vacioT}>Aún no hay incidencias</Text>
              <Text style={s.vacioS}>Cuando envíes un reporte aparecerá aquí con su foto.</Text>
            </View>
          )}

          {lista.data.map((r) => (
            <Card key={r.id}>
              {r.imageUrl ? (
                <Pressable onPress={() => setVisor(r.imageUrl)} accessibilityLabel="Ver foto completa">
                  <Image source={{ uri: r.imageUrl }} style={[s.img, { marginTop: 0 }]} resizeMode="cover" />
                </Pressable>
              ) : r.image_path ? (
                <Text style={s.errTxt}>No se pudo cargar la imagen.</Text>
              ) : null}
              <View style={s.itemHead}>
                <Text style={s.itemTit}>{r.titulo}</Text>
                <Chip label={r.estado === 'abierta' ? 'Abierta' : r.estado} tone={r.estado === 'abierta' ? 'warn' : 'ok'} />
              </View>
              {!!r.descripcion && <Text style={s.itemDesc}>{r.descripcion}</Text>}
              <View style={s.itemPie}>
                <Text style={s.nota}>🕒 {hace(r.created_at)}</Text>
                <Pressable onPress={() => borrar(r)} hitSlop={10} accessibilityRole="button" accessibilityLabel="Eliminar incidencia">
                  <Text style={s.borrar}>🗑️ Eliminar</Text>
                </Pressable>
              </View>
            </Card>
          ))}

          <Card style={{ backgroundColor: C.warnSoft, shadowOpacity: 0 }}>
            <Pressable style={s.testHead} onPress={() => setPanelPrueba((v) => !v)} accessibilityRole="button">
              <Text style={s.testTitle}>🧪 Pruebas de seguridad</Text>
              <Text style={s.testChev}>{panelPrueba ? '▲' : '▼'}</Text>
            </Pressable>
            {panelPrueba && (
              <View style={{ marginTop: 10, gap: 8 }}>
                {[
                  ['1. Formato no permitido (cliente)', pruebaFormatoLocal],
                  ['2. Formato no permitido (servidor)', pruebaFormatoServidor],
                  ['3. Acceso público sin firma', pruebaPublica],
                  ['4. Lectura sin sesión de usuario', pruebaSinSesion],
                  ['5. Archivo de otro usuario', pruebaAjena],
                ].map(([t, fn]) => (
                  <Pressable key={t} style={({ pressed }) => [s.btnTest, pressed && { opacity: 0.7 }]} onPress={fn} disabled={!usuario}>
                    <Text style={s.btnTestTxt}>{t}</Text>
                  </Pressable>
                ))}
                <Text style={s.nota}>Prueba de conexión: activa el modo avión y pulsa "Enviar incidencia".</Text>
                {pruebas.map((p, i) => <Text key={i} style={s.log}>{p}</Text>)}
              </View>
            )}
          </Card>
        </View>
      </ScrollView>

      <Modal visible={!!visor} transparent animationType="fade" onRequestClose={() => setVisor(null)}>
        <Pressable style={s.visor} onPress={() => setVisor(null)}>
          {visor && <Image source={{ uri: visor }} style={s.visorImg} resizeMode="contain" />}
          <Text style={s.visorTxt}>Toca para cerrar</Text>
        </Pressable>
      </Modal>
    </>
  );
}

const s = StyleSheet.create({
  body: { padding: 16, paddingTop: 18 },
  h2: { fontSize: 18, fontWeight: '800', color: C.ink },
  listaHead: { flexDirection: 'row', alignItems: 'center', gap: 10, marginVertical: 6, marginBottom: 12 },
  paso: { color: C.ink, lineHeight: 24, fontSize: 14.5 },
  code: { fontFamily: 'monospace', fontWeight: '700', color: C.brandDark },
  codeBlock: { fontFamily: 'monospace', backgroundColor: '#fff', padding: 12, borderRadius: R.sm, marginVertical: 8, color: C.brandDark, fontSize: 12.5, lineHeight: 20 },
  error: { color: C.danger, marginTop: 10, lineHeight: 20 },
  diagFila: { flexDirection: 'row', gap: 10, paddingVertical: 6 },
  diagIco: { fontSize: 16 },
  diagLbl: { fontWeight: '700', color: C.ink },
  diagDet: { color: C.danger, marginTop: 2, lineHeight: 19, fontSize: 13 },
  input: { backgroundColor: C.chip, borderRadius: R.md, paddingHorizontal: 14, height: 48, marginBottom: 10, fontSize: 15, color: C.ink },
  multi: { height: 96, paddingTop: 12, textAlignVertical: 'top', marginBottom: 2 },
  contador: { color: C.mute, fontSize: 12, textAlign: 'right', marginBottom: 12 },
  row: { flexDirection: 'row', gap: 10 },
  adjuntar: { borderWidth: 1.5, borderStyle: 'dashed', borderColor: C.line, borderRadius: R.md, padding: 14, gap: 10 },
  adjuntarT: { color: C.sub, fontWeight: '600' },
  previewBox: { gap: 10 },
  previewBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  img: { width: '100%', height: 190, borderRadius: R.md, backgroundColor: C.chip },
  nota: { color: C.mute, fontSize: 12.5, marginTop: 6 },
  mono: { fontFamily: 'monospace', fontSize: 11.5, marginTop: 6, color: C.ink },
  okBox: { backgroundColor: C.okSoft, padding: 12, borderRadius: R.md, marginTop: 14 },
  okTxt: { color: C.ok, fontWeight: '700' },
  errBox: { backgroundColor: C.dangerSoft, padding: 12, borderRadius: R.md, marginTop: 14 },
  errTxt: { color: C.danger, lineHeight: 20 },
  vacio: { alignItems: 'center', paddingVertical: 24 },
  vacioT: { fontWeight: '800', fontSize: 16, color: C.ink, marginTop: 8 },
  vacioS: { color: C.sub, marginTop: 4, textAlign: 'center' },
  itemHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  itemTit: { flex: 1, fontSize: 17, fontWeight: '800', color: C.ink },
  itemDesc: { color: C.sub, marginTop: 6, lineHeight: 21 },
  itemPie: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 },
  borrar: { color: C.danger, fontWeight: '700', fontSize: 13 },
  testHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  testTitle: { fontWeight: '800', color: C.warn, fontSize: 15 },
  testChev: { color: C.warn, fontSize: 12 },
  btnTest: { backgroundColor: '#fff', borderRadius: R.sm, padding: 12, borderWidth: 1, borderColor: '#EBD08A' },
  btnTestTxt: { fontWeight: '600', color: C.ink },
  log: { fontSize: 12, color: C.ink, lineHeight: 18 },
  visor: { flex: 1, backgroundColor: 'rgba(5,10,25,0.94)', justifyContent: 'center', alignItems: 'center' },
  visorImg: { width: '100%', height: '80%' },
  visorTxt: { color: 'rgba(255,255,255,0.6)', marginTop: 10 },
});
