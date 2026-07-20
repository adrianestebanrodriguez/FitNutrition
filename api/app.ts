import express, { Request, Response } from "express";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();

app.use(express.json());

// Initialize server-side Gemini client
const apiKey = process.env.GEMINI_API_KEY;
const ai = new GoogleGenAI({
  apiKey,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

// Helper Functions for Offline Fallback Generators
function fallbackPlanGenerator(profile: any) {
  const dailyKcalTarget = profile.dailyKcalTarget || profile.kcalObjetivo || 2000;
  const proteinsTarget = profile.proteinsTarget || profile.proteinasObjetivo || 100;

  const desayunos = [
    "Huevos revueltos (3 claras, 1 huevo entero) con 1 tostada de pan integral, aguacate y taza de café sin azúcar.",
    "Bowl de yogur griego natural (200g) con fresas, arándanos, granola sin azúcar y semillas de chía.",
    "Tortitas fit de avena y claras de huevo (3 unidades) con sirope sin calorías y frutos rojos frescos.",
    "Batido verde detox: espinacas, 1/2 plátano, proteína whey, leche de almendras y 1 cucharada de mantequilla de maní.",
    "Omelette de 2 huevos enteros + 2 claras con champiñones, espinacas, tomate cherry y queso light.",
    "Pan integral tostado (2 rebanadas) con aguacate machacado, huevo pochado y salmón ahumado.",
    "Avena cocida en leche desnatada con canela, manzana picada, nueces y un toque de miel."
  ];

  const almuerzos = [
    "Pechuga de pollo a la plancha (150g) con ensalada fresca mixta condimentada y porción de arroz cocido.",
    "Bowl de quinoa con garbanzos, pepino, tomate cherry, aceitunas, cebolla morada y aderezo de limón.",
    "Pescado blanco al horno (merluza 180g) con patatas asadas y verduras salteadas (pimiento, calabacín, berenjena).",
    "Carne magra de ternera (150g) salteada con tiras de pimiento y cebolla, acompañada de arroz integral.",
    "Pollo al curry con leche de coco ligera, espinacas frescas y arroz basmati integral.",
    "Ensalada completa de atún, huevo duro, maíz, lechuga, tomate, aceitunas y vinagreta ligera.",
    "Wrap integral de pavo, lechuga, tomate, queso fresco y hummus como aderezo."
  ];

  const cenas = [
    "Filete de salmón asado a la plancha acompañado de brócoli al vapor y un toque de aceite de oliva.",
    "Tortilla de claras con espinacas y queso cottage, acompañada de ensalada verde.",
    "Pechuga de pollo desmenuzada sobre cama de rúcula, tomates cherry, nueces y vinagreta balsámica.",
    "Revuelto de tofu o claras con champiñones, ajo y perejil, con espárragos trigueros salteados.",
    "Lomos de merluza al papillote con verduras (brócoli, zanahoria, calabacín) y un chorrito de aceite de oliva virgen extra.",
    "Ensalada templada de garbanzos, espinacas salteadas, pimiento asado y taquitos de jamón serrano.",
    "Crema de calabaza y zanahoria casera con jengibre y una pizca de cúrcuma, acompañada de daditos de pollo salteado."
  ];

  const snacksList = [
    "Un puñado de almendras tostadas (25g) más una manzana entera picada.",
    "Yogur griego natural (150g) con arándanos y una cucharadita de semillas de lino.",
    "Batido de proteína whey con leche desnatada y canela.",
    "Palitos de zanahoria y apio con hummus casero (2 cucharadas).",
    "Puñado de nueces (30g) y una pera fresca.",
    "Queso cottage (100g) con rodajas de tomate y orégano.",
    "Un puñado de garbanzos asados con especias y una mandarina."
  ];

  const entrenamientos = [
    "Rutina de fuerza enfocada en tren superior (Push/Pull): 4 series de dominadas, flexiones, press militar y fondos de tríceps.",
    "Rutina de fuerza enfocada en tren inferior (Piernas/Core): 4 series de sentadillas, zancadas, peso muerto rumano y planchas.",
    "HIIT de 20 minutos: 40s de trabajo/20s de descanso (burpees, mountain climbers, jump squats, high knees).",
    "Cardio moderado: 40 minutos de bicicleta estática a ritmo constante más 15 minutos de abdominales.",
    "Circuito funcional: 3 rondas de 12 ejercicios (30s cada uno) combinando saltos, fuerza y core.",
    "Natación o sesión de elíptica: 40 minutos a intensidad media-alta más estiramientos finales.",
    "Día de descanso activo: caminata de 45 minutos a ritmo ligero seguido de 20 minutos de estiramientos y yoga."
  ];

  const dias = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

  const planesPorDia = dias.map((dia, index) => ({
    dia,
    desayuno: desayunos[index % desayunos.length],
    almuerzo: almuerzos[index % almuerzos.length],
    cena: cenas[index % cenas.length],
    snacks: snacksList[index % snacksList.length],
    kcalEstimada: Math.round(dailyKcalTarget * (0.95 + (index % 7) * 0.01)),
    entrenamiento: entrenamientos[index % entrenamientos.length]
  }));

  return {
    objetivo: "Sugerencia personalizada de plan nutricional generada localmente debido a límites de API excedidos temporalmente.",
    consejosGenerales: "Recuerda beber al menos 2.5 litros de agua al día, mantener una higiene del sueño de 7 a 8 horas continuas y entrenar con consistencia manteniendo la sobrecarga progresiva en tus ejercicios físicos diarios.",
    planesPorDia
  };
}

function fallbackFoodAnalyzer(text: string) {
  const normalized = text.toLowerCase();
  let calories = 350;
  let proteinas = 15;
  const identifiedFoods: string[] = [];

  if (normalized.includes("huevo")) {
    identifiedFoods.push("Huevos cocidos/revueltos");
    calories = 140;
    proteinas = 12;
  }
  if (normalized.includes("pollo") || normalized.includes("pechuga")) {
    identifiedFoods.push("Pechuga de pollo a la plancha");
    calories = 240;
    proteinas = 32;
  }
  if (normalized.includes("arroz")) {
    identifiedFoods.push("Arroz blanco cocido");
    calories = normalized.includes("huevo") || normalized.includes("pollo") ? calories + 130 : 130;
    proteinas = normalized.includes("huevo") || normalized.includes("pollo") ? proteinas + 3 : 3;
  }
  if (normalized.includes("atun") || normalized.includes("atún")) {
    identifiedFoods.push("Atún al agua");
    calories = 160;
    proteinas = 26;
  }
  if (normalized.includes("manzana")) {
    identifiedFoods.push("Manzana fresca");
    calories = 80;
    proteinas = 0;
  }
  if (normalized.includes("platano") || normalized.includes("plátano") || normalized.includes("banana")) {
    identifiedFoods.push("Plátano maduro");
    calories = 105;
    proteinas = 1;
  }
  if (normalized.includes("ensalada")) {
    identifiedFoods.push("Ensalada fresca mixta");
    calories = normalized.includes("pollo") ? 320 : 100;
    proteinas = normalized.includes("pollo") ? 22 : 2;
  }
  if (normalized.includes("pan") || normalized.includes("tostada")) {
    identifiedFoods.push("Tostada de pan integral");
    calories = 150;
    proteinas = 5;
  }
  if (normalized.includes("leche") || normalized.includes("yogur") || normalized.includes("yogurt")) {
    identifiedFoods.push("Yogur natural pro / Lácteo");
    calories = 110;
    proteinas = 7;
  }
  if (normalized.includes("avena")) {
    identifiedFoods.push("Avena con leche o agua");
    calories = 200;
    proteinas = 6;
  }
  if (normalized.includes("café") || normalized.includes("cafe")) {
    identifiedFoods.push("Café express");
    calories = normalized.includes("leche") ? calories + 40 : 5;
  }
  if (normalized.includes("carne") || normalized.includes("ternera") || normalized.includes("bife")) {
    identifiedFoods.push("Carne de ternera magra");
    calories = 280;
    proteinas = 28;
  }

  if (identifiedFoods.length === 0) {
    identifiedFoods.push(text.trim());
  }

  const kcalMatch = normalized.match(/(\d+)\s*(kcal|calorias|calorías)/);
  if (kcalMatch && kcalMatch[1]) {
    calories = parseInt(kcalMatch[1], 10);
  }

  return {
    alimentos: identifiedFoods.join(", ") + " (Estimado Local)",
    calorias: calories,
    proteinas: proteinas
  };
}

function fallbackActivityAnalyzer(text: string) {
  const normalized = text.toLowerCase();
  let ejercicio = "Entrenamiento general";
  let duracion = 30;
  let intensidad: "Baja" | "Media" | "Alta" = "Media";
  let MET = 5.0;

  const durationMatch = normalized.match(/(\d+)\s*(minutos|min|m)/);
  if (durationMatch && durationMatch[1]) {
    duracion = parseInt(durationMatch[1], 10);
  }

  if (normalized.includes("alta") || normalized.includes("fuerte") || normalized.includes("intenso") || normalized.includes("hiit") || normalized.includes("muy")) {
    intensidad = "Alta";
    MET = 8.5;
  } else if (normalized.includes("baja") || normalized.includes("suave") || normalized.includes("leve") || normalized.includes("ligero")) {
    intensidad = "Baja";
    MET = 3.0;
  } else {
    intensidad = "Media";
    MET = 5.5;
  }

  if (normalized.includes("correr") || normalized.includes("trote") || normalized.includes("running")) {
    ejercicio = "Trote / Running";
    MET = intensidad === "Alta" ? 10.0 : intensidad === "Media" ? 7.5 : 5.5;
  } else if (normalized.includes("bici") || normalized.includes("bicicleta") || normalized.includes("spinning") || normalized.includes("ciclismo")) {
    ejercicio = "Spinning / Ciclismo";
    MET = intensidad === "Alta" ? 9.0 : intensidad === "Media" ? 6.5 : 4.0;
  } else if (normalized.includes("caminar") || normalized.includes("pasos") || normalized.includes("caminata")) {
    ejercicio = "Caminata a ritmo continuo";
    MET = intensidad === "Alta" ? 4.0 : intensidad === "Media" ? 3.3 : 2.3;
  } else if (normalized.includes("gimnasio") || normalized.includes("pesas") || normalized.includes("fuerza") || normalized.includes("musculación") || normalized.includes("musculacion")) {
    ejercicio = "Entrenamiento de Fuerza / Pesas";
    MET = intensidad === "Alta" ? 6.0 : intensidad === "Media" ? 4.0 : 3.0;
  } else if (normalized.includes("futbol") || normalized.includes("fútbol") || normalized.includes("pelota")) {
    ejercicio = "Fútbol recreativo";
    MET = 7.0;
  } else if (normalized.includes("nadar") || normalized.includes("natación") || normalized.includes("natacion")) {
    ejercicio = "Natación recreativa";
    MET = 7.0;
  } else if (normalized.includes("yoga") || normalized.includes("pilates")) {
    ejercicio = "Yoga / Estiramientos";
    MET = 2.5;
    intensidad = "Baja";
  }

  const baseWeight = 75;
  const caloriasQuemadas = Math.round(MET * 3.5 * baseWeight * duracion / 200);

  return {
    ejercicio: ejercicio + " (Estimado Local)",
    duracion,
    intensidad,
    caloriasQuemadas
  };
}

function fallbackRecipeGenerator(targetKcal: number, targetPeriod: string, preferences: string, ingredients: string) {
  const normalizedPrefs = (preferences || "").toLowerCase();
  
  const db: any[] = [
    {
      nombre: "Tortitas Fit de Avena y Claras de Huevo",
      kcal: 320,
      prot: 24,
      ingredientes: [
        "50g de copos de avena triturados",
        "4 claras de huevo",
        "1 chorrito de leche vegetal o desnatada",
        "1g de canela en polvo",
        "50g de fresas o frutos rojos frescos"
      ],
      pasos: [
        "Vierte los copos de avena triturados, las claras de huevo, la canela y la leche en una licuadora.",
        "Mezcla todo hasta obtener una textura suave y líquida pero con consistencia.",
        "Calienta una sartén antiadherente a fuego medio con unas gotas de aceite de oliva.",
        "Cocina las tortitas de una en una, dándole la vuelta cuando empiecen a salir pequeñas burbujas.",
        "Sirve templadas decoradas con frutos rojos por encima."
      ],
      justificacion: "Alta dosis de proteínas limpias y carbohidratos complejos de absorción lenta. Ideal para desayunos o meriendas fitness."
    },
    {
      nombre: "Bowl de Yogur Griego Pro, Chía y Nueces",
      kcal: 280,
      prot: 18,
      ingredientes: [
        "150g de yogur griego natural sin azúcar",
        "10g de semillas de chía",
        "15g de nueces picadas",
        "10g de miel de abejas o edulcorante ligero"
      ],
      pasos: [
        "Sirve el yogur griego bien frío en un bol hondo.",
        "Espolvorea las semillas de chía y mezcla suavemente para hidratar.",
        "Decora distribuyendo las nueces picadas por encima.",
        "Finaliza derramando un hilo fino de miel o edulcorante por encima para dar un toque dulce."
      ],
      justificacion: "Perfecto balance de grasas saludables, fibra saciante y probióticos de alta densidad calórica controlada."
    },
    {
      nombre: "Pechuga de Pollo al Limón con Espárragos y Arroz Integral",
      kcal: 440,
      prot: 38,
      ingredientes: [
        "150g de pechuga de pollo cortada en filetes",
        "8 espárragos verdes frescos",
        "60g en crudo (120g cocido) de arroz integral",
        "1 diente de ajo y zumo de medio limón",
        "1 cucharadita de aceite de oliva virgen extra"
      ],
      pasos: [
        "Pon a cocer el arroz integral en agua con sal durante 25-30 minutos.",
        "En una sartén bien caliente, añade la cucharadita de aceite e integra el ajo picado.",
        "Sella la pechuga de pollo y sazona con sal baja en sodio y pimienta recién molida.",
        "Añade los espárragos verdes a la parrilla junto al pollo, virtiéndoles el zumo de limón al final.",
        "Sirve el arroz en la base y acompaña con el pollo al limón y espárragos tostados."
      ],
      justificacion: "El plato definitivo del deportista: carbohidratos saludables de bajo índice glucémico más proteína magra del más alto valor biológico."
    },
    {
      nombre: "Tacos Fit de Lechuga con Pavo Especiado",
      kcal: 310,
      prot: 29,
      ingredientes: [
        "150g de carne de pavo molida",
        "4 hojas grandes de lechuga romana o romana fresca",
        "50g de tomate picado en cubitos",
        "30g de cebolla picada y 1/4 de aguacate",
        "Pizca de comino, pimentón y orégano seco"
      ],
      pasos: [
        "En una sartén antiadherente saltea la cebolla con un poco de agua o aceite en spray.",
        "Añade la carne de pavo con las especias (comino, pimentón, orégano) hasta que esté bien dorada.",
        "Lava bien las hojas de lechuga que actuarán como 'tortillas' de taco.",
        "Rellena cada hoja con el pavo especiado templado, encima añade tomate picado y unas láminas de aguacate."
      ],
      justificacion: "Opción baja en carbohidratos (low carb) y grasas saturadas, pero extremadamente rica en sabor y proteínas saciantes."
    },
    {
      nombre: "Ensalada de Quinoa, Aguacate, Garbanzos y Tomatitos",
      kcal: 490,
      prot: 15,
      ingredientes: [
        "60g de quinoa limpia",
        "100g de garbanzos cocidos escurridos",
        "1/2 aguacate maduro en rodajas y 6 tomates cherry",
        "1 cucharada mediana de semillas de calabaza tostadas",
        "Vinagreta ligera casera (limón, sal, un hilo de aceite)"
      ],
      pasos: [
        "Cuece la quinoa en agua hirviendo durante 12-15 minutos y deja templar.",
        "En un cuenco grande añade los garbanzos, los tomates cherry cortados por la mitad y la quinoa.",
        "Añade la pulpa del medio aguacate cortada en cubitos.",
        "Espolvorea las semillas de calabaza para añadir textura crocante.",
        "Aliña suavemente y revuelve con cuidado."
      ],
      justificacion: "Alta cantidad de minerales, grasas cardiosaludables monoinsaturadas y proteínas de origen vegetal 100% vegetariana y sin gluten."
    },
    {
      nombre: "Salmón al Horno con Verduras y Batata",
      kcal: 580,
      prot: 34,
      ingredientes: [
        "140g de filete de salmón fresco",
        "150g de boniato o batata (patata dulce)",
        "1/2 taza de brócoli cortado en ramitos",
        "1/2 zanahoria rebanada fina",
        "Eneldo seco y 1 cucharada de aceite ligero"
      ],
      pasos: [
        "Precalienta el horno a 200°C.",
        "Lava el boniato y córtalo en dados gruesos. Embadurna ligeramente de aceite y hornea durante 15 minutos.",
        "Añade los ramitos de brócoli, rodajas de zanahoria y haz un espacio para el lomo de salmón con eneldo.",
        "Hornea todo en conjunto 15-18 minutos más hasta que el salmón esté opaco y jugoso."
      ],
      justificacion: "Aporte superlativo de Ácidos Grasos Omega-3 de excelente bioactividad cardíaca y cerebral."
    }
  ];

  let filtered = db;
  
  if (normalizedPrefs.includes("vegetariano") || normalizedPrefs.includes("vegano")) {
    filtered = db.filter(r => r.nombre.includes("Quinoa") || r.nombre.includes("Yogur") || r.nombre.includes("Tortitas"));
  } else if (normalizedPrefs.includes("gluten") || normalizedPrefs.includes("sin gluten")) {
    filtered = db.filter(r => r.nombre.includes("Quinoa") || r.nombre.includes("Salmón") || r.nombre.includes("Bowl") || r.nombre.includes("Tacos"));
  }

  if (filtered.length === 0) {
    filtered = db;
  }

  const distanceSorted = [...filtered].sort((a, b) => {
    const distA = Math.abs(a.kcal - targetKcal);
    const distB = Math.abs(b.kcal - targetKcal);
    return distA - distB;
  });

  const selectedList = distanceSorted.slice(0, 3);

  return {
    recetas: selectedList.map(item => ({
      nombre: item.nombre,
      calorias: item.kcal,
      proteinas: item.prot,
      ingredientes: item.ingredientes,
      pasos: item.pasos,
      justificacion: item.justificacion + " (Sugerencia local offline debido a saturación temporal de API)"
    }))
  };
}

// 1. Endpoint to generate a personalized weekly menu and physical activity plan
app.post("/api/agent/suggest-plan", async (req: Request, res: Response) => {
  const { 
    age, 
    height, 
    currentWeight, 
    targetWeight, 
    goal, 
    dailyKcalTarget, 
    proteinsTarget,
    enfermedades,
    lesiones,
    problemasMusculares,
    glucosaSangre,
    trigliceridos,
    colesterolHDL,
    colesterolLDL,
    pcrUs,
    horasSueno,
    tshTiroides
  } = req.body;

  let medicalRestrictionsText = "";
  if (enfermedades) medicalRestrictionsText += `\n- Enfermedades/Condiciones Previas: ${enfermedades}`;
  if (lesiones) medicalRestrictionsText += `\n- Lesiones Activas: ${lesiones}`;
  if (problemasMusculares) medicalRestrictionsText += `\n- Problemas Musculares o de Articulaciones: ${problemasMusculares}`;

  let clinicalMarkersText = "";
  if (glucosaSangre) clinicalMarkersText += `\n- Glucosa en Sangre: ${glucosaSangre} mg/dL`;
  if (trigliceridos) clinicalMarkersText += `\n- Triglicéridos: ${trigliceridos} mg/dL`;
  if (colesterolHDL) clinicalMarkersText += `\n- Colesterol HDL: ${colesterolHDL} mg/dL`;
  if (colesterolLDL) clinicalMarkersText += `\n- Colesterol LDL: ${colesterolLDL} mg/dL`;
  if (pcrUs) clinicalMarkersText += `\n- Proteína C Reactiva (PCR-us): ${pcrUs} mg/L`;
  if (horasSueno) clinicalMarkersText += `\n- Horas de Sueño Promedio: ${horasSueno} h`;
  if (tshTiroides) clinicalMarkersText += `\n- Hormona TSH (Tiroides): ${tshTiroides} µIU/mL`;

  let goalTypeText = "";
  if (goal?.toLowerCase().includes("perder") || goal?.toLowerCase().includes("deficit") || goal?.toLowerCase().includes("déficit") || goal?.toLowerCase().includes("bajar") || goal?.toLowerCase().includes("perdida") || goal?.toLowerCase().includes("pérdida")) {
    goalTypeText = "DÉFICIT CALÓRICO: Prioriza proteínas magras, vegetales de alto volumen y bajo contenido calórico, carbohidratos complejos en cantidades controladas. El objetivo es pérdida de grasa preservando masa muscular. Incluye alimentos saciantes y ricos en fibra.";
  } else if (goal?.toLowerCase().includes("ganar") || goal?.toLowerCase().includes("superavit") || goal?.toLowerCase().includes("superávit") || goal?.toLowerCase().includes("volumen") || goal?.toLowerCase().includes("masa") || goal?.toLowerCase().includes("hipertrofia")) {
    goalTypeText = "SUPERÁVIT CALÓRICO: Prioriza proteínas de alto valor biológico, carbohidratos para rendimiento y energía, grasas saludables para función hormonal. El objetivo es ganancia de masa muscular. Las porciones deben ser generosas y frecuentes.";
  } else {
    goalTypeText = "MANTENIMIENTO/NORMOCALÓRICO: Balance energético equilibrado. Distribución de macros para mantener peso y composición corporal. Las comidas deben ser completas y nutritivas sin excesos ni restricciones severas.";
  }

  let glucoseGuidelines = "";
  if (glucosaSangre) {
    const gluc = Number(glucosaSangre);
    if (gluc >= 126) {
      glucoseGuidelines = "GLUCOSA ALTA (≥126 mg/dL): Prioridad ABSOLUTA en control glucémico. Todas las comidas deben tener bajo índice glucémico. Prohíbe azúcares añadidos, harinas refinadas, jugos de fruta, arroz blanco, papas. Usa sólo carbohidratos complejos (quinoa, avena integral, legumbres, vegetales no feculentos) en porciones medidas. Cada comida debe combinar proteína + fibra + grasa saludable para estabilizar glucosa.";
    } else if (gluc >= 100) {
      glucoseGuidelines = "GLUCOSA ELEVADA / PREDIABETES (100-125 mg/dL): Prioriza alimentos de bajo índice glucémico. Reduce carbohidratos simples y refinados. Cada comida debe tener al menos 20-30g de proteína y fibra soluble para evitar picos de insulina. Incluye canela, vinagre de manzana y grasas saludables que ayudan a modular la respuesta glucémica.";
    } else {
      glucoseGuidelines = "GLUCOSA NORMAL (<100 mg/dL): Mantén el equilibrio actual. Incluye carbohidratos complejos en todas las comidas y distribuye la proteína uniformemente. Evita picos de glucosa con comidas altas en azúcar.";
    }
  }

  let inflammationGuidelines = "";
  if (pcrUs) {
    const pcr = Number(pcrUs);
    if (pcr > 3.0) {
      inflammationGuidelines = "INFLAMACIÓN CRÓNICA ALTA (PCR-us >3.0 mg/L): DIETA ANTIINFLAMATORIA ESTRICTA. Incluye ácidos grasos omega-3 (salmón, caballa, sardinas, nueces, semillas de chía y lino). Añade cúrcuma con pimienta negra diariamente. Prioriza vegetales de hoja verde, frutas rojas, aceite de oliva virgen extra. Elimina alimentos ultraprocesados, fritos, grasas trans, alcohol y azúcares refinados. Incluye probióticos (yogur griego, kéfir, vegetales fermentados).";
    } else if (pcr >= 1.0) {
      inflammationGuidelines = "INFLAMACIÓN DE BAJO GRADO (PCR-us 1.0-3.0 mg/L): Incorpora alimentos antiinflamatorios como pescado graso 3-4 veces por semana, cúrcuma, jengibre, aceite de oliva, frutos secos y semillas. Reduce consumo de carnes rojas, lácteos enteros y alcohol. Aumenta ingesta de antioxidantes naturales (frutas del bosque, vegetales coloridos, té verde).";
    } else {
      inflammationGuidelines = "INFLAMACIÓN BAJA (PCR-us <1.0 mg/L): Continúa con una dieta rica en antioxidantes y omega-3 para mantener el estado antiinflamatorio favorable.";
    }
  }

  let lipidGuidelines = "";
  if (colesterolLDL || trigliceridos || colesterolHDL) {
    const ldl = Number(colesterolLDL) || 0;
    const tg = Number(trigliceridos) || 0;
    const hdl = Number(colesterolHDL) || 60;
    const lipidNotes: string[] = [];
    if (ldl >= 160) lipidNotes.push("LDL elevado: Reduce grasas saturadas (carnes rojas, embutidos, mantequilla, queso entero, piel de pollo). Aumenta fibra soluble (avena, legumbres, manzana, berenjena) y fitoesteroles (nueces, semillas, aceites vegetales).");
    if (ldl >= 130 && ldl < 160) lipidNotes.push("LDL moderado: Modera el consumo de grasas saturadas y aumenta pescado azul y fibra soluble.");
    if (tg >= 200) lipidNotes.push("TRIGLICÉRIDOS ALTOS: Reduce drásticamente carbohidratos simples, azúcares y alcohol. Aumenta omega-3 (pescado graso, nueces, semillas de lino). Prioriza carbohidratos complejos con fibra.");
    if (tg >= 150 && tg < 200) lipidNotes.push("Triglicéridos moderados: Reduce azúcares añadidos y carbohidratos refinados. Incrementa actividad cardiovascular.");
    if (hdl < 40) lipidNotes.push("HDL bajo: Aumenta grasas monoinsaturadas (aceite de oliva, aguacate, frutos secos, aceitunas) y realiza ejercicio cardiovascular regular.");
    if (lipidNotes.length > 0) lipidGuidelines = "PERFIL LIPÍDICO: " + lipidNotes.join(" ");
  }

  let thyroidGuidelines = "";
  if (tshTiroides) {
    const tsh = Number(tshTiroides);
    if (tsh > 4.5) {
      thyroidGuidelines = "TSH ELEVADA / HIPOTIROIDISMO: Asegura ingesta adecuada de selenio (nueces de Brasil, atún, sardinas, huevo) y zinc (ostras, carne magra, semillas de calabaza). Incluye alimentos ricos en yodo (pescado de mar, algas, sal yodada con moderación). Evita consumo excesivo de crucíferas crudas (brócoli, coliflor, repollo) que pueden interferir con la función tiroidea; consúmelas cocidas. Mantén hidratación y control calórico estricto ya que el metabolismo puede estar más lento.";
    } else if (tsh < 0.5) {
      thyroidGuidelines = "TSH BAJA / HIPERTIROIDISMO: Aumenta el aporte calórico para compensar el metabolismo acelerado. Prioriza proteínas magras, carbohidratos complejos y grasas saludables para evitar pérdida de peso no intencionada. Incluye calcio y vitamina D para proteger densidad ósea. Reduce cafeína y estimulantes.";
    }
  }

  let sleepGuidelines = "";
  if (horasSueno) {
    if (Number(horasSueno) < 6.5) {
      sleepGuidelines = "SUEÑO INSUFICIENTE (<6.5h): Prioriza alimentos ricos en triptófano (pavo, huevo, lácteos, plátano, avena) y magnesio (espinacas, almendras, semillas de calabaza) para mejorar calidad del sueño. Evita cafeína después de las 4pm. Reduce carbohidratos simples en la cena.";
    }
  }

  const inputSummary = `- Edad: ${age} años
- Altura: ${height} cm
- Peso Actual: ${currentWeight} kg
- Peso Objetivo: ${targetWeight} kg
- Objetivo principal: ${goal}
- Tipo de plan: ${goalTypeText.split(":")[0]}
- Objetivo de Calorías Diarias: ${dailyKcalTarget} kcal
- Objetivo de Proteínas Diarias: ${proteinsTarget} g`;

  const prompt = `Actúa como un experto nutricionista clínico con especialización en endocrinología metabólica, inflamación sistémica y medicina del deporte.

Genera un plan semanal completo y personalizado de nutrición (desayuno, almuerzo, cena y snacks) y entrenamiento físico basado en el siguiente perfil del usuario:

${inputSummary}${medicalRestrictionsText ? `\n\nCONDICIONES CLÍNICAS Y LIMITACIONES FÍSICAS RELEVANTES:${medicalRestrictionsText}` : ""}${clinicalMarkersText ? `\n\nBIOMARCADORES DE LABORATORIO APORTADOS:${clinicalMarkersText}` : ""}

ESTRATEGIA NUTRICIONAL SEGÚN OBJETIVO:
${goalTypeText}

${glucoseGuidelines ? `ADAPTACIÓN POR GLUCOSA:\n${glucoseGuidelines}\n` : ""}${inflammationGuidelines ? `ADAPTACIÓN POR INFLAMACIÓN:\n${inflammationGuidelines}\n` : ""}${lipidGuidelines ? `ADAPTACIÓN POR PERFIL LIPÍDICO:\n${lipidGuidelines}\n` : ""}${thyroidGuidelines ? `ADAPTACIÓN POR TIROIDES:\n${thyroidGuidelines}\n` : ""}${sleepGuidelines ? `ADAPTACIÓN POR SUEÑO:\n${sleepGuidelines}\n` : ""}

INDICACIONES MÉDICO-DEPORTIVAS CRÍTICAS DE SEGURIDAD:
- Si el usuario reporta diabetes, prediabetes o glucosa elevada: TODAS las comidas deben priorizar control glucémico (bajo IG, sin azúcares, combinación proteína+grasa+fibra en cada comida).
- Si el usuario reporta inflamación alta (PCR-us elevada o enfermedades autoinmunes): LA DIETA DEBE SER ANTIINFLAMATORIA (omega-3, cúrcuma, antioxidantes, eliminar procesados y fritos).
- Si el usuario reporta enfermedades o condiciones previas (diabetes, hipertensión, hipotiroidismo, resistencia a la insulina): adapta rigurosamente la selección de alimentos.
- Si el usuario reporta lesiones activas o problemas musculares/articulares: ajusta las rutinas de ejercicio para evitar daño (bajo impacto, natación, elíptica, isométricos, movilidad articular).
- Explica en "consejosGenerales" cómo adaptaste el plan según sus biomarcadores y condiciones clínicas.

Debes proporcionar un plan de 7 días (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo).
Para cada día, define:
1. Desayuno (saludable, equilibrado y fácil de preparar)
2. Almuerzo (la comida principal, detallando ingredientes clave)
3. Cena (comida ligera, alta en proteínas y adaptada a las condiciones del usuario)
4. Snacks (ideas saludables para picar entre horas)
5. Kcal Estimada (calorías totales estimadas del día)
6. Entrenamiento (ejercicio adaptado a condición física, lesiones y objetivo)

CRÍTICO SOBRE VARIEDAD: Cada día debe tener comidas COMPLETAMENTE DIFERENTES. No repitas ningún plato entre los 7 días. Varía proteínas (pollo, pescado azul, pescado blanco, huevo, ternera magra, tofu, pavo, legumbres), carbohidratos (quinoa, arroz integral, batata, avena, pasta integral, legumbres, pan integral) y vegetales (brócoli, espinacas, calabacín, pimiento, berenjena, zanahoria, espárragos). Usa diferentes técnicas de cocción (plancha, horno, salteado, vapor, papillote, crudo, hervido). La variedad es OBLIGATORIA.

CRÍTICO SOBRE ADAPTACIÓN CLÍNICA: Cada comida debe estar alineada con las condiciones de salud del usuario. Por ejemplo: si tiene glucosa alta no sugerir arroz blanco ni jugos; si tiene inflamación alta incluir omega-3 y cúrcuma; si tiene colesterol LDL alto evitar grasas saturadas y priorizar fibra soluble.

Escribe todo en ESPAÑOL, de manera motivadora, elegante y profesional.`;

  const responseSchema = {
    type: Type.OBJECT,
    required: ["objetivo", "planesPorDia", "consejosGenerales"],
    properties: {
      objetivo: {
        type: Type.STRING,
        description: "Resumen motivador sobre cómo este plan ayudará a alcanzar el objetivo."
      },
      consejosGenerales: {
        type: Type.STRING,
        description: "Consejos generales sobre hidratación, descanso y disciplina en español."
      },
      planesPorDia: {
        type: Type.ARRAY,
        description: "Lista ordenada de 7 elementos correspondientes a los días de la semana de Lunes a Domingo.",
        items: {
          type: Type.OBJECT,
          required: ["dia", "desayuno", "almuerzo", "cena", "snacks", "kcalEstimada", "entrenamiento"],
          properties: {
            dia: { type: Type.STRING, description: "Nombre del día de la semana, p. ej. 'Lunes'" },
            desayuno: { type: Type.STRING, description: "Detalle del desayuno recomendado." },
            almuerzo: { type: Type.STRING, description: "Detalle del almuerzo recomendado." },
            cena: { type: Type.STRING, description: "Detalle de la cena recomendada." },
            snacks: { type: Type.STRING, description: "Detalle de colaciones o snacks." },
            kcalEstimada: { type: Type.INTEGER, description: "Estimación del total de kcal de estas comidas del día entera." },
            entrenamiento: { type: Type.STRING, description: "Rutina o propuesta de ejercicio físico para este día." }
          }
        }
      }
    }
  };

  try {
    let resultText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    } catch (err: any) {
      console.warn("Attempt 1 with gemini-3.5-flash failed, trying gemini-3.1-flash-lite:", err.message || err);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    }

    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.warn("Gemini generation failed, using high-quality local plan template:", error?.message || error);
    const localPlan = fallbackPlanGenerator({
      goal,
      kcalObjetivo: dailyKcalTarget,
      proteinasObjetivo: proteinsTarget
    });
    res.json(localPlan);
  }
});

// 2. Endpoint to analyze a meal description using natural language and return parsed details
app.post("/api/agent/analyze-food", async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Por favor proporciona la descripción de lo que comiste." });
  }

  const prompt = `Analiza la siguiente comida escrita por el usuario: "${text}".
Calcula de manera profesional y realista:
1. Las calorías totales (kcal) aproximadas.
2. Contenido de proteínas total aproximado en gramos (g).
3. Una lista simplificada y estandarizada de los alimentos identificados.

Responde estrictamente en formato JSON según el esquema especificado.`;

  const responseSchema = {
    type: Type.OBJECT,
    required: ["alimentos", "calorias", "proteinas"],
    properties: {
      alimentos: { type: Type.STRING, description: "Lista concisa y formateada de los ingredientes identificados en español." },
      calorias: { type: Type.INTEGER, description: "Calorías calculadas como número entero." },
      proteinas: { type: Type.INTEGER, description: "Gramos de proteína calculados como número entero." }
    }
  };

  try {
    let resultText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    } catch (err: any) {
      console.warn("Attempt 1 with gemini-3.5-flash failed, trying gemini-3.1-flash-lite:", err.message || err);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    }

    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.warn("All Gemini models exhausted or failed, using local offline parser:", error?.message || error);
    const result = fallbackFoodAnalyzer(text);
    res.json(result);
  }
});

// 3. Endpoint to analyze physical activity and return parsed details
app.post("/api/agent/analyze-activity", async (req: Request, res: Response) => {
  const { text } = req.body;
  if (!text) {
    return res.status(400).json({ error: "Por favor proporciona la descripción de tu entrenamiento." });
  }

  const prompt = `Analiza el ejercicio físico realizado y reportado por el usuario: "${text}".
Determina de forma realista:
1. El tipo de ejercicio o actividad física principal.
2. La duración aproximada en minutos (si no se especifica, estima un valor típico razonable, como 30 o 45 minutos enteros).
3. El nivel de intensidad (Baja, Media o Alta).
4. El gasto aproximado en calorías quemadas (kcal estimadas de manera realista según la intensidad y duración).

Responde estrictamente en formato JSON según el esquema especificado.`;

  const responseSchema = {
    type: Type.OBJECT,
    required: ["ejercicio", "duracion", "intensidad", "caloriasQuemadas"],
    properties: {
      ejercicio: { type: Type.STRING, description: "Nombre simple y estandarizado del ejercicio o deporte en español." },
      duracion: { type: Type.INTEGER, description: "Duración estimada en minutos como número entero." },
      intensidad: { type: Type.STRING, description: "Intensidad medida como 'Baja', 'Media' o 'Alta'." },
      caloriasQuemadas: { type: Type.INTEGER, description: "Calorías quemadas estimadas como número entero de kcal." }
    }
  };

  try {
    let resultText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    } catch (err: any) {
      console.warn("Attempt 1 with gemini-3.5-flash failed, trying gemini-3.1-flash-lite:", err.message || err);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.6,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    }

    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.warn("All Gemini models exhausted, using local activity estimator:", error?.message || error);
    const result = fallbackActivityAnalyzer(text);
    res.json(result);
  }
});

// 4. Endpoint to generate 2-3 recipe suggestions based on calorie target, preferences, and optionally available ingredients
app.post("/api/agent/suggest-recipes", async (req: Request, res: Response) => {
  const { targetKcal, targetPeriod, preferences, ingredients } = req.body;

  if (!targetKcal) {
    return res.status(400).json({ error: "Por favor proporciona las calorías objetivo." });
  }

  const prompt = `Actúa como un chef profesional y experto en nutrición.
Genera 2 o 3 sugerencias de recetas saludables, deliciosas y perfectamente equilibradas basadas en los siguientes criterios de búsqueda:
- Calorías objetivo: ${targetKcal} kcal (pensado para ser consumido ${targetPeriod === 'day' ? 'en todo el día entero' : 'en una sola comida'})
- Preferencias o restricciones alimentarias: ${preferences || 'Ninguna especificada'}
- Ingredientes disponibles (opcional, si se proporcionan úsalos o facilítalos): ${ingredients || 'Cualquiera'}

Cada sugerencia de receta debe ser detallada, creativa, variada (no repitas recetas típicas como pechuga de pollo o salmón a la plancha), realista para preparar en casa y nutricionalmente coherente con el objetivo de calorías establecido en el prompt.

Responde estrictamente en formato JSON en ESPAÑOL, siguiendo el esquema de respuesta definido.`;

  const responseSchema = {
    type: Type.OBJECT,
    required: ["recetas"],
    properties: {
      recetas: {
        type: Type.ARRAY,
        description: "Colección de 2 a 3 sugerencias de recetas recomendadas.",
        items: {
          type: Type.OBJECT,
          required: ["nombre", "calorias", "proteinas", "ingredientes", "pasos", "justificacion"],
          properties: {
            nombre: { type: Type.STRING, description: "Nombre atractivo e informativo de la receta en español." },
            calorias: { type: Type.INTEGER, description: "Calorías estimadas del plato como número entero." },
            proteinas: { type: Type.INTEGER, description: "Proteínas estimadas del plato en gramos como número entero." },
            ingredientes: {
              type: Type.ARRAY,
              description: "Lista de ingredientes necesarios con sus respectivas cantidades.",
              items: { type: Type.STRING }
            },
            pasos: {
              type: Type.ARRAY,
              description: "Pasos claros y secuenciales para la preparación y cocinado de la receta.",
              items: { type: Type.STRING }
            },
            justificacion: { type: Type.STRING, description: "Explicación breve de por qué este plato cumple de manera excelente con las calorías y preferencias solicitadas." }
          }
        }
      }
    }
  };

  try {
    let resultText = "";
    try {
      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: prompt,
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    } catch (err: any) {
      console.warn("Attempt 1 with gemini-3.5-flash failed, trying gemini-3.1-flash-lite:", err.message || err);
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite",
        contents: prompt,
        config: {
          temperature: 0.9,
          responseMimeType: "application/json",
          responseSchema
        }
      });
      resultText = response.text || "";
    }

    if (!resultText) {
      throw new Error("No response from Gemini");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.warn("All Gemini models exhausted, using offline healthy recipe builder:", error?.message || error);
    const result = fallbackRecipeGenerator(targetKcal, targetPeriod, preferences, ingredients);
    res.json(result);
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date() });
});

export default app;
