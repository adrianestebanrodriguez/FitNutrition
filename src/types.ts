export interface UserProfile {
  fecha: string;
  edad: number;
  altura: number; // in cm
  pesoActual: number; // in kg
  pesoObjetivo: number; // in kg
  objetivo: string; // e.g. "Perder peso", "Mantener peso", "Ganar masa muscular"
  kcalObjetivo: number;
  proteinasObjetivo: number; // in grams
}

export interface CalorieLog {
  fecha: string; // YYYY-MM-DD
  comida: string; // e.g., "Desayuno", "Almuerzo", "Cena", "Snack"
  alimentos: string;
  calorias: number;
  proteinas: number; // in grams
  registradoPorIA: boolean;
}

export interface ActivityLog {
  fecha: string; // YYYY-MM-DD
  ejercicio: string;
  duracion: number; // in minutes
  intensidad: "Baja" | "Media" | "Alta";
  caloriasQuemadas: number;
  registradoPorIA: boolean;
}

export interface DayPlan {
  dia: string; // e.g., "Lunes", "Martes" ...
  desayuno: string;
  almuerzo: string;
  cena: string;
  snacks: string;
  kcalEstimada: number;
  entrenamiento: string;
}

export interface WeeklyPlan {
  creadoEn: string;
  objetivo: string;
  planesPorDia: DayPlan[];
  consejosGenerales: string;
}
