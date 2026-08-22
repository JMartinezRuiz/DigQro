function roundCurrency(value) {
  return Math.round((Number(value) || 0) * 100) / 100;
}

function cleanRate(value) {
  return Math.max(0, Math.min(1, Number(value) || 0));
}

export function catalogBasePriceFromGross(price, ivaRate = 0) {
  const gross = roundCurrency(Math.max(0, Number(price) || 0));
  const rate = cleanRate(ivaRate);
  return rate ? roundCurrency(gross / (1 + rate)) : gross;
}

export function catalogPriceBreakdownFromBase(price, ivaRate = 0) {
  const base = roundCurrency(Math.max(0, Number(price) || 0));
  const rate = cleanRate(ivaRate);
  const total = roundCurrency(base * (1 + rate));
  return {
    base,
    iva: roundCurrency(total - base),
    total,
    rate,
  };
}

export function catalogGrossPriceForEdit(basePrice, existingGrossPrice = null, ivaRate = 0) {
  const breakdown = catalogPriceBreakdownFromBase(basePrice, ivaRate);
  if (existingGrossPrice === null || existingGrossPrice === undefined) return breakdown.total;
  const existingGross = roundCurrency(Math.max(0, Number(existingGrossPrice) || 0));
  const existingBase = catalogBasePriceFromGross(existingGross, ivaRate);
  return breakdown.base === existingBase ? existingGross : breakdown.total;
}
