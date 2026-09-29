import test from 'node:test';
import assert from 'node:assert/strict';
import { mergeConcurrentInventory } from '../src/inventory-sync.js';

test('concurrent restaurant and Uber comandas preserve both stock deductions', () => {
  const base = { id: 'coffee', qty: 100, unitCost: 10, totalCost: 1000 };
  const local = { ...base, qty: 98, totalCost: 980 }, remote = { ...base, qty: 97, totalCost: 970 };
  assert.deepEqual(mergeConcurrentInventory(base, local, remote), { ...base, qty: 95, totalCost: 950 });
  assert.equal(base.qty, 100);
});
test('editing cost or name does not overwrite stock consumed by the server', () => {
  const base = { id: 'coffee', qty: 100, unitCost: 10, name: 'Coffee' };
  const merged = mergeConcurrentInventory(base, { ...base, unitCost: 12 }, { ...base, qty: 97, name: 'Café' });
  assert.equal(merged.qty, 97); assert.equal(merged.unitCost, 12); assert.equal(merged.name, 'Café'); assert.equal(merged.totalCost, 1164);
});
