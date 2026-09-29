export const menuCatalog = [
  {
    id: "empanadas-fritas",
    name: "Empanadas fritas",
    section: "Para picar",
    subsection: "Empanadas",
    price: 65,
    station: "Cocina",
    icon: "empanada",
    description: "Orden de 4 piezas.",
    options: [
      singleOption("relleno", "Relleno", ["Queso", "Pollo", "Carne"]),
    ],
  },
  {
    id: "bocoles-maiz",
    name: "Bocoles de maiz",
    section: "Para picar",
    subsection: "Bocoles",
    price: 165,
    station: "Cocina",
    icon: "bowl",
    description: "4 piezas, naturales o masa con frijol.",
    options: [
      singleOption("masa", "Masa", ["Naturales", "Masa con frijol"]),
      singleOption("relleno", "Relleno", [
        "Frijol con chorizo",
        "Huevo revuelto",
        "Queso",
        "Huevo con chorizo",
        "Huevo en salsa verde",
      ]),
    ],
  },
  {
    id: "bocoles-harina",
    name: "Bocoles de harina",
    section: "Para picar",
    subsection: "Bocoles",
    price: 165,
    station: "Cocina",
    icon: "bowl",
    description: "6 piezas acompanadas de frijol, queso y salsa.",
    options: [
      singleOption("proteina", "Proteina", [
        "Cecina",
        "Huevo revuelto",
        "Huevo revuelto con chorizo",
        "Huevo en salsa verde",
        "Carne enchilada",
      ]),
    ],
  },
  {
    id: "tamales",
    name: "Tamales",
    section: "Al vapor",
    subsection: "Tamales",
    price: 45,
    station: "Cocina",
    icon: "steam",
    description: "De hoja de platano estilo Veracruz.",
    options: [
      singleOption("sabor", "Sabor", [
        "Picadillo",
        "Cerdo",
        "Camaron con calabaza",
        "Pique",
        "Queso",
      ]),
    ],
  },
  {
    id: "zacahuil",
    name: "Zacahuil",
    section: "Al vapor",
    subsection: "Tamales",
    price: 95,
    station: "Cocina",
    icon: "steam",
    description: "Tamal gigante de masa martajada, chiles y carne de cerdo.",
    options: [],
  },
  {
    id: "empanadas-harina",
    name: "Empanadas de harina",
    section: "Lo frito",
    subsection: "Empanadas",
    price: 22,
    station: "Cocina",
    icon: "empanada",
    description: "Precio por pieza.",
    options: [singleOption("relleno", "Relleno", ["Manjar", "Carne"])],
  },
  {
    id: "molotes",
    name: "Molotes",
    section: "Lo frito",
    subsection: "Molotes",
    price: 120,
    station: "Cocina",
    icon: "fry",
    description: "4 piezas con repollo, crema y queso.",
    options: [
      singleOption("relleno", "Relleno", ["Pollo", "Carne de cerdo"]),
      singleOption("masa", "Masa", ["Platano", "Papa"]),
    ],
  },
  {
    id: "enchiladas",
    name: "Enchiladas",
    section: "Del comal",
    subsection: "Enchiladas",
    price: 180,
    station: "Cocina",
    icon: "plate",
    description: "4 piezas con frijoles, aguacate y queso asado.",
    options: [
      singleOption("salsa", "Salsa", [
        "Entomatadas",
        "Roja",
        "Verde",
        "Pipian",
        "Cacahuate",
        "Enmoladas",
        "Enfrijoladas",
        "Ajonjoli",
      ]),
      proteinOption(),
    ],
  },
  {
    id: "enchiladas-chile-seco",
    name: "Enchiladas de chile seco",
    section: "Del comal",
    subsection: "Enchiladas",
    price: 240,
    station: "Cocina",
    icon: "plate",
    description: "4 piezas con salsa a eleccion y proteina.",
    options: [
      singleOption("salsa", "Salsa", [
        "Chile seco",
        "Entomatadas",
        "Roja",
        "Verde",
        "Pipian",
        "Enmoladas",
        "Enfrijoladas",
      ]),
      proteinOption(),
    ],
  },
  {
    id: "estrujadas",
    name: "Estrujadas",
    section: "Del comal",
    subsection: "Estrujadas",
    price: 170,
    station: "Cocina",
    icon: "plate",
    description: "Tortilla gruesa, salsa, frijoles, queso y proteina.",
    options: [
      singleOption("salsa", "Salsa", ["Verde", "Roja"]),
      proteinOption(),
    ],
  },
  panProduct("roscas-sin-azucar", "Roscas sin azucar", 20, 60, 120),
  panProduct("roscas-con-azucar", "Roscas con azucar", 20, 60, 120),
  panProduct("pintas", "Pintas", 25, 70, 140),
  panProduct("chichimbre", "Chichimbre", 25, 70, 140),
  panProduct("chancludas", "Chancludas", 20, 70, 140),
  panProduct("envidiosas", "Envidiosas", 25, 70, 140),
  panProduct("pemoles", "Pemoles", 18, 50, 100),
  panProduct("batidas", "Batidas", 70),
  panProduct("doraditas", "Doraditas", 18, 50, 100),
  {
    id: "torrejas",
    name: "Torrejas",
    section: "Lo dulce",
    subsection: "Postres",
    price: 80,
    station: "Cocina",
    icon: "dessert",
    description: "3 piezas con miel de trapiche.",
    options: [
      {
        id: "extras",
        label: "Extras",
        type: "multi",
        required: false,
        choices: [{ label: "Bola de helado de vainilla", priceDelta: 40 }],
      },
    ],
  },
  {
    id: "hojuelas",
    name: "Hojuelas",
    section: "Lo dulce",
    subsection: "Postres",
    price: 65,
    station: "Cocina",
    icon: "dessert",
    description: "5 piezas crujientes con miel de trapiche.",
    options: [],
  },
  {
    id: "platanos-fritos",
    name: "Platanos fritos",
    section: "Lo dulce",
    subsection: "Postres",
    price: 50,
    station: "Cocina",
    icon: "dessert",
    description: "Con crema y queso.",
    options: [],
  },
  drink("cafe-olla", "Cafe de olla", "Calientes", 35, "Canela y piloncillo."),
  drink("atole-dia", "Atole del dia", "Calientes", 40, "Base masa."),
  drink("refresco-escuis", "Refresco Escuis", "Refrescos", 45, "Botella."),
  drink("limonada-jengibre", "Limonada mineral jengibre", "Frias", 65, "Mineral con jengibre."),
  {
    ...drink("limonada-hierbas", "Limonada mineral con hierbas", "Frias", 55, "Hierba buena, albahaca o menta."),
    options: [singleOption("hierba", "Hierba", ["Hierba buena", "Albahaca", "Menta"])],
  },
  drink("frutos-rojos-mango", "Frutos rojos con mango", "Frias", 55, "Bebida fria de casa."),
  drink("pinada", "Pinada", "Frias", 55, "Bebida fria de casa."),
  drink("rusa-topo-chico", "Rusa Topo Chico", "Minerales", 65, "Preparada con Topo Chico."),
  drink("agua-mineral-topo", "Agua mineral Topo Chico", "Minerales", 45, "Botella."),
  drink("agua-dia", "Agua del dia", "Aguas", 35, "Sabor disponible en cocina."),
];



export const inventoryRecipes = {
  "empanadas-fritas": [
    { name: "MASA MERCADO", qty: 0.35 },
    { name: "QUESO FRESCO DE ARO", qty: 0.04 },
  ],
  "bocoles-maiz": [
    { name: "MASA MERCADO", qty: 0.16 },
    { name: "CECINA PALOMILLA", qty: 0.12 },
    { name: "QUESO FRESCO DE ARO", qty: 0.01 },
  ],
  "bocoles-harina": [
    { name: "MASA MERCADO", qty: 0.25 },
    { name: "CECINA PALOMILLA", qty: 0.12 },
    { name: "QUESO FRESCO DE ARO", qty: 0.005 },
  ],
  tamales: [
    { name: "MASA MERCADO", qty: 0.054 },
    { name: "HOJA DE PLATANO", qty: 0.08 },
    { name: "PIERNA DE CERDO", qty: 0.04 },
  ],
  zacahuil: [
    { name: "MASA MARTAJADA", qty: 0.14 },
    { name: "PIERNA DE CERDO", qty: 0.09 },
    { name: "HOJA DE PLATANO", qty: 0.1 },
  ],
  "empanadas-harina": [
    { name: "MASA HARINA", qty: 0.05 },
    { name: "MANJAR", qty: 0.05 },
    { name: "AZUCAR", qty: 0.000667 },
    { name: "CANELA MOLIDA", qty: 0.000333 },
  ],
  molotes: [
    { name: "MASA MERCADO", qty: 0.14 },
    { name: "POLLO", qty: 0.1 },
    { name: "CREMA", qty: 0.001 },
    { name: "QUESO FRESCO DE ARO", qty: 0.02 },
  ],
  enchiladas: [
    { name: "MASA MERCADO", qty: 0.16 },
    { name: "CECINA PALOMILLA", qty: 0.12 },
    { name: "QUESO FRESCO DE ARO", qty: 0.02 },
    { name: "JITOMATE", qty: 0.1 },
  ],
  "enchiladas-chile-seco": [
    { name: "MASA MERCADO", qty: 0.16 },
    { name: "CHILE GUAJILLO", qty: 0.08 },
    { name: "CECINA PALOMILLA", qty: 0.12 },
    { name: "QUESO FRESCO DE ARO", qty: 0.02 },
  ],
  estrujadas: [
    { name: "MASA MERCADO", qty: 0.2 },
    { name: "CECINA PALOMILLA", qty: 0.12 },
    { name: "QUESO FRESCO DE ARO", qty: 0.02 },
  ],
  torrejas: [
    { name: "PAN BAGUETTE", qty: 0.6 },
    { name: "HUEVO", qty: 0.042 },
    { name: "CANELA MOLIDA", qty: 0.001 },
    { name: "VAINILLA", qty: 0.001 },
    { name: "MIEL DE TRAPICHE", qty: 0.052 },
  ],
  hojuelas: [
    { name: "MASA HARINA", qty: 0.1 },
    { name: "MIEL DE TRAPICHE", qty: 0.07 },
  ],
  "platanos-fritos": [
    { name: "PLATANO DE CASTILLA", qty: 0.18 },
    { name: "CREMA", qty: 0.07 },
    { name: "QUESO FRESCO DE ARO", qty: 0.008 },
  ],
  "cafe-olla": [
    { name: "AGUA GARRAFON", qty: 0.333 },
    { name: "ANIS ESTRELLA", qty: 0.044 },
    { name: "CANELA VARA", qty: 0.003 },
    { name: "CLAVO", qty: 0.0001 },
    { name: "CAFE EN GRANO MOLIDO", qty: 0.017 },
    { name: "PILONCILLO", qty: 0.017 },
  ],
  "atole-dia": [
    { name: "AGUA GARRAFON", qty: 0.4 },
    { name: "MASA MERCADO", qty: 0.04 },
    { name: "CANELA VARA", qty: 0.003 },
    { name: "PILONCILLO", qty: 0.025 },
  ],
  "refresco-escuis": [
    { name: "REFRESCO ESCUIS", qty: 1 },
  ],
  "limonada-jengibre": [
    { name: "LIMONADA MINERAL JENGIBRE", qty: 1 },
  ],
  "limonada-hierbas": [
    { name: "LIMONADA MINERAL CON HIERBAS", qty: 1 },
  ],
  "frutos-rojos-mango": [
    { name: "FRUTOS ROJOS CON MANGO", qty: 1 },
  ],
  pinada: [
    { name: "PINADA", qty: 1 },
  ],
  "rusa-topo-chico": [
    { name: "RUSA TOPO CHICO", qty: 1 },
  ],
  "agua-mineral-topo": [
    { name: "AGUA MINERAL TOPO CHICO", qty: 1 },
  ],
  "agua-dia": [
    { name: "AGUA DEL DIA", qty: 1 },
  ],
};



export function singleOption(id, label, choices) {
  return {
    id,
    label,
    type: "single",
    required: true,
    choices: choices.map((choice) => (typeof choice === "string" ? { label: choice } : { ...choice })),
  };
}

export function proteinOption() {
  return singleOption("proteina", "Proteina", [
    "Cecina",
    "Carne enchilada",
    "Huevo revuelto con chorizo",
    "Huevo en salsa verde",
  ]);
}

function panProduct(id, name, unit, pack5, pack10) {
  const choices = [{ label: "Pieza", price: unit }];
  if (pack5) choices.push({ label: "Paquete 5", price: pack5 });
  if (pack10) choices.push({ label: "Paquete 10", price: pack10 });
  return {
    id,
    name,
    section: "Lo dulce",
    subsection: "Pan de lena",
    price: unit,
    station: "Caja",
    icon: "dessert",
    description: "Pan de la region de horno de lena con base masa madre.",
    options: [
      {
        id: "presentacion",
        label: "Presentacion",
        type: "single",
        required: true,
        choices,
      },
    ],
  };
}

function drink(id, name, subsection, price, description) {
  return {
    id,
    name,
    section: "Bebidas",
    subsection,
    price,
    station: "Barra",
    icon: "cup",
    description,
    options: [],
  };
}
