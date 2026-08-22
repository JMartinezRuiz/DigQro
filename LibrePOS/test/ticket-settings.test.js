import test from "node:test";
import assert from "node:assert/strict";
import {
  DEFAULT_TICKET_ITEM_PRICE_MODE,
  TICKET_ITEM_PRICE_MODE_MIGRATION,
  migrateTicketItemPriceModeSettings,
} from "../src/ticket-settings.js";

test("v0.5 migra una instalacion guardada en Sin IVA al modo IVA incluido", () => {
  const previous = { ticketItemPriceMode: "net", ticketMarginLeftMm: 6 };
  const result = migrateTicketItemPriceModeSettings(previous);

  assert.equal(result.changed, true);
  assert.equal(result.settings.ticketItemPriceMode, DEFAULT_TICKET_ITEM_PRICE_MODE);
  assert.equal(result.settings.ticketItemPriceModeMigration, TICKET_ITEM_PRICE_MODE_MIGRATION);
  assert.equal(result.settings.ticketMarginLeftMm, 6);
  assert.equal(previous.ticketItemPriceMode, "net");
});

test("respeta una seleccion manual posterior a la migracion de v0.5", () => {
  const result = migrateTicketItemPriceModeSettings({
    ticketItemPriceMode: "net",
    ticketItemPriceModeMigration: TICKET_ITEM_PRICE_MODE_MIGRATION,
  });

  assert.equal(result.changed, false);
  assert.equal(result.settings.ticketItemPriceMode, "net");
});

test("una instalacion nueva usa IVA incluido", () => {
  const result = migrateTicketItemPriceModeSettings({});

  assert.equal(result.settings.ticketItemPriceMode, "gross");
  assert.equal(result.settings.ticketItemPriceModeMigration, TICKET_ITEM_PRICE_MODE_MIGRATION);
});
