function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function netFromGross(value, ivaRate = 0) {
  const gross = roundCurrency(Math.max(0, Number(value) || 0));
  const rate = Math.max(0, Math.min(1, Number(ivaRate) || 0));
  return rate ? roundCurrency(gross / (1 + rate)) : gross;
}

function displayTotal(grossTotal, priceMode, ivaRate) {
  const gross = roundCurrency(Math.max(0, Number(grossTotal) || 0));
  return priceMode === "net" ? netFromGross(gross, ivaRate) : gross;
}

export function receiptItemPriceBreakdown({ grossTotal = 0, qty = 0, extras = [], ivaRate = 0, priceMode = "gross" } = {}) {
  const itemQty = Math.max(0, Number(qty) || 0);
  const extraRows = (Array.isArray(extras) ? extras : []).map((extra) => {
    const count = Math.max(1, Number(extra?.count) || 1) * itemQty;
    const extraGrossTotal = roundCurrency(Math.max(0, Number(extra?.total) || 0) * itemQty);
    return {
      name: String(extra?.name || "").trim(),
      count,
      grossTotal: extraGrossTotal,
      displayTotal: displayTotal(extraGrossTotal, priceMode, ivaRate),
    };
  }).filter((extra) => extra.name && extra.grossTotal > 0);
  const extrasGrossTotal = roundCurrency(extraRows.reduce((sum, extra) => sum + extra.grossTotal, 0));
  const productGrossTotal = roundCurrency(Math.max(0, roundCurrency(grossTotal) - extrasGrossTotal));
  return {
    productGrossTotal,
    productDisplayTotal: displayTotal(productGrossTotal, priceMode, ivaRate),
    extrasGrossTotal,
    extraRows,
  };
}

export function receiptOptionsWithoutPricedExtras(value, hasPricedExtras = false) {
  const text = String(value || "").trim();
  if (!hasPricedExtras) return text;
  return text.replace(/(?:^|\s*·\s*)Extras:\s*.*$/i, "").trim();
}
