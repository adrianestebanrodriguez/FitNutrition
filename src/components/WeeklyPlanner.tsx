import { useState } from 'react';
import { WeeklyPlan, UserProfile } from '../types';
import { saveWeeklyPlan } from '../lib/sheets';
import { Sparkles, Calendar, Coffee, Crop, Moon, Apple, Award, Dumbbell, Flame, RefreshCw, CheckCircle2 } from 'lucide-react';

interface WeeklyPlannerProps {
  currentPlan: WeeklyPlan | null;
  profile: UserProfile | null;
  token: string;
  onPlanUpdated: (plan: WeeklyPlan) => void;
}

export default function WeeklyPlanner({ currentPlan, profile, token, onPlanUpdated }: WeeklyPlannerProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeDay, setActiveDay] = useState<string>('Lunes');

  const handleGeneratePlan = async () => {
    if (!profile) {
      setError('Por favor, completa primero tus objetivos en la pestaña "Mi Perfil".');
      return;
    }

    setIsGenerating(true);
    setError(null);

    try {
      const response = await fetch('/api/agent/suggest-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          age: profile.edad,
          height: profile.altura,
          currentWeight: profile.pesoActual,
          targetWeight: profile.pesoObjetivo,
          goal: profile.objetivo,
          dailyKcalTarget: profile.kcalObjetivo,
          proteinsTarget: profile.proteinasObjetivo
        })
      });

      if (!response.ok) {
        throw new Error('El Agente de IA falló al preparar tu plan personalizado.');
      }

      const generatedPlan: WeeklyPlan = await response.json();

      await saveWeeklyPlan(generatedPlan, token);

      onPlanUpdated(generatedPlan);

      if (generatedPlan.planesPorDia.length > 0) {
        setActiveDay(generatedPlan.planesPorDia[0].dia);
      }
    } catch (err: any) {
      console.error(err);
      setError(err?.message || 'Error al generar el plan de ejercicio y dieta.');
    } finally {
      setIsGenerating(false);
    }
  };

  const currentDayPlan = currentPlan?.planesPorDia.find(d => d.dia.toLowerCase() === activeDay.toLowerCase());

  return (
    <div className="space-y-6" id="planner-container">
      <div className="glass-panel p-6 rounded-3xl border border-slate-700/30 shadow-xl flex flex-col md:flex-row items-center justify-between gap-4" id="planner-header-card">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-1.5 font-display">
            <Sparkles className="h-5 w-5 text-indigo-400" />
            Plan Personalizado Semanal Inteligente
          </h3>
          <p className="text-sm text-slate-400 font-sans mt-1">
            {profile
              ? `Plan de Nutrición y Ejercicio diseñado para: ${profile.objetivo} (${profile.kcalObjetivo} Kcal/día)`
              : 'Configura tus parámetros físicos en "Mi Perfil" para generar planes dedicados.'
            }
          </p>
        </div>

        <button
          onClick={handleGeneratePlan}
          disabled={isGenerating}
          className="w-full md:w-auto px-5 py-3 bg-indigo-500 hover:bg-indigo-400 text-white hover:shadow-xl active:scale-[0.98] rounded-xl font-bold text-sm flex items-center justify-center gap-2 transition-all disabled:opacity-75 shadow-md shrink-0 cursor-pointer"
          id="planner-generate-btn"
        >
          {isGenerating ? (
            <RefreshCw className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          <span>{isGenerating ? 'Preparando Plan con IA...' : 'Generar Nuevo Plan con IA'}</span>
        </button>
      </div>

      {error && (
        <div className="p-3 text-xs text-red-300 bg-red-500/15 rounded-xl border border-red-500/25 font-semibold text-center" id="planner-error">
          {error}
        </div>
      )}

      {currentPlan ? (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6" id="planner-grid">
          <div className="space-y-2 lg:col-span-1" id="days-sidebar">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-wider px-2 mb-3 font-display">Días de la Semana</p>
            {currentPlan.planesPorDia.map((dayPlan, index) => {
              const isSelected = dayPlan.dia.toLowerCase() === activeDay.toLowerCase();
              return (
                <button
                  key={index}
                  onClick={() => setActiveDay(dayPlan.dia)}
                  className={`w-full flex items-center justify-between px-4 py-3 rounded-xl text-sm font-bold transition-all border cursor-pointer ${
                    isSelected
                      ? 'bg-indigo-500 text-white border-indigo-500 shadow-lg scale-[1.02]'
                      : 'bg-slate-800/40 hover:bg-slate-700/60 text-slate-300 border-slate-700/30'
                  }`}
                  id={`day-select-${dayPlan.dia}`}
                >
                  <span className="flex items-center gap-2">
                    <Calendar className={`h-4.5 w-4.5 ${isSelected ? 'text-white' : 'text-slate-500'}`} />
                    {dayPlan.dia}
                  </span>
                  <span className={`text-xs font-mono font-bold ${isSelected ? 'text-indigo-200' : 'text-slate-500'}`}>{dayPlan.kcalEstimada} kcal</span>
                </button>
              );
            })}

            {currentPlan.consejosGenerales && (
              <div className="mt-6 p-5 bg-amber-500/10 border border-amber-500/20 rounded-2xl space-y-2 text-xs text-amber-200/90 shadow-inner" id="general-advices">
                <h4 className="font-bold flex items-center gap-1 text-amber-400">
                  <Award className="h-4 w-4 shrink-0" />
                  Consejos de tu Coach de IA:
                </h4>
                <p className="font-sans leading-relaxed">{currentPlan.consejosGenerales}</p>
              </div>
            )}
          </div>

          <div className="lg:col-span-3 space-y-6" id="day-detail-panel">
            {currentDayPlan ? (
              <div className="glass-panel rounded-3xl border border-slate-700/30 shadow-xl overflow-hidden text-slate-200" id="day-plan-details">
                <div className="p-6 bg-slate-800/40 border-b border-slate-700/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3" id="day-detail-hdr">
                  <div>
                    <h3 className="text-2xl font-extrabold text-white flex items-center gap-2 font-display">
                      Plan para el {currentDayPlan.dia}
                    </h3>
                    <p className="text-sm text-slate-400 font-sans mt-0.5">Sincronizado de manera segura en tu Google Sheet</p>
                  </div>
                  <div className="px-4 py-2 bg-indigo-500/20 border border-indigo-500/30 text-indigo-300 rounded-xl flex items-center gap-1.5 shadow-md w-fit" id="day-detail-kcal">
                    <Flame className="h-4 w-4 text-amber-400 fill-amber-400" />
                    <span className="font-mono font-bold text-sm">{currentDayPlan.kcalEstimada} kcal</span>
                  </div>
                </div>

                <div className="p-6 space-y-6" id="day-detail-body">
                  <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2 font-display">Menú de Alimentación</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4" id="meals-grid-planner">

                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 flex gap-3.5" id="meal-p-desayuno">
                      <div className="h-8.5 w-8.5 rounded-xl bg-orange-500/20 border border-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                        <Coffee className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-white">Desayuno</h5>
                        <p className="text-sm text-slate-300 font-sans mt-1 leading-relaxed">{currentDayPlan.desayuno}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 flex gap-3.5" id="meal-p-almuerzo">
                      <div className="h-8.5 w-8.5 rounded-xl bg-indigo-500/20 border border-indigo-500/20 flex items-center justify-center text-indigo-400 shrink-0">
                        <Crop className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-white">Almuerzo / Comida Principal</h5>
                        <p className="text-sm text-slate-300 font-sans mt-1 leading-relaxed">{currentDayPlan.almuerzo}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 flex gap-3.5" id="meal-p-cena">
                      <div className="h-8.5 w-8.5 rounded-xl bg-purple-500/20 border border-purple-500/20 flex items-center justify-center text-purple-400 shrink-0">
                        <Moon className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-white">Cena</h5>
                        <p className="text-sm text-slate-300 font-sans mt-1 leading-relaxed">{currentDayPlan.cena}</p>
                      </div>
                    </div>

                    <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30 flex gap-3.5" id="meal-p-snacks">
                      <div className="h-8.5 w-8.5 rounded-xl bg-rose-500/20 border border-rose-500/20 flex items-center justify-center text-rose-400 shrink-0">
                        <Apple className="h-4.5 w-4.5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-sm text-white">Snacks / Colaciones</h5>
                        <p className="text-sm text-slate-300 font-sans mt-1 leading-relaxed">{currentDayPlan.snacks}</p>
                      </div>
                    </div>

                  </div>

                  <div className="pt-6 border-t border-slate-700/30" id="workout-p-section">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-3 font-display">Rutina Física Recomendada</h4>
                    <div className="p-5 bg-gradient-to-r from-slate-800/80 to-indigo-950/60 text-slate-200 rounded-2xl border border-slate-700/30 flex gap-4 shadow-md" id="workout-detail-card">
                      <div className="h-10 w-10 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0 text-amber-400 border border-indigo-500/30">
                        <Dumbbell className="h-5 w-5" />
                      </div>
                      <div>
                        <h5 className="font-bold text-base text-white">Plan de Entrenamiento</h5>
                        <p className="text-sm text-slate-300 font-sans mt-1 leading-relaxed">{currentDayPlan.entrenamiento}</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="glass-panel p-12 rounded-3xl border border-slate-700/30 text-center text-slate-200" id="day-plan-empty">
                <Calendar className="h-12 w-12 text-slate-600 mx-auto mb-2" />
                <p className="text-sm text-slate-500 font-sans">No se encontró información para el día seleccionado.</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="glass-panel border border-slate-700/30 rounded-3xl p-8 sm:p-12 text-center text-slate-200" id="planner-onboarding">
          <Calendar className="h-12 w-12 text-indigo-400 mx-auto mb-4" />
          <h4 className="text-lg font-bold text-white mb-2 font-display">Aún no se ha generado ningún plan semanal</h4>
          <p className="text-sm text-slate-400 font-sans max-w-md mx-auto mb-6">
            Presiona el botón de arriba de "Generar Nuevo Plan con IA" para que nuestro Agente prepare una estructura de alimentación y entrenamientos optimizados para tu perfil.
          </p>
          <div className="flex flex-wrap justify-center gap-4 text-xs text-slate-400 max-w-md mx-auto" id="planner-onb-feat">
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/40 rounded-full border border-slate-700/30"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Nutrición Personalizada</span>
            <span className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800/40 rounded-full border border-slate-700/30"><CheckCircle2 className="h-4 w-4 text-indigo-400 shrink-0" /> Rutinas de Ejercicio</span>
          </div>
        </div>
      )}
    </div>
  );
}
