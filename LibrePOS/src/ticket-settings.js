export const DEFAULT_TICKET_ITEM_PRICE_MODE = "gross";
export const TICKET_ITEM_PRICE_MODE_MIGRATION = "0.5.0-gross-default";

export function normalizeTicketItemPriceMode(value) {
  return value === "net" ? "net" : DEFAULT_TICKET_ITEM_PRICE_MODE;
}

export function migrateTicketItemPriceModeSettings(settings = {}) {
  const source = settings && typeof settings === "object" && !Array.isArray(settings) ? settings : {};
  const next = { ...source };
  let changed = false;

  if (next.ticketItemPriceModeMigration !== TICKET_ITEM_PRICE_MODE_MIGRATION) {
    next.ticketItemPriceMode = DEFAULT_TICKET_ITEM_PRICE_MODE;
    next.ticketItemPriceModeMigration = TICKET_ITEM_PRICE_MODE_MIGRATION;
    changed = true;
  } else {
    const normalizedMode = normalizeTicketItemPriceMode(next.ticketItemPriceMode);
    if (normalizedMode !== next.ticketItemPriceMode) {
      next.ticketItemPriceMode = normalizedMode;
      changed = true;
    }
  }

  return { settings: next, changed };
}
