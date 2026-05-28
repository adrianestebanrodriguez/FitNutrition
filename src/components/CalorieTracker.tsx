import React, { useState } from 'react';
import { CalorieLog, UserProfile } from '../types';
import { appendCalorieLog } from '../lib/sheets';
import { Sparkles, Utensils, Flame, Plus, RefreshCw, BarChart3 } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface CalorieTrackerProps {
  logs: CalorieLog[];
  profile: UserProfile | null;
  token: string;
  onLogAdded: (log: CalorieLog) => void;
}

export default function CalorieTracker({ logs, profile, token, onLogAdded }: CalorieTrackerProps) {
  // Natural language query input
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Form states to refine proposed calorie logging details
  const [comida, setComida] = useState('Desayuno');
  const [alimentos, setAlimentos] = useState('');
  const [calorias, setCalorias] = useState(0);
  const [proteinas, setProteinas] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  // Today's date string
  const todayStr = new Date().toLocaleDateString('es-ES');

  // Filter logs for today to calculate total consumed
  const todayLogs = logs.filter(log => log.fecha === todayStr);
  const todayKcal = todayLogs.reduce((acc, curr) => acc + curr.calorias, 0);
  const todayProteins = todayLogs.reduce((acc, curr) => acc + curr.proteinas, 0);

  // Targets
  const targetKcal = profile?.kcalObjetivo || 2000;
  const targetProteins = profile?.proteinasObjetivo || 100;

  // Percentage calculations
  const kcalPercent = Math.min(100, Math.round((todayKcal / targetKcal) * 100));
  const proPercent = Math.min(100, Math.round((todayProteins / targetProteins) * 100));

  // Request server-side AI parsing of food description
  const handleAnalyzeFood = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/agent/analyze-food', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        throw new Error('No se pudo analizar la descripción con el servidor AI.');
      }

      const data = await response.json();
      setAlimentos(data.alimentos || '');
      setCalorias(Number(data.calorias) || 0);
      setProteinas(Number(data.proteinas) || 0);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err?.message || 'Error al analizar comida con IA.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!alimentos) return;
    setIsSaving(true);

    const newLog: CalorieLog = {
      fecha: todayStr,
      comida,
      alimentos,
      calorias,
      proteinas,
      registradoPorIA: inputText.trim() !== ''
    };

    try {
      await appendCalorieLog(newLog, token);
      onLogAdded(newLog);
      
      // Reset input panels
      setInputText('');
      setAlimentos('');
      setCalorias(0);
      setProteinas(0);
    } catch (err) {
      console.error('Error saving food log:', err);
      alert('Error al guardar el registro de calorías en Google Sheets.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group calorie logs by date for chart data
  const getChartData = () => {
    const datesMap: { [key: string]: number } = {};
    
    // Last 7 days helper
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toLocaleDateString('es-ES');
      datesMap[str] = 0;
    }

    // Populate log energies
    logs.forEach(log => {
      if (datesMap[log.fecha] !== undefined) {
        datesMap[log.fecha] += log.calorias;
      }
    });

    return Object.keys(datesMap).map(date => {
      const parts = date.split('/');
      // Return short label, e.g., "DD/MM"
      const shortLabel = parts.length > 1 ? `${parts[0]}/${parts[1]}` : date;
      return {
        name: shortLabel,
        Kcal: datesMap[date],
        Objetivo: targetKcal
      };
    });
  };

  const chartData = getChartData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="calorie-tracker-container">
      {/* Target Progress & Chart column */}
      <div className="lg:col-span-2 space-y-6" id="kcal-metrics-panel">
        <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white" id="today-stats-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
            <Flame className="h-5 w-5 text-amber-300 fill-amber-300" />
            Control de Calorías para Hoy
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6" id="stats-grid">
            {/* Energy progress bar */}
            <div className="space-y-2" id="energy-bar-wrap">
              <div className="flex justify-between text-sm" id="cal-labels">
                <span className="font-semibold text-white/90">Kcal Consumidas</span>
                <span className="font-bold text-white">{todayKcal} / {targetKcal} kcal</span>
              </div>
              <div className="w-full bg-white/10 border border-white/10 h-4.5 rounded-full overflow-hidden shadow-inner" id="kcal-progress-outer">
                <div 
                  className="bg-gradient-to-r from-amber-400 to-orange-500 h-full rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${kcalPercent}%` }}
                  id="kcal-progress-inner"
                ></div>
              </div>
              <p className="text-xs text-white/70 text-right font-sans">{kcalPercent}% consumido - {Math.max(0, targetKcal - todayKcal)} kcal restantes</p>
            </div>

            {/* Protein progress bar */}
            <div className="space-y-2" id="protein-bar-wrap">
              <div className="flex justify-between text-sm" id="pro-labels">
                <span className="font-semibold text-white/90">Proteína</span>
                <span className="font-bold text-white">{todayProteins} / {targetProteins} g</span>
              </div>
              <div className="w-full bg-white/10 border border-white/10 h-4.5 rounded-full overflow-hidden shadow-inner" id="pro-progress-outer">
                <div 
                  className="bg-gradient-to-r from-cyan-400 to-teal-500 h-full rounded-full transition-all duration-500 shadow-lg"
                  style={{ width: `${proPercent}%` }}
                  id="pro-progress-inner"
                ></div>
              </div>
              <p className="text-xs text-white/70 text-right font-sans">{proPercent}% alcanzado - {Math.max(0, targetProteins - todayProteins)} g restantes</p>
            </div>
          </div>
        </div>

        {/* History bar chart */}
        <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white" id="history-chart-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
            <BarChart3 className="h-5 w-5 text-emerald-300" />
            Consumo de Energía (Últimos 7 días)
          </h3>
          <div className="h-64 mt-2" id="kcal-history-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} style={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} style={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#1e293b' }} />
                <Bar dataKey="Kcal" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Inputs & Logging Column */}
      <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white h-fit" id="kcal-input-panel">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
          <Utensils className="h-5 w-5 text-emerald-300" />
          Registrar Alimento
        </h3>

        {/* Option 1: AI Prompt analysis */}
        <div className="space-y-3" id="ai-food-helper">
          <label className="block text-xs font-semibold text-emerald-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Describir en Lenguaje Natural
          </label>
          <div className="relative" id="ai-food-input-group">
            <textarea
              rows={3}
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Ej.: Un plato de pasta con salsa boloñesa y una copa de vino tinto para cenar..."
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              id="ai-food-textarea"
            />
          </div>
          <button
            type="button"
            onClick={handleAnalyzeFood}
            disabled={isAnalyzing || !inputText.trim()}
            className="w-full px-4 py-2.5 border border-white/10 bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-75 cursor-pointer shadow-sm"
            id="ai-food-analyze-btn"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-emerald-300" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            )}
            {isAnalyzing ? 'Analizando con IA...' : 'Analizar con IA'}
          </button>
          {analysisError && (
            <p className="text-xs text-red-200 bg-red-900/30 p-2.5 rounded-xl border border-red-500/30 text-center font-sans" id="analysis-err">
              {analysisError}
            </p>
          )}
        </div>

        {/* Refining fields */}
        <form onSubmit={handleSaveLog} className="mt-5 pt-5 border-t border-white/10 space-y-4" id="refine-log-form">
          <div id="field-tipo-comida">
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Tipo de Comida</label>
            <select
              value={comida}
              onChange={(e) => setComida(e.target.value)}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-teal-900/40 text-white focus:outline-none focus:ring-2 focus:ring-emerald-400 cursor-pointer"
              required
            >
              <option className="bg-teal-900 text-white" value="Desayuno">Desayuno</option>
              <option className="bg-teal-900 text-white" value="Almuerzo">Almuerzo</option>
              <option className="bg-teal-900 text-white" value="Cena">Cena</option>
              <option className="bg-teal-900 text-white" value="Snack">Snack / Colación</option>
            </select>
          </div>

          <div id="field-alimentos-detalle">
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Alimentos / Detalles</label>
            <input
              type="text"
              value={alimentos}
              onChange={(e) => setAlimentos(e.target.value)}
              placeholder="Ej.: Tazón de avena con plátano y nueces"
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all font-sans"
              required
            />
          </div>

          <div className="grid grid-cols-2 gap-4" id="cal-pro-inputs">
            <div id="field-calorias">
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Calorías (kcal)</label>
              <input
                type="number"
                value={calorias}
                onChange={(e) => setCalorias(Number(e.target.value))}
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                required
                min="0"
              />
            </div>
            <div id="field-proteinas-g">
              <label className="block text-xs font-semibold text-white/80 mb-1.5">Proteínas (g)</label>
              <input
                type="number"
                value={proteinas}
                onChange={(e) => setProteinas(Number(e.target.value))}
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none"
                required
                min="0"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={isSaving || !alimentos}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            id="food-submit-btn"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Registrando...' : 'Registrar Comida'}</span>
          </button>
        </form>
      </div>

      {/* Row showing today's logged meals */}
      <div className="col-span-1 lg:col-span-3 glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white" id="today-meals-log">
        <h3 className="text-base font-bold text-white mb-4 font-display">Registro del Día de Hoy</h3>
        {todayLogs.length === 0 ? (
          <p className="text-sm text-white/60 font-sans text-center py-6" id="no-meals">Aún no has registrado ningún alimento hoy.</p>
        ) : (
          <div className="overflow-x-auto" id="meals-list">
            <table className="w-full text-left text-sm border-collapse" id="meals-table">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-white/60 uppercase tracking-wider" id="meals-hdr">
                  <th className="py-2.5">Momento</th>
                  <th className="py-2.5">Alimentos</th>
                  <th className="py-2.5">Calorías</th>
                  <th className="py-2.5">Proteínas</th>
                  <th className="py-2.5 text-right">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {todayLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors" id={`meal-row-${index}`}>
                    <td className="py-3 font-semibold text-white/90">{log.comida}</td>
                    <td className="py-3 text-white/80 font-sans">{log.alimentos}</td>
                    <td className="py-3 font-bold text-amber-300 font-mono">{log.calorias} kcal</td>
                    <td className="py-3 font-semibold text-cyan-300 font-mono">{log.proteinas} g</td>
                    <td className="py-3 text-right">
                      {log.registradoPorIA ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/20">
                          <Sparkles className="h-3 w-3 text-amber-300" />
                          IA
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-white/50 bg-white/10 px-2 py-0.5 rounded-full border border-white/5 font-semibold">Manual</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
