import "./styles.css";

const STORAGE_KEY = "librepos:v2";
const CLIENT_ID_KEY = "librepos:client-id";
const BRAND_IMAGE = "/assets/brand.jpg";
const SHARED_STATE_KEYS = [
  "settings",
  "users",
  "orders",
  "sales",
  "cancellations",
  "inventory",
  "inventoryMovements",
  "expenses",
  "attendance",
];

const money = new Intl.NumberFormat("es-MX", {
  style: "currency",
  currency: "MXN",
});

const defaultUsers = [
  {
    id: "admin",
    username: "admin",
    password: "admin",
    name: "Administrador",
    role: "Administrador",
    functions: ["admin", "mesero", "cocina"],
    active: true,
    createdAt: new Date().toISOString(),
  },
];

const userFunctionOptions = [
  { id: "mesero", label: "Mesero" },
  { id: "cocina", label: "Cocina" },
  { id: "admin", label: "Admin" },
];

const tables = Array.from({ length: 13 }, (_, index) => index + 1);

const menuCatalog = [
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

const themes = [
  { id: "tatias", name: "Tatias", brand: "#df835f", strong: "#ba5c3d", soft: "#f7d6c8", teal: "#2f6f73" },
  { id: "verde", name: "Verde", brand: "#5d927b", strong: "#2f6f5a", soft: "#dceee7", teal: "#355f73" },
  { id: "vino", name: "Vino", brand: "#b65a68", strong: "#803343", soft: "#f4d5da", teal: "#3f706b" },
  { id: "maiz", name: "Maiz", brand: "#d8a648", strong: "#9b6e1f", soft: "#f8e6bb", teal: "#386c70" },
];

const inventoryItems = [
  ["CHILES SECOS", "CHILE GUAJILLO", "MERCADO", "KILO", 1, 150, 150],
  ["CHILES SECOS", "CHILE COLOR/ANCHO", "MERCADO", "KILO", 1, 150, 150],
  ["CHILES SECOS", "CHILE CAPON", "MERCADO", "KILO", 0.5, 160, 80],
  ["CHILES SECOS", "CHILE MORITA", "MERCADO", "KILO", 0.5, 120, 60],
  ["CHILES SECOS", "CHILE PIQUIN", "MERCADO", "KILO", 0.25, 1080, 270],
  ["ESPECIAS", "CANELA VARA", "MERCADO", "KILO", 0.25, 500, 125],
  ["ESPECIAS", "CANELA MOLIDA", "MERCADO", "KILO", 0.25, 72, 18],
  ["ESPECIAS", "ANIS ESTRELLA", "MERCADO", "BOLSA", 3, 12, 36],
  ["ESPECIAS", "PIMIENTA", "MERCADO", "KILO", 0.1, 30, 30],
  ["ESPECIAS", "SAL", "OXXO", "KILO", 1, 19.5, 19.5],
  ["SEMILLAS", "PIPIAN CRIOLLO", "MERCADO", "KILO", 1, 180, 180],
  ["SEMILLAS", "AJONJOLI", "MERCADO", "KILO", 0.5, 100, 25],
  ["SEMILLAS", "CACAHUATE", "MERCADO", "KILO", 1, 70, 70],
  ["HOJAS", "HOJA DE PLATANO", "MERCADO", "ROLLO", 40, 6, 220],
  ["MAIZ", "MASA FINA", "PRODUCTOR", "KILO", 10, 16, 160],
  ["MAIZ", "MASA MERCADO", "MERCADO", "KILO", 8, 25, 200],
  ["MAIZ", "MASA MARTAJADA", "PRODUCTOR", "KILO", 3, 16, 48],
  ["LEGUMBRES", "FRIJOL NEGRO", "MERCADO", "KILO", 5, 35, 175],
  ["PROTEINAS", "CECINA PALOMILLA", "CARNI SAN", "KILO", 1.13, 260, 293.8],
  ["PROTEINAS", "CECINA PULPA NEGRA", "CARNI SAN", "KILO", 5.43, 260, 1411.8],
  ["PROTEINAS", "CHORIZO", "MERCADO", "KILO", 2, 140, 280],
  ["PROTEINAS", "PIERNA DE CERDO", "PROVEEDOR", "KILO", 1, 160, 160],
  ["PROTEINAS", "CARNE ENCHILADA", "PROVEEDOR", "KILO", 3, 140, 420],
  ["PROTEINAS", "POLLO", "MERCADO", "KILO", 1, 150, 150],
  ["PROTEINAS", "HUEVO", "MERCADO", "KILO", 1, 30, 30],
  ["PROTEINAS", "CAMARON", "MERCADO", "KILO", 1, 220, 220],
  ["LACTEOS", "QUESO FRESCO DE ARO", "PRODUCTOR", "PZ", 20, 50, 1000],
  ["LACTEOS", "CREMA", "JAMONERIA", "KG", 0.4, 100, 40],
  ["LACTEOS", "LECHE DESLACTOSADA", "SAN JUAN", "LITRO", 1, 34, 34],
  ["FRUTAS Y VERDURAS", "PLATANO DE CASTILLA", "MERCADO", "KILO", 6, 20, 120],
  ["FRUTAS Y VERDURAS", "PAPA", "MERCADO", "KILO", 5, 24, 120],
  ["FRUTAS Y VERDURAS", "CALABAZA", "MERCADO", "KILO", 2, 30, 60],
  ["FRUTAS Y VERDURAS", "NARANJA DE CUCHO", "MERCADO", "PIEZA", 10, 5, 50],
  ["FRUTAS Y VERDURAS", "JITOMATE", "MERCADO", "KILO", 1, 33, 33],
  ["FRUTAS Y VERDURAS", "CEBOLLA", "MERCADO", "KILO", 1, 17, 17],
  ["FRUTAS Y VERDURAS", "AJO", "MERCADO", "KILO", 1, 70, 70],
  ["FRUTAS Y VERDURAS", "CHILE SERRANO", "MERCADO", "KILO", 1, 88, 88],
  ["PAN", "ROSCAS SIN AZUCAR", "PANADERIA", "PIEZA", 100, 7, 700],
  ["PAN", "ROSCAS CON AZUCAR", "PANADERIA", "PIEZA", 100, 7, 700],
  ["PAN", "PINTAS", "PANADERIA", "PIEZA", 60, 7, 420],
  ["PAN", "CHICHIMBRE", "PANADERIA", "PIEZA", 20, 7, 140],
  ["PAN", "CHANCLUDAS", "PANADERIA", "PIEZA", 70, 7, 490],
  ["PAN", "ENVIDIOSAS", "PANADERIA", "PIEZA", 30, 7, 210],
  ["PAN", "PEMOLES", "PANADERIA", "PIEZA", 100, 5, 500],
  ["PAN", "BATIDAS", "PANADERIA", "PIEZA", 20, 19, 380],
  ["PAN", "DORADITAS", "PANADERIA", "PIEZA", 96, 7, 672],
].map(([category, name, supplier, unit, qty, unitCost, totalCost]) => ({
  category,
  name,
  supplier,
  unit,
  qty,
  unitCost,
  totalCost,
}));

const recipeCosts = {
  "atole-dia": 4.71,
  "cafe-olla": 9.15,
  zacahuil: 23.37,
  "bocoles-maiz": 39.57,
  "bocoles-harina": 44.73,
  tamales: 9.75,
  "empanadas-fritas": 5.99,
  "empanadas-harina": 5.49,
  molotes: 23.07,
  enchiladas: 47.24,
  "enchiladas-chile-seco": 67.33,
  estrujadas: 15.07,
  torrejas: 14.97,
  hojuelas: 8.87,
  "platanos-fritos": 11,
  "roscas-sin-azucar": 7,
  "roscas-con-azucar": 7,
  pintas: 7,
  chichimbre: 7,
  chancludas: 7,
  envidiosas: 7,
  pemoles: 5,
  batidas: 19,
  doraditas: 7,
};

const fixedExpenses = [
  { name: "Gasto insumos y pan", amount: 17241.54 },
  { name: "Gasto pan registrado", amount: 4212 },
];

const inventoryRecipes = {
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
    { name: "MASA MERCADO", qty: 0.15 },
    { name: "PIERNA DE CERDO", qty: 0.06 },
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
    { name: "HUEVO", qty: 0.04 },
    { name: "CANELA MOLIDA", qty: 0.001 },
  ],
  "platanos-fritos": [
    { name: "PLATANO DE CASTILLA", qty: 0.18 },
    { name: "CREMA", qty: 0.07 },
    { name: "QUESO FRESCO DE ARO", qty: 0.008 },
  ],
  "cafe-olla": [
    { name: "CANELA VARA", qty: 0.004 },
  ],
  "atole-dia": [
    { name: "MASA MERCADO", qty: 0.04 },
    { name: "CANELA VARA", qty: 0.003 },
  ],
};

const icons = {
  sale: `<path d="M4 6h16v12H4z" /><path d="M8 10h8M8 14h5" />`,
  tables: `<path d="M4 9h16" /><path d="M6 9l-2 10M18 9l2 10" /><path d="M8 9V5h8v4" />`,
  kitchen: `<path d="M4 10h16" /><path d="M6 10v8a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2v-8" /><path d="M8 6h8" /><path d="M10 3h4" />`,
  inventory: `<path d="M4 7 12 3l8 4-8 4Z" /><path d="M4 7v10l8 4 8-4V7" /><path d="M12 11v10" />`,
  data: `<path d="M4 19V5" /><path d="M4 19h16" /><path d="M8 16v-5" /><path d="M12 16V8" /><path d="M16 16v-8" />`,
  users: `<path d="M16 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" /><circle cx="9.5" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.8" /><path d="M16 3.1a4 4 0 0 1 0 7.8" />`,
  logout: `<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="M16 17l5-5-5-5" /><path d="M21 12H9" />`,
  search: `<circle cx="10.5" cy="10.5" r="6.5" /><path d="m16 16 4 4" />`,
  plus: `<path d="M12 5v14M5 12h14" />`,
  minus: `<path d="M5 12h14" />`,
  trash: `<path d="M4 7h16" /><path d="M9 7V5h6v2" /><path d="M7 7l1 13h8l1-13" />`,
  table: `<path d="M4 9h16" /><path d="M6 9l-2 10M18 9l2 10" /><path d="M8 9V5h8v4" />`,
  bag: `<path d="M6 8h12l-1 13H7Z" /><path d="M9 8a3 3 0 0 1 6 0" />`,
  check: `<path d="M20 6 9 17l-5-5" />`,
  clock: `<circle cx="12" cy="12" r="9" /><path d="M12 7v5l3 2" />`,
  cash: `<path d="M4 7h16v10H4z" /><circle cx="12" cy="12" r="3" /><path d="M7 9v.01M17 15v.01" />`,
  card: `<path d="M3 6h18v12H3z" /><path d="M3 10h18" /><path d="M7 15h4" />`,
  transfer: `<path d="M7 7h11l-3-3" /><path d="M17 17H6l3 3" />`,
  note: `<path d="M5 4h10l4 4v12H5z" /><path d="M15 4v5h5" /><path d="M8 13h8M8 17h6" />`,
  alert: `<path d="M12 3 2.8 19h18.4Z" /><path d="M12 8v5" /><path d="M12 16.5v.01" />`,
  cancel: `<circle cx="12" cy="12" r="9" /><path d="M8 8l8 8M16 8l-8 8" />`,
  print: `<path d="M7 8V4h10v4" /><path d="M7 17H5a2 2 0 0 1-2-2v-3a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2h-2" /><path d="M7 14h10v6H7z" />`,
  digital: `<path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" />`,
  empanada: `<path d="M4 15a8 8 0 0 1 16 0v3H4z" /><path d="M8 15v3M12 12v6M16 15v3" />`,
  bowl: `<path d="M5 11h14c-.4 5-3 8-7 8s-6.6-3-7-8Z" /><path d="M7 8c1.5-1.5 8.5-1.5 10 0" />`,
  steam: `<path d="M8 4c2 2-2 3 0 5M12 4c2 2-2 3 0 5M16 4c2 2-2 3 0 5" /><path d="M5 13h14l-2 7H7Z" />`,
  fry: `<path d="M5 12h14l-2 8H7Z" /><path d="M7 9h10" /><path d="M9 5h6" />`,
  plate: `<circle cx="12" cy="12" r="7" /><circle cx="12" cy="12" r="3" />`,
  dessert: `<path d="M6 10h12l-2 9H8Z" /><path d="M8 10c0-3 8-3 8 0" /><path d="M12 3v4" />`,
  cup: `<path d="M7 4h10l-1 16H8Z" /><path d="M8 8h8" />`,
};

const defaultState = {
  sessionUserId: null,
  authError: "",
  view: "sale",
  activeOrderId: null,
  activeSection: "Para picar",
  activeSubsection: "Todos",
  productSearch: "",
  productConfig: null,
  modal: null,
  paymentMethod: "Efectivo",
  updateInfo: null,
  updateBusy: false,
  settings: {
    restaurantName: "LibrePOS",
    subtitle: "Los Tatas · POS restaurante",
    theme: "tatias",
  },
  users: defaultUsers,
  orders: [],
  sales: [],
  cancellations: [],
  inventory: inventoryItems,
  inventoryMovements: [],
  expenses: fixedExpenses,
  attendance: [],
};

let state = loadState();
let toastTimer;
let celebrationTimer;
let lockedScrollY = 0;
let openTableSubmitLocked = false;
let syncEnabled = false;
let syncVersion = 0;
let syncClientId = loadClientId();
let syncPushTimer;
let syncLastPayload = "";

const app = document.querySelector("#app");

function singleOption(id, label, choices) {
  return {
    id,
    label,
    type: "single",
    required: true,
    choices: choices.map((choice) => ({ label: choice })),
  };
}

function proteinOption() {
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

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (!saved) return structuredClone(defaultState);
    return {
      ...structuredClone(defaultState),
      ...saved,
      settings: { ...defaultState.settings, ...saved.settings },
      users: normalizeUsers(saved.users),
      orders: Array.isArray(saved.orders) ? saved.orders : [],
      sales: Array.isArray(saved.sales) ? saved.sales : [],
      cancellations: Array.isArray(saved.cancellations) ? saved.cancellations : [],
      inventory: normalizeInventory(saved.inventory),
      inventoryMovements: Array.isArray(saved.inventoryMovements) ? saved.inventoryMovements : [],
      expenses: Array.isArray(saved.expenses) ? saved.expenses : fixedExpenses,
      attendance: Array.isArray(saved.attendance) ? saved.attendance : [],
    };
  } catch {
    return structuredClone(defaultState);
  }
}

function safeId(prefix) {
  const randomUuid = globalThis.crypto?.randomUUID?.();
  if (randomUuid) return `${prefix}-${randomUuid}`;
  const fallback = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
  return `${prefix}-${fallback}`;
}

function loadClientId() {
  try {
    const saved = localStorage.getItem(CLIENT_ID_KEY);
    if (saved) return saved;
    const next = safeId("client");
    localStorage.setItem(CLIENT_ID_KEY, next);
    return next;
  } catch {
    return safeId("client");
  }
}

function cloneValue(value) {
  return value == null ? value : JSON.parse(JSON.stringify(value));
}

function normalizeInventory(inventory) {
  const source = Array.isArray(inventory) && inventory.length ? inventory : inventoryItems;
  const normalized = source.map((item, index) => ({
    id: item.id || `inv-${index}-${normalize(item.name || "item").replaceAll(" ", "-")}`,
    category: item.category || "GENERAL",
    name: item.name || "Insumo",
    supplier: item.supplier || "Sin proveedor",
    unit: item.unit || "PZ",
    qty: Number(item.qty) || 0,
    unitCost: Number(item.unitCost) || 0,
    totalCost: Number.isFinite(Number(item.totalCost))
      ? Number(item.totalCost)
      : (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
  }));
  inventoryItems.forEach((item, index) => {
    if (normalized.some((entry) => normalize(entry.name) === normalize(item.name))) return;
    normalized.push({
      id: item.id || `inv-base-${index}-${normalize(item.name || "item").replaceAll(" ", "-")}`,
      category: item.category || "GENERAL",
      name: item.name || "Insumo",
      supplier: item.supplier || "Sin proveedor",
      unit: item.unit || "PZ",
      qty: Number(item.qty) || 0,
      unitCost: Number(item.unitCost) || 0,
      totalCost: Number.isFinite(Number(item.totalCost))
        ? Number(item.totalCost)
        : (Number(item.qty) || 0) * (Number(item.unitCost) || 0),
    });
  });
  return normalized;
}

function normalizeUsers(users) {
  const source = Array.isArray(users) && users.length ? users : defaultUsers;
  const merged = source.some((user) => user.username === "admin") ? source : [...defaultUsers, ...source];
  return merged.map((user) => ({
    ...user,
    password: user.password ?? (user.username === "admin" && !user.passwordHash ? "admin" : ""),
    role: user.role || roleFromFunctions(normalizeUserFunctions(user)),
    functions: normalizeUserFunctions(user),
    active: user.active !== false,
  }));
}

function normalizeUserFunctions(user) {
  const valid = new Set(userFunctionOptions.map((item) => item.id));
  const source = Array.isArray(user.functions) && user.functions.length ? user.functions : functionsFromRole(user.role);
  const normalized = source.filter((item) => valid.has(item));
  return normalized.length ? normalized : ["mesero"];
}

function functionsFromRole(role = "") {
  const value = normalize(role);
  if (value.includes("admin")) return ["admin", "mesero", "cocina"];
  if (value.includes("cocina")) return ["cocina"];
  return ["mesero"];
}

function roleFromFunctions(functions) {
  if (functions.includes("admin")) return "Administrador";
  if (functions.length > 1) return functions.map(functionLabel).join(" + ");
  return functionLabel(functions[0] || "mesero");
}

function functionLabel(id) {
  return userFunctionOptions.find((item) => item.id === id)?.label || id;
}

function hasUserFunction(user, functionId) {
  const functions = normalizeUserFunctions(user);
  return functions.includes("admin") || functions.includes(functionId);
}

function isAdminUser(user = currentUser()) {
  return Boolean(user && normalizeUserFunctions(user).includes("admin"));
}

function availableWaiters() {
  const waiters = state.users.filter((item) => item.active && hasUserFunction(item, "mesero"));
  return waiters.length ? waiters : state.users.filter((item) => item.active);
}

function persist() {
  persistLocal();
  queueSyncState();
}

function persistLocal() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    showToast("No se pudo guardar en este navegador.");
  }
}

function sharedStateFromCurrent() {
  return Object.fromEntries(SHARED_STATE_KEYS.map((key) => [key, cloneValue(state[key])]));
}

function normalizeSharedState(shared = {}) {
  return {
    settings: { ...defaultState.settings, ...(shared.settings || {}) },
    users: normalizeUsers(shared.users),
    orders: Array.isArray(shared.orders) ? shared.orders : [],
    sales: Array.isArray(shared.sales) ? shared.sales : [],
    cancellations: Array.isArray(shared.cancellations) ? shared.cancellations : [],
    inventory: normalizeInventory(shared.inventory),
    inventoryMovements: Array.isArray(shared.inventoryMovements) ? shared.inventoryMovements : [],
    expenses: Array.isArray(shared.expenses) ? shared.expenses : fixedExpenses,
    attendance: Array.isArray(shared.attendance) ? shared.attendance : [],
  };
}

function applySharedState(shared) {
  const localSession = {
    sessionUserId: state.sessionUserId,
    authError: state.authError,
    view: state.view,
    activeOrderId: state.activeOrderId,
    activeSection: state.activeSection,
    activeSubsection: state.activeSubsection,
    productSearch: state.productSearch,
    productConfig: state.productConfig,
    modal: state.modal,
    paymentMethod: state.paymentMethod,
    updateInfo: state.updateInfo,
    updateBusy: state.updateBusy,
  };
  state = {
    ...state,
    ...normalizeSharedState(shared),
    ...localSession,
  };
  if (state.activeOrderId && !getOrder(state.activeOrderId)) state.activeOrderId = null;
}

function queueSyncState() {
  if (!syncEnabled) return;
  clearTimeout(syncPushTimer);
  syncPushTimer = window.setTimeout(pushSharedState, 150);
}

async function pushSharedState() {
  if (!syncEnabled) return;
  const shared = sharedStateFromCurrent();
  const serialized = JSON.stringify(shared);
  if (serialized === syncLastPayload) return;
  const baseSnapshot = parseSnapshot(syncLastPayload);
  syncLastPayload = serialized;
  try {
    const response = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: syncClientId, baseVersion: syncVersion, state: shared }),
    });
    const payload = await response.json();
    if (response.status === 409) {
      await resolveSyncConflict(payload, shared, baseSnapshot);
      return;
    }
    if (!response.ok) return;
    syncVersion = Number(payload.version) || syncVersion;
    if (payload.state) {
      applySharedState(payload.state);
      syncLastPayload = JSON.stringify(sharedStateFromCurrent());
      persistLocal();
      render();
    }
  } catch {
    // The app still works locally when the sync server is not available.
  }
}

async function resolveSyncConflict(payload, localShared, base) {
  if (!payload.state) return;
  const remote = normalizeSharedState(payload.state);
  const merged = mergeSharedStates(base, localShared, remote);
  syncVersion = Number(payload.version) || syncVersion;
  applySharedState(merged);
  syncLastPayload = JSON.stringify(remote);
  persistLocal();
  try {
    const retry = await fetch("/api/state", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId: syncClientId, baseVersion: syncVersion, state: sharedStateFromCurrent() }),
    });
    if (!retry.ok) return;
    const saved = await retry.json();
    syncVersion = Number(saved.version) || syncVersion;
    if (saved.state) applySharedState(saved.state);
    syncLastPayload = JSON.stringify(sharedStateFromCurrent());
    persistLocal();
    render();
  } catch {
    // Keep the merged local state; the next save will try again.
  }
}

function parseSnapshot(value) {
  try {
    return value ? JSON.parse(value) : {};
  } catch {
    return {};
  }
}

function mergeSharedStates(base = {}, local = {}, remote = {}) {
  const merged = {};
  SHARED_STATE_KEYS.forEach((key) => {
    if (Array.isArray(local[key]) || Array.isArray(remote[key])) {
      merged[key] = mergeArrayById(base[key], local[key], remote[key], key);
      return;
    }
    merged[key] = chooseMergedValue(base[key], local[key], remote[key]);
  });
  return normalizeSharedState(merged);
}

function mergeArrayById(baseValue = [], localValue = [], remoteValue = [], key = "") {
  const base = Array.isArray(baseValue) ? baseValue : [];
  const local = Array.isArray(localValue) ? localValue : [];
  const remote = Array.isArray(remoteValue) ? remoteValue : [];
  const source = [...base, ...local, ...remote];
  if (!source.some((item) => item?.id)) {
    return chooseMergedValue(base, local, remote) || [];
  }
  const ids = new Set(source.map((item) => item?.id).filter(Boolean));
  return [...ids].map((id) => mergeEntity(
    base.find((item) => item?.id === id),
    local.find((item) => item?.id === id),
    remote.find((item) => item?.id === id),
    key,
  )).filter(Boolean);
}

function mergeEntity(base, local, remote, key) {
  if (key === "orders") {
    const merged = chooseMergedObject(base, local, remote);
    if (!merged) return null;
    merged.items = mergeArrayById(base?.items, local?.items, remote?.items, "order-items");
    merged.commandBatches = mergeArrayById(base?.commandBatches, local?.commandBatches, remote?.commandBatches, "command-batches");
    merged.alerts = mergeArrayById(base?.alerts, local?.alerts, remote?.alerts, "alerts");
    return merged;
  }
  return chooseMergedValue(base, local, remote);
}

function chooseMergedObject(base, local, remote) {
  const chosen = chooseMergedValue(base, local, remote);
  return chosen && typeof chosen === "object" ? chosen : null;
}

function chooseMergedValue(base, local, remote) {
  const localChanged = !isSameJson(local, base);
  const remoteChanged = !isSameJson(remote, base);
  if (localChanged && !remoteChanged) return cloneValue(local);
  if (!localChanged && remoteChanged) return cloneValue(remote);
  if (localChanged && remoteChanged && isPlainObject(local) && isPlainObject(remote)) {
    return { ...cloneValue(remote), ...cloneValue(local) };
  }
  if (localChanged && remoteChanged) return cloneValue(local);
  return cloneValue(remote ?? local ?? base);
}

function isPlainObject(value) {
  return value && typeof value === "object" && !Array.isArray(value);
}

function isSameJson(left, right) {
  return JSON.stringify(left ?? null) === JSON.stringify(right ?? null);
}

async function initNetworkSync() {
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    const payload = await response.json();
    syncEnabled = true;
    syncVersion = Number(payload.version) || 0;
    if (payload.state) {
      applySharedState(payload.state);
      const remotePayload = JSON.stringify(payload.state);
      const normalizedPayload = JSON.stringify(sharedStateFromCurrent());
      syncLastPayload = remotePayload;
      persistLocal();
      render();
      if (normalizedPayload !== remotePayload) queueSyncState();
    } else {
      pushSharedState();
    }
    startSyncEvents();
  } catch {
    // Running without the LAN sync server leaves localStorage behavior unchanged.
  }
}

function startSyncEvents() {
  if (!("EventSource" in window)) {
    window.setInterval(pollSyncState, 2500);
    return;
  }
  const source = new EventSource(`/api/events?clientId=${encodeURIComponent(syncClientId)}`);
  source.addEventListener("state", (event) => {
    const payload = JSON.parse(event.data);
    applyRemoteSyncPayload(payload);
  });
  source.onerror = () => {
    source.close();
    window.setInterval(pollSyncState, 2500);
  };
}

async function pollSyncState() {
  if (!syncEnabled) return;
  try {
    const response = await fetch("/api/state", { cache: "no-store" });
    if (!response.ok) return;
    applyRemoteSyncPayload(await response.json());
  } catch {
    // Ignore transient network drops.
  }
}

function applyRemoteSyncPayload(payload) {
  const version = Number(payload.version) || 0;
  if (!payload.state || version <= syncVersion || payload.clientId === syncClientId) return;
  syncVersion = version;
  applySharedState(payload.state);
  syncLastPayload = JSON.stringify(sharedStateFromCurrent());
  persistLocal();
  render();
}

async function checkForUpdates() {
  try {
    const response = await fetch("/api/update/status", { cache: "no-store" });
    if (!response.ok) return;
    const info = await response.json();
    const previous = state.updateInfo || {};
    const changed =
      previous.available !== info.available ||
      previous.remoteCommit !== info.remoteCommit ||
      previous.localCommit !== info.localCommit;
    state.updateInfo = info;
    if (changed && currentUser()) render();
  } catch {
    // The update button stays hidden when GitHub or the local server is unavailable.
  }
}

async function applyUpdate() {
  if (state.updateBusy) return;
  state.updateBusy = true;
  render();
  try {
    const response = await fetch("/api/update/apply", { method: "POST" });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(payload.error || "update-failed");
    state.updateInfo = {
      ...(state.updateInfo || {}),
      ...payload,
      available: false,
      localCommit: payload.remoteCommit || state.updateInfo?.remoteCommit || state.updateInfo?.localCommit,
    };
    persistLocal();
    showToast(
      payload.updated
        ? "LibrePOS actualizado. Cierra y abre LibrePOS para cargar la nueva version."
        : "LibrePOS ya estaba actualizado.",
    );
  } catch (error) {
    const message = String(error?.message || "");
    if (message.includes("update-in-progress")) {
      showToast("Ya hay una actualizacion en curso.");
    } else if (message.includes("github")) {
      showToast("No se pudo consultar GitHub. Revisa la conexion a internet.");
    } else {
      showToast("No se pudo actualizar LibrePOS.");
    }
  } finally {
    state.updateBusy = false;
    render();
  }
}

function setTheme() {
  const theme = themes.find((item) => item.id === state.settings.theme) || themes[0];
  document.documentElement.style.setProperty("--brand", theme.brand);
  document.documentElement.style.setProperty("--brand-strong", theme.strong);
  document.documentElement.style.setProperty("--brand-soft", theme.soft);
  document.documentElement.style.setProperty("--teal", theme.teal);
}

function svg(name, className = "icon") {
  return `<svg class="${className}" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.plate}</svg>`;
}

function currentUser() {
  return state.users.find((user) => user.id === state.sessionUserId) || null;
}

function getActiveOrder() {
  return state.orders.find((order) => order.id === state.activeOrderId && order.status === "open") || null;
}

function getOpenOrders() {
  return state.orders.filter((order) => order.status === "open");
}

function currentInventory() {
  state.inventory = normalizeInventory(state.inventory);
  return state.inventory;
}

function getTableOrder(number) {
  return getOpenOrders().find((order) => order.type === "table" && Number(order.tableNumber) === Number(number)) || null;
}

function getOrder(orderId) {
  return state.orders.find((order) => order.id === orderId && order.status === "open") || null;
}

function findLine(lineId) {
  for (const order of getOpenOrders()) {
    const line = order.items.find((item) => item.id === lineId);
    if (line) return { order, line };
  }
  return null;
}

function activeAlerts(order) {
  return (order.alerts || []).filter((alert) => !alert.clearedAt);
}

function addOrderAlert(order, message, tone = "cancel") {
  order.alerts = order.alerts || [];
  order.alerts.unshift({
    id: safeId("alert"),
    tone,
    message,
    createdAt: new Date().toISOString(),
    createdBy: currentUser()?.id,
  });
}

function recordCancellation(entry) {
  state.cancellations = Array.isArray(state.cancellations) ? state.cancellations : [];
  state.cancellations.unshift({
    id: safeId("cancel"),
    createdAt: new Date().toISOString(),
    createdBy: currentUser()?.id,
    ...entry,
  });
}

const tableStateMeta = {
  free: { label: "Libre", legend: "Libre" },
  open: { label: "Sin comanda", legend: "Sin pedido" },
  ordering: { label: "Por comandar", legend: "Por comandar" },
  waiting: { label: "Esperando cocina", legend: "Esperando" },
  preparing: { label: "En cocina", legend: "En cocina" },
  ready: { label: "Listo para entregar", legend: "Listo" },
  served: { label: "Entregado", legend: "Entregado" },
};

function tableState(order) {
  if (!order) return "free";
  const totals = calculateTotals(order);
  const batches = (order.commandBatches || []).filter((batch) => batch.status !== "cancelled");
  if (batches.some((batch) => batch.status === "ready")) return "ready";
  if (batches.some((batch) => batch.status === "preparing")) return "preparing";
  if (batches.some((batch) => !batch.status || batch.status === "new")) return "waiting";
  if (totals.pending) return "ordering";
  if (order.items.length && batches.length && batches.every((batch) => batch.status === "delivered")) return "served";
  return "open";
}

function lastKitchenTime(order) {
  const batches = (order.commandBatches || []).filter((batch) => batch.status !== "cancelled");
  const latest = [...batches].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))[0];
  if (!latest) return "Sin comanda";
  if (latest.status === "delivered") return `Entregada hace ${elapsed(latest.deliveredAt || latest.updatedAt || latest.createdAt)}`;
  if (latest.status === "ready") return `Lista hace ${elapsed(latest.readyAt || latest.updatedAt || latest.createdAt)}`;
  if (latest.status === "preparing") return `Prep. ${elapsed(latest.startedAt || latest.updatedAt || latest.createdAt)}`;
  return `Espera ${elapsed(latest.createdAt)}`;
}

function lineServiceStatus(item, order) {
  if (item.status === "pending") return "pending";
  const commandIds = item.commandIds || [];
  const batches = (order.commandBatches || []).filter(
    (batch) =>
      batch.status !== "cancelled" &&
      (commandIds.includes(batch.id) || (batch.lines || []).some((line) => line.lineId === item.id)),
  );
  if (!batches.length) return "waiting";
  if (batches.some((batch) => batch.status === "ready")) return "ready";
  if (batches.some((batch) => batch.status === "preparing")) return "preparing";
  if (batches.some((batch) => !batch.status || batch.status === "new")) return "waiting";
  if (batches.every((batch) => batch.status === "delivered")) return "delivered";
  return "waiting";
}

function lineStatusLabel(status) {
  return {
    pending: "Por comandar",
    waiting: "Esperando cocina",
    preparing: "En cocina",
    ready: "Listo",
    delivered: "Entregado",
  }[status] || "Comandado";
}

function readyBatches(order) {
  return (order.commandBatches || []).filter((batch) => batch.status === "ready");
}

function batchQty(batch) {
  return (batch.lines || []).reduce((sum, line) => sum + line.qty, 0);
}

function findBatchForLine(order, lineId, commandId = "", allowedStatuses = []) {
  const batches = order?.commandBatches || [];
  const normalizedStatuses = allowedStatuses.map((status) => (status === "new" ? "" : status));
  const matchesStatus = (batch) => {
    if (!allowedStatuses.length) return true;
    const status = batch.status || "new";
    return allowedStatuses.includes(status) || normalizedStatuses.includes(batch.status || "");
  };
  if (commandId) {
    return batches.find(
      (batch) => batch.id === commandId && matchesStatus(batch) && (batch.lines || []).some((line) => line.lineId === lineId),
    );
  }
  return batches.find((batch) => matchesStatus(batch) && (batch.lines || []).some((line) => line.lineId === lineId));
}

function cancellationStageLabel(stage) {
  return {
    new: "Esperando cocina",
    waiting: "Esperando cocina",
    preparing: "En preparacion",
    ready: "Listo para entregar",
    pending: "Por comandar",
    order: "Orden completa",
  }[stage || "new"] || "Cancelacion";
}

function getProduct(id) {
  return menuCatalog.find((item) => item.id === id);
}

function sections() {
  return [...new Set(menuCatalog.map((item) => item.section))];
}

function subsectionsFor(section) {
  return ["Todos", ...new Set(menuCatalog.filter((item) => item.section === section).map((item) => item.subsection))];
}

function defaultSelectionsFor(product) {
  const selections = {};
  product.options.forEach((option) => {
    selections[option.id] = option.type === "multi" ? [] : 0;
  });
  return selections;
}

function calculateTotals(order) {
  const subtotal = order.items.reduce((sum, item) => sum + item.unitPrice * item.qty, 0);
  const statusCounts = order.items.reduce(
    (acc, item) => {
      const status = lineServiceStatus(item, order);
      acc[status] = (acc[status] || 0) + item.qty;
      if (status !== "pending") acc.commanded += item.qty;
      return acc;
    },
    { pending: 0, waiting: 0, preparing: 0, ready: 0, delivered: 0, commanded: 0 },
  );
  return {
    subtotal,
    total: subtotal,
    count: order.items.reduce((sum, item) => sum + item.qty, 0),
    ...statusCounts,
  };
}

function orderLabel(order) {
  if (order.type === "table") return `Mesa ${order.tableNumber}`;
  const name = String(order.customerName || "").trim();
  return name && name !== "Mostrador" ? `Para llevar · ${name}` : "Para llevar";
}

function waiterName(id) {
  return state.users.find((user) => user.id === id)?.name || "Sin mesero";
}

function showToast(message) {
  clearTimeout(toastTimer);
  let toast = document.querySelector(".toast");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.hidden = false;
  toastTimer = setTimeout(() => {
    toast.hidden = true;
  }, 3000);
}

function celebrateAction(type = "success", source, label = "") {
  const reducedMotion = window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
  const oldBurst = document.querySelector(".celebration-burst");
  oldBurst?.remove();
  clearTimeout(celebrationTimer);

  const rect = source?.getBoundingClientRect?.();
  const x = rect ? rect.left + rect.width / 2 : window.innerWidth / 2;
  const y = rect ? rect.top + rect.height / 2 : window.innerHeight * 0.42;
  const themes = {
    kitchen: ["#f59e0b", "#ea580c", "#fef3c7", "#7c2d12"],
    ready: ["#16a34a", "#22c55e", "#dcfce7", "#14532d"],
    delivered: ["#0d9488", "#14b8a6", "#ccfbf1", "#134e4a"],
    paid: ["#1c1917", "#df835f", "#f7d6c8", "#2f6f73"],
    success: ["#16a34a", "#f59e0b", "#df835f", "#0d9488"],
  };
  const colors = themes[type] || themes.success;
  const burst = document.createElement("div");
  burst.className = `celebration-burst is-${type}`;
  burst.style.left = `${x}px`;
  burst.style.top = `${y}px`;

  const ring = document.createElement("span");
  ring.className = "celebration-ring";
  burst.appendChild(ring);

  if (label) {
    const badge = document.createElement("span");
    badge.className = "celebration-badge";
    badge.textContent = label;
    burst.appendChild(badge);
  }

  if (!reducedMotion) {
    const count = type === "paid" ? 30 : 24;
    for (let index = 0; index < count; index += 1) {
      const particle = document.createElement("span");
      const angle = (Math.PI * 2 * index) / count + (index % 2 ? 0.18 : -0.12);
      const distance = 54 + (index % 6) * 10;
      const dx = Math.cos(angle) * distance;
      const dy = Math.sin(angle) * distance - 18;
      particle.className = `celebration-particle ${index % 3 === 0 ? "is-square" : ""}`;
      particle.style.setProperty("--dx", `${dx.toFixed(1)}px`);
      particle.style.setProperty("--dy", `${dy.toFixed(1)}px`);
      particle.style.setProperty("--size", `${6 + (index % 4)}px`);
      particle.style.setProperty("--delay", `${(index % 5) * 18}ms`);
      particle.style.setProperty("--spin", `${index % 2 ? 140 : -120}deg`);
      particle.style.setProperty("--color", colors[index % colors.length]);
      burst.appendChild(particle);
    }
  }

  document.body.appendChild(burst);
  celebrationTimer = setTimeout(() => burst.remove(), 1300);
}

function render() {
  setTheme();
  if (!currentUser()) {
    app.innerHTML = renderLogin();
    syncScrollLock();
    bindLogin();
    return;
  }
  if (state.view === "users" && !isAdminUser()) state.view = "profile";
  if (!state.view || !availableNavItems().some(([view]) => view === state.view)) state.view = "profile";

  app.innerHTML = `
    <main class="app-shell">
      ${renderHeader()}
      <section class="view">
        ${state.view === "profile" ? renderProfile() : ""}
        ${state.view === "sale" ? renderSale() : ""}
        ${state.view === "tables" ? renderTables() : ""}
        ${state.view === "kitchen" ? renderKitchen() : ""}
        ${state.view === "inventory" ? renderInventory() : ""}
        ${state.view === "data" ? renderData() : ""}
        ${state.view === "users" ? renderUsers() : ""}
      </section>
      ${renderModal()}
    </main>
  `;
  syncScrollLock();
  bindEvents();
}

function syncScrollLock() {
  const shouldLock = Boolean(currentUser() && (state.modal || state.productConfig));
  const isLocked = document.body.classList.contains("modal-open");
  if (shouldLock && !isLocked) {
    lockedScrollY = window.scrollY || document.documentElement.scrollTop || 0;
    document.documentElement.classList.add("modal-open");
    document.body.classList.add("modal-open");
    document.body.style.setProperty("--modal-scroll-y", `-${lockedScrollY}px`);
    return;
  }
  if (!shouldLock && isLocked) {
    document.documentElement.classList.remove("modal-open");
    document.body.classList.remove("modal-open");
    document.body.style.removeProperty("--modal-scroll-y");
    window.scrollTo(0, lockedScrollY);
  }
}

function availableNavItems() {
  const user = currentUser();
  const items = [["profile", "Mi perfil", "users"]];
  if (hasUserFunction(user, "mesero")) {
    items.push(["sale", "Venta", "sale"], ["tables", "Mesas", "tables"]);
  }
  if (hasUserFunction(user, "cocina")) items.push(["kitchen", "Cocina", "kitchen"]);
  if (isAdminUser(user)) {
    items.push(["inventory", "Inventario", "inventory"], ["data", "Datos", "data"], ["users", "Usuarios", "users"]);
  }
  return items;
}

function renderLogin() {
  return `
    <main class="login-shell">
      <section class="login-panel">
        <div class="brand-lockup login-brand">
          <div class="brand-mark"><img src="${BRAND_IMAGE}" alt="Los Tatas" /></div>
          <div class="brand-copy">
            <h1 class="brand-title"><span>LibrePOS</span><span class="brand-badge">Los Tatas</span></h1>
            <p class="brand-subtitle">Acceso al punto de venta</p>
          </div>
        </div>
        <form class="login-form" data-login-form autocomplete="off">
          <label class="field">
            <span>Usuario</span>
            <input name="username" autocomplete="off" autocapitalize="none" spellcheck="false" />
          </label>
          <label class="field">
            <span>Contrasena</span>
            <input name="password" type="password" autocomplete="off" />
          </label>
          ${state.authError ? `<p class="form-error">${escapeHtml(state.authError)}</p>` : ""}
          <button class="primary-button" type="submit">${svg("check")}Entrar</button>
        </form>
      </section>
    </main>
  `;
}

function shortCommit(value) {
  return value ? String(value).slice(0, 7) : "";
}

function renderUpdateButton() {
  if (!isAdminUser()) return "";
  if (!state.updateBusy && !state.updateInfo?.available) return "";
  const title = state.updateInfo?.remoteCommit
    ? `Nueva version disponible: ${shortCommit(state.updateInfo.remoteCommit)}`
    : "Actualizar LibrePOS";
  return `
    <button class="nav-button update-nav-button ${state.updateBusy ? "is-busy" : ""}" data-apply-update ${state.updateBusy ? "disabled" : ""} title="${escapeHtml(title)}">
      ${svg("transfer")}
      <span>${state.updateBusy ? "Actualizando" : "Actualizar"}</span>
    </button>
  `;
}

function renderHeader() {
  const user = currentUser();
  return `
    <header class="topbar">
      <div class="brand-lockup">
        <div class="brand-mark"><img src="${BRAND_IMAGE}" alt="Los Tatas" /></div>
        <div class="brand-copy">
          <h1 class="brand-title">
            <span>${escapeHtml(state.settings.restaurantName)}</span>
            <span class="brand-badge">Los Tatas</span>
          </h1>
          <p class="brand-subtitle">${escapeHtml(state.settings.subtitle)} · ${escapeHtml(user.name)}</p>
        </div>
      </div>
      <nav class="topbar-actions" aria-label="Secciones">
        ${availableNavItems()
          .map(
            ([view, label, icon]) => `
              <button class="nav-button ${state.view === view ? "is-active" : ""}" data-nav="${view}">
                ${svg(icon)}
                <span>${label}</span>
              </button>
            `,
          )
          .join("")}
        ${renderUpdateButton()}
        <button class="nav-button logout-nav-button" data-logout>${svg("logout")}Salir</button>
      </nav>
    </header>
  `;
}

function renderSale() {
  const activeOrder = getActiveOrder();
  if (!activeOrder) return renderSaleHome();
  return `
    <div class="quick-actions">
      <button class="secondary-button" data-open-modal="open-table">${svg("table")}Nueva mesa</button>
      <button class="secondary-button" data-open-modal="takeout">${svg("bag")}Para llevar</button>
      <button class="secondary-button" data-back-home>${svg("minus")}Ordenes</button>
    </div>
    ${renderActiveTableSwitcher(activeOrder)}
    ${renderOrderFocus(activeOrder)}
    <div class="sale-workspace is-immediate">
      ${renderTicket(activeOrder)}
      ${renderMenu(activeOrder)}
    </div>
    ${renderMobileOrderBar(activeOrder)}
  `;
}

function renderMobileOrderBar(order) {
  const totals = calculateTotals(order);
  return `
    <section class="mobile-order-bar" aria-label="Acciones rapidas de orden">
      <div>
        <strong>${money.format(totals.total)}</strong>
        <span>${totals.pending} por comandar · ${totals.ready} listas</span>
      </div>
      <div class="mobile-order-actions">
        <button class="primary-button compact" data-open-modal="command" ${totals.pending ? "" : "disabled"}>${svg("digital")}Comandar</button>
        <button class="secondary-button compact" data-open-modal="price">${svg("cash")}</button>
        <button class="secondary-button compact" data-finalize-order ${order.items.length ? "" : "disabled"}>${svg("check")}</button>
      </div>
    </section>
  `;
}

function renderActiveTableSwitcher(activeOrder) {
  const activeOrders = getOpenOrders().sort((a, b) => {
    if (a.type !== b.type) return a.type === "table" ? -1 : 1;
    if (a.type === "table") return Number(a.tableNumber) - Number(b.tableNumber);
    return new Date(a.openedAt) - new Date(b.openedAt);
  });
  if (!activeOrders.length) return "";
  return `
    <section class="table-switcher" aria-label="Ordenes activas">
      <div class="table-switcher-head">
        <strong>${svg("tables")}Ordenes activas</strong>
        <span>${activeOrders.length}</span>
      </div>
      <div class="table-switcher-list">
        ${activeOrders
          .map((order) => {
            const totals = calculateTotals(order);
            const status = tableState(order);
            const priorityCount = totals.ready || totals.preparing || totals.waiting || totals.pending || totals.delivered || 0;
            const priorityLabel =
              totals.ready ? "listas" : totals.preparing ? "cocina" : totals.waiting ? "espera" : totals.pending ? "por cmd" : "ent.";
            return `
              <button class="table-switch-button order-type-${order.type} state-${status} ${order.id === activeOrder.id ? "is-active" : ""}" data-open-order="${order.id}">
                <span>
                  <strong>${escapeHtml(orderLabel(order))}</strong>
                  <small>${tableStateMeta[status].label} · ${elapsed(order.openedAt)}</small>
                </span>
                <span class="table-switch-meta">
                  <b>${priorityCount}</b>
                  <small>${priorityLabel}</small>
                </span>
              </button>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderSaleHome() {
  return `
    <div class="sale-home">
      ${renderServiceOverview()}
      <section class="action-band">
        <button class="big-action" data-open-modal="open-table">
          ${svg("table", "big-icon")}
          <span>Abrir nueva mesa</span>
        </button>
        <button class="big-action" data-open-modal="takeout">
          ${svg("bag", "big-icon")}
          <span>Para llevar</span>
        </button>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Ordenes abiertas</h2>
            <p class="panel-kicker">${getOpenOrders().length} activas</p>
          </div>
        </div>
        <div class="order-card-grid">
          ${
            getOpenOrders().length
              ? getOpenOrders().map(renderOrderCard).join("")
              : `<div class="empty-state">No hay mesas ni ordenes para llevar abiertas.</div>`
          }
        </div>
      </section>
    </div>
  `;
}

function renderServiceOverview() {
  const orders = getOpenOrders();
  const totals = orders.reduce(
    (acc, order) => {
      const status = tableState(order);
      acc[status] = (acc[status] || 0) + 1;
      if (order.type === "table") acc.tables += 1;
      if (order.type === "takeout") acc.takeout += 1;
      acc.revenue += calculateTotals(order).total;
      return acc;
    },
    { tables: 0, takeout: 0, ready: 0, preparing: 0, waiting: 0, ordering: 0, revenue: 0 },
  );
  return `
    <section class="service-overview" aria-label="Resumen de servicio">
      ${renderServiceCard("Abiertas", String(orders.length), `${totals.tables} mesas · ${totals.takeout} llevar`, "open")}
      ${renderServiceCard("Listas", String(totals.ready || 0), "por entregar", "ready")}
      ${renderServiceCard("En cocina", String(totals.preparing || 0), `${totals.waiting || 0} en espera`, "preparing")}
      ${renderServiceCard("Monto activo", money.format(totals.revenue), "sin cerrar", "money")}
    </section>
  `;
}

function renderServiceCard(label, value, detail, tone) {
  return `
    <article class="service-card tone-${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
      <small>${detail}</small>
    </article>
  `;
}

function renderOrderFocus(order) {
  const totals = calculateTotals(order);
  const status = tableState(order);
  return `
    <section class="order-focus state-${status}">
      <div>
        <span class="order-focus-kicker">${tableStateMeta[status].label}</span>
        <h2>${escapeHtml(orderLabel(order))}</h2>
        <p>${escapeHtml(waiterName(order.waiterId))}${order.guests ? ` · ${order.guests} comensales` : ""} · ${elapsed(order.openedAt)}</p>
      </div>
      <div class="order-focus-metrics">
        <span><strong>${totals.pending}</strong>Por comandar</span>
        <span><strong>${totals.waiting + totals.preparing + totals.ready}</strong>En proceso</span>
        <span><strong>${money.format(totals.total)}</strong>Total</span>
      </div>
    </section>
  `;
}

function renderTables() {
  const openTables = tables.map((number) => ({ number, order: getTableOrder(number) }));
  const takeoutOrders = getOpenOrders()
    .filter((order) => order.type === "takeout")
    .sort((a, b) => new Date(a.openedAt) - new Date(b.openedAt));
  const tableStates = ["free", "open", "ordering", "waiting", "preparing", "ready", "served"];
  const counts = openTables.reduce(
    (acc, item) => {
      acc[tableState(item.order)] += 1;
      return acc;
    },
    Object.fromEntries(tableStates.map((stateId) => [stateId, 0])),
  );
  return `
    <div class="tables-view">
      <section class="board-header">
        <div>
          <h2>Mesas</h2>
          <p>13 mesas · vista rapida por color</p>
        </div>
        <div class="table-legend">
          ${tableStates
            .map((stateId) => `<span><i class="legend-dot ${stateId}"></i>${tableStateMeta[stateId].legend} ${counts[stateId]}</span>`)
            .join("")}
        </div>
      </section>
      ${renderTakeoutNotes(takeoutOrders)}
      <section class="tables-grid">
        ${openTables.map(({ number, order }) => renderTableTile(number, order)).join("")}
      </section>
    </div>
  `;
}

function renderTakeoutNotes(orders) {
  if (!orders.length) return "";
  return `
    <section class="takeout-notes" aria-label="Ordenes para llevar">
      <div class="takeout-notes-head">
        <strong>${svg("bag")}Para llevar activos</strong>
        <span>${orders.length}</span>
      </div>
      <div class="takeout-note-list">
        ${orders.map(renderTakeoutNoteCard).join("")}
      </div>
    </section>
  `;
}

function renderTakeoutNoteCard(order) {
  const status = tableState(order);
  const totals = calculateTotals(order);
  const readyQty = readyBatches(order).reduce((sum, batch) => sum + batchQty(batch), 0);
  return `
    <article class="takeout-note state-${status}">
      <div class="takeout-note-main">
        <div>
          <h3>${escapeHtml(orderLabel(order))}</h3>
          <p>${tableStateMeta[status].label} · ${elapsed(order.openedAt)}</p>
        </div>
        <strong>${money.format(totals.total)}</strong>
      </div>
      <div class="table-progress">
        ${renderTableProgress(totals)}
      </div>
      ${order.comments ? `<div class="table-note">${escapeHtml(order.comments)}</div>` : ""}
      ${renderOrderAlerts(order)}
      <div class="takeout-note-actions">
        ${readyQty ? `<button class="primary-button deliver-button" data-deliver-ready="${order.id}">${svg("check")}Entregar (${readyQty})</button>` : ""}
        <button class="secondary-button" data-open-order="${order.id}">${svg("sale")}Continuar</button>
        <button class="secondary-button" data-open-modal="table-note" data-order-id="${order.id}">${svg("note")}Nota</button>
        <button class="danger-button" data-close-order="${order.id}">${svg("check")}Cerrar</button>
      </div>
    </article>
  `;
}

function renderOrderAlerts(order) {
  const alerts = activeAlerts(order);
  if (!alerts.length) return "";
  return `
    <div class="order-alerts">
      ${alerts
        .map(
          (alert) => `
            <div class="order-alert tone-${alert.tone || "cancel"}">
              <span>${svg("alert")}</span>
              <p>${escapeHtml(alert.message)}<small>${elapsed(alert.createdAt)}</small></p>
              <button class="icon-button compact alert-clear" data-clear-alert="${order.id}:${alert.id}" title="Limpiar aviso">${svg("check")}</button>
            </div>
          `,
        )
        .join("")}
    </div>
  `;
}

function renderTableTile(number, order) {
  const status = tableState(order);
  const label = tableStateMeta[status].label;
  const totals = order ? calculateTotals(order) : null;
  const readyCommands = order ? readyBatches(order) : [];
  const readyQty = readyCommands.reduce((sum, batch) => sum + batchQty(batch), 0);
  return `
    <article class="table-tile state-${status}">
      <div class="table-tile-head">
        <div>
          <h3>Mesa ${number}</h3>
          <p>${label}</p>
        </div>
        <span class="table-status">${label}</span>
      </div>
      ${
        order
          ? `
            <div class="table-metrics">
              <span><strong>${escapeHtml(waiterName(order.waiterId))}</strong>Mesero</span>
              <span><strong>${order.guests || 0}</strong>Comensales</span>
              <span><strong>${elapsed(order.openedAt)}</strong>Abierta</span>
              <span><strong>${money.format(totals.total)}</strong>Total</span>
            </div>
            <div class="table-progress">
              ${renderTableProgress(totals)}
              <span>${lastKitchenTime(order)}</span>
            </div>
            ${order.comments ? `<div class="table-note">${escapeHtml(order.comments)}</div>` : ""}
            ${renderOrderAlerts(order)}
            <div class="table-actions-row ${readyQty ? "has-delivery" : ""}">
              ${readyQty ? `<button class="primary-button deliver-button" data-deliver-ready="${order.id}">${svg("check")}Entregar listos (${readyQty})</button>` : ""}
              <button class="secondary-button" data-open-order="${order.id}">${svg("sale")}Continuar</button>
              <button class="secondary-button" data-open-modal="table-note" data-order-id="${order.id}">${svg("note")}Nota</button>
              <button class="danger-button" data-close-order="${order.id}">${svg("check")}Cerrar</button>
            </div>
          `
          : `
            <div class="table-empty-copy">Lista para abrir.</div>
            <button class="primary-button" data-open-modal="open-table" data-table-number="${number}">${svg("table")}Abrir</button>
          `
      }
    </article>
  `;
}

function renderTableProgress(totals) {
  const chips = [
    ["pending", "por comandar"],
    ["waiting", "espera"],
    ["preparing", "cocina"],
    ["ready", "listas"],
    ["delivered", "entregadas"],
  ].filter(([key]) => totals[key]);
  if (!chips.length) return `<span class="status-chip open">sin productos</span>`;
  return chips.map(([key, label]) => `<span class="status-chip ${key}">${totals[key]} ${label}</span>`).join("");
}

function renderOpenTableForm() {
  const user = currentUser();
  const occupiedTables = new Set(
    getOpenOrders()
      .filter((order) => order.type === "table")
      .map((order) => Number(order.tableNumber)),
  );
  const availableTables = tables.filter((number) => !occupiedTables.has(number));
  const requestedTable = Number(state.modal?.tableNumber);
  const selectedTable = availableTables.includes(requestedTable) ? requestedTable : availableTables[0];
  const noAvailableTables = availableTables.length === 0;
  return `
    <form class="panel-body field-grid" data-open-table-form>
      <div class="field-row">
        <label class="field">
          <span>Numero de mesa</span>
          <select name="tableNumber" ${noAvailableTables ? "disabled" : ""}>
            ${tables
              .map((number) => {
                const busy = occupiedTables.has(number);
                const selected = selectedTable === number;
                return `<option value="${number}" ${busy ? "disabled" : ""} ${selected ? "selected" : ""}>Mesa ${number}${busy ? " ocupada" : ""}</option>`;
              })
              .join("")}
          </select>
        </label>
        <label class="field">
          <span>Comensales</span>
          <input name="guests" type="number" min="1" value="2" />
        </label>
      </div>
      <label class="field">
        <span>Mesero</span>
        <select name="waiterId">
          ${availableWaiters()
            .map((item) => `<option value="${item.id}" ${item.id === user.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
            .join("")}
        </select>
      </label>
      <label class="field">
        <span>Comentarios opcionales</span>
        <textarea name="comments" rows="3" placeholder="Alergias, celebracion o notas de servicio"></textarea>
      </label>
      ${noAvailableTables ? `<div class="empty-state compact">No hay mesas libres para abrir.</div>` : ""}
      <button class="primary-button" type="submit" data-open-table-submit ${noAvailableTables ? "disabled" : ""}>${svg("table")}Abrir mesa</button>
    </form>
  `;
}

function renderTakeoutForm() {
  const user = currentUser();
  return `
    <form class="panel-body field-grid" data-open-takeout-form>
      <label class="field">
        <span>Cliente</span>
        <input name="customerName" placeholder="Mostrador" />
      </label>
      <label class="field">
        <span>Responsable</span>
        <select name="waiterId">
          ${availableWaiters()
            .map((item) => `<option value="${item.id}" ${item.id === user.id ? "selected" : ""}>${escapeHtml(item.name)}</option>`)
            .join("")}
        </select>
      </label>
      <button class="primary-button" type="submit">${svg("bag")}Abrir para llevar</button>
    </form>
  `;
}

function renderOrderCard(order) {
  const totals = calculateTotals(order);
  const status = tableState(order);
  return `
    <button class="order-card state-${status}" data-open-order="${order.id}">
      <span>
        <strong>${escapeHtml(orderLabel(order))}</strong>
        <small>${escapeHtml(waiterName(order.waiterId))}${order.guests ? ` · ${order.guests} pax` : ""}</small>
      </span>
      <span class="order-card-meta">
        <em class="order-card-status">${tableStateMeta[status].label}</em>
        <strong>${money.format(totals.total)}</strong>
        <small>${totals.pending} pendientes · ${totals.commanded} comandados</small>
      </span>
    </button>
  `;
}

function renderTicket(order) {
  const totals = calculateTotals(order);
  return `
    <aside class="ticket-column">
      <section class="ticket-head">
        <button class="ghost-button compact" data-back-home>${svg("minus")}Venta</button>
        <div>
          <h2>${escapeHtml(orderLabel(order))}</h2>
          <p>${escapeHtml(waiterName(order.waiterId))}${order.guests ? ` · ${order.guests} comensales` : ""} · ${elapsed(order.openedAt)}</p>
          ${order.comments ? `<p class="ticket-comment">${escapeHtml(order.comments)}</p>` : ""}
          ${renderOrderAlerts(order)}
        </div>
        <button class="ghost-button compact" data-open-modal="table-note" data-order-id="${order.id}">${svg("note")}Nota orden</button>
      </section>
      <section class="ticket-list">
        ${
          order.items.length
            ? order.items.map((item) => renderTicketLine(item, order)).join("")
            : `<div class="ticket-empty">Elige productos del menu para iniciar la orden.</div>`
        }
      </section>
      <section class="ticket-footer">
        <div class="total-line">
          <span>Por comandar</span>
          <strong>${totals.pending} pzas</strong>
        </div>
        <div class="total-line">
          <span>En proceso/listo</span>
          <strong>${totals.waiting + totals.preparing + totals.ready} pzas</strong>
        </div>
        <div class="total-line">
          <span>Entregado</span>
          <strong>${totals.delivered} pzas</strong>
        </div>
        <div class="total-line grand">
          <span>Precio</span>
          <strong>${money.format(totals.total)}</strong>
        </div>
        <div class="ticket-actions">
          <button class="primary-button" data-open-modal="command" ${totals.pending ? "" : "disabled"}>${svg("digital")}Comandar</button>
          <button class="secondary-button" data-open-modal="price">${svg("cash")}Precio</button>
          <button class="secondary-button" data-finalize-order ${order.items.length ? "" : "disabled"}>${svg("check")}Finalizar</button>
        </div>
      </section>
    </aside>
  `;
}

function renderTicketLine(item, order) {
  const serviceStatus = lineServiceStatus(item, order);
  const locked = item.status !== "pending";
  const canCancelFromSale = serviceStatus === "waiting";
  return `
    <article class="ticket-line is-${serviceStatus}">
      <div class="ticket-line-main">
        <div>
          <h3>${escapeHtml(item.name)}</h3>
          <p>${escapeHtml(item.optionsText || item.subsection)}</p>
          ${item.note ? `<p class="line-note">${escapeHtml(item.note)}</p>` : ""}
          <span class="line-status status-${serviceStatus}">${lineStatusLabel(serviceStatus)}</span>
        </div>
        <strong>${money.format(item.unitPrice * item.qty)}</strong>
      </div>
      <div class="ticket-line-controls">
        <div class="qty-control">
          <button data-line-qty="${item.id}" data-delta="-1" ${locked ? "disabled" : ""}>${svg("minus")}</button>
          <span>${item.qty}</span>
          <button data-line-qty="${item.id}" data-delta="1" ${locked ? "disabled" : ""}>${svg("plus")}</button>
        </div>
        <div class="line-action-buttons">
          <button class="icon-button" data-open-modal="line-note" data-line-id="${item.id}" title="Nota">${svg("note")}</button>
          ${
            canCancelFromSale
              ? `<button class="icon-button subtle-danger" data-open-modal="cancel-line" data-order-id="${order.id}" data-line-id="${item.id}" data-cancel-source="venta" title="Cancelar">${svg("cancel")}</button>`
              : ""
          }
          <button class="icon-button" data-remove-line="${item.id}" ${locked ? "disabled" : ""} title="Quitar">${svg("trash")}</button>
        </div>
      </div>
    </article>
  `;
}

function renderCommandOptions(order) {
  const pending = order.items.filter((item) => item.status === "pending");
  return `
    <div class="command-box">
      <p class="mini-title">Enviar ${pending.length} linea${pending.length === 1 ? "" : "s"}</p>
      <div class="command-grid">
        <button class="command-option" data-command-mode="digital">${svg("digital")}Digital</button>
        <button class="command-option" disabled title="Pendiente de impresora">${svg("print")}Impresa</button>
        <button class="command-option" disabled title="Pendiente de impresora">${svg("print")}Ambas</button>
      </div>
    </div>
  `;
}

function renderMenu(order) {
  const activeSubsections = subsectionsFor(state.activeSection);
  const query = normalize(state.productSearch);
  const products = menuCatalog.filter((item) => {
    const inSection = item.section === state.activeSection;
    const inSubsection = state.activeSubsection === "Todos" || item.subsection === state.activeSubsection;
    const text = normalize(`${item.name} ${item.description} ${item.section} ${item.subsection}`);
    return inSection && inSubsection && text.includes(query);
  });

  return `
    <section class="menu-column">
      <div class="menu-head">
        <div>
          <h2>Menu</h2>
          <p>${escapeHtml(state.activeSection)} · ${products.length} productos</p>
        </div>
        <span>${escapeHtml(orderLabel(order))}</span>
      </div>
      <div class="menu-toolbar">
        <div class="search-wrap">
          ${svg("search")}
          <input class="search-input" data-search value="${escapeAttr(state.productSearch)}" placeholder="Buscar en el menu" />
        </div>
      </div>
      <div class="mobile-menu-filters" aria-label="Filtros de menu movil">
        <label class="mobile-filter-field">
          <span>Categoria</span>
          <select data-mobile-section>
            ${sections()
              .map(
                (section) => `
                  <option value="${escapeAttr(section)}" ${state.activeSection === section ? "selected" : ""}>
                    ${escapeHtml(section)} (${menuCatalog.filter((item) => item.section === section).length})
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
        <label class="mobile-filter-field">
          <span>Subcategoria</span>
          <select data-mobile-subsection>
            ${activeSubsections
              .map(
                (subsection) => `
                  <option value="${escapeAttr(subsection)}" ${state.activeSubsection === subsection ? "selected" : ""}>
                    ${escapeHtml(subsection)}
                  </option>
                `,
              )
              .join("")}
          </select>
        </label>
      </div>
      <div class="section-tabs">
        ${sections()
          .map(
            (section) => `
              <button class="section-tab ${state.activeSection === section ? "is-active" : ""}" data-section="${escapeAttr(section)}">
                ${escapeHtml(section)}
                <small>${menuCatalog.filter((item) => item.section === section).length}</small>
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="chip-row">
        ${activeSubsections
          .map(
            (subsection) => `
              <button class="chip ${state.activeSubsection === subsection ? "is-active" : ""}" data-subsection="${escapeAttr(subsection)}">
                ${escapeHtml(subsection)}
              </button>
            `,
          )
          .join("")}
      </div>
      <div class="menu-grid">
        ${
          products.length
            ? products.map((item) => renderMenuItem(item)).join("")
            : `<div class="empty-state">No hay productos en esta combinacion.</div>`
        }
      </div>
    </section>
  `;
}

function renderMenuItem(item) {
  const hasOptions = item.options.length > 0;
  const stock = estimateProductStock(item, defaultSelectionsFor(item));
  return `
    <button class="menu-item" data-configure-product="${item.id}">
      <span class="menu-item-top">
        <span class="menu-icon">${svg(item.icon)}</span>
        <strong>${money.format(item.price)}</strong>
      </span>
      <span>
        <h3>${escapeHtml(item.name)}</h3>
        <p>${escapeHtml(item.description)}</p>
      </span>
      <span class="menu-meta">
        <span>${escapeHtml(item.subsection)}</span>
        <span>${hasOptions ? "Variantes" : "Directo"}</span>
        ${renderStockPill(stock)}
      </span>
    </button>
  `;
}

function renderOrderSidePanel(order) {
  return `
    <aside class="side-column">
      ${state.productConfig ? renderProductConfig() : renderOrderContext(order)}
    </aside>
  `;
}

function renderProductConfig() {
  const product = getProduct(state.productConfig.productId);
  if (!product) return "";
  const price = configuredUnitPrice(product, state.productConfig.selections);
  const total = price * state.productConfig.qty;
  const stock = estimateProductStock(product, state.productConfig.selections);
  return `
    <section class="panel detail-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">${escapeHtml(product.name)}</h2>
          <p class="panel-kicker">${escapeHtml(product.section)} · ${escapeHtml(product.subsection)}</p>
        </div>
        <button class="icon-button" data-close-config title="Cerrar">${svg("minus")}</button>
      </div>
      <div class="panel-body field-grid">
        <p class="detail-description">${escapeHtml(product.description)}</p>
        ${product.options.map((option) => renderOptionGroup(product, option)).join("")}
        <div data-config-stock-panel>
          ${renderProductStockPanel(stock, state.productConfig.qty)}
        </div>
        <label class="field">
          <span>Nota para cocina</span>
          <textarea data-config-note rows="3" placeholder="Ej. sin azucar, poco hielo, alergia">${escapeHtml(state.productConfig.note || "")}</textarea>
        </label>
        <div class="config-footer">
          <div class="qty-control large">
            <button data-config-qty="-1">${svg("minus")}</button>
            <span data-config-qty-value>${state.productConfig.qty}</span>
            <button data-config-qty="1">${svg("plus")}</button>
          </div>
          <div class="config-price">
            <span>Precio</span>
            <strong data-config-total>${money.format(total)}</strong>
            <small data-config-unit>${money.format(price)} c/u</small>
          </div>
        </div>
        <button class="primary-button" data-add-configured>${svg("plus")}Agregar al ticket</button>
      </div>
    </section>
  `;
}

function renderOptionGroup(product, option) {
  const selected = state.productConfig.selections[option.id];
  if (option.type === "multi") {
    const values = Array.isArray(selected) ? selected : [];
    return `
      <fieldset class="option-group">
        <legend>${escapeHtml(option.label)}</legend>
        ${option.choices
          .map(
            (choice, index) => `
              <button class="option-pill ${values.includes(index) ? "is-active" : ""}" data-toggle-option="${option.id}" data-choice-index="${index}" type="button">
                <span>${escapeHtml(choice.label)}</span>
                ${choice.priceDelta ? `<strong>+${money.format(choice.priceDelta)}</strong>` : ""}
                ${renderVariantStockBadge(product, option, index)}
              </button>
            `,
          )
          .join("")}
      </fieldset>
    `;
  }
  return `
    <fieldset class="option-group">
      <legend>${escapeHtml(option.label)}</legend>
      ${option.choices
        .map(
          (choice, index) => `
            <button class="option-pill ${selected === index ? "is-active" : ""}" data-select-option="${option.id}" data-choice-index="${index}" type="button">
              <span>${escapeHtml(choice.label)}</span>
              ${choice.price ? `<strong>${money.format(choice.price)}</strong>` : ""}
              ${renderVariantStockBadge(product, option, index)}
            </button>
          `,
        )
        .join("")}
    </fieldset>
  `;
}

function renderVariantStockBadge(product, option, index) {
  if (!state.productConfig || !variantAffectsInventory(product, option.id)) return "";
  const selections = structuredClone(state.productConfig.selections);
  selections[option.id] = option.type === "multi" ? toggleSelectionPreview(selections[option.id], index) : index;
  const stock = estimateProductStock(product, selections);
  if (!stock.known) return "";
  return `<small class="variant-stock ${stock.tone}">~${stock.orderable}</small>`;
}

function toggleSelectionPreview(selected, index) {
  const values = Array.isArray(selected) ? selected : [];
  return values.includes(index) ? values.filter((item) => item !== index) : [...values, index];
}

function variantAffectsInventory(product, optionId) {
  const variantOptions = {
    "empanadas-fritas": ["relleno"],
    "bocoles-maiz": ["relleno"],
    "bocoles-harina": ["proteina"],
    tamales: ["sabor"],
    "empanadas-harina": ["relleno"],
    molotes: ["relleno", "masa"],
    enchiladas: ["proteina", "salsa"],
    "enchiladas-chile-seco": ["proteina", "salsa"],
    estrujadas: ["proteina"],
  };
  return Boolean(variantOptions[product.id]?.includes(optionId));
}

function renderStockPill(stock) {
  if (!stock.known || stock.tone === "ok") return "";
  const labels = {
    low: "Inventario bajo",
    critical: "Inventario critico",
    zero: "Sin inventario",
  };
  return `
    <span class="stock-alert ${stock.tone}" title="${labels[stock.tone]}" aria-label="${labels[stock.tone]}">
      ${svg("alert")}
    </span>
  `;
}

function renderProductStockPanel(stock, requestedQty) {
  if (!stock.known) {
    return `
      <section class="stock-panel unknown" data-stock-panel>
        <div class="stock-panel-head">
          <span>${svg("inventory")}Inventario estimado</span>
          <strong>Sin receta</strong>
        </div>
        <p data-stock-message>No hay insumos ligados a este producto. Se puede vender, pero no hay alerta automatica.</p>
      </section>
    `;
  }
  const tightItems = stock.items.slice(0, 4);
  const overRequest = requestedQty > stock.orderable;
  return `
    <section class="stock-panel ${stock.tone} ${overRequest ? "over-request" : ""}" data-stock-panel>
      <div class="stock-panel-head">
        <span>${svg("inventory")}Inventario estimado</span>
        <strong>~${stock.orderable} orden${stock.orderable === 1 ? "" : "es"}</strong>
      </div>
      <p data-stock-message>${escapeHtml(productStockMessage(stock, requestedQty))}</p>
      <div class="stock-lines">
        ${tightItems
          .map(
            (item) => `
              <div class="stock-line ${item.portions <= 5 ? "is-tight" : ""}">
                <span>
                  <strong>${escapeHtml(item.name)}</strong>
                  <small>${formatNumber(item.availableQty)} ${escapeHtml(item.unit)} disp. · ${formatNumber(item.requiredQty)} por orden</small>
                </span>
                <b>${item.portions}</b>
              </div>
            `,
          )
          .join("")}
      </div>
    </section>
  `;
}

function productStockMessage(stock, requestedQty) {
  if (!stock.known) return "No hay insumos ligados a este producto. Se puede vender, pero no hay alerta automatica.";
  if (requestedQty > stock.orderable) {
    return `Alerta: estas capturando ${requestedQty}, pero el inventario sugiere hasta ${stock.orderable}.`;
  }
  if (stock.tone === "critical") return "Inventario critico. Conviene confirmar antes de prometer mas ordenes.";
  if (stock.tone === "low") return "Inventario bajo. Todavia se puede vender, pero hay que estar atentos.";
  return "Calculado con insumos disponibles menos tickets pendientes sin comandar.";
}

function renderOrderContext(order) {
  return `
    <section class="panel detail-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Orden abierta</h2>
          <p class="panel-kicker">${escapeHtml(orderLabel(order))}</p>
        </div>
      </div>
      <div class="panel-body field-grid">
        <div class="context-grid">
          <span><strong>Mesero</strong>${escapeHtml(waiterName(order.waiterId))}</span>
          <span><strong>Inicio</strong>${formatTime(order.openedAt)}</span>
          ${order.guests ? `<span><strong>Comensales</strong>${order.guests}</span>` : ""}
          <span><strong>Comandas</strong>${order.commandBatches.length}</span>
        </div>
        <div class="command-history">
          <h3 class="mini-title">Comandas digitales</h3>
          ${
            order.commandBatches.length
              ? order.commandBatches
                  .map(
                    (batch) => `
                      <article class="history-row">
                        <span>${svg("digital")}</span>
                        <div>
                          <strong>${formatTime(batch.createdAt)}</strong>
                          <p>${batch.lines.reduce((sum, line) => sum + line.qty, 0)} piezas · ${escapeHtml(waiterName(batch.createdBy))}</p>
                        </div>
                      </article>
                    `,
                  )
                  .join("")
              : `<p class="muted-text">Todavia no se ha comandado nada.</p>`
          }
        </div>
      </div>
    </section>
  `;
}

function renderModal() {
  if (state.productConfig) {
    return `
      <div class="modal-backdrop" data-close-modal>
        <div class="modal-card" data-modal-card>
          ${renderProductConfig()}
        </div>
      </div>
    `;
  }
  if (!state.modal) return "";
  const order = getActiveOrder();
  const modalOrder = getOrder(state.modal.orderId) || order;
  const lineTarget = state.modal.lineId ? findLine(state.modal.lineId) : null;
  const modalContent = {
    "open-table": renderOpenTableModal(),
    takeout: renderTakeoutModal(),
    "new-user": isAdminUser() ? renderCreateUserModal() : "",
    command: order ? renderCommandModal(order) : "",
    price: order ? renderPriceModal(order) : "",
    checkout: modalOrder ? renderCheckoutModal(modalOrder) : "",
    "cancel-order": modalOrder ? renderCancelOrderModal(modalOrder) : "",
    "cancel-line": lineTarget ? renderCancelLineModal(lineTarget.order, lineTarget.line, state.modal) : "",
    "table-note": modalOrder ? renderTableNoteModal(modalOrder) : "",
    "line-note": lineTarget ? renderLineNoteModal(lineTarget.order, lineTarget.line) : "",
  }[state.modal.type] || "";
  if (!modalContent) return "";
  return `
    <div class="modal-backdrop" data-close-modal>
      <div class="modal-card" data-modal-card>
        ${modalContent}
      </div>
    </div>
  `;
}

function renderOpenTableModal() {
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Abrir nueva mesa</h2>
          <p class="panel-kicker">Mesa, comensales y mesero responsable</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      ${renderOpenTableForm()}
    </section>
  `;
}

function renderTakeoutModal() {
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Para llevar</h2>
          <p class="panel-kicker">Orden rapida sin numero de mesa</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      ${renderTakeoutForm()}
    </section>
  `;
}

function renderCreateUserModal() {
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Nuevo usuario</h2>
          <p class="panel-kicker">Acceso y funciones dentro del POS</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <form class="panel-body field-grid" data-user-form>
        <label class="field">
          <span>Nombre</span>
          <input name="name" placeholder="Nombre del usuario" required />
        </label>
        <div class="field-row">
          <label class="field">
            <span>Usuario</span>
            <input name="username" placeholder="usuario" required />
          </label>
          <label class="field">
            <span>Contrasena inicial</span>
            <input name="password" type="password" placeholder="1234" required />
          </label>
        </div>
        ${renderFunctionChoices(["mesero"])}
        <button class="primary-button" type="submit">${svg("plus")}Crear usuario</button>
      </form>
    </section>
  `;
}

function renderTableNoteModal(order) {
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Nota de ${escapeHtml(orderLabel(order))}</h2>
          <p class="panel-kicker">Visible para el equipo durante el servicio</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <form class="panel-body field-grid" data-table-note-form data-order-id="${order.id}">
        <label class="field">
          <span>Nota de orden</span>
          <textarea name="comments" rows="4" placeholder="Alergias, celebracion, instrucciones de servicio">${escapeHtml(order.comments || "")}</textarea>
        </label>
        <button class="primary-button" type="submit">${svg("note")}Guardar nota</button>
      </form>
    </section>
  `;
}

function renderLineNoteModal(order, line) {
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Nota de producto</h2>
          <p class="panel-kicker">${escapeHtml(orderLabel(order))} · ${escapeHtml(line.name)}</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <form class="panel-body field-grid" data-line-note-form data-line-id="${line.id}">
        <label class="field">
          <span>Nota para cocina</span>
          <textarea name="note" rows="4" placeholder="Ej. sin azucar, sin cebolla, termino medio">${escapeHtml(line.note || "")}</textarea>
        </label>
        <button class="primary-button" type="submit">${svg("note")}Guardar nota</button>
      </form>
    </section>
  `;
}

function renderCommandModal(order) {
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Comandar</h2>
          <p class="panel-kicker">${escapeHtml(orderLabel(order))} · ${calculateTotals(order).pending} piezas pendientes</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <div class="panel-body">
        ${renderCommandOptions(order)}
      </div>
    </section>
  `;
}

function renderPriceModal(order) {
  const totals = calculateTotals(order);
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Precio</h2>
          <p class="panel-kicker">${escapeHtml(orderLabel(order))}</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <div class="panel-body field-grid">
        ${order.items
          .map(
            (item) => `
              <div class="price-row">
                <span>${item.qty} x ${escapeHtml(item.name)}${item.optionsText ? `<small>${escapeHtml(item.optionsText)}</small>` : ""}</span>
                <strong>${money.format(item.unitPrice * item.qty)}</strong>
              </div>
            `,
          )
          .join("")}
        <div class="total-line grand"><span>Total</span><strong>${money.format(totals.total)}</strong></div>
      </div>
    </section>
  `;
}

function renderCheckoutModal(order) {
  const totals = calculateTotals(order);
  const pendingWarning = totals.pending
    ? `<div class="checkout-warning">${svg("alert")}Hay ${totals.pending} pieza${totals.pending === 1 ? "" : "s"} sin comandar.</div>`
    : "";
  const cancelLabel = order.type === "table" ? "Cancelar mesa" : "Cancelar orden";
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Cerrar ${escapeHtml(orderLabel(order))}</h2>
          <p class="panel-kicker">Cobro o incidencia de cancelacion</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <div class="panel-body checkout-body">
        ${pendingWarning}
        <div class="checkout-total">
          <span>Total a cobrar</span>
          <strong data-checkout-total>${money.format(totals.total)}</strong>
        </div>
        <section class="tip-box" data-checkout-tip data-subtotal="${totals.subtotal}">
          <div class="tip-box-head">
            <strong>${svg("cash")}Propina</strong>
            <span data-tip-preview>${money.format(0)}</span>
          </div>
          <div class="tip-options">
            <label><input type="radio" name="tipMode" value="none" checked />Sin propina</label>
            <label><input type="radio" name="tipMode" value="fixed" />Fija</label>
            <label><input type="radio" name="tipMode" value="percent" />Porcentaje</label>
          </div>
          <label class="field tip-value-field">
            <span>Monto o porcentaje</span>
            <input data-tip-value type="number" min="0" step="0.01" value="0" />
          </label>
        </section>
        <div class="checkout-actions">
          <button class="primary-button" data-charge-order="${order.id}" data-payment-method="Efectivo">${svg("cash")}Efectivo</button>
          <button class="secondary-button" data-charge-order="${order.id}" data-payment-method="Tarjeta">${svg("card")}Tarjeta</button>
          <button class="danger-button" data-open-modal="cancel-order" data-order-id="${order.id}">${svg("cancel")}${cancelLabel}</button>
        </div>
      </div>
    </section>
  `;
}

function renderCancelOrderModal(order) {
  const totals = calculateTotals(order);
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Cancelar ${escapeHtml(orderLabel(order))}</h2>
          <p class="panel-kicker">Incidencia sin cobro · ${money.format(totals.total)}</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <form class="panel-body field-grid cancel-form" data-cancel-order-form data-order-id="${order.id}">
        <div class="incident-copy">
          ${svg("alert")}
          <p>La orden se cerrara como cancelada y quedara registrada en Datos.</p>
        </div>
        <label class="field">
          <span>Nota obligatoria</span>
          <textarea name="note" rows="4" required placeholder="Motivo de la cancelacion o incidencia"></textarea>
        </label>
        <button class="danger-button" type="submit">${svg("cancel")}Confirmar cancelacion</button>
      </form>
    </section>
  `;
}

function renderCancelLineModal(order, line, modal = {}) {
  const source = modal.cancelSource || "venta";
  const batch = findBatchForLine(order, line.id, modal.commandId, source === "venta" ? ["new"] : ["new", "preparing", "ready"]);
  const batchLine = batch?.lines?.find((item) => item.lineId === line.id);
  const stage = batch?.status || lineServiceStatus(line, order);
  const allowed =
    source === "venta"
      ? stage === "new" || lineServiceStatus(line, order) === "waiting"
      : ["new", "preparing", "ready"].includes(stage);
  const maxQty = Math.max(0, Math.min(line.qty, batchLine?.qty ?? line.qty));
  if (!allowed || maxQty <= 0) {
    return `
      <section class="panel modal-panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">No se puede cancelar</h2>
            <p class="panel-kicker">${escapeHtml(line.name)}</p>
          </div>
          <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
        </div>
        <div class="panel-body">
          <div class="empty-state compact">Esta linea ya no esta en una etapa cancelable desde esta ventana.</div>
        </div>
      </section>
    `;
  }
  const stageLabel = cancellationStageLabel(stage);
  return `
    <section class="panel modal-panel">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Cancelar producto</h2>
          <p class="panel-kicker">${escapeHtml(orderLabel(order))} · ${stageLabel}</p>
        </div>
        <button class="icon-button" data-close-modal-button title="Cerrar">${svg("minus")}</button>
      </div>
      <form
        class="panel-body field-grid cancel-form"
        data-cancel-line-form
        data-order-id="${order.id}"
        data-line-id="${line.id}"
        data-command-id="${batch?.id || ""}"
        data-cancel-source="${escapeAttr(source)}"
      >
        <div class="cancel-line-summary">
          <span>${svg("cancel")}</span>
          <p><strong>${escapeHtml(line.name)}</strong>${line.optionsText ? `<small>${escapeHtml(line.optionsText)}</small>` : ""}</p>
        </div>
        <div class="field-row">
          <label class="field">
            <span>Cantidad a cancelar</span>
            <input name="qty" type="number" min="1" max="${maxQty}" value="1" required />
          </label>
          <label class="field">
            <span>Disponible en esta comanda</span>
            <input value="${maxQty}" disabled />
          </label>
        </div>
        <label class="field">
          <span>Nota opcional</span>
          <textarea name="note" rows="3" placeholder="Motivo o detalle para la incidencia"></textarea>
        </label>
        <button class="danger-button" type="submit">${svg("cancel")}Cancelar producto</button>
      </form>
    </section>
  `;
}

function renderKitchen() {
  const commands = kitchenCommands();
  return `
    <section class="kitchen-board">
      <div class="board-header">
        <div>
          <h2>Cocina</h2>
          <p>${commands.length} comandas activas</p>
        </div>
        <span class="stat-pill">${commands.filter((item) => item.status === "new").length} nuevas</span>
      </div>
      <div class="kitchen-columns">
        ${["new", "preparing", "ready"].map((status) => renderKitchenColumn(status, commands)).join("")}
      </div>
    </section>
  `;
}

function renderKitchenColumn(status, commands) {
  const labels = {
    new: "Nuevas",
    preparing: "En preparacion",
    ready: "Listas para entregar",
  };
  const items = commands.filter((item) => item.status === status);
  return `
    <section class="kitchen-column">
      <h3><span>${labels[status]}</span><b>${items.length}</b></h3>
      <div class="kitchen-stack">
        ${
          items.length
            ? items.map(renderKitchenCard).join("")
            : `<div class="empty-state compact-empty">Sin comandas.</div>`
        }
      </div>
    </section>
  `;
}

function renderKitchenCard(command) {
  const timeLabel =
    command.status === "preparing"
      ? `Prep. ${elapsed(command.startedAt || command.updatedAt || command.createdAt)}`
      : command.status === "ready"
        ? `Lista hace ${elapsed(command.readyAt || command.updatedAt || command.createdAt)}`
        : `Espera ${elapsed(command.createdAt)}`;
  return `
    <article class="kitchen-card status-${command.status}">
      <div class="kitchen-card-head">
        <div>
          <h4>${escapeHtml(command.label)}</h4>
          <p>${formatTime(command.createdAt)} · ${escapeHtml(waiterName(command.createdBy))} · ${timeLabel}</p>
        </div>
        <strong>${command.lines.reduce((sum, line) => sum + line.qty, 0)} pzas</strong>
      </div>
      <div class="kitchen-lines">
        ${command.lines
          .map(
            (line) => `
              <div class="kitchen-line-row">
                <div class="kitchen-line-copy">
                  <strong>${line.qty} x ${escapeHtml(line.name)}</strong>
                  ${line.optionsText ? `<span>${escapeHtml(line.optionsText)}</span>` : ""}
                  ${line.note ? `<em>${svg("note")}${escapeHtml(line.note)}</em>` : ""}
                </div>
                <button
                  class="icon-button line-cancel-button"
                  data-open-modal="cancel-line"
                  data-order-id="${command.orderId}"
                  data-command-id="${command.id}"
                  data-line-id="${line.lineId}"
                  data-cancel-source="cocina"
                  title="Cancelar producto"
                >${svg("cancel")}</button>
              </div>
            `,
          )
          .join("")}
      </div>
      <div class="kitchen-actions">
        ${command.status === "new" ? `<button class="secondary-button" data-command-status="${command.orderId}:${command.id}:preparing">${svg("clock")}Preparar</button>` : ""}
        ${command.status === "preparing" ? `<button class="primary-button" data-command-status="${command.orderId}:${command.id}:ready">${svg("check")}Lista</button>` : ""}
      </div>
    </article>
  `;
}

function renderInventory() {
  const inventory = currentInventory();
  const total = inventory.reduce((sum, item) => sum + item.totalCost, 0);
  const categories = [...new Set(inventory.map((item) => item.category))];
  return `
    <div class="inventory-layout">
      <section class="summary-grid">
        ${renderSummaryCard("Valor inventario", money.format(total))}
        ${renderSummaryCard("Categorias", String(categories.length))}
        ${renderSummaryCard("Insumos", String(inventory.length))}
        ${renderSummaryCard("Bajo stock", String(inventory.filter((item) => Number(item.qty) <= 1).length))}
      </section>
      <section class="inventory-controls">
        <form class="panel panel-body field-grid" data-inventory-add-form>
          <h2 class="panel-title">Agregar insumo</h2>
          <div class="field-row">
            <label class="field"><span>Categoria</span><input name="category" required placeholder="PROTEINAS" /></label>
            <label class="field"><span>Insumo</span><input name="name" required placeholder="POLLO" /></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Proveedor</span><input name="supplier" placeholder="MERCADO" /></label>
            <label class="field"><span>Unidad</span><input name="unit" required placeholder="KILO" /></label>
          </div>
          <div class="field-row">
            <label class="field"><span>Cantidad</span><input name="qty" type="number" step="0.001" required value="1" /></label>
            <label class="field"><span>Costo unitario</span><input name="unitCost" type="number" step="0.01" required value="0" /></label>
          </div>
          <button class="primary-button" type="submit">${svg("plus")}Agregar</button>
        </form>
        <form class="panel panel-body field-grid" data-inventory-adjust-form>
          <h2 class="panel-title">Movimiento manual</h2>
          <label class="field">
            <span>Insumo</span>
            <select name="itemId">
              ${inventory.map((item) => `<option value="${item.id}">${escapeHtml(item.name)} · ${formatNumber(item.qty)} ${escapeHtml(item.unit)}</option>`).join("")}
            </select>
          </label>
          <div class="field-row">
            <label class="field"><span>Cantidad</span><input name="qty" type="number" step="0.001" required value="1" /></label>
            <label class="field"><span>Tipo</span><select name="direction"><option value="in">Entrada</option><option value="out">Salida</option></select></label>
          </div>
          <label class="field"><span>Motivo</span><input name="reason" placeholder="Compra, merma, ajuste" /></label>
          <button class="secondary-button" type="submit">${svg("inventory")}Aplicar movimiento</button>
        </form>
        ${
          isAdminUser()
            ? `
              <section class="panel panel-body field-grid admin-tools">
                <h2 class="panel-title">Reinicio de inventario</h2>
                <p class="muted-text">Deja todas las cantidades en cero sin borrar los insumos ni sus costos unitarios.</p>
                <button class="danger-button" data-reset-action="inventory-zero">${svg("trash")}Inventario a cero</button>
              </section>
            `
            : ""
        }
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Inventario</h2>
            <p class="panel-kicker">Base inicial desde COSTOS INSUMOS Y PAN.xlsx</p>
          </div>
        </div>
        <div class="panel-body table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Categoria</th>
                <th>Insumo</th>
                <th>Proveedor</th>
                <th>Unidad</th>
                <th>Cantidad</th>
                <th>Costo unit.</th>
                <th>Total</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${inventory
                .map(
                  (item) => `
                    <tr>
                      <td>${escapeHtml(item.category)}</td>
                      <td><strong>${escapeHtml(item.name)}</strong></td>
                      <td>${escapeHtml(item.supplier)}</td>
                      <td>${escapeHtml(item.unit)}</td>
                      <td>${formatNumber(item.qty)}</td>
                      <td>${money.format(item.unitCost)}</td>
                      <td><strong>${money.format(item.totalCost)}</strong></td>
                      <td class="row-actions">
                        <button class="icon-button" data-inventory-quick="${item.id}:in" title="Entrada +1">${svg("plus")}</button>
                        <button class="icon-button" data-inventory-quick="${item.id}:out" title="Salida -1">${svg("minus")}</button>
                      </td>
                    </tr>
                  `,
                )
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  `;
}

function renderData() {
  const metrics = buildBusinessMetrics(new Date());
  return `
    <div class="data-layout">
      <section class="summary-grid">
        ${renderSummaryCard("Cobrado hoy", money.format(metrics.revenue))}
        ${renderSummaryCard("Propinas hoy", money.format(metrics.tips))}
        ${renderSummaryCard("Costo estimado", money.format(metrics.foodCost))}
        ${renderSummaryCard("Ganancia bruta", money.format(metrics.grossProfit))}
        ${renderSummaryCard("Gastos", money.format(metrics.expenses))}
        ${renderSummaryCard("Cancelaciones", `${metrics.cancelCount} · ${money.format(metrics.cancelAmount)}`)}
      </section>
      ${
        isAdminUser()
          ? `
            <section class="panel admin-tools">
              <div class="panel-header">
                <div>
                  <h2 class="panel-title">Reinicio de datos</h2>
                  <p class="panel-kicker">Acciones administrativas para empezar de cero por seccion</p>
                </div>
              </div>
              <div class="panel-body reset-grid">
                <button class="danger-button" data-reset-action="expenses-zero">${svg("cash")}Gastos a cero</button>
                <button class="danger-button" data-reset-action="sales-data">${svg("data")}Ventas y cancelaciones</button>
                <button class="danger-button" data-reset-action="operations">${svg("trash")}Operacion completa</button>
              </div>
            </section>
          `
          : ""
      }
      <div class="data-grid">
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Margen</h2>
              <p class="panel-kicker">Calculado con COSTEO RECETAS.xlsx</p>
            </div>
          </div>
          <div class="panel-body metric-stack">
            <div class="big-metric">
              <span>Margen bruto</span>
              <strong>${formatNumber(metrics.margin)}%</strong>
            </div>
            <div class="total-line"><span>Tickets cobrados</span><strong>${metrics.tickets}</strong></div>
            <div class="total-line"><span>Promedio por ticket</span><strong>${money.format(metrics.averageTicket)}</strong></div>
            <div class="total-line"><span>Utilidad despues de gastos</span><strong>${money.format(metrics.netAfterExpenses)}</strong></div>
          </div>
        </section>
        <section class="panel">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Productos vendidos</h2>
              <p class="panel-kicker">Unidades, venta y costo estimado</p>
            </div>
          </div>
          <div class="panel-body table-wrap">
            <table class="data-table">
              <thead><tr><th>Producto</th><th>Unidades</th><th>Venta</th><th>Costo</th><th>Ganancia</th></tr></thead>
              <tbody>
                ${
                  metrics.products.length
                    ? metrics.products
                        .map(
                          (item) => `
                            <tr>
                              <td><strong>${escapeHtml(item.name)}</strong></td>
                              <td>${item.qty}</td>
                              <td>${money.format(item.revenue)}</td>
                              <td>${money.format(item.cost)}</td>
                              <td><strong>${money.format(item.revenue - item.cost)}</strong></td>
                            </tr>
                          `,
                        )
                        .join("")
                    : `<tr><td colspan="5">Aun no hay ventas cerradas.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
        <section class="panel data-grid-wide">
          <div class="panel-header">
            <div>
              <h2 class="panel-title">Cancelaciones</h2>
              <p class="panel-kicker">Incidencias de productos y mesas sin cobro</p>
            </div>
          </div>
          <div class="panel-body table-wrap">
            <table class="data-table">
              <thead><tr><th>Fecha</th><th>Orden</th><th>Tipo</th><th>Producto</th><th>Cant.</th><th>Monto</th><th>Nota</th></tr></thead>
              <tbody>
                ${
                  metrics.cancellations.length
                    ? metrics.cancellations
                        .map(
                          (item) => `
                            <tr class="is-cancelled">
                              <td>${formatDateTime(item.createdAt)}</td>
                              <td><strong>${escapeHtml(item.orderLabel || "Orden")}</strong><small>${escapeHtml(waiterName(item.waiterId))}</small></td>
                              <td>${escapeHtml(cancellationStageLabel(item.stage))}<small>${escapeHtml(item.source || "Sistema")}</small></td>
                              <td>${escapeHtml(item.itemName || (item.scope === "order" ? "Orden completa" : "Producto"))}</td>
                              <td>${item.qty || ""}</td>
                              <td><strong>${money.format(item.amount || 0)}</strong></td>
                              <td>${escapeHtml(item.note || "Sin nota")}</td>
                            </tr>
                          `,
                        )
                        .join("")
                    : `<tr><td colspan="7">Aun no hay cancelaciones registradas.</td></tr>`
                }
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  `;
}

function renderSummaryCard(label, value) {
  return `
    <article class="summary-card">
      <p class="summary-label">${label}</p>
      <p class="summary-value">${value}</p>
    </article>
  `;
}

function renderFunctionChoices(selected = ["mesero"]) {
  return `
    <fieldset class="function-picker">
      <legend>Funciones</legend>
      ${userFunctionOptions
        .map(
          (option) => `
            <label class="function-option">
              <input type="checkbox" name="functions" value="${option.id}" ${selected.includes(option.id) ? "checked" : ""} />
              <span>${escapeHtml(option.label)}</span>
            </label>
          `,
        )
        .join("")}
    </fieldset>
  `;
}

function renderUserFunctionTags(user) {
  return `
    <div class="function-tags">
      ${normalizeUserFunctions(user)
        .map((item) => `<span>${escapeHtml(functionLabel(item))}</span>`)
        .join("")}
    </div>
  `;
}

function currentShift(userId) {
  return (state.attendance || []).find((shift) => shift.userId === userId && !shift.clockOutAt) || null;
}

function shiftMinutes(shift) {
  return minutesBetween(shift.clockInAt, shift.clockOutAt || new Date());
}

function attendanceTodayMinutes(userId) {
  const today = new Date().toDateString();
  return (state.attendance || [])
    .filter((shift) => shift.userId === userId && new Date(shift.clockInAt).toDateString() === today)
    .reduce((sum, shift) => sum + shiftMinutes(shift), 0);
}

function formatDuration(minutes) {
  const safe = Math.max(0, Number(minutes) || 0);
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (!hours) return `${mins}m`;
  return `${hours}h ${mins}m`;
}

function recordDate(value) {
  return value ? new Date(value) : null;
}

function isSameLocalDay(value, day = new Date()) {
  const date = recordDate(value);
  if (!date || Number.isNaN(date.getTime())) return false;
  return date.toDateString() === day.toDateString();
}

function saleClosedAt(sale) {
  return sale.chargedAt || sale.closedAt || sale.createdAt;
}

function saleTotal(sale) {
  return Number(sale.totals?.total ?? sale.total ?? 0);
}

function saleTip(sale) {
  return Number(sale.totals?.tip ?? sale.tip?.amount ?? 0);
}

function renderTimeClockPanel() {
  const users = state.users.filter((user) => user.active);
  return `
    <section class="panel data-grid-wide">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Fichaje</h2>
          <p class="panel-kicker">Entrada y salida por usuario</p>
        </div>
      </div>
      <div class="panel-body clock-grid">
        ${users
          .map((user) => {
            const shift = currentShift(user.id);
            const active = Boolean(shift);
            return `
              <article class="clock-card ${active ? "is-active" : ""}">
                <div>
                  <strong>${escapeHtml(user.name)}</strong>
                  <span>${active ? `Dentro · ${formatDuration(shiftMinutes(shift))}` : "Fuera de turno"}</span>
                  <small>${active ? `Entrada ${formatTime(shift.clockInAt)}` : `Hoy acumulado ${formatDuration(attendanceTodayMinutes(user.id))}`}</small>
                </div>
                <button class="${active ? "danger-button" : "primary-button"}" data-clock-action="${user.id}:${active ? "out" : "in"}">
                  ${svg(active ? "logout" : "clock")}${active ? "Salida" : "Entrada"}
                </button>
              </article>
            `;
          })
          .join("")}
      </div>
    </section>
  `;
}

function renderUserClockCard(user) {
  const shift = currentShift(user.id);
  const active = Boolean(shift);
  return `
    <article class="clock-card ${active ? "is-active" : ""}">
      <div>
        <strong>${escapeHtml(user.name)}</strong>
        <span>${active ? `Dentro · ${formatDuration(shiftMinutes(shift))}` : "Fuera de turno"}</span>
        <small>${active ? `Entrada ${formatTime(shift.clockInAt)}` : `Hoy acumulado ${formatDuration(attendanceTodayMinutes(user.id))}`}</small>
      </div>
      <button class="${active ? "danger-button" : "primary-button"}" data-clock-action="${user.id}:${active ? "out" : "in"}">
        ${svg(active ? "logout" : "clock")}${active ? "Salida" : "Entrada"}
      </button>
    </article>
  `;
}

function renderAttendanceHistory(userId = null) {
  const shifts = [...(state.attendance || [])]
    .filter((shift) => !userId || shift.userId === userId)
    .sort((a, b) => new Date(b.clockInAt) - new Date(a.clockInAt))
    .slice(0, 30);
  return `
    <section class="panel data-grid-wide">
      <div class="panel-header">
        <div>
          <h2 class="panel-title">Historial de fichajes</h2>
          <p class="panel-kicker">Ultimos registros de entrada y salida</p>
        </div>
      </div>
      <div class="panel-body table-wrap">
        <table class="data-table">
          <thead><tr><th>Usuario</th><th>Entrada</th><th>Salida</th><th>Tiempo</th><th>Estado</th></tr></thead>
          <tbody>
            ${
              shifts.length
                ? shifts
                    .map(
                      (shift) => `
                        <tr>
                          <td><strong>${escapeHtml(waiterName(shift.userId))}</strong></td>
                          <td>${formatDateTime(shift.clockInAt)}</td>
                          <td>${shift.clockOutAt ? formatDateTime(shift.clockOutAt) : "Activo"}</td>
                          <td>${formatDuration(shiftMinutes(shift))}</td>
                          <td><span class="shift-status ${shift.clockOutAt ? "" : "is-active"}">${shift.clockOutAt ? "Cerrado" : "Activo"}</span></td>
                        </tr>
                      `,
                    )
                    .join("")
                : `<tr><td colspan="5">Aun no hay fichajes.</td></tr>`
            }
          </tbody>
        </table>
      </div>
    </section>
  `;
}

function renderProfile() {
  const user = currentUser();
  const stats = buildUserStatsForDay(new Date())[user.id] || emptyStats();
  const shift = currentShift(user.id);
  const shiftLabel = shift ? `Dentro · ${formatDuration(shiftMinutes(shift))}` : "Fuera";
  const profileSalesToday = state.sales.filter(
    (sale) => isSameLocalDay(saleClosedAt(sale)) && (sale.waiterId === user.id || sale.cashierId === user.id),
  );
  const profileChargedToday = profileSalesToday.reduce((sum, sale) => sum + saleTotal(sale), 0);
  const profileTipsToday = profileSalesToday.reduce((sum, sale) => sum + saleTip(sale), 0);
  return `
    <div class="profile-layout">
      <section class="panel profile-hero">
        <div class="profile-avatar">${escapeHtml((user.name || user.username || "U").slice(0, 1).toUpperCase())}</div>
        <div>
          <h2>${escapeHtml(user.name)}</h2>
          <p>${escapeHtml(user.username)}</p>
          ${renderUserFunctionTags(user)}
        </div>
        <button class="secondary-button mobile-profile-logout" data-logout>${svg("logout")}Cerrar sesion</button>
      </section>
      <section class="summary-grid">
        ${renderSummaryCard("Fichaje", shiftLabel)}
        ${renderSummaryCard("Ordenes hoy", String(stats.orders))}
        ${renderSummaryCard("Cobrado hoy", money.format(profileChargedToday))}
        ${renderSummaryCard("Propinas hoy", money.format(profileTipsToday))}
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Mi fichaje</h2>
            <p class="panel-kicker">Entrada y salida de turno</p>
          </div>
        </div>
        <div class="panel-body">
          ${renderUserClockCard(user)}
        </div>
      </section>
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Mis estadisticas</h2>
            <p class="panel-kicker">Actividad registrada en el POS</p>
          </div>
        </div>
        <div class="panel-body metric-stack">
          <div class="total-line"><span>Ordenes de hoy</span><strong>${stats.orders}</strong></div>
          <div class="total-line"><span>Comandas de hoy</span><strong>${stats.commands}</strong></div>
          <div class="total-line"><span>Cobros de hoy</span><strong>${stats.charges}</strong></div>
          <div class="total-line"><span>Propinas de hoy</span><strong>${money.format(profileTipsToday)}</strong></div>
          <div class="total-line"><span>Total cobrado hoy</span><strong>${money.format(profileChargedToday)}</strong></div>
        </div>
      </section>
      ${renderAttendanceHistory(user.id)}
    </div>
  `;
}

function renderUsersOverview(users) {
  const inShift = users.filter((user) => currentShift(user.id)).length;
  const admins = users.filter((user) => normalizeUserFunctions(user).includes("admin")).length;
  const kitchen = users.filter((user) => hasUserFunction(user, "cocina")).length;
  const waiters = users.filter((user) => hasUserFunction(user, "mesero")).length;
  return `
    <section class="summary-grid">
      ${renderSummaryCard("Usuarios activos", String(users.length))}
      ${renderSummaryCard("Fichados", String(inShift))}
      ${renderSummaryCard("Meseros", String(waiters))}
      ${renderSummaryCard("Cocina/Admin", `${kitchen}/${admins}`)}
    </section>
  `;
}

function renderUsers() {
  const stats = buildUserStats();
  const users = state.users.filter((user) => user.active);
  return `
    <div class="users-admin-layout">
      <section class="board-header">
        <div>
          <h2>Usuarios</h2>
          <p>Gestion de accesos, funciones y contrasenas</p>
        </div>
        <button class="primary-button" data-open-modal="new-user">${svg("plus")}Nuevo usuario</button>
      </section>
      ${renderUsersOverview(users)}
      <section class="panel">
        <div class="panel-header">
          <div>
            <h2 class="panel-title">Equipo activo</h2>
            <p class="panel-kicker">Funciones, actividad y acciones administrativas</p>
          </div>
        </div>
        <div class="panel-body table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th>Usuario</th>
                <th>Funciones</th>
                <th>Fichaje</th>
                <th>Hoy</th>
                <th>Ordenes</th>
                <th>Comandas</th>
                <th>Cobros</th>
                <th>Cobrado</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              ${users
                .map((user) => {
                  const item = stats[user.id] || emptyStats();
                  const shift = currentShift(user.id);
                  const canDelete = canDeleteUser(user.id);
                  return `
                    <tr>
                      <td><strong>${escapeHtml(user.name)}</strong><small>${escapeHtml(user.username)}</small></td>
                      <td>${renderUserFunctionTags(user)}</td>
                      <td><span class="shift-status ${shift ? "is-active" : ""}">${shift ? `Dentro · ${formatDuration(shiftMinutes(shift))}` : "Fuera"}</span></td>
                      <td>${formatDuration(attendanceTodayMinutes(user.id))}</td>
                      <td>${item.orders}</td>
                      <td>${item.commands}</td>
                      <td>${item.charges}</td>
                      <td><strong>${money.format(item.charged)}</strong></td>
                      <td class="row-actions user-row-actions">
                        <button class="${shift ? "danger-button" : "primary-button"} compact" data-clock-action="${user.id}:${shift ? "out" : "in"}">
                          ${svg(shift ? "logout" : "clock")}${shift ? "Terminar fichaje" : "Fichar entrada"}
                        </button>
                        <button class="secondary-button compact" data-reset-password="${user.id}">${svg("transfer")}Resetear clave</button>
                        <button class="danger-button compact" data-delete-user="${user.id}" ${canDelete ? "" : "disabled"}>${svg("trash")}Borrar</button>
                      </td>
                    </tr>
                  `;
                })
                .join("")}
            </tbody>
          </table>
        </div>
      </section>
      ${renderAttendanceHistory()}
    </div>
  `;
}

function bindLogin() {
  document.querySelector("[data-login-form]")?.addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const username = String(form.get("username") || "").trim();
    const password = String(form.get("password") || "");
    const user = await authenticateUser(username, password);
    if (!user) {
      state.authError = "Usuario o contrasena incorrectos.";
      persist();
      render();
      return;
    }
    state.authError = "";
    state.sessionUserId = user.id;
    persist();
    render();
    checkForUpdates();
  });
}

async function authenticateUser(username, password) {
  try {
    const response = await fetch("/api/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });
    if (response.ok) {
      const payload = await response.json();
      syncEnabled = true;
      syncVersion = Number(payload.version) || syncVersion;
      if (payload.state) {
        applySharedState(payload.state);
        syncLastPayload = JSON.stringify(sharedStateFromCurrent());
        persistLocal();
      }
      return state.users.find((item) => item.active && item.id === payload.userId) || null;
    }
    if (response.status === 401) return null;
  } catch {
    // Fall back to local login when the sync server is not running.
  }
  return state.users.find((item) => item.active && item.username === username && item.password === password) || null;
}

function bindEvents() {
  document.querySelector("[data-apply-update]")?.addEventListener("click", applyUpdate);
  document.querySelectorAll("[data-nav]").forEach((button) => {
    button.addEventListener("click", () => {
      state.view = button.dataset.nav;
      state.productConfig = null;
      state.modal = null;
      persist();
      render();
    });
  });
  document.querySelectorAll("[data-logout]").forEach((button) => {
    button.addEventListener("click", () => {
      state.sessionUserId = null;
      state.activeOrderId = null;
      state.productConfig = null;
      state.modal = null;
      persist();
      render();
    });
  });
  document.querySelectorAll("[data-open-modal]").forEach((button) => {
    button.addEventListener("click", () => {
      const modal = { type: button.dataset.openModal };
      if (button.dataset.tableNumber) modal.tableNumber = Number(button.dataset.tableNumber);
      if (button.dataset.orderId) modal.orderId = button.dataset.orderId;
      if (button.dataset.lineId) modal.lineId = button.dataset.lineId;
      if (button.dataset.commandId) modal.commandId = button.dataset.commandId;
      if (button.dataset.cancelSource) modal.cancelSource = button.dataset.cancelSource;
      state.modal = modal;
      persist();
      render();
    });
  });
  document.querySelectorAll("[data-close-modal], [data-close-modal-button]").forEach((target) => {
    target.addEventListener("click", (event) => {
      if (event.target.closest("[data-modal-card]") && !event.target.closest("[data-close-modal-button]")) return;
      state.modal = null;
      state.productConfig = null;
      persist();
      render();
    });
  });
  document.querySelector("[data-open-table-form]")?.addEventListener("submit", submitOpenTable);
  const openTableSubmit = document.querySelector("[data-open-table-submit]");
  openTableSubmit?.addEventListener("click", submitOpenTable);
  openTableSubmit?.addEventListener("touchend", submitOpenTable, { passive: false });
  document.querySelector("[data-open-takeout-form]")?.addEventListener("submit", openTakeout);
  document.querySelector("[data-table-note-form]")?.addEventListener("submit", saveTableNote);
  document.querySelector("[data-line-note-form]")?.addEventListener("submit", saveLineNote);
  document.querySelector("[data-cancel-order-form]")?.addEventListener("submit", cancelOrderFromForm);
  document.querySelector("[data-cancel-line-form]")?.addEventListener("submit", cancelLineFromForm);
  document.querySelectorAll("[data-close-order]").forEach((button) => {
    button.addEventListener("click", () => openCheckout(button.dataset.closeOrder));
  });
  document.querySelectorAll("[data-charge-order]").forEach((button) => {
    button.addEventListener("click", () => chargeOrder(button.dataset.chargeOrder, button.dataset.paymentMethod, button));
  });
  document.querySelector("[data-checkout-tip]")?.addEventListener("input", updateCheckoutTipPreview);
  document.querySelector("[data-checkout-tip]")?.addEventListener("change", updateCheckoutTipPreview);
  document.querySelectorAll("[data-clear-alert]").forEach((button) => {
    button.addEventListener("click", () => clearOrderAlert(button.dataset.clearAlert));
  });
  document.querySelectorAll("[data-open-order]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeOrderId = button.dataset.openOrder;
      state.view = "sale";
      state.productConfig = null;
      state.modal = null;
      persist();
      render();
    });
  });
  document.querySelector("[data-back-home]")?.addEventListener("click", () => {
    state.activeOrderId = null;
    state.productConfig = null;
    state.modal = null;
    persist();
    render();
  });
  const search = document.querySelector("[data-search]");
  if (search) {
    search.addEventListener("input", (event) => {
      const caret = event.target.selectionStart || event.target.value.length;
      state.productSearch = event.target.value;
      persist();
      render();
      const restored = document.querySelector("[data-search]");
      restored?.focus();
      restored?.setSelectionRange(caret, caret);
    });
  }
  document.querySelectorAll("[data-section]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeSection = button.dataset.section;
      state.activeSubsection = "Todos";
      state.productConfig = null;
      state.modal = null;
      persist();
      render();
    });
  });
  document.querySelectorAll("[data-subsection]").forEach((button) => {
    button.addEventListener("click", () => {
      state.activeSubsection = button.dataset.subsection;
      state.productConfig = null;
      state.modal = null;
      persist();
      render();
    });
  });
  document.querySelector("[data-mobile-section]")?.addEventListener("change", (event) => {
    state.activeSection = event.target.value;
    state.activeSubsection = "Todos";
    state.productConfig = null;
    state.modal = null;
    persist();
    render();
  });
  document.querySelector("[data-mobile-subsection]")?.addEventListener("change", (event) => {
    state.activeSubsection = event.target.value;
    state.productConfig = null;
    state.modal = null;
    persist();
    render();
  });
  document.querySelectorAll("[data-configure-product]").forEach((button) => {
    button.addEventListener("click", () => startProductConfig(button.dataset.configureProduct));
  });
  document.querySelector("[data-close-config]")?.addEventListener("click", () => {
    state.productConfig = null;
    state.modal = null;
    persist();
    render();
  });
  document.querySelectorAll("[data-select-option]").forEach((button) => {
    button.addEventListener("click", () => {
      state.productConfig.selections[button.dataset.selectOption] = Number(button.dataset.choiceIndex);
      persist();
      render();
    });
  });
  document.querySelectorAll("[data-toggle-option]").forEach((button) => {
    button.addEventListener("click", () => toggleMultiOption(button.dataset.toggleOption, Number(button.dataset.choiceIndex)));
  });
  document.querySelectorAll("[data-config-qty]").forEach((button) => {
    button.addEventListener("click", () => updateConfigQty(Number(button.dataset.configQty)));
  });
  document.querySelector("[data-config-note]")?.addEventListener("input", (event) => {
    state.productConfig.note = event.target.value;
    persist();
  });
  document.querySelector("[data-add-configured]")?.addEventListener("click", addConfiguredProduct);
  document.querySelectorAll("[data-line-qty]").forEach((button) => {
    button.addEventListener("click", () => updateLineQty(button.dataset.lineQty, Number(button.dataset.delta)));
  });
  document.querySelectorAll("[data-remove-line]").forEach((button) => {
    button.addEventListener("click", () => removeLine(button.dataset.removeLine));
  });
  document.querySelectorAll("[data-command-mode]").forEach((button) => {
    button.addEventListener("click", () => commandPending(button.dataset.commandMode, button));
  });
  document.querySelectorAll("[data-finalize-order]").forEach((button) => {
    button.addEventListener("click", (event) => finalizeOrder(event.currentTarget));
  });
  document.querySelector("[data-user-form]")?.addEventListener("submit", createUser);
  document.querySelectorAll("[data-reset-password]").forEach((button) => {
    button.addEventListener("click", () => resetUserPassword(button.dataset.resetPassword));
  });
  document.querySelectorAll("[data-delete-user]").forEach((button) => {
    button.addEventListener("click", () => deleteUser(button.dataset.deleteUser));
  });
  document.querySelectorAll("[data-clock-action]").forEach((button) => {
    button.addEventListener("click", () => {
      const [userId, action] = button.dataset.clockAction.split(":");
      toggleClock(userId, action);
    });
  });
  document.querySelectorAll("[data-reset-action]").forEach((button) => {
    button.addEventListener("click", () => resetData(button.dataset.resetAction));
  });
  document.querySelector("[data-inventory-add-form]")?.addEventListener("submit", addInventoryItem);
  document.querySelector("[data-inventory-adjust-form]")?.addEventListener("submit", adjustInventoryFromForm);
  document.querySelectorAll("[data-inventory-quick]").forEach((button) => {
    button.addEventListener("click", () => {
      const [itemId, direction] = button.dataset.inventoryQuick.split(":");
      adjustInventory(itemId, direction === "in" ? 1 : -1, direction === "in" ? "Entrada rapida" : "Salida rapida");
    });
  });
  document.querySelectorAll("[data-command-status]").forEach((button) => {
    button.addEventListener("click", () => {
      const [orderId, commandId, status] = button.dataset.commandStatus.split(":");
      updateCommandStatus(orderId, commandId, status, button);
    });
  });
  document.querySelectorAll("[data-deliver-ready]").forEach((button) => {
    button.addEventListener("click", () => deliverReadyCommands(button.dataset.deliverReady, button));
  });
}

function submitOpenTable(event) {
  event.preventDefault();
  if (openTableSubmitLocked) {
    return;
  }
  const formElement = event.currentTarget.closest?.("[data-open-table-form]") || event.currentTarget;
  if (!formElement?.matches?.("[data-open-table-form]")) {
    showToast("No se encontro el formulario de mesa.");
    return;
  }
  openTableSubmitLocked = true;
  try {
    openTable(formElement);
  } catch {
    showToast("Error al abrir mesa.");
  } finally {
    window.setTimeout(() => {
      openTableSubmitLocked = false;
    }, 600);
  }
}

function openTable(formElement) {
  const form = new FormData(formElement);
  const tableNumber = Number(form.get("tableNumber"));
  if (!tables.includes(tableNumber)) {
    showToast("Selecciona una mesa disponible.");
    render();
    return;
  }
  const existing = getOpenOrders().find((order) => order.type === "table" && Number(order.tableNumber) === tableNumber);
  if (existing) {
    state.modal = null;
    showToast(`Mesa ${tableNumber} ya estaba abierta.`);
    persist();
    render();
    return;
  }
  const order = {
    id: safeId("order"),
    type: "table",
    tableNumber,
    guests: Math.max(1, Number(form.get("guests")) || 1),
    waiterId: String(form.get("waiterId") || currentUser().id),
    customerName: "",
    comments: String(form.get("comments") || "").trim(),
    status: "open",
    items: [],
    commandBatches: [],
    openedAt: new Date().toISOString(),
    openedBy: currentUser().id,
  };
  state.orders.push(order);
  state.productConfig = null;
  state.modal = null;
  persist();
  showToast(`Mesa ${tableNumber} abierta. Pulsa Continuar para vender.`);
  render();
}

function saveTableNote(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const order = getOrder(event.currentTarget.dataset.orderId);
  if (!order) return;
  order.comments = String(form.get("comments") || "").trim();
  state.modal = null;
  persist();
  render();
}

function saveLineNote(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const target = findLine(event.currentTarget.dataset.lineId);
  if (!target) return;
  const note = String(form.get("note") || "").trim();
  target.line.note = note;
  syncLineNoteToBatches(target.order, target.line.id, note);
  state.modal = null;
  persist();
  render();
}

function syncLineNoteToBatches(order, lineId, note) {
  (order.commandBatches || []).forEach((batch) => {
    (batch.lines || []).forEach((line) => {
      if (line.lineId === lineId) line.note = note;
    });
  });
}

function openTakeout(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const order = {
    id: safeId("order"),
    type: "takeout",
    tableNumber: null,
    guests: 0,
    waiterId: String(form.get("waiterId") || currentUser().id),
    customerName: String(form.get("customerName") || "Mostrador").trim() || "Mostrador",
    status: "open",
    items: [],
    commandBatches: [],
    openedAt: new Date().toISOString(),
    openedBy: currentUser().id,
  };
  state.orders.push(order);
  state.activeOrderId = order.id;
  state.productConfig = null;
  state.modal = null;
  persist();
  render();
}

function openCheckout(orderId) {
  const order = state.orders.find((item) => item.id === orderId && item.status === "open");
  if (!order) return;
  state.modal = { type: "checkout", orderId };
  state.productConfig = null;
  persist();
  render();
}

function readCheckoutTip(subtotal) {
  const box = document.querySelector("[data-checkout-tip]");
  if (!box) return { mode: "none", value: 0, amount: 0 };
  const mode = box.querySelector('input[name="tipMode"]:checked')?.value || "none";
  const rawValue = Math.max(0, Number(box.querySelector("[data-tip-value]")?.value) || 0);
  const amount = mode === "fixed" ? rawValue : mode === "percent" ? subtotal * (rawValue / 100) : 0;
  return {
    mode,
    value: rawValue,
    amount: Math.round(amount * 100) / 100,
  };
}

function updateCheckoutTipPreview() {
  const box = document.querySelector("[data-checkout-tip]");
  if (!box) return;
  const subtotal = Number(box.dataset.subtotal) || 0;
  const tip = readCheckoutTip(subtotal);
  const total = subtotal + tip.amount;
  const tipPreview = document.querySelector("[data-tip-preview]");
  const totalPreview = document.querySelector("[data-checkout-total]");
  if (tipPreview) tipPreview.textContent = money.format(tip.amount);
  if (totalPreview) totalPreview.textContent = money.format(total);
}

function chargeOrder(orderId, paymentMethod = "Efectivo", source) {
  const order = state.orders.find((item) => item.id === orderId && item.status === "open");
  if (!order) return;
  if (!order.items.length) {
    order.status = "closed";
    order.closedAt = new Date().toISOString();
    order.closedBy = currentUser().id;
    order.paymentMethod = paymentMethod;
    if (state.activeOrderId === order.id) state.activeOrderId = null;
    state.modal = null;
    persist();
    render();
    return;
  }
  const pending = order.items.some((item) => item.status === "pending");
  if (pending) {
    const confirmed = window.confirm("Hay productos sin comandar. Cerrar de todos modos?");
    if (!confirmed) return;
  }
  const baseTotals = calculateTotals(order);
  const tip = readCheckoutTip(baseTotals.subtotal);
  const closedAt = new Date().toISOString();
  const totals = {
    ...baseTotals,
    tip: tip.amount,
    tipMode: tip.mode,
    tipValue: tip.value,
    total: baseTotals.subtotal + tip.amount,
  };
  state.sales.unshift({
    id: safeId("sale"),
    orderId: order.id,
    type: order.type,
    tableNumber: order.tableNumber,
    label: orderLabel(order),
    customerName: order.customerName,
    comments: order.comments,
    waiterId: order.waiterId,
    cashierId: currentUser().id,
    paymentMethod,
    items: structuredClone(order.items),
    commandBatches: structuredClone(order.commandBatches),
    totals,
    tip,
    openedAt: order.openedAt,
    closedAt,
    chargedAt: closedAt,
    waitMinutes: minutesBetween(order.openedAt, closedAt),
  });
  order.status = "closed";
  order.closedAt = closedAt;
  order.cashierId = currentUser().id;
  order.paymentMethod = paymentMethod;
  order.tip = tip;
  state.paymentMethod = paymentMethod;
  if (state.activeOrderId === order.id) state.activeOrderId = null;
  state.productConfig = null;
  state.modal = null;
  persist();
  showToast(`${orderLabel(order)} cobrada por ${money.format(totals.total)}.`);
  celebrateAction("paid", source, "Cobrado");
  render();
}

function cancelOrderFromForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const note = String(form.get("note") || "").trim();
  if (!note) {
    showToast("Captura una nota para cancelar la orden.");
    return;
  }
  cancelOrder(event.currentTarget.dataset.orderId, note);
}

function cancelOrder(orderId, note) {
  const order = state.orders.find((item) => item.id === orderId && item.status === "open");
  if (!order) return;
  const now = new Date().toISOString();
  const totals = calculateTotals(order);
  const restorableLines = [];
  (order.commandBatches || []).forEach((batch) => {
    const status = batch.status || "new";
    if (status === "new") {
      (batch.lines || []).forEach((batchLine) => {
        const line = order.items.find((item) => item.id === batchLine.lineId);
        if (line) restorableLines.push({ ...line, qty: batchLine.qty });
      });
    }
    if (status !== "delivered") {
      batch.status = "cancelled";
      batch.cancelledAt = now;
      batch.updatedAt = now;
      batch.updatedBy = currentUser().id;
    }
  });
  if (restorableLines.length) {
    restoreInventoryForLines(restorableLines, order, "Cancelacion de orden antes de cocina");
  }
  recordCancellation({
    scope: "order",
    source: order.type === "table" ? "Mesa" : "Venta",
    stage: "order",
    orderId: order.id,
    orderLabel: orderLabel(order),
    tableNumber: order.tableNumber,
    waiterId: order.waiterId,
    qty: totals.count,
    amount: totals.total,
    note,
    items: order.items.map((item) => ({
      lineId: item.id,
      productId: item.productId,
      name: item.name,
      qty: item.qty,
      amount: item.unitPrice * item.qty,
    })),
    restoredStock: restorableLines.length > 0,
  });
  order.status = "cancelled";
  order.cancelledAt = now;
  order.cancelledBy = currentUser().id;
  order.cancelReason = note;
  if (state.activeOrderId === order.id) state.activeOrderId = null;
  state.productConfig = null;
  state.modal = null;
  persist();
  showToast(`${orderLabel(order)} cancelada como incidencia.`);
  render();
}

function cancelLineFromForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  cancelLine({
    orderId: event.currentTarget.dataset.orderId,
    lineId: event.currentTarget.dataset.lineId,
    commandId: event.currentTarget.dataset.commandId,
    source: event.currentTarget.dataset.cancelSource || "venta",
    qty: Number(form.get("qty")) || 1,
    note: String(form.get("note") || "").trim(),
  });
}

function cancelLine({ orderId, lineId, commandId, source = "venta", qty = 1, note = "" }) {
  const order = getOrder(orderId);
  const line = order?.items.find((item) => item.id === lineId);
  if (!order || !line) return;
  const batch = findBatchForLine(order, line.id, commandId, source === "venta" ? ["new"] : ["new", "preparing", "ready"]);
  const batchLine = batch?.lines?.find((item) => item.lineId === line.id);
  const stage = batch?.status || lineServiceStatus(line, order);
  const serviceStatus = lineServiceStatus(line, order);
  const allowed =
    source === "venta" ? stage === "new" || serviceStatus === "waiting" : ["new", "preparing", "ready"].includes(stage);
  if (!allowed) {
    showToast("Esa linea ya no se puede cancelar desde aqui.");
    state.modal = null;
    persist();
    render();
    return;
  }
  const maxQty = Math.max(0, Math.min(line.qty, batchLine?.qty ?? line.qty));
  const cancelQty = Math.min(Math.max(1, qty), maxQty);
  if (!cancelQty) return;
  const now = new Date().toISOString();
  const amount = line.unitPrice * cancelQty;
  const restoreStock = stage === "new" || stage === "waiting";
  if (restoreStock) {
    restoreInventoryForLines([{ ...line, qty: cancelQty }], order, `Cancelacion ${line.name} antes de cocina`);
  }
  if (batchLine) {
    batchLine.qty -= cancelQty;
    if (batchLine.qty <= 0) batch.lines = batch.lines.filter((item) => item.lineId !== line.id);
    batch.updatedAt = now;
    batch.updatedBy = currentUser().id;
    if (!batch.lines.length) {
      batch.status = "cancelled";
      batch.cancelledAt = now;
    }
  }
  line.qty -= cancelQty;
  if (line.qty <= 0) {
    order.items = order.items.filter((item) => item.id !== line.id);
  }
  const sourceLabel = source === "cocina" ? "Cocina" : "Venta";
  recordCancellation({
    scope: "item",
    source: sourceLabel,
    stage,
    orderId: order.id,
    orderLabel: orderLabel(order),
    tableNumber: order.tableNumber,
    waiterId: order.waiterId,
    lineId: line.id,
    productId: line.productId,
    itemName: line.name,
    qty: cancelQty,
    amount,
    note,
    restoredStock: restoreStock,
  });
  if (source === "cocina") {
    const message = `${cancelQty} x ${line.name} cancelado en cocina (${cancellationStageLabel(stage)}).${note ? ` ${note}` : ""}`;
    addOrderAlert(order, message, "cancel");
  }
  state.modal = null;
  persist();
  showToast(`${cancelQty} x ${line.name} cancelado.`);
  render();
}

function clearOrderAlert(key) {
  const [orderId, alertId] = String(key || "").split(":");
  const order = getOrder(orderId);
  const alert = order?.alerts?.find((item) => item.id === alertId);
  if (!alert) return;
  alert.clearedAt = new Date().toISOString();
  alert.clearedBy = currentUser().id;
  persist();
  render();
}

function startProductConfig(productId) {
  const product = getProduct(productId);
  if (!product) return;
  const selections = defaultSelectionsFor(product);
  state.productConfig = { productId, qty: 1, selections, note: "" };
  state.modal = null;
  persist();
  render();
}

function toggleMultiOption(optionId, index) {
  const current = state.productConfig.selections[optionId] || [];
  state.productConfig.selections[optionId] = current.includes(index)
    ? current.filter((item) => item !== index)
    : [...current, index];
  persist();
  render();
}

function updateConfigQty(delta) {
  if (!state.productConfig) return;
  state.productConfig.qty = Math.max(1, state.productConfig.qty + delta);
  persist();
  const product = getProduct(state.productConfig.productId);
  if (!product) return;
  const unitPrice = configuredUnitPrice(product, state.productConfig.selections);
  const stock = estimateProductStock(product, state.productConfig.selections);
  const qtyTarget = document.querySelector("[data-config-qty-value]");
  const totalTarget = document.querySelector("[data-config-total]");
  const unitTarget = document.querySelector("[data-config-unit]");
  const stockTarget = document.querySelector("[data-config-stock-panel]");
  const stockPanel = document.querySelector("[data-stock-panel]");
  const stockMessage = document.querySelector("[data-stock-message]");
  if (qtyTarget) qtyTarget.textContent = String(state.productConfig.qty);
  if (totalTarget) totalTarget.textContent = money.format(unitPrice * state.productConfig.qty);
  if (unitTarget) unitTarget.textContent = `${money.format(unitPrice)} c/u`;
  if (stockPanel && stockMessage) {
    const overRequest = stock.known && state.productConfig.qty > stock.orderable;
    stockPanel.className = `stock-panel ${stock.known ? stock.tone : "unknown"} ${overRequest ? "over-request" : ""}`;
    stockMessage.textContent = productStockMessage(stock, state.productConfig.qty);
    return;
  }
  if (stockTarget) stockTarget.innerHTML = renderProductStockPanel(stock, state.productConfig.qty);
}

function addConfiguredProduct() {
  const order = getActiveOrder();
  const product = getProduct(state.productConfig?.productId);
  if (!order || !product) return;
  const selections = structuredClone(state.productConfig.selections);
  const unitPrice = configuredUnitPrice(product, selections);
  const optionsText = optionSummary(product, selections);
  const optionKey = JSON.stringify(selections);
  const note = String(state.productConfig.note || "").trim();
  const requestedQty = state.productConfig.qty;
  const stock = estimateProductStock(product, selections);
  const existing = order.items.find(
    (item) => item.status === "pending" && item.productId === product.id && item.optionKey === optionKey && (item.note || "") === note,
  );
  if (existing) {
    existing.qty += state.productConfig.qty;
  } else {
    order.items.push({
      id: safeId("line"),
      productId: product.id,
      name: product.name,
      section: product.section,
      subsection: product.subsection,
      station: product.station,
      qty: state.productConfig.qty,
      unitPrice,
      selections,
      optionKey,
      optionsText,
      note,
      status: "pending",
      addedBy: currentUser().id,
      addedAt: new Date().toISOString(),
      commandIds: [],
    });
  }
  state.productConfig = null;
  state.modal = null;
  persist();
  if (stock.known && requestedQty > stock.orderable) {
    showToast(`Inventario bajo: quedan aprox. ${stock.orderable} ordenes de ${product.name}.`);
  }
  render();
}

function configuredUnitPrice(product, selections) {
  let price = Number(product.price) || 0;
  product.options.forEach((option) => {
    const selected = selections[option.id];
    if (option.type === "single") {
      const choice = option.choices[selected];
      if (!choice) return;
      if (Number.isFinite(choice.price)) price = Number(choice.price);
      if (Number.isFinite(choice.priceDelta)) price += Number(choice.priceDelta);
      return;
    }
    if (option.type === "multi" && Array.isArray(selected)) {
      selected.forEach((index) => {
        const choice = option.choices[index];
        if (choice?.priceDelta) price += Number(choice.priceDelta);
      });
    }
  });
  return price;
}

function optionSummary(product, selections) {
  const parts = [];
  product.options.forEach((option) => {
    const selected = selections[option.id];
    if (option.type === "single") {
      const choice = option.choices[selected];
      if (choice) parts.push(`${option.label}: ${choice.label}`);
    }
    if (option.type === "multi" && Array.isArray(selected) && selected.length) {
      const labels = selected.map((index) => option.choices[index]?.label).filter(Boolean);
      if (labels.length) parts.push(`${option.label}: ${labels.join(", ")}`);
    }
  });
  return parts.join(" · ");
}

function updateLineQty(lineId, delta) {
  const order = getActiveOrder();
  if (!order) return;
  const line = order.items.find((item) => item.id === lineId && item.status === "pending");
  if (!line) return;
  line.qty += delta;
  if (line.qty <= 0) {
    order.items = order.items.filter((item) => item.id !== lineId);
  }
  persist();
  render();
}

function removeLine(lineId) {
  const order = getActiveOrder();
  if (!order) return;
  order.items = order.items.filter((item) => item.id !== lineId || item.status === "commanded");
  persist();
  render();
}

function commandPending(mode, source) {
  const order = getActiveOrder();
  if (!order) return;
  const pending = order.items.filter((item) => item.status === "pending");
  if (!pending.length) {
    showToast("No hay productos pendientes para comandar.");
    return;
  }
  if (mode !== "digital") {
    showToast("Por ahora solo esta activa la comanda digital.");
    return;
  }
  deductInventoryForLines(pending, order);
  const batchId = safeId("cmd");
  const batch = {
    id: batchId,
    mode: "digital",
    status: "new",
    createdAt: new Date().toISOString(),
    createdBy: currentUser().id,
    lines: pending.map((item) => ({
      lineId: item.id,
      name: item.name,
      qty: item.qty,
      station: item.station,
      optionsText: item.optionsText,
      note: item.note || "",
    })),
  };
  pending.forEach((item) => {
    item.status = "commanded";
    item.commandIds.push(batchId);
  });
  order.commandBatches.push(batch);
  state.modal = null;
  persist();
  showToast(`Comanda digital enviada para ${orderLabel(order)}.`);
  celebrateAction("kitchen", source, "A cocina");
  render();
}

function finalizeOrder(source) {
  const order = getActiveOrder();
  if (!order) return;
  openCheckout(order.id);
}

function createUser(event) {
  event.preventDefault();
  if (!isAdminUser()) {
    showToast("Solo admin puede crear usuarios.");
    return;
  }
  const form = new FormData(event.currentTarget);
  const username = String(form.get("username") || "").trim();
  const functions = form.getAll("functions").map(String);
  if (state.users.some((user) => user.username === username)) {
    showToast("Ese usuario ya existe.");
    return;
  }
  if (!functions.length) {
    showToast("Selecciona al menos una funcion.");
    return;
  }
  state.users.push({
    id: safeId("user"),
    username,
    password: String(form.get("password") || ""),
    name: String(form.get("name") || "").trim(),
    role: roleFromFunctions(functions),
    functions,
    active: true,
    createdAt: new Date().toISOString(),
  });
  state.modal = null;
  persist();
  showToast("Usuario creado.");
  render();
}

function activeAdmins() {
  return state.users.filter((user) => user.active && normalizeUserFunctions(user).includes("admin"));
}

function canDeleteUser(userId) {
  const user = state.users.find((item) => item.id === userId);
  if (!user || !user.active) return false;
  if (user.id === currentUser()?.id) return false;
  if (normalizeUserFunctions(user).includes("admin") && activeAdmins().length <= 1) return false;
  return true;
}

function resetUserPassword(userId) {
  if (!isAdminUser()) {
    showToast("Solo admin puede resetear contrasenas.");
    return;
  }
  const user = state.users.find((item) => item.id === userId && item.active);
  if (!user) return;
  const password = window.prompt(`Nueva contrasena para ${user.name}`, "1234");
  if (password === null) return;
  const nextPassword = String(password).trim();
  if (!nextPassword) {
    showToast("La contrasena no puede estar vacia.");
    return;
  }
  user.password = nextPassword;
  user.passwordResetAt = new Date().toISOString();
  user.passwordResetBy = currentUser()?.id;
  persist();
  showToast(`Contrasena actualizada para ${user.name}.`);
  render();
}

function deleteUser(userId) {
  if (!isAdminUser()) {
    showToast("Solo admin puede borrar usuarios.");
    return;
  }
  const user = state.users.find((item) => item.id === userId && item.active);
  if (!user) return;
  if (!canDeleteUser(userId)) {
    showToast("No se puede borrar este usuario.");
    return;
  }
  const confirmed = window.confirm(`Borrar usuario ${user.name}? Ya no podra iniciar sesion.`);
  if (!confirmed) return;
  user.active = false;
  user.deletedAt = new Date().toISOString();
  user.deletedBy = currentUser()?.id;
  const shift = currentShift(user.id);
  if (shift) {
    shift.clockOutAt = user.deletedAt;
    shift.clockOutBy = currentUser()?.id;
  }
  persist();
  showToast(`${user.name} borrado.`);
  render();
}

function toggleClock(userId, action) {
  const user = state.users.find((item) => item.id === userId && item.active);
  if (!user) return;
  if (user.id !== currentUser()?.id && !isAdminUser()) {
    showToast("Solo puedes fichar tu propio usuario.");
    return;
  }
  state.attendance = Array.isArray(state.attendance) ? state.attendance : [];
  const openShift = currentShift(userId);
  const now = new Date().toISOString();
  if (action === "out") {
    if (!openShift) {
      showToast("Ese usuario no tiene entrada abierta.");
      render();
      return;
    }
    openShift.clockOutAt = now;
    openShift.clockOutBy = currentUser()?.id;
    persist();
    showToast(`Salida registrada para ${user.name}.`);
    render();
    return;
  }
  if (openShift) {
    showToast("Ese usuario ya tiene una entrada abierta.");
    render();
    return;
  }
  state.attendance.unshift({
    id: safeId("shift"),
    userId,
    clockInAt: now,
    clockInBy: currentUser()?.id,
  });
  persist();
  showToast(`Entrada registrada para ${user.name}.`);
  render();
}

function resetData(action) {
  if (!isAdminUser()) {
    showToast("Solo admin puede reiniciar datos.");
    return;
  }
  const labels = {
    "inventory-zero": "poner todo el inventario en cero",
    "expenses-zero": "poner todos los gastos en cero",
    "sales-data": "borrar ventas y cancelaciones",
    operations: "borrar la operacion completa del POS",
  };
  const confirmed = window.confirm(`Confirmar: ${labels[action] || "reiniciar datos"}?`);
  if (!confirmed) return;
  if (action === "inventory-zero") {
    currentInventory().forEach((item) => {
      item.qty = 0;
      item.totalCost = 0;
    });
    state.inventoryMovements.unshift({
      id: safeId("mov"),
      itemId: "all",
      itemName: "Inventario completo",
      qty: 0,
      unit: "",
      reason: "Reset de inventario a cero",
      source: "reset",
      createdAt: new Date().toISOString(),
      userId: currentUser()?.id,
    });
    showToast("Inventario puesto en cero.");
  }
  if (action === "expenses-zero") {
    state.expenses = (state.expenses || fixedExpenses).map((item) => ({ ...item, amount: 0 }));
    showToast("Gastos puestos en cero.");
  }
  if (action === "sales-data") {
    state.sales = [];
    state.cancellations = [];
    showToast("Ventas y cancelaciones reiniciadas.");
  }
  if (action === "operations") {
    state.activeOrderId = null;
    state.productConfig = null;
    state.modal = null;
    state.orders = [];
    state.sales = [];
    state.cancellations = [];
    state.inventoryMovements = [];
    state.expenses = (state.expenses || fixedExpenses).map((item) => ({ ...item, amount: 0 }));
    showToast("Operacion reiniciada.");
  }
  persist();
  render();
}

function addInventoryItem(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const name = String(form.get("name") || "").trim().toUpperCase();
  const qty = Number(form.get("qty")) || 0;
  const unitCost = Number(form.get("unitCost")) || 0;
  if (!name || qty <= 0) {
    showToast("Captura nombre y cantidad.");
    return;
  }
  const inventory = currentInventory();
  const existing = inventory.find((item) => normalize(item.name) === normalize(name));
  if (existing) {
    existing.qty += qty;
    existing.unitCost = unitCost || existing.unitCost;
    existing.totalCost = existing.qty * existing.unitCost;
    recordInventoryMovement(existing, qty, "Entrada por alta/compra", "manual");
  } else {
    const item = {
      id: safeId("inv"),
      category: String(form.get("category") || "GENERAL").trim().toUpperCase(),
      name,
      supplier: String(form.get("supplier") || "Sin proveedor").trim().toUpperCase(),
      unit: String(form.get("unit") || "PZ").trim().toUpperCase(),
      qty,
      unitCost,
      totalCost: qty * unitCost,
    };
    inventory.push(item);
    recordInventoryMovement(item, qty, "Alta de insumo", "manual");
  }
  persist();
  showToast("Inventario actualizado.");
  render();
}

function adjustInventoryFromForm(event) {
  event.preventDefault();
  const form = new FormData(event.currentTarget);
  const qty = Math.abs(Number(form.get("qty")) || 0);
  if (!qty) {
    showToast("Captura una cantidad valida.");
    return;
  }
  const direction = String(form.get("direction"));
  const signedQty = direction === "out" ? -qty : qty;
  adjustInventory(String(form.get("itemId")), signedQty, String(form.get("reason") || "Movimiento manual"));
}

function adjustInventory(itemId, signedQty, reason, source = "manual") {
  const item = currentInventory().find((entry) => entry.id === itemId);
  if (!item) return;
  const nextQty = Math.max(0, Number(item.qty) + signedQty);
  const appliedQty = nextQty - Number(item.qty);
  if (!appliedQty) {
    showToast("El inventario ya esta en cero.");
    return;
  }
  item.qty = nextQty;
  item.totalCost = item.qty * item.unitCost;
  recordInventoryMovement(item, appliedQty, reason, source);
  persist();
  render();
}

function recordInventoryMovement(item, signedQty, reason, source) {
  state.inventoryMovements.unshift({
    id: safeId("mov"),
    itemId: item.id,
    itemName: item.name,
    qty: signedQty,
    unit: item.unit,
    reason,
    source,
    createdAt: new Date().toISOString(),
    userId: currentUser()?.id,
  });
}

function deductInventoryForLines(lines, order) {
  const usage = new Map();
  lines.forEach((line) => {
    inventoryUsageForLine(line).forEach((item) => {
      usage.set(item.name, (usage.get(item.name) || 0) + item.qty);
    });
  });
  usage.forEach((qty, name) => {
    const item = currentInventory().find((entry) => normalize(entry.name) === normalize(name));
    if (!item) return;
    const nextQty = Math.max(0, Number(item.qty) - qty);
    const appliedQty = nextQty - Number(item.qty);
    if (!appliedQty) return;
    item.qty = nextQty;
    item.totalCost = item.qty * item.unitCost;
    recordInventoryMovement(item, appliedQty, `Comanda ${orderLabel(order)}`, "comanda");
  });
}

function restoreInventoryForLines(lines, order, reason) {
  const usage = new Map();
  lines.forEach((line) => {
    inventoryUsageForLine(line).forEach((item) => {
      usage.set(item.name, (usage.get(item.name) || 0) + item.qty);
    });
  });
  usage.forEach((qty, name) => {
    const item = currentInventory().find((entry) => normalize(entry.name) === normalize(name));
    if (!item) return;
    item.qty += qty;
    item.totalCost = item.qty * item.unitCost;
    recordInventoryMovement(item, qty, `${reason} · ${orderLabel(order)}`, "cancelacion");
  });
}

function inventoryUsageForLine(line) {
  const product = getProduct(line.productId);
  if (!product) return [];
  if (product.subsection === "Pan de lena") {
    const option = product.options.find((item) => item.id === "presentacion");
    const choice = option?.choices?.[line.selections?.presentacion || 0]?.label || "Pieza";
    const units = choice.includes("10") ? 10 : choice.includes("5") ? 5 : 1;
    return [{ name: product.name.toUpperCase(), qty: units * line.qty }];
  }
  return inventoryRecipeForSelections(product, line.selections || defaultSelectionsFor(product)).map((item) => ({
    name: item.name,
    qty: item.qty * line.qty,
  }));
}

function inventoryRecipeForSelections(product, selections = defaultSelectionsFor(product)) {
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
      { name: "MASA MERCADO", qty: 0.054 },
      { name: "HOJA DE PLATANO", qty: 0.08 },
      ...ingredientChoice(sabor, {
        Picadillo: [{ name: "PIERNA DE CERDO", qty: 0.035 }],
        Cerdo: [{ name: "PIERNA DE CERDO", qty: 0.04 }],
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
      { name: "MASA MERCADO", qty: 0.15 },
      ...ingredientChoice(relleno, {
        Carne: [{ name: "PIERNA DE CERDO", qty: 0.06 }],
      }),
    ];
  }

  if (product.id === "molotes") {
    return [
      ...(normalize(masa).includes("platano")
        ? [{ name: "PLATANO DE CASTILLA", qty: 0.14 }]
        : [{ name: "PAPA", qty: 0.16 }]),
      { name: "CREMA", qty: 0.001 },
      { name: "QUESO FRESCO DE ARO", qty: 0.02 },
      ...ingredientChoice(relleno, {
        Pollo: [{ name: "POLLO", qty: 0.1 }],
        "Carne de cerdo": [{ name: "PIERNA DE CERDO", qty: 0.1 }],
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

function selectedChoiceLabel(product, selections, optionId) {
  const option = product.options.find((item) => item.id === optionId);
  if (!option) return "";
  return option.choices?.[selections?.[optionId]]?.label || "";
}

function ingredientChoice(label, choices) {
  return choices[label] || [];
}

function proteinIngredients(label) {
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

function salsaIngredients(label) {
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

function inventoryUsageForProduct(product, selections = defaultSelectionsFor(product)) {
  return inventoryUsageForLine({
    productId: product.id,
    selections,
    qty: 1,
  });
}

function pendingInventoryUsage() {
  const usage = new Map();
  getOpenOrders().forEach((order) => {
    order.items
      .filter((line) => line.status === "pending")
      .forEach((line) => {
        inventoryUsageForLine(line).forEach((item) => {
          const key = normalize(item.name);
          usage.set(key, (usage.get(key) || 0) + item.qty);
        });
      });
  });
  return usage;
}

function estimateProductStock(product, selections = defaultSelectionsFor(product)) {
  const recipe = inventoryUsageForProduct(product, selections).filter((item) => Number(item.qty) > 0);
  if (!recipe.length) {
    return { known: false, tone: "unknown", orderable: 0, items: [] };
  }
  const inventory = currentInventory();
  const reserved = pendingInventoryUsage();
  const items = recipe
    .map((recipeItem) => {
      const key = normalize(recipeItem.name);
      const inventoryItem = inventory.find((entry) => normalize(entry.name) === key);
      const stockQty = Number(inventoryItem?.qty) || 0;
      const reservedQty = Number(reserved.get(key)) || 0;
      const availableQty = Math.max(0, stockQty - reservedQty);
      const requiredQty = Number(recipeItem.qty) || 0;
      const portions = inventoryItem && requiredQty > 0 ? Math.floor(availableQty / requiredQty) : 0;
      return {
        name: recipeItem.name,
        unit: inventoryItem?.unit || "UND",
        stockQty,
        reservedQty,
        availableQty,
        requiredQty,
        portions,
        missing: !inventoryItem,
      };
    })
    .sort((a, b) => a.portions - b.portions);
  const orderable = Math.max(0, Math.min(...items.map((item) => item.portions)));
  const tone = orderable <= 0 ? "zero" : orderable <= 5 ? "critical" : orderable < 15 ? "low" : "ok";
  return { known: true, tone, orderable, items };
}

function buildUserStats() {
  const stats = {};
  const countedBatches = new Set();
  state.users.forEach((user) => {
    stats[user.id] = emptyStats();
  });
  state.orders.forEach((order) => {
    if (!stats[order.waiterId]) stats[order.waiterId] = emptyStats();
    stats[order.waiterId].orders += 1;
    order.commandBatches?.forEach((batch) => {
      if (countedBatches.has(batch.id)) return;
      countedBatches.add(batch.id);
      if (!stats[batch.createdBy]) stats[batch.createdBy] = emptyStats();
      stats[batch.createdBy].commands += 1;
    });
  });
  state.sales.forEach((sale) => {
    if (!stats[sale.waiterId]) stats[sale.waiterId] = emptyStats();
    if (!stats[sale.cashierId]) stats[sale.cashierId] = emptyStats();
    sale.commandBatches?.forEach((batch) => {
      if (countedBatches.has(batch.id)) return;
      countedBatches.add(batch.id);
      if (!stats[batch.createdBy]) stats[batch.createdBy] = emptyStats();
      stats[batch.createdBy].commands += 1;
    });
    stats[sale.cashierId].charges += 1;
    stats[sale.cashierId].charged += saleTotal(sale);
    stats[sale.cashierId].tips += saleTip(sale);
  });
  return stats;
}

function emptyStats() {
  return { orders: 0, commands: 0, charges: 0, charged: 0, tips: 0 };
}

function buildUserStatsForDay(day = new Date()) {
  const stats = {};
  const countedBatches = new Set();
  state.users.forEach((user) => {
    stats[user.id] = emptyStats();
  });
  state.orders.forEach((order) => {
    if (!isSameLocalDay(order.openedAt, day)) return;
    if (!stats[order.waiterId]) stats[order.waiterId] = emptyStats();
    stats[order.waiterId].orders += 1;
  });
  [...state.orders, ...state.sales].forEach((record) => {
    record.commandBatches?.forEach((batch) => {
      if (countedBatches.has(batch.id) || !isSameLocalDay(batch.createdAt, day)) return;
      countedBatches.add(batch.id);
      if (!stats[batch.createdBy]) stats[batch.createdBy] = emptyStats();
      stats[batch.createdBy].commands += 1;
    });
  });
  state.sales.forEach((sale) => {
    if (!isSameLocalDay(saleClosedAt(sale), day)) return;
    if (!stats[sale.waiterId]) stats[sale.waiterId] = emptyStats();
    if (!stats[sale.cashierId]) stats[sale.cashierId] = emptyStats();
    stats[sale.cashierId].charges += 1;
    stats[sale.cashierId].charged += saleTotal(sale);
    stats[sale.cashierId].tips += saleTip(sale);
  });
  return stats;
}

function kitchenCommands() {
  return getOpenOrders()
    .flatMap((order) =>
      (order.commandBatches || []).map((batch) => ({
        ...batch,
        status: batch.status || "new",
        orderId: order.id,
        label: orderLabel(order),
      })),
    )
    .filter((batch) => !["delivered", "cancelled"].includes(batch.status) && (batch.lines || []).length)
    .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));
}

function updateCommandStatus(orderId, commandId, status, source) {
  const order = state.orders.find((item) => item.id === orderId);
  const batch = order?.commandBatches?.find((item) => item.id === commandId);
  if (!batch) return;
  batch.status = status;
  batch.updatedAt = new Date().toISOString();
  if (status === "preparing" && !batch.startedAt) batch.startedAt = batch.updatedAt;
  if (status === "ready" && !batch.readyAt) batch.readyAt = batch.updatedAt;
  if (status === "delivered" && !batch.deliveredAt) batch.deliveredAt = batch.updatedAt;
  batch.updatedBy = currentUser().id;
  persist();
  if (status === "ready") {
    showToast(`${orderLabel(order)} lista para entregar.`);
    celebrateAction("ready", source, "Lista");
  }
  if (status === "preparing") {
    celebrateAction("kitchen", source, "Preparando");
  }
  render();
}

function deliverReadyCommands(orderId, source) {
  const order = state.orders.find((item) => item.id === orderId && item.status === "open");
  if (!order) return;
  const batches = readyBatches(order);
  if (!batches.length) {
    showToast("No hay comandas listas para entregar en esta mesa.");
    return;
  }
  const now = new Date().toISOString();
  const total = batches.reduce((sum, batch) => sum + batchQty(batch), 0);
  batches.forEach((batch) => {
    batch.status = "delivered";
    batch.deliveredAt = now;
    batch.updatedAt = now;
    batch.updatedBy = currentUser().id;
  });
  persist();
  showToast(`${total} pieza${total === 1 ? "" : "s"} entregada${total === 1 ? "" : "s"} en ${orderLabel(order)}.`);
  celebrateAction("delivered", source, "Entregado");
  render();
}

function productCost(productId) {
  const product = getProduct(productId);
  if (!product) return 0;
  return recipeCosts[productId] ?? Math.round(product.price * 0.32 * 100) / 100;
}

function buildBusinessMetrics(day = null) {
  const productMap = new Map();
  let revenue = 0;
  let foodCost = 0;
  let tips = 0;
  const sales = day ? state.sales.filter((sale) => isSameLocalDay(saleClosedAt(sale), day)) : state.sales;
  sales.forEach((sale) => {
    revenue += saleTotal(sale);
    tips += saleTip(sale);
    sale.items?.forEach((line) => {
      const lineRevenue = line.unitPrice * line.qty;
      const lineCost = productCost(line.productId) * line.qty;
      foodCost += lineCost;
      const key = line.productId || line.name;
      const current = productMap.get(key) || { name: line.name, qty: 0, revenue: 0, cost: 0 };
      current.qty += line.qty;
      current.revenue += lineRevenue;
      current.cost += lineCost;
      productMap.set(key, current);
    });
  });
  const expenses = (state.expenses || fixedExpenses).reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const cancellations = (Array.isArray(state.cancellations) ? state.cancellations : [])
    .filter((item) => !day || isSameLocalDay(item.createdAt, day));
  const cancelAmount = cancellations.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const grossProfit = revenue - foodCost;
  return {
    revenue,
    tips,
    foodCost,
    grossProfit,
    expenses,
    cancelAmount,
    cancelCount: cancellations.length,
    netAfterExpenses: grossProfit - expenses,
    margin: revenue ? (grossProfit / revenue) * 100 : 0,
    tickets: sales.length,
    averageTicket: sales.length ? revenue / sales.length : 0,
    products: [...productMap.values()].sort((a, b) => b.revenue - a.revenue),
    cancellations: [...cancellations].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).slice(0, 40),
  };
}

function formatNumber(value) {
  return new Intl.NumberFormat("es-MX", {
    maximumFractionDigits: 2,
  }).format(Number(value) || 0);
}

function normalize(value) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function escapeAttr(value) {
  return escapeHtml(value).replaceAll("`", "&#096;");
}

function formatTime(value) {
  return new Intl.DateTimeFormat("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function formatDateTime(value) {
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function elapsed(value) {
  if (!value) return "0m";
  const minutes = Math.max(0, Math.floor((Date.now() - new Date(value).getTime()) / 60000));
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  return `${hours}h ${minutes % 60}m`;
}

function minutesBetween(start, end) {
  return Math.max(0, Math.floor((new Date(end).getTime() - new Date(start).getTime()) / 60000));
}

render();
initNetworkSync();
checkForUpdates();
window.setInterval(checkForUpdates, 10 * 60 * 1000);
