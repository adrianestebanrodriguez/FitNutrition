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
  Hash, 
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
  // Input states
  const [targetKcal, setTargetKcal] = useState<number>(profile ? Math.round(profile.kcalObjetivo / 3) : 600);
  const [targetPeriod, setTargetPeriod] = useState<'meal' | 'day'>('meal');
  const [preferences, setPreferences] = useState<string>('');
  const [ingredients, setIngredients] = useState<string>('');
  
  // Quick-tag preferences
  const quickTags = ['Vegetariano', 'Vegano', 'Sin Gluten', 'Sin Lactosa', 'Keto', 'Bajo en Grasas'];

  // UI state
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
      
      // Initialize default meal types for logs
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
    <div className="space-y-6 animate-fade-in" id="recipe-generator-container">
      {/* Search Criteria Card */}
      <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white" id="criteria-card">
        <h3 className="text-xl font-bold text-white mb-4 flex items-center gap-2 font-display">
          <ChefHat className="h-6 w-6 text-emerald-300" />
          Generador de Recetas Inteligente con IA
        </h3>
        <p className="text-sm text-white/80 font-sans mb-6">
          Indica tus preferencias, ingredientes disponibles y el rango calórico objetivo para que nuestro Agente Nutricional formule 2-3 sugerencias de recetas personalizadas de alta calidad.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="criteria-inputs-grid">
          {/* Target Kcal selection */}
          <div className="space-y-2" id="kcal-criteria-group">
            <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              Calorías Objetivo
            </label>
            <div className="flex gap-2" id="kcal-option-inputs">
              <input
                type="number"
                value={targetKcal}
                onChange={(e) => setTargetKcal(Number(e.target.value))}
                className="w-1/2 px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                required
                min="50"
                max="5000"
              />
              <select
                value={targetPeriod}
                onChange={(e) => setTargetPeriod(e.target.value as 'meal' | 'day')}
                className="w-1/2 px-3 py-2 border border-white/20 rounded-xl text-sm bg-teal-900/40 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              >
                <option className="bg-teal-900 text-white" value="meal">Por Comida</option>
                <option className="bg-teal-900 text-white" value="day">Por Día Completo</option>
              </select>
            </div>
            {profile && (
              <p className="text-[11px] text-white/60 font-sans">
                Tu meta diaria en el perfil es <span className="font-bold">{profile.kcalObjetivo} kcal</span>
              </p>
            )}
          </div>

          {/* Preferences tag selection & inputs */}
          <div className="space-y-2" id="prefs-criteria-group">
            <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider">
              Preferencias Alimentarias / Alergias
            </label>
            <input
              type="text"
              value={preferences}
              onChange={(e) => setPreferences(e.target.value)}
              placeholder="Ej.: Sin lactosa, bajo en sodio..."
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none"
            />
            {/* Quick tags */}
            <div className="flex flex-wrap gap-1.5 pt-1" id="quick-preset-tags">
              {quickTags.map((tag, i) => {
                const isActive = preferences.split(',').map(t => t.trim()).includes(tag);
                return (
                  <button
                    key={i}
                    onClick={() => toggleTag(tag)}
                    className={`text-[10px] px-2 py-1 rounded-full font-bold transition-all ${
                      isActive 
                        ? 'bg-emerald-400 text-emerald-950 border border-emerald-400' 
                        : 'bg-white/10 hover:bg-white/15 text-white/80 border border-white/10'
                    }`}
                  >
                    {tag}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Available ingredients (Optional) */}
          <div className="col-span-1 md:col-span-2 space-y-2" id="ingredients-criteria-group">
            <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
              <Apple className="h-3.5 w-3.5 text-cyan-300" />
              Ingredientes que deseas utilizar (Opcional)
            </label>
            <textarea
              rows={2}
              value={ingredients}
              onChange={(e) => setIngredients(e.target.value)}
              placeholder="Ej.: Aguacate (palta), espinacas, avena, tomates, pechuga de pollo..."
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
            />
          </div>
        </div>

        {/* Action Button */}
        <div className="mt-6 pt-6 border-t border-white/10 flex justify-end" id="btn-criteria-wrap">
          <button
            onClick={handleGenerateRecipes}
            disabled={isGenerating || targetKcal <= 0}
            className="w-full md:w-auto px-6 py-3 bg-white hover:bg-emerald-50 text-emerald-950 hover:shadow-xl active:scale-[0.98] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-75 shadow-md cursor-pointer"
            id="btn-recipe-trigger"
          >
            {isGenerating ? (
              <RefreshCw className="h-4.5 w-4.5 animate-spin text-emerald-600" />
            ) : (
              <Sparkles className="h-4.5 w-4.5 text-emerald-700 animate-pulse" />
            )}
            <span>{isGenerating ? 'Formulando Recetas...' : 'Generar Recetas Saludables'}</span>
          </button>
        </div>
      </div>

      {/* Error state */}
      {error && (
        <div className="p-4 rounded-xl bg-red-900/30 border border-red-500/30 flex items-center gap-3 text-red-200 text-sm" id="recipe-error">
          <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {/* Results grid */}
      {recipes.length > 0 && (
        <div className="space-y-6 animate-fade-in" id="recipes-results-section">
          <div className="flex items-center gap-2" id="results-headline">
            <BookOpen className="h-5 w-5 text-emerald-300 animate-bounce" />
            <h4 className="text-lg font-bold text-white font-display">Sugerencias Recomendadas</h4>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="recipes-grid">
            {recipes.map((recipe, index) => {
              const isLogged = loggedRecipes[recipe.nombre];
              const activeMealType = mealTypes[recipe.nombre] || 'Almuerzo';
              
              return (
                <div 
                  key={index} 
                  className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white flex flex-col justify-between h-full bg-gradient-to-b from-white/10 to-transparent hover:scale-[1.01] transition-transform" 
                  id={`recipe-card-${index}`}
                >
                  <div className="space-y-4">
                    {/* Header */}
                    <div>
                      <h5 className="text-lg font-bold text-emerald-200 mb-1 font-display leading-tight">{recipe.nombre}</h5>
                      <div className="flex gap-3 text-xs text-white/70 font-mono font-bold mt-2 bg-white/5 py-1.5 px-3 rounded-lg border border-white/5 w-fit" id="recipe-stats">
                        <span className="flex items-center gap-1 text-amber-300">
                          <Flame className="h-3 w-3 fill-amber-300" />
                          {recipe.calorias} kcal
                        </span>
                        <span>•</span>
                        <span className="text-cyan-300">
                          {recipe.proteinas}g Prot
                        </span>
                      </div>
                    </div>

                    {/* Justification info */}
                    <div className="text-xs text-white/80 italic font-sans leading-relaxed bg-white/5 p-3 rounded-xl border border-white/5" id="recipe-reason">
                      "{recipe.justificacion}"
                    </div>

                    {/* Ingredients */}
                    <div id="recipe-ingredients-wrap">
                      <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest mb-2 font-display">Ingredientes:</p>
                      <ul className="space-y-1 text-xs text-white/85" id="recipe-ingr-list">
                        {recipe.ingredientes.map((ing, i) => (
                          <li key={i} className="flex items-start gap-1.5">
                            <span className="text-emerald-400 shrink-0 font-bold">•</span>
                            <span>{ing}</span>
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/* Preparation Steps */}
                    <div id="recipe-steps-wrap">
                      <p className="text-[11px] font-bold text-emerald-300 uppercase tracking-widest mb-2 font-display">Preparación:</p>
                      <ol className="space-y-2 text-xs text-white/80" id="recipe-step-list">
                        {recipe.pasos.map((paso, i) => (
                          <li key={i} className="flex gap-2">
                            <span className="text-emerald-300 font-mono font-bold shrink-0">{i + 1}.</span>
                            <span>{paso}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  </div>

                  {/* Synchronizer Action footer */}
                  <div className="mt-6 pt-4 border-t border-white/10 space-y-3" id="recipe-actions">
                    <div className="flex items-center gap-2" id="meal-select-wrap">
                      <label className="text-[11px] text-white/60 font-semibold font-sans">Registrar como:</label>
                      <select
                        value={activeMealType}
                        onChange={(e) => setMealTypes(prev => ({ ...prev, [recipe.nombre]: e.target.value }))}
                        className="flex-1 text-[11px] font-bold bg-teal-950/60 text-white rounded-lg px-2 py-1.5 border border-white/15 outline-none cursor-pointer"
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
                          ? 'bg-emerald-500/20 border border-emerald-500/20 text-emerald-200' 
                          : 'bg-emerald-400 hover:bg-emerald-300 text-emerald-950 active:scale-[0.98]'
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
