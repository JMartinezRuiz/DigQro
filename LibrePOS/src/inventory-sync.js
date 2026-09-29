// Both a browser comanda and an Uber webhook can consume the same ingredient.
// Merge deltas against the acknowledged baseline instead of replacing stock.
export function mergeConcurrentInventory(base, local, remote) {
  const merged = structuredClone(remote);
  for (const key of Object.keys(local)) if (JSON.stringify(local[key]) !== JSON.stringify(base[key])) merged[key] = structuredClone(local[key]);
  if (local.qty !== base.qty && remote.qty !== base.qty) merged.qty = Number(remote.qty) + Number(local.qty) - Number(base.qty);
  merged.totalCost = Number(merged.qty) * Number(merged.unitCost || 0);
  return merged;
}
