import { inventoryRecipes } from "./catalog-data.js";
const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const cleanUserText = value => String(value || "").trim().replace(/\s+/g, " ");
const slugify = value => normalize(value).replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || "platillo";


export function normalizeRecipe(recipe = []) {
  const merged = new Map();
  (Array.isArray(recipe) ? recipe : []).forEach((entry) => {
    const name = String(entry.name || "").trim().toUpperCase();
    const qty = Math.max(0, Number(entry.qty) || 0);
    if (!name || qty <= 0) return;
    const key = normalize(name);
    const existing = merged.get(key);
    if (existing) {
      existing.qty += qty;
      return;
    }
    merged.set(key, {
      itemId: String(entry.itemId || ""),
      name,
      unit: String(entry.unit || "PZ").trim().toUpperCase(),
      qty,
    });
  });
  return [...merged.values()];
}

export function normalizeVariantRecipes(variantRecipes = []) {
  return (Array.isArray(variantRecipes) ? variantRecipes : [])
    .map((variant, index) => {
      const optionId = String(variant.optionId || "").trim();
      const choiceLabel = cleanUserText(variant.choiceLabel || variant.label || "");
      const recipe = normalizeRecipe(variant.recipe);
      if (!optionId || !choiceLabel || !recipe.length) return null;
      return {
        id: variant.id || `variant-${index}-${slugify(`${optionId}-${choiceLabel}`)}`,
        optionId,
        choiceLabel,
        recipe,
        updatedAt: variant.updatedAt || "",
        updatedBy: variant.updatedBy || "",
      };
    })
    .filter(Boolean);
}

export function defaultSelectionsFor(product) {
  const selections = {};
  product.options.forEach((option) => {
    if (option.type === "multi") {
      selections[option.id] = [];
      return;
    }
    selections[option.id] = firstActiveChoiceIndex(option);
  });
  return selections;
}

export function firstActiveChoiceIndex(option) {
  const index = (option.choices || []).findIndex((choice) => choice.active !== false);
  return index >= 0 ? index : -1;
}

export function inventoryRecipeForSelections(product, selections = defaultSelectionsFor(product)) {
  const variantRecipe = recipeVariantForSelections(product, selections);
  if (variantRecipe?.recipe?.length) {
    return normalizeRecipe(variantRecipe.recipe).map((item) => ({ name: item.name, qty: item.qty }));
  }
  if (Array.isArray(product.recipe) && product.recipe.length) {
    return normalizeRecipe(product.recipe).map((item) => ({ name: item.name, qty: item.qty }));
  }
  const protein = selectedChoiceLabel(product, selections, "proteina");
  const relleno = selectedChoiceLabel(product, selections, "relleno");
  const sabor = selectedChoiceLabel(product, selections, "sabor");
  const masa = selectedChoiceLabel(product, selections, "masa");
  const salsa = selectedChoiceLabel(product, selections, "salsa");

  if (product.id === "empanadas-fritas") {
    return [
      { name: "MASA MERCADO", qty: 0.35 },
      ...ingredientChoice(relleno, {
        Queso: [{ name: "QUESO FRESCO DE ARO", qty: 0.04 }],
        Pollo: [{ name: "POLLO", qty: 0.08 }],
        Carne: [{ name: "PIERNA DE CERDO", qty: 0.08 }],
      }),
    ];
  }

  if (product.id === "bocoles-maiz") {
    return [
      { name: "MASA MERCADO", qty: 0.16 },
      ...(normalize(masa).includes("frijol") ? [{ name: "FRIJOL NEGRO", qty: 0.04 }] : []),
      ...ingredientChoice(relleno, {
        "Frijol con chorizo": [
          { name: "FRIJOL NEGRO", qty: 0.06 },
          { name: "CHORIZO", qty: 0.04 },
        ],
        "Huevo revuelto": [{ name: "HUEVO", qty: 0.08 }],
        Queso: [{ name: "QUESO FRESCO DE ARO", qty: 0.04 }],
        "Huevo con chorizo": [
          { name: "HUEVO", qty: 0.06 },
          { name: "CHORIZO", qty: 0.03 },
        ],
        "Huevo en salsa verde": [
          { name: "HUEVO", qty: 0.06 },
          { name: "CHILE SERRANO", qty: 0.015 },
        ],
      }),
    ];
  }

  if (product.id === "bocoles-harina") {
    return [
      { name: "MASA MERCADO", qty: 0.25 },
      { name: "QUESO FRESCO DE ARO", qty: 0.005 },
      ...proteinIngredients(protein),
    ];
  }

  if (product.id === "tamales") {
    return [
      { name: "MASA TAMALES", qty: 0.054 },
      { name: "HOJA DE PLATANO", qty: 0.08 },
      ...ingredientChoice(sabor, {
        Picadillo: [{ name: "PICADILLO", qty: 0.058 }],
        Cerdo: [
          { name: "PIERNA DE CERDO", qty: 0.042 },
          { name: "ADOBO", qty: 0.022 },
        ],
        "Camaron con calabaza": [
          { name: "CAMARON", qty: 0.04 },
          { name: "CALABAZA", qty: 0.03 },
        ],
        Pique: [{ name: "CHILE PIQUIN", qty: 0.004 }],
        Queso: [{ name: "QUESO FRESCO DE ARO", qty: 0.035 }],
      }),
    ];
  }

  if (product.id === "empanadas-harina") {
    return [
      { name: "MASA HARINA", qty: 0.05 },
      ...ingredientChoice(relleno, {
        Manjar: [
          { name: "MANJAR", qty: 0.05 },
          { name: "AZUCAR", qty: 0.000667 },
          { name: "CANELA MOLIDA", qty: 0.000333 },
        ],
        Carne: [{ name: "RELLENO PIERNA", qty: 0.02 }],
      }),
    ];
  }

  if (product.id === "molotes") {
    return [
      ...(normalize(masa).includes("platano")
        ? [{ name: "MASA MOLOTES PLATANO", qty: 0.14 }]
        : [{ name: "MASA MOLOTES", qty: 0.14 }]),
      { name: "REPOLLO", qty: 0.002 },
      { name: "CREMA", qty: 0.001 },
      { name: "QUESO FRESCO DE ARO", qty: 0.02 },
      { name: "SALSA MOLOTES", qty: 0.18 },
      ...ingredientChoice(relleno, {
        Pollo: [{ name: "RELLENO POLLO", qty: 0.1 }],
        "Carne de cerdo": [{ name: "RELLENO CARNE", qty: 0.1 }],
      }),
    ];
  }

  if (product.id === "enchiladas") {
    return [
      { name: "MASA MERCADO", qty: 0.16 },
      { name: "QUESO FRESCO DE ARO", qty: 0.02 },
      ...salsaIngredients(salsa),
      ...proteinIngredients(protein),
    ];
  }

  if (product.id === "enchiladas-chile-seco") {
    return [
      { name: "MASA MERCADO", qty: 0.16 },
      { name: "QUESO FRESCO DE ARO", qty: 0.02 },
      ...(normalize(salsa) === "chile seco" ? [{ name: "CHILE GUAJILLO", qty: 0.08 }] : salsaIngredients(salsa)),
      ...proteinIngredients(protein),
    ];
  }

  if (product.id === "estrujadas") {
    return [
      { name: "MASA MERCADO", qty: 0.2 },
      { name: "QUESO FRESCO DE ARO", qty: 0.02 },
      ...salsaIngredients(salsa),
      ...proteinIngredients(protein),
    ];
  }

  return inventoryRecipes[product.id] || [];
}

export function recipeVariantForSelections(product, selections = defaultSelectionsFor(product)) {
  const variants = normalizeVariantRecipes(product?.variantRecipes);
  if (!variants.length) return null;
  const matches = [];
  for (const option of product.options || []) {
    if (option.type !== "single") continue;
    const choice = option.choices?.[selections?.[option.id]];
    if (!choice?.label) continue;
    const variant = variants.find(
      (item) => item.optionId === option.id && normalize(item.choiceLabel) === normalize(choice.label),
    );
    if (variant) matches.push({ option, variant });
  }
  matches.sort((left, right) => variantOptionPriority(left.option) - variantOptionPriority(right.option));
  return matches[0]?.variant || null;
}

export function variantOptionPriority(option) {
  const value = normalize(`${option?.id || ""} ${option?.label || ""}`);
  if (value.includes("relleno")) return 1;
  if (value.includes("sabor")) return 2;
  if (value.includes("proteina")) return 3;
  if (value.includes("variante")) return 4;
  if (value.includes("salsa")) return 5;
  if (value.includes("masa")) return 8;
  return 6;
}

export function selectedChoiceLabel(product, selections, optionId) {
  const option = product.options.find((item) => item.id === optionId);
  if (!option) return "";
  return option.choices?.[selections?.[optionId]]?.label || "";
}

export function ingredientChoice(label, choices) {
  return choices[label] || [];
}

export function proteinIngredients(label) {
  return ingredientChoice(label, {
    Cecina: [{ name: "CECINA PALOMILLA", qty: 0.12 }],
    "Carne enchilada": [{ name: "CARNE ENCHILADA", qty: 0.12 }],
    "Huevo revuelto": [{ name: "HUEVO", qty: 0.08 }],
    "Huevo revuelto con chorizo": [
      { name: "HUEVO", qty: 0.06 },
      { name: "CHORIZO", qty: 0.04 },
    ],
    "Huevo en salsa verde": [
      { name: "HUEVO", qty: 0.06 },
      { name: "CHILE SERRANO", qty: 0.015 },
    ],
  });
}

export function salsaIngredients(label) {
  return ingredientChoice(label, {
    Entomatadas: [{ name: "JITOMATE", qty: 0.1 }],
    Roja: [{ name: "JITOMATE", qty: 0.06 }],
    Verde: [{ name: "CHILE SERRANO", qty: 0.025 }],
    Pipian: [{ name: "PIPIAN CRIOLLO", qty: 0.04 }],
    Cacahuate: [{ name: "CACAHUATE", qty: 0.04 }],
    Enfrijoladas: [{ name: "FRIJOL NEGRO", qty: 0.08 }],
    Enmoladas: [{ name: "CHILE COLOR/ANCHO", qty: 0.025 }],
    Ajonjoli: [{ name: "AJONJOLI", qty: 0.025 }],
  });
}

export function configuredRecipeForProduct(product, selections = defaultSelectionsFor(product)) {
  if (product?.subsection === "Pan de lena") {
    const option = product.options.find((item) => item.id === "presentacion");
    const choice = option?.choices?.[selections?.presentacion || 0]?.label || "Pieza";
    const units = choice.includes("10") ? 10 : choice.includes("5") ? 5 : 1;
    return [{ name: product.name.toUpperCase(), qty: units }];
  }
  return inventoryRecipeForSelections(product, selections);
}
