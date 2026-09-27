import assert from "node:assert/strict";
import test from "node:test";
import { inventoryCountAdjustments } from "../src/inventory-count.js";

test("a multi-item count targets every live inventory item, without changing stock before confirmation", () => {
  const inventory = [{ id: "rice", qty: 10 }, { id: "beans", qty: 20 }, { id: "milk", qty: 5 }];
  const plan = inventoryCountAdjustments(inventory, [
    { itemId: "rice", value: "8" },
    { itemId: "beans", value: "17" },
    { itemId: "milk", value: "5" },
  ]);
  assert.deepEqual(inventory.map((item) => item.qty), [10, 20, 5], "preparing the confirmation must not mutate inventory");
  assert.equal(plan.length, 2);
  assert.equal(plan[0].item, inventory[0], "first adjustment must retain the live item, not a detached clone");
  assert.equal(plan[1].item, inventory[1], "later rows must not detach earlier adjustments");
  assert.deepEqual(plan.map(({ expected, counted, diff }) => ({ expected, counted, diff })), [
    { expected: 10, counted: 8, diff: -2 },
    { expected: 20, counted: 17, diff: -3 },
  ]);
});

test("blank counts are left alone while an explicit zero is a valid physical count", () => {
  const inventory = [{ id: "rice", qty: 10 }, { id: "beans", qty: 20 }];
  const plan = inventoryCountAdjustments(inventory, [
    { itemId: "rice", value: "  " },
    { itemId: "beans", value: "0" },
    { itemId: "missing", value: "3" },
  ]);
  assert.equal(plan.length, 1);
  assert.equal(plan[0].item, inventory[1]);
  assert.equal(plan[0].counted, 0);
  assert.equal(plan[0].diff, -20);
});
