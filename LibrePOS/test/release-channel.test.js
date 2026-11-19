import test from 'node:test';
import assert from 'node:assert/strict';
import { generateKeyPairSync, sign } from 'node:crypto';
import { verifyManifest } from '../scripts/release-channel.js';

test('solo admite manifiestos firmados para LibrePOS y archivos acotados', () => {
  const {publicKey, privateKey} = generateKeyPairSync('ed25519');
  const bundle = {product:'LibrePOS',format:1,version:'2.1.0-beta.6',bytes:30,sha256:'a'.repeat(64)};
  const envelope = data => {
    const bytes = Buffer.from(JSON.stringify(data));
    return {payload: bytes.toString('base64'),signature: sign(null,bytes,privateKey).toString('base64')};
  };
  assert.deepEqual(verifyManifest(envelope(bundle),publicKey),bundle);
  const changed = envelope({...bundle,version:'3.0.0'});
  changed.signature = envelope(bundle).signature;
  assert.throws(()=>verifyManifest(changed,publicKey), /Firma/);
  for (const patch of [{product:'otro'}, {format:2}, {sha256:'otro'}, {bytes:0}, {version:'latest'}]) {
    assert.throws(()=>verifyManifest(envelope({...bundle,...patch}),publicKey));
  }
});
