import React, { useState } from 'react';
import { UserProfile, CalorieLog } from '../types';
import { appendCalorieLog } from '../lib/sheets';
import {
  Sparkles,
  ChefHat,
  Flame,
  Plus,
  RefreshCw,
  Check,
  Apple,
  BookOpen,
  AlertCircle
} from 'lucide-react';

interface Recipe {
  nombre: string;
  calorias: number;
  proteinas: number;
  ingredientes: string[];
  pasos: string[];
  justificacion: string;
}

interface RecipeGeneratorProps {
  profile: UserProfile | null;
  token: string;
  onLogAdded: (log: CalorieLog) => void;
}

export default function RecipeGenerator({ profile, token, onLogAdded }: RecipeGeneratorProps) {
  const [targetKcal, setTargetKcal] = useState<number>(profile ? Math.round(profile.kcalObjetivo / 3) : 600);
  const [targetPeriod, setTargetPeriod] = useState<'meal' | 'day'>('meal');
  const [preferences, setPreferences] = useState<string>('');
  const [ingredients, setIngredients] = useState<string>('');

  const quickTags = ['Vegetariano', 'Vegano', 'Sin Gluten', 'Sin Lactosa', 'Keto', 'Bajo en Grasas'];

  const [isGenerating, setIsGenerating] = useState(false);
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loggedRecipes, setLoggedRecipes] = useState<{ [key: string]: boolean }>({});
  const [mealTypes, setMealTypes] = useState<{ [key: string]: string }>({});

  const toggleTag = (tag: string) => {
    setPreferences(prev => {
      const tags = prev.split(',').map(t => t.trim()).filter(Boolean);
      if (tags.includes(tag)) {
        return tags.filter(t => t !== tag).join(', ');
      } else {
        return [...tags, tag].join(', ');
      }
    });
  };

  const handleGenerateRecipes = async () => {
    setIsGenerating(true);
    setError(null);
    setLoggedRecipes({});

    try {
      const response = await fetch('/api/agent/suggest-recipes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          targetKcal,
          targetPeriod,
          preferences,
          ingredients
        }),
      });

      if (!response.ok) {
        throw new Error('No se pudo generar el plan de recetas con IA.');
      }

      const data = await response.json();
      setRecipes(data.recetas || []);

      const defaultMealTypes: { [key: string]: string } = {};
      (data.recetas || []).forEach((recipe: Recipe) => {
        defaultMealTypes[recipe.nombre] = 'Almuerzo';
      });
      setMealTypes(defaultMealTypes);
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Ocurrió un error al contactar al Agente de IA.');
    } finally {
      setIsGenerating(false);
    }
  };

  const handleLogToSheet = async (recipe: Recipe) => {
    const mealType = mealTypes[recipe.nombre] || 'Almuerzo';
    const todayStr = new Date().toLocaleDateString('es-ES');

    const newLog: CalorieLog = {
      fecha: todayStr,
      comida: mealType,
      alimentos: `${recipe.nombre} (Sugerido por IA)`,
      calorias: recipe.calorias,
      proteinas: recipe.proteinas,
      registradoPorIA: true
    };

    try {
      await appendCalorieLog(newLog, token);
      onLogAdded(newLog);

      setLoggedRecipes(prev => ({
        ...prev,
        [recipe.nombre]: true
      }));
    } catch (err) {
      console.error('Error logging recipe:', err);
      alert('Error al guardar el registro en Google Sheets.');
    }
  };

  return (
    <div className="space-y-6" id="recipe-generator-container">
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/30 shadow-xl text-slate-200" id="criteria-card">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-display">
          <ChefHat className="h-6 w-6 text-indigo-400" />
          Generador de Recetas Inteligente con IA
        </h3>
        <p className="text-sm text-slate-400 font-sans mb-6">
          Indica tus preferencias, ingredientes disponibles y el rango calórico objetivo para que nuestro Agente Nutricional formule 2-3 sugerencias de recetas personalizadas de alta calidad.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="criteria-inputs-grid">
          <div className="space-y-2" id="kcal-criteria-group">
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              Calorías Objetivo
            </label>
            <div className="flex gap-2" id="kcal-option-inputs">
              <input
                type="number"
                value={targetKcal}
                onChange={(e) => setTargetKcal(Number(e.target.value))}
                className="w-1/2 px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                required
                min="50"
                max="5000"
              />
              <select
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value as 'meal' | 'day')}
                className="w-1/2 px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/60 text-white focus:outline-none focus:ring-2 focus:ring-indigo-500 cursor-pointer"
              >
                <option className="bg-slate-800 text-white" value="meal">Por Comida</option>
                <option className="bg-slate-800 text-white" value="day">Por Día Completo</option>
              </select>
            </div>
            {profile && (
              <p className="text-[11px] text-slate-500 font-sans">
                Tu meta diaria en el perfil es <span className="font-bold text-slate-300">{profile.kcalObjetivo} kcal</span>
              </p>
            )}
          </div>

          <div className="space-y-2" id="prefs-criteria-group">
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider">
              Preferencias Alimentarias / Alergias
            </label>
            <input
              type="text"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="Ej.: Sin lactosa, bajo en sodio..."
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none"
            />
            <div className="flex flex-wrap gap-1.5 pt-1" id="quick-preset-tags">
              {quickTags.map((tag, i) => {
                const isActive = preferences.split(',').map(t => t.trim()).includes(tag);
                return (
                  <button
                    key={i}
                    onClick={() => toggleTag(tag)}
                    className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                      isActive
                        ? 'bg-indigo-500 text-white border border-indigo-500'
                        : 'bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border border-slate-700/30'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="col-span-1 md:col-span-2 space-y-2" id="ingredients-criteria-group">
            <label className="block text-xs font-semibold text-indigo-300 uppercase tracking-wider flex items-center gap-1">
              <Apple className="h-3.5 w-3.5 text-cyan-400" />
              Ingredientes que deseas utilizar (Opcional)
            </label>
            <textarea
              rows={2}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Ej.: Aguacate (palta), espinacas, avena, tomates, pechuga de pollo..."
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
            />
          </div>
        </div>

        <div className="mt-6 pt-6 border-t border-slate-700/30 flex justify-end" id="btn-criteria-wrap">
          <button
            onClick={handleGenerateRecipes}
            disabled={isGenerating || targetKcal <= 0}
            className="w-full md:w-auto px-6 py-3 bg-indigo-500 hover:bg-indigo-400 text-white hover:shadow-xl active:scale-[0.98] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-75 shadow-md cursor-pointer"
            id="btn-recipe-trigger"
          >
            {isGenerating ? (
              <RefreshCw className="h-4.5 w-4.5 animate-spin text-white" />
            ) : (
              <Sparkles className="h-4.5 w-4.5" />
            )}
            <span>{isGenerating ? 'Formulando Recetas...' : 'Generar Recetas Saludables'}</span>
          </button>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/15 border border-red-500/25 flex items-center gap-3 text-red-300 text-sm" id="recipe-error">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {recipes.length > 0 && (
        <div className="space-y-6" id="recipes-results-section">
          <div className="flex items-center gap-2" id="results-headline">
            <BookOpen className="h-5 w-5 text-indigo-400" />
            <h4 className="text-lg font-bold text-white font-display">Sugerencias Recomendadas</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="recipes-grid">
            {recipes.map((recipe, index) => {
              const isLogged = loggedRecipes[recipe.nombre];
              const activeMealType = mealTypes[recipe.nombre] || 'Almuerzo';

              return (
                <div
                  key={index}
                  className="glass-panel p-6 rounded-3xl border border-slate-700/30 shadow-xl text-slate-200 flex flex-col justify-between h-full bg-gradient-to-b from-slate-800/20 to-transparent hover:scale-[1.01] transition-transform"
                  id={`recipe-card-${index}`}
                >
                  <div className="space-y-4">
                    <div>
                      <h5 className="text-lg font-bold text-indigo-200 mb-1 font-display leading-tight">{recipe.nombre}</h5>
                      <div className="flex gap-3 text-xs text-slate-400 font-mono font-bold mt-2 bg-slate-800/40 py-1.5 px-3 rounded-lg border border-slate-700/30 w-fit" id="recipe-stats">
                        <span className="flex items-center gap-1 text-amber-400">
                          <Flame className="h-3 w-3 fill-amber-400" />
                          {recipe.calorias} kcal
                        </span>
                        <span>•</span>
                        <span className="text-cyan-400">
                          {recipe.proteinas}g Prot
                        </span>
                      </div>
                    </div>

                    <div className="text-xs text-slate-400 italic font-sans leading-relaxed bg-slate-800/40 p-3 rounded-xl border border-slate-700/30" id="recipe-reason">
                      "{recipe.justificacion}"
                    </div>

                    <div id="recipe-ingredients-wrap">
                      <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mb-2 font-display">Ingredientes:</p>
                      <ul className="space-y-1 text-xs text-slate-300" id="recipe-ingr-list">
                        {recipe.ingredientes.map((ing, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-indigo-400 shrink-0 font-bold">•</span>
                            <span>{ing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div id="recipe-steps-wrap">
                      <p className="text-[11px] font-bold text-indigo-300 uppercase tracking-widest mb-2 font-display">Preparación:</p>
                      <ol className="space-y-2 text-xs text-slate-300" id="recipe-step-list">
                        {recipe.pasos.map((paso, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-indigo-400 font-mono font-bold shrink-0">{i + 1}.</span>
                            <span>{paso}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  <div className="mt-6 pt-4 border-t border-slate-700/30 space-y-3" id="recipe-actions">
                    <div className="flex items-center gap-2" id="meal-select-wrap">
                      <label className="text-[11px] text-slate-500 font-semibold font-sans">Registrar como:</label>
                      <select
                        value={activeMealType}
                        onChange={(e) => setMealTypes(prev => ({ ...prev, [recipe.nombre]: e.target.value }))}
                        className="flex-1 text-[11px] font-bold bg-slate-800/60 text-white rounded-lg px-2 py-1.5 border border-slate-700/30 outline-none cursor-pointer"
                        disabled={isLogged}
                      >
                        <option value="Desayuno">Desayuno</option>
                        <option value="Almuerzo">Almuerzo</option>
                        <option value="Cena">Cena</option>
                        <option value="Snack">Snack / Colación</option>
                      </select>
                    </div>

                    <button
                      onClick={() => handleLogToSheet(recipe)}
                      disabled={isLogged}
                      className={`w-full flex items-center justify-center gap-1.5 px-4 py-2.5 rounded-xl text-xs font-bold transition-all shadow-md ${
                        isLogged
                          ? 'bg-indigo-500/20 border border-indigo-500/30 text-indigo-300'
                          : 'bg-indigo-500 hover:bg-indigo-400 text-white active:scale-[0.98]'
                      } cursor-pointer`}
                    >
                      {isLogged ? (
                        <>
                          <Check className="h-4.5 w-4.5" />
                          <span>¡Sincronizado con Sheets!</span>
                        </>
                      ) : (
                        <>
                          <Plus className="h-4.5 w-4.5" />
                          <span>Registrar en mi Dieta</span>
                        </>
                      )}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
