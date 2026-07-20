import type { VercelRequest, VercelResponse } from '@vercel/node';

// ─── Fallback generators ───────────────────────────────────────────────

function fallbackPlanGenerator(profile: any) {
  const dailyKcalTarget = profile.dailyKcalTarget || profile.kcalObjetivo || 2000;

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

  return {
    objetivo: "Sugerencia personalizada de plan nutricional generada localmente debido a límites de API excedidos temporalmente.",
    consejosGenerales: "Recuerda beber al menos 2.5 litros de agua al día, mantener una higiene del sueño de 7 a 8 horas continuas y entrenar con consistencia manteniendo la sobrecarga progresiva en tus ejercicios físicos diarios.",
    planesPorDia: dias.map((dia, index) => ({
      dia,
      desayuno: desayunos[index % desayunos.length],
      almuerzo: almuerzos[index % almuerzos.length],
      cena: cenas[index % cenas.length],
      snacks: snacksList[index % snacksList.length],
      kcalEstimada: Math.round(dailyKcalTarget * (0.95 + (index % 7) * 0.01)),
      entrenamiento: entrenamientos[index % entrenamientos.length]
    }))
  };
}

function fallbackFoodAnalyzer(text: string) {
  const n = text.toLowerCase();
  const foods: string[] = [];
  let cal = 350, prot = 15;
  if (n.includes("huevo")) { foods.push("Huevos cocidos/revueltos"); cal = 140; prot = 12; }
  if (n.includes("pollo") || n.includes("pechuga")) { foods.push("Pechuga de pollo a la plancha"); cal = 240; prot = 32; }
  if (n.includes("arroz")) { foods.push("Arroz blanco cocido"); cal += 130; prot += 3; }
  if (n.includes("atun") || n.includes("atún")) { foods.push("Atún al agua"); cal = 160; prot = 26; }
  if (n.includes("manzana")) { foods.push("Manzana fresca"); cal = 80; prot = 0; }
  if (n.includes("platano") || n.includes("plátano") || n.includes("banana")) { foods.push("Plátano maduro"); cal = 105; prot = 1; }
  if (n.includes("ensalada")) { foods.push("Ensalada fresca mixta"); cal = n.includes("pollo") ? 320 : 100; prot = n.includes("pollo") ? 22 : 2; }
  if (n.includes("pan") || n.includes("tostada")) { foods.push("Tostada de pan integral"); cal = 150; prot = 5; }
  if (n.includes("leche") || n.includes("yogur") || n.includes("yogurt")) { foods.push("Yogur natural pro / Lácteo"); cal = 110; prot = 7; }
  if (n.includes("avena")) { foods.push("Avena con leche o agua"); cal = 200; prot = 6; }
  if (n.includes("carne") || n.includes("ternera") || n.includes("bife")) { foods.push("Carne de ternera magra"); cal = 280; prot = 28; }
  if (foods.length === 0) foods.push(text.trim());
  const kcalMatch = n.match(/(\d+)\s*(kcal|calorias|calorías)/);
  if (kcalMatch) cal = parseInt(kcalMatch[1], 10);
  return { alimentos: foods.join(", ") + " (Estimado Local)", calorias: cal, proteinas: prot };
}

function fallbackActivityAnalyzer(text: string) {
  const n = text.toLowerCase();
  let ejercicio = "Entrenamiento general", duracion = 30, intensidad: string = "Media", MET = 5.0;
  const dm = n.match(/(\d+)\s*(minutos|min|m)/);
  if (dm) duracion = parseInt(dm[1], 10);
  if (n.includes("alta") || n.includes("fuerte") || n.includes("intenso") || n.includes("hiit")) { intensidad = "Alta"; MET = 8.5; }
  else if (n.includes("baja") || n.includes("suave") || n.includes("leve") || n.includes("ligero")) { intensidad = "Baja"; MET = 3.0; }
  else { intensidad = "Media"; MET = 5.5; }
  if (n.includes("correr") || n.includes("trote") || n.includes("running")) { ejercicio = "Trote / Running"; MET = intensidad === "Alta" ? 10.0 : intensidad === "Media" ? 7.5 : 5.5; }
  else if (n.includes("bici") || n.includes("bicicleta") || n.includes("spinning")) { ejercicio = "Spinning / Ciclismo"; MET = intensidad === "Alta" ? 9.0 : intensidad === "Media" ? 6.5 : 4.0; }
  else if (n.includes("caminar") || n.includes("pasos") || n.includes("caminata")) { ejercicio = "Caminata a ritmo continuo"; MET = intensidad === "Alta" ? 4.0 : intensidad === "Media" ? 3.3 : 2.3; }
  else if (n.includes("gimnasio") || n.includes("pesas") || n.includes("fuerza") || n.includes("musculación") || n.includes("musculacion")) { ejercicio = "Entrenamiento de Fuerza / Pesas"; MET = intensidad === "Alta" ? 6.0 : intensidad === "Media" ? 4.0 : 3.0; }
  else if (n.includes("futbol") || n.includes("fútbol") || n.includes("pelota")) { ejercicio = "Fútbol recreativo"; MET = 7.0; }
  else if (n.includes("nadar") || n.includes("natación") || n.includes("natacion")) { ejercicio = "Natación recreativa"; MET = 7.0; }
  else if (n.includes("yoga") || n.includes("pilates")) { ejercicio = "Yoga / Estiramientos"; MET = 2.5; intensidad = "Baja"; }
  const kcal = Math.round(MET * 3.5 * 75 * duracion / 200);
  return { ejercicio: ejercicio + " (Estimado Local)", duracion, intensidad, caloriasQuemadas: kcal };
}

function fallbackRecipeGenerator(targetKcal: number, _targetPeriod: string, preferences: string, _ingredients: string) {
  const db: any[] = [
    { nombre: "Tortitas Fit de Avena y Claras de Huevo", kcal: 320, prot: 24, ingredientes: ["50g de copos de avena triturados", "4 claras de huevo", "1 chorrito de leche vegetal o desnatada", "1g de canela en polvo", "50g de fresas o frutos rojos frescos"], pasos: ["Vierte los copos de avena triturados, las claras de huevo, la canela y la leche en una licuadora.", "Mezcla todo hasta obtener una textura suave.", "Calienta una sartén antiadherente a fuego medio.", "Cocina las tortitas de una en una.", "Sirve templadas decoradas con frutos rojos por encima."], justificacion: "Alta dosis de proteínas limpias y carbohidratos complejos." },
    { nombre: "Bowl de Yogur Griego Pro, Chía y Nueces", kcal: 280, prot: 18, ingredientes: ["150g de yogur griego natural sin azúcar", "10g de semillas de chía", "15g de nueces picadas", "10g de miel de abejas"], pasos: ["Sirve el yogur griego bien frío en un bol hondo.", "Espolvorea las semillas de chía y mezcla suavemente.", "Decora distribuyendo las nueces picadas por encima.", "Finaliza derramando un hilo fino de miel."], justificacion: "Perfecto balance de grasas saludables, fibra saciante y probióticos." },
    { nombre: "Pechuga de Pollo al Limón con Espárragos y Arroz Integral", kcal: 440, prot: 38, ingredientes: ["150g de pechuga de pollo", "8 espárragos verdes frescos", "60g de arroz integral", "1 diente de ajo y zumo de medio limón", "1 cucharadita de aceite de oliva"], pasos: ["Cuece el arroz integral en agua con sal 25-30 minutos.", "En una sartén caliente, añade aceite y ajo picado.", "Sella la pechuga de pollo y sazona.", "Añade los espárragos a la parrilla y el zumo de limón.", "Sirve el arroz en la base con el pollo y espárragos."], justificacion: "Carbohidratos saludables de bajo índice glucémico más proteína magra." },
    { nombre: "Salmón al Horno con Verduras y Batata", kcal: 580, prot: 34, ingredientes: ["140g de filete de salmón fresco", "150g de boniato o batata", "1/2 taza de brócoli", "1/2 zanahoria rebanada", "Eneldo seco y 1 cucharada de aceite"], pasos: ["Precalienta el horno a 200°C.", "Corta el boniato en dados, embadurna de aceite y hornea 15 min.", "Añade brócoli, zanahoria y el lomo de salmón con eneldo.", "Hornea 15-18 minutos más."], justificacion: "Aporte de Ácidos Grasos Omega-3 de excelente bioactividad." }
  ];
  let filtered = db;
  const np = (preferences || "").toLowerCase();
  if (np.includes("vegetariano") || np.includes("vegano")) filtered = db.filter(r => r.nombre.includes("Quinoa") || r.nombre.includes("Yogur") || r.nombre.includes("Tortitas"));
  else if (np.includes("gluten") || np.includes("sin gluten")) filtered = db.filter(r => r.nombre.includes("Quinoa") || r.nombre.includes("Salmón") || r.nombre.includes("Bowl"));
  if (filtered.length === 0) filtered = db;
  const sorted = [...filtered].sort((a, b) => Math.abs(a.kcal - targetKcal) - Math.abs(b.kcal - targetKcal)).slice(0, 3);
  return { recetas: sorted.map(item => ({ nombre: item.nombre, calorias: item.kcal, proteinas: item.prot, ingredientes: item.ingredientes, pasos: item.pasos, justificacion: item.justificacion + " (Sugerencia local offline)" })) };
}

// ─── Gemini client (lazy) ──────────────────────────────────────────────

let _genaiCache: any = null;
async function getGenAI() {
  if (_genaiCache) return _genaiCache;
  try {
    const mod = await import('@google/genai');
    const ai = new mod.GoogleGenAI({
      apiKey: process.env.GEMINI_API_KEY || '',
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });
    _genaiCache = { ai };
  } catch {
    _genaiCache = { ai: null };
  }
  return _genaiCache;
}

// ─── Parse JSON body ───────────────────────────────────────────────────

async function parseBody(req: any): Promise<any> {
  if (req.method === 'GET') return {};
  if (req.body && typeof req.body === 'object' && Object.keys(req.body).length > 0) return req.body;
  return new Promise((resolve) => {
    let data = '';
    req.on('data', (chunk: string) => data += chunk);
    req.on('end', () => {
      try { resolve(JSON.parse(data || '{}')); }
      catch { resolve({}); }
    });
  });
}

// ─── Route handlers ────────────────────────────────────────────────────

async function handleSuggestPlan(req: VercelRequest, res: VercelResponse) {
  const body = await parseBody(req);
  const { goal, dailyKcalTarget, proteinsTarget } = body;

  let data: any;
  try {
    const genai = await getGenAI();
    if (!genai.ai) throw new Error('no ai');

    const prompt = `Genera un plan semanal nutricional en ESPAÑOL para un usuario con objetivo: ${goal || 'saludable'}, ${dailyKcalTarget || 2000} kcal/día, ${proteinsTarget || 100}g proteína. Incluye 7 días con desayuno, almuerzo, cena, snacks, kcal estimada y entrenamiento. Responde JSON con "objetivo", "consejosGenerales" y "planesPorDia".`;

    const response = await genai.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.9, responseMimeType: 'application/json' }
    });

    data = JSON.parse(response.text || '');
  } catch {
    data = fallbackPlanGenerator({
      goal, kcalObjetivo: dailyKcalTarget, proteinasObjetivo: proteinsTarget
    });
  }

  res.status(200).json(data);
}

async function handleAnalyzeFood(req: VercelRequest, res: VercelResponse) {
  const body = await parseBody(req);
  const text = body.text || '';

  if (!text) {
    return res.status(400).json({ error: 'Por favor proporciona la descripción de lo que comiste.' });
  }

  let result: any;
  try {
    const genai = await getGenAI();
    if (!genai.ai) throw new Error('no ai');

    const prompt = `Analiza esta comida: "${text}". Devuelve JSON con "alimentos" (string), "calorias" (int), "proteinas" (int).`;

    const response = await genai.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.6, responseMimeType: 'application/json' }
    });

    result = JSON.parse(response.text || '');
  } catch {
    result = fallbackFoodAnalyzer(text);
  }

  res.status(200).json(result);
}

async function handleAnalyzeActivity(req: VercelRequest, res: VercelResponse) {
  const body = await parseBody(req);
  const text = body.text || '';

  if (!text) {
    return res.status(400).json({ error: 'Por favor proporciona la descripción de tu entrenamiento.' });
  }

  let result: any;
  try {
    const genai = await getGenAI();
    if (!genai.ai) throw new Error('no ai');

    const prompt = `Analiza este ejercicio: "${text}". Devuelve JSON con "ejercicio" (string), "duracion" (int), "intensidad" ("Baja"|"Media"|"Alta"), "caloriasQuemadas" (int).`;

    const response = await genai.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.6, responseMimeType: 'application/json' }
    });

    result = JSON.parse(response.text || '');
  } catch {
    result = fallbackActivityAnalyzer(text);
  }

  res.status(200).json(result);
}

async function handleSuggestRecipes(req: VercelRequest, res: VercelResponse) {
  const body = await parseBody(req);
  const { targetKcal, targetPeriod, preferences, ingredients } = body;

  if (!targetKcal) {
    return res.status(400).json({ error: 'Por favor proporciona las calorías objetivo.' });
  }

  let result: any;
  try {
    const genai = await getGenAI();
    if (!genai.ai) throw new Error('no ai');

    const prompt = `Genera 2-3 recetas saludables en ESPAÑOL con ${targetKcal} kcal. Preferencias: ${preferences || 'ninguna'}. Ingredientes: ${ingredients || 'cualquiera'}. Devuelve JSON con "recetas" (array con "nombre", "calorias", "proteinas", "ingredientes"[], "pasos"[], "justificacion").`;

    const response = await genai.ai.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
      config: { temperature: 0.9, responseMimeType: 'application/json' }
    });

    result = JSON.parse(response.text || '');
  } catch {
    result = fallbackRecipeGenerator(targetKcal, targetPeriod || 'meal', preferences || '', ingredients || '');
  }

  res.status(200).json(result);
}

// ─── Main handler ──────────────────────────────────────────────────────

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const url = req.url || '';
  const method = req.method || 'GET';

  res.setHeader('Content-Type', 'application/json');

  try {
    if (url === '/api/health' || url === '/api/index' || url === '/api') {
      return res.status(200).json({ status: 'healthy', time: new Date().toISOString() });
    }

    if (method === 'POST') {
      if (url === '/api/agent/suggest-plan') return handleSuggestPlan(req, res);
      if (url === '/api/agent/analyze-food') return handleAnalyzeFood(req, res);
      if (url === '/api/agent/analyze-activity') return handleAnalyzeActivity(req, res);
      if (url === '/api/agent/suggest-recipes') return handleSuggestRecipes(req, res);
    }

    res.status(404).json({ error: 'Ruta no encontrada' });
  } catch (error: any) {
    res.status(500).json({ error: 'Error interno del servidor', detail: error?.message || String(error) });
  }
}
