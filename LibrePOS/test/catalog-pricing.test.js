import test from "node:test";
import assert from "node:assert/strict";
import {
  catalogBasePriceFromGross,
  catalogGrossPriceForEdit,
  catalogPriceBreakdownFromBase,
} from "../src/catalog-pricing.js";

test("calcula precio base, IVA y total para un alta de catalogo", () => {
  assert.deepEqual(catalogPriceBreakdownFromBase(50, 0.16), {
    base: 50,
    iva: 8,
    total: 58,
    rate: 0.16,
  });
});

test("recupera el precio base de un precio existente con IVA", () => {
  assert.equal(catalogBasePriceFromGross(58, 0.16), 50);
});

test("conserva exactamente el total existente si no cambia su base visible", () => {
  assert.equal(catalogGrossPriceForEdit(0.03, 0.04, 0.16), 0.04);
});

test("aplica el nuevo total cuando el usuario cambia el precio base", () => {
  assert.equal(catalogGrossPriceForEdit(60, 58, 0.16), 69.6);
});
