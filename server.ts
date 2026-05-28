import express, { Request, Response } from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const app = express();
const PORT = 3000;

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

// 1. Endpoint to generate a personalized weekly menu and physical activity plan
app.post("/api/agent/suggest-plan", async (req: Request, res: Response) => {
  try {
    const { age, height, currentWeight, targetWeight, goal, dailyKcalTarget, proteinsTarget } = req.body;

    const prompt = `Actúa como un experto nutricionista y entrenador personal certificado.
Genera un plan semanal completo y personalizado de nutrición (desayuno, almuerzo, cena y snacks) y entrenamiento físico en base al siguiente perfil del usuario:
- Edad: ${age} años
- Altura: ${height} cm
- Peso Actual: ${currentWeight} kg
- Peso Objetivo: ${targetWeight} kg
- Objetivo principal: ${goal}
- Objetivo de Calorías Diarias: ${dailyKcalTarget} kcal
- Objetivo de Proteínas Diarias: ${proteinsTarget} g

Debes proporcionar de forma estricta un plan de 7 días (Lunes, Martes, Miércoles, Jueves, Viernes, Sábado, Domingo).
Para cada día, define:
1. Desayuno (saludable, equilibrado y fácil de preparar)
2. Almuerzo (la comida principal, detallando ingredientes clave sanos)
3. Cena (comida ligera y alta en proteínas)
4. Snacks (ideas saludables para picar entre horas)
5. Kcal Estimada (estimación de calorías para todo el día de alimentación asignado en el plan)
6. Entrenamiento (ejercicios recomendados para ese día, descanso o cardio según el objetivo)

Escribe todos los textos en ESPAÑOL, de manera motivadora, elegante y profesional.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se obtuvo respuesta del Agente de IA.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error al sugerir plan:", error);
    res.status(500).json({ error: error.message || "Error al procesar la sugerencia con IA" });
  }
});

// 2. Endpoint to analyze a meal description using natural language and return parsed details
app.post("/api/agent/analyze-food", async (req: Request, res: Response) => {
  try {
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["alimentos", "calorias", "proteinas"],
          properties: {
            alimentos: { type: Type.STRING, description: "Lista concisa y formateada de los ingredientes identificados en español." },
            calorias: { type: Type.INTEGER, description: "Calorías calculadas como número entero." },
            proteinas: { type: Type.INTEGER, description: "Gramos de proteína calculados como número entero." }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se pudo analizar la comida.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error al analizar comida:", error);
    res.status(500).json({ error: error.message || "Error al analizar alimentos con IA" });
  }
});

// 3. Endpoint to analyze physical activity and return parsed details
app.post("/api/agent/analyze-activity", async (req: Request, res: Response) => {
  try {
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

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          required: ["ejercicio", "duracion", "intensidad", "caloriasQuemadas"],
          properties: {
            ejercicio: { type: Type.STRING, description: "Nombre simple y estandarizado del ejercicio o deporte en español." },
            duracion: { type: Type.INTEGER, description: "Duración estimada en minutos como número entero." },
            intensidad: { type: Type.STRING, description: "Intensidad medida como 'Baja', 'Media' o 'Alta'." },
            caloriasQuemadas: { type: Type.INTEGER, description: "Calorías quemadas estimadas como número entero de kcal." }
          }
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se pudo analizar la actividad.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error al analizar actividad:", error);
    res.status(500).json({ error: error.message || "Error al analizar actividad con IA" });
  }
});

// 4. Endpoint to generate 2-3 recipe suggestions based on calorie target, preferences, and optionally available ingredients
app.post("/api/agent/suggest-recipes", async (req: Request, res: Response) => {
  try {
    const { targetKcal, targetPeriod, preferences, ingredients } = req.body;

    if (!targetKcal) {
      return res.status(400).json({ error: "Por favor proporciona las calorías objetivo." });
    }

    const prompt = `Actúa como un chef profesional y experto en nutrición.
Genera 2 o 3 sugerencias de recetas saludables, deliciosas y perfectamente equilibradas basadas en los siguientes criterios de búsqueda:
- Calorías objetivo: ${targetKcal} kcal (pensado para ser consumido ${targetPeriod === 'day' ? 'en todo el día entero' : 'en una sola comida'})
- Preferencias o restricciones alimentarias: ${preferences || 'Ninguna especificada'}
- Ingredientes disponibles (opcional, si se proporcionan úsalos o facilítalos): ${ingredients || 'Cualquiera'}

Cada sugerencia de receta debe ser detallada, creativa, realista para preparar en casa y nutricionalmente coherente con el objetivo de calorías establecido en el prompt.

Responde estrictamente en formato JSON en ESPAÑOL, siguiendo el esquema de respuesta definido.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
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
        }
      }
    });

    const resultText = response.text;
    if (!resultText) {
      throw new Error("No se pudo obtener sugerencias de recetas de la IA.");
    }

    res.json(JSON.parse(resultText));
  } catch (error: any) {
    console.error("Error al sugerir recetas:", error);
    res.status(500).json({ error: error.message || "Error al generar recetas con IA" });
  }
});

// Serve health status
app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", time: new Date() });
});

// Integración con Vite en modo desarrollo u estático en producción
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    // SPA fallback
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`[Server] Corriendo de manera segura en http://localhost:${PORT}`);
  });
}

startServer();
