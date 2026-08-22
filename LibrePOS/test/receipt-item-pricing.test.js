import test from "node:test";
import assert from "node:assert/strict";
import { receiptItemPriceBreakdown, receiptOptionsWithoutPricedExtras } from "../src/receipt-item-pricing.js";

const bocolesWithCecina = {
  grossTotal: 215,
  qty: 1,
  extras: [{ name: "EXTRA CECINA", count: 1, total: 50 }],
  ivaRate: 0.16,
};

test("muestra $76.00 en la linea cuando la base es $65.52 y el IVA es $10.48", () => {
  const result = receiptItemPriceBreakdown({
    grossTotal: 76,
    qty: 1,
    ivaRate: 0.16,
    priceMode: "gross",
  });

  assert.equal(result.productDisplayTotal, 76);
  assert.equal(result.productGrossTotal, 76);
});

test("separa Bocoles mixtos y extra con IVA incluido", () => {
  const result = receiptItemPriceBreakdown({ ...bocolesWithCecina, priceMode: "gross" });
  assert.equal(result.productDisplayTotal, 165);
  assert.equal(result.extrasGrossTotal, 50);
  assert.deepEqual(result.extraRows, [{
    name: "EXTRA CECINA",
    count: 1,
    grossTotal: 50,
    displayTotal: 50,
  }]);
});

test("separa los mismos importes sin IVA cuando se elige ese modo", () => {
  const result = receiptItemPriceBreakdown({ ...bocolesWithCecina, priceMode: "net" });
  assert.equal(result.productDisplayTotal, 142.24);
  assert.equal(result.extraRows[0].displayTotal, 43.1);
  assert.equal(result.productDisplayTotal + result.extraRows[0].displayTotal, 185.34);
});

test("multiplica producto, extras y conteo por la cantidad de platillos", () => {
  const result = receiptItemPriceBreakdown({
    ...bocolesWithCecina,
    grossTotal: 430,
    qty: 2,
    priceMode: "gross",
  });
  assert.equal(result.productDisplayTotal, 330);
  assert.equal(result.extraRows[0].displayTotal, 100);
  assert.equal(result.extraRows[0].count, 2);
});

test("elimina el resumen duplicado solo cuando hay extras con precio", () => {
  const options = "Mixto ×2 · Parte 1 → Cecina · Parte 2 → Huevo · Extras: EXTRA CECINA";
  assert.equal(receiptOptionsWithoutPricedExtras(options, true), "Mixto ×2 · Parte 1 → Cecina · Parte 2 → Huevo");
  assert.equal(receiptOptionsWithoutPricedExtras(options, false), options);
});
