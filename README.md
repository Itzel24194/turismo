# Turismo e Incidencias — Expo SDK 58 / React Native 0.88

La app tiene dos pestañas:
- **🌎 Destinos** → Práctica 1: integración de 3 APIs (ver sección *Práctica 1*).
- **📝 Incidencias** → Práctica 2: fotos en almacenamiento en la nube con Supabase Storage (ver sección *Práctica 2*).

# Práctica 1 — Integración de 3 APIs

Al buscar una ciudad, la app combina tres servicios independientes y muestra
ubicación, clima y datos del país en una sola pantalla.

## Ejecución
```bash
npm install
npx expo install --fix      # alinea versiones exactas con el SDK 58
npx expo start              # escanea el QR con Expo Go (o un development build)
npm test                    # pruebas del procesamiento JSON (Node 22+)
```
Requiere Node.js 22.13 o superior. Ninguna API necesita clave.

## Entregable 2 — APIs y endpoints
| # | API | Uso | Endpoint | Parámetros clave | Respuesta |
|---|-----|-----|----------|------------------|-----------|
| 1 | OpenStreetMap Nominatim (https://nominatim.org/release-docs/latest/api/Search/) | Geocodificación | `GET https://nominatim.openstreetmap.org/search` | `q`, `format=jsonv2`, `addressdetails=1`, `limit=1`, `accept-language=es` + cabecera `User-Agent` propia (obligatoria) | Arreglo JSON; `lat`/`lon` como texto, `address.country_code` |
| 2 | Open-Meteo (https://open-meteo.com/en/docs) | Clima | `GET https://api.open-meteo.com/v1/forecast` | `latitude`, `longitude`, `current=…`, `daily=…`, `forecast_days=3`, `timezone=auto` | Objeto con `current`, `current_units`, `daily` (arreglos paralelos) |
| 3 | REST Countries (https://restcountries.com/) | Datos del país | `GET https://restcountries.com/v3.1/alpha/{código}` | `fields=name,translations,capital,region,subregion,population,currencies,languages,flags` | Objeto/arreglo con datos del país |

**Relación entre APIs:** la API 1 produce `lat`, `lon` y `country_code`. Con `lat/lon` se consulta la API 2 y con `country_code` la API 3 (las dos en paralelo).

Nota: Nominatim tiene una política de uso (máx. ~1 petición/segundo, uso moderado) y **exige un `User-Agent` que identifique la app**; sin él responde **HTTP 403**. La app lo envía en `src/services/geocoding.js`. Si Nominatim falla por cualquier motivo real (403, caída, red), se usa automáticamente el geocodificador de Open-Meteo (`geocoding-api.open-meteo.com`) como respaldo y la tarjeta lo indica con la etiqueta *Open-Meteo (respaldo)*. La caída *simulada* de OpenStreetMap (modo prueba) NO usa el respaldo, para poder demostrar el manejo de errores.

## Entregable 5 — Cómo se procesó el JSON
- **Nominatim** (`parseGeocoding`): toma el primer elemento del arreglo, convierte `lat` y `lon` de texto a número con `parseFloat`, obtiene el código de país en mayúsculas (`mx` → `MX`) y construye el enlace a OpenStreetMap. Si el arreglo viene vacío devuelve `null` y se muestra "ciudad no encontrada".
- **Open-Meteo** (`parseWeather`): `daily` llega como arreglos paralelos (`time[]`, `temperature_2m_max[]`…); con `map` se transforman en una lista de objetos `{fecha, max, min, descripcion}`. El `weather_code` (WMO) se traduce a texto en español con una tabla.
- **REST Countries** (`parseCountry`): `currencies` y `languages` son objetos con clave dinámica (`MXN`, `spa`); se usa `Object.values` para convertirlos en listas legibles. Se usa el nombre en español (`translations.spa`).

Cada servicio tiene su archivo en `src/services/` y devuelve un objeto simple que la pantalla (`App.js`) solo dibuja.

## Validación y seguridad (Parte 3)
| Requisito | Dónde / cómo |
|-----------|--------------|
| HTTPS | `src/utils/http.js` rechaza cualquier URL que no empiece con `https://` (prueba unitaria incluida). Las 3 APIs usan HTTPS. |
| Carga | Cada tarjeta muestra `ActivityIndicator` mientras espera. |
| Error | Mensajes por servicio (HTTP ≠ 2xx, timeout de 10 s, sin conexión, ciudad no encontrada) con botón **Reintentar**. |
| API no disponible | Al final de la pantalla hay un panel **Modo prueba** con un interruptor por API. Si se simula la caída de Open-Meteo o REST Countries, esa tarjeta muestra error y las demás siguen funcionando (resiliencia con llamadas independientes). Si cae Nominatim, no hay coordenadas y se muestra el error principal. |
| Dos ubicaciones | Probar p. ej. `Toluca` y `Madrid` (o `Tokyo`). |

### Plan de pruebas (llenar con resultados reales)
| Prueba | Pasos | Esperado | Resultado |
|--------|-------|----------|-----------|
| Ciudad 1 | Buscar "Toluca" | 3 tarjetas con datos de México | |
| Ciudad 2 | Buscar "Madrid" | 3 tarjetas con datos de España | |
| Ciudad inexistente | Buscar "asdfqwer" | Error "No se encontró la ciudad" | |
| Clima caído | Activar Open-Meteo y buscar | Error solo en clima + Reintentar | |
| País caído | Activar REST Countries y buscar | Error solo en país | |
| Sin internet | Modo avión y buscar | Error "No se pudo conectar" | |
| HTTPS | `npm test` | Prueba "bloquea URLs sin HTTPS" pasa | Pasó 6/6 |

## Estructura del proyecto
```
App.js                        pestañas (Destinos / Incidencias)
src/screens/DestinosScreen.js     Práctica 1
src/screens/IncidenciasScreen.js  Práctica 2
src/services/                 geocoding · weather · country · history · supabase · storage · incidencias · diagnostico
src/utils/                    http · validation · base64 · errors · format
src/components/               Card (cargando/error/contenido) · Header · ui (Button, Chip, Skeleton)
src/theme.js                  colores, radios y sombras
supabase/setup.sql            bucket privado + tabla + reglas de seguridad
tests/                        pruebas unitarias (npm test)
evidencias/                   capturas de pantalla (por agregar)
.env.example                  plantilla de configuración
```

---

# Práctica 2 — Fotos de incidencias en la nube (Supabase Storage)

## Parte 1 — Preparación del servicio
| Concepto | Valor |
|----------|-------|
| Servicio | **Supabase Storage** (https://supabase.com/docs/guides/storage), plan gratuito |
| Bucket | `incidencias` — **privado** |
| Tipos permitidos | `image/jpeg`, `image/png`, `image/webp` (validado en la app **y** en el bucket con `allowed_mime_types`) |
| Tamaño máximo | **5 MB** (`file_size_limit = 5242880`, validado también en la app) |
| Mecanismo de carga | `supabase.storage.from('incidencias').upload(ruta, bytes)` por HTTPS, con el JWT del usuario |
| Acceso y seguridad | Bucket privado + reglas RLS: cada usuario solo escribe/lee en su carpeta `<user_id>/`. La imagen se muestra con una **URL firmada** temporal (1 h) |
| Claves en la app | Solo la **anon key** (pública por diseño). Sin `service_role` ni claves administrativas |

### Configuración paso a paso
1. Crea un proyecto en https://supabase.com.
2. **Authentication → Sign In / Providers →** activa **Allow anonymous sign-ins** (cada instalación recibe un usuario propio sin pedir registro; en producción conviene usar correo/Google).
3. **SQL Editor →** pega y ejecuta `supabase/setup.sql`. Crea el bucket privado, la tabla `incidencias` y las reglas.
4. **Project Settings → API:** copia *Project URL* y la clave *anon/publishable*.
5. Copia `.env.example` a `.env` y pega ambos valores en `EXPO_PUBLIC_SUPABASE_URL` y `EXPO_PUBLIC_SUPABASE_ANON_KEY`. Reinicia con `npx expo start -c`.
   > En Expo solo se leen variables que empiezan con **`EXPO_PUBLIC_`**. Con `NEXT_PUBLIC_…` la app dirá "Falta configurar Supabase".

Al abrir la pestaña **Incidencias**, la app comprueba sola los 3 pasos (sesión anónima, tabla, bucket) y muestra con ✅/❌ cuál falta y cómo arreglarlo.

## Parte 2 y 3 — Flujo implementado
1. El usuario escribe título y descripción, y elige **Galería** o **Cámara** (`expo-image-picker`, con permisos solicitados en tiempo de ejecución).
2. Se muestra la **vista previa** y se valida tipo y tamaño localmente.
3. Al enviar: se decodifica la imagen, se **sube** al bucket en `<user_id>/<fecha>.jpg` y se muestra el estado (subiendo → guardando → éxito/error con la ruta guardada).
4. Se inserta una fila en la tabla `incidencias` con la **ruta** de la imagen. Si ese registro falla, se borra la imagen subida (sin archivos huérfanos).
5. Para visualizar, la app consulta la tabla y pide **URLs firmadas** de las rutas; la imagen se carga desde Supabase, no desde el dispositivo.
6. Al cerrar y abrir la app, la sesión persiste (AsyncStorage), se vuelve a consultar la tabla y se generan URLs nuevas: las imágenes reaparecen.

### ¿Qué conservar en la base de datos? (Parte 3.4)
| Columna | Motivo |
|---------|--------|
| `id` | identificador de la incidencia |
| `user_id` | dueño; base de las reglas de acceso |
| `titulo`, `descripcion`, `estado`, `created_at` | datos del reporte |
| **`image_path`** | **referencia permanente al archivo** (ruta en el bucket) |
| `image_mime`, `image_size` | metadatos para auditoría/validación |

Se guarda la **ruta y no la URL** porque la URL firmada caduca; se regenera cuando hace falta. La imagen nunca se guarda en la base de datos.

## Parte 4 — Seguridad y pruebas
| Requisito | Cómo se cumple |
|-----------|----------------|
| Formato no permitido | Validación local + `allowed_mime_types` en el servidor (botones de prueba 1 y 2) |
| Pérdida de conexión | Mensaje "Sin conexión…", se conserva el formulario y la foto para reintentar |
| Restricciones de acceso | Bucket privado + RLS por carpeta de usuario |
| Sin claves privadas | Solo anon key en `.env` (ignorado por git); `service_role` jamás se usa |
| Carga autorizada | Solo usuarios autenticados pueden insertar, y solo en su carpeta |
| Archivos privados | URL pública sin firma → denegada (prueba 3); lectura sin sesión → denegada (4); archivo de otro usuario → denegado (5) |
| HTTPS | Todo el tráfico va a `https://…supabase.co`; `config.js` exige que la URL empiece con `https://` |

### Plan de pruebas (llenar con resultados reales)
| Prueba | Pasos | Esperado | Resultado |
|--------|-------|----------|-----------|
| Subida con galería | Elegir foto → Enviar | ✅ y ruta mostrada; aparece en la lista con imagen | |
| Subida con cámara | Tomar foto → Enviar | Igual | |
| Persistencia | Cerrar la app por completo y abrirla | La incidencia y su foto siguen visibles | |
| Formato (cliente) | Botón de prueba 1 | BLOQUEADO | |
| Formato (servidor) | Botón de prueba 2 | RECHAZADO por el servidor | |
| Sin conexión | Modo avión → Enviar | Error de conexión; datos conservados | |
| URL pública | Botón 3 (tras subir una foto) | DENEGADO | |
| Sin sesión | Botón 4 | DENEGADO | |
| Archivo ajeno | Botón 5 | DENEGADO | |
| Dashboard | Storage → bucket `incidencias` | Aparece el archivo en la carpeta del usuario (captura) | |

## Notas y límites
- Las sesiones anónimas son un atajo para el prototipo: si se desinstala la app se pierde el usuario y, con él, el acceso a sus fotos. Para producción usa autenticación real y, si hace falta, que personal autorizado vea todas las incidencias con un rol/política específica.
- `expo-image-picker` y la cámara requieren dispositivo físico o emulador con cámara; funcionan en Expo Go.
# turismo

---

# Solución de problemas

| Síntoma | Causa | Solución |
|---------|-------|----------|
| Destinos: "OpenStreetMap respondió con error HTTP 403" | Nominatim bloquea peticiones sin `User-Agent` propio | Ya corregido; además hay respaldo automático. Actualiza la app (`r` en la terminal de Expo). |
| Incidencias: "Falta configurar Supabase" | Variables con prefijo equivocado o `.env` sin reiniciar | Usa `EXPO_PUBLIC_SUPABASE_URL` / `EXPO_PUBLIC_SUPABASE_ANON_KEY` y reinicia con `npx expo start -c`. |
| ❌ Sesión anónima | Anonymous sign-ins desactivado | Supabase → Authentication → Sign In / Providers → *Allow anonymous sign-ins*. |
| ❌ Tabla / ❌ Bucket | No se ejecutó el SQL | Supabase → SQL Editor → pega y ejecuta `supabase/setup.sql`. |
| ❌ con "Invalid API key" | Clave mal copiada | Project Settings → API → copia la *anon/publishable key* completa. |

> Tip: `.history/` (extensión Local History de VS Code) guarda copias de tu `.env`; ya está en `.gitignore`.

