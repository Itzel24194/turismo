import test from 'node:test';
import assert from 'node:assert/strict';
import { validateImage, buildPath, mimeFromName, MAX_BYTES } from '../src/utils/validation.js';
import { base64ToBytes } from '../src/utils/base64.js';
import { traducirError } from '../src/utils/errors.js';

test('Validación: acepta JPG, PNG y WebP', () => {
  for (const m of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(validateImage({ mimeType: m, size: 1000 }).ok, true);
});
test('Validación: rechaza .txt, .pdf y .exe', () => {
  assert.equal(validateImage({ mimeType: 'text/plain', fileName: 'a.txt', size: 10 }).ok, false);
  assert.equal(validateImage({ fileName: 'doc.pdf', size: 10 }).ok, false);
  assert.equal(validateImage({ mimeType: 'application/x-msdownload', size: 10 }).ok, false);
});
test('Validación: rechaza archivos de más de 5 MB y vacíos', () => {
  assert.equal(validateImage({ mimeType: 'image/png', size: MAX_BYTES + 1 }).ok, false);
  assert.equal(validateImage({ mimeType: 'image/png', size: MAX_BYTES }).ok, true);
  assert.equal(validateImage({ mimeType: 'image/png', size: 0 }).ok, false);
});
test('Tipo MIME por extensión', () => {
  assert.equal(mimeFromName('file:///x/foto.JPG?v=1'), 'image/jpeg');
  assert.equal(mimeFromName('x.gif'), null);
});
test('Ruta: <usuario>/<tiempo>.<ext>', () => {
  assert.equal(buildPath('abc', 'image/png', 123), 'abc/123.png');
});
test('Base64 → bytes (con y sin relleno)', () => {
  assert.deepEqual([...base64ToBytes('SG9sYQ==')], [...Buffer.from('Hola')]);
  assert.deepEqual([...base64ToBytes('SGk=')], [...Buffer.from('Hi')]);
  assert.deepEqual([...base64ToBytes('QUJD')], [...Buffer.from('ABC')]);
  const rnd = Buffer.from(Array.from({ length: 1001 }, (_, i) => (i * 37) % 256));
  assert.deepEqual([...base64ToBytes(rnd.toString('base64'))], [...rnd]);
});
test('Errores: sin conexión, tipo, tamaño y permisos', () => {
  assert.match(traducirError(new Error('Network request failed')).message, /Sin conexión/);
  assert.match(traducirError({ message: 'mime type text/plain is not supported', statusCode: '415' }).message, /tipo de archivo/);
  assert.match(traducirError({ message: 'The object exceeded the maximum allowed size', statusCode: '413' }).message, /tamaño/);
  assert.match(traducirError({ message: 'new row violates row-level security policy' }).message, /autorización/);
});
