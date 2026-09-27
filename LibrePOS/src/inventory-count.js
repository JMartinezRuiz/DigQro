/** Prepare a physical count from one stable inventory snapshot, without writing it. */
export function inventoryCountAdjustments(inventory, counts) {
  const itemsById = new Map(inventory.map((item) => [item.id, item]));
  return counts.flatMap(({ itemId, value }) => {
    const rawValue = String(value ?? "").trim();
    if (!rawValue) return [];
    const item = itemsById.get(itemId);
    if (!item) return [];
    const expected = Number(item.qty) || 0;
    const counted = Math.max(0, Number(rawValue) || 0);
    const diff = counted - expected;
    if (Math.abs(diff) < 0.0005) return [];
    return [{ item, expected, counted, diff }];
  });
}
