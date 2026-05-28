import React, { useState } from 'react';
import { ActivityLog, UserProfile } from '../types';
import { appendActivityLog } from '../lib/sheets';
import { Sparkles, Dumbbell, Flame, Plus, RefreshCw, BarChart3, Clock } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';

interface ActivityTrackerProps {
  logs: ActivityLog[];
  profile: UserProfile | null;
  token: string;
  onLogAdded: (log: ActivityLog) => void;
}

export default function ActivityTracker({ logs, profile, token, onLogAdded }: ActivityTrackerProps) {
  // Input queries for natural language parsing
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  // Form states to refine proposed activity details
  const [ejercicio, setEjercicio] = useState('');
  const [duracion, setDuracion] = useState(30);
  const [intensidad, setIntensidad] = useState<'Baja' | 'Media' | 'Alta'>('Media');
  const [caloriasQuemadas, setCaloriasQuemadas] = useState(150);
  const [isSaving, setIsSaving] = useState(false);

  // Today's date string
  const todayStr = new Date().toLocaleDateString('es-ES');

  // Filter logs for today
  const todayLogs = logs.filter(log => log.fecha === todayStr);
  const totalBurnedToday = todayLogs.reduce((acc, curr) => acc + curr.caloriasQuemadas, 0);
  const totalDurationToday = todayLogs.reduce((acc, curr) => acc + curr.duracion, 0);

  // Analyze activity description
  const handleAnalyzeActivity = async () => {
    if (!inputText.trim()) return;
    setIsAnalyzing(true);
    setAnalysisError(null);

    try {
      const response = await fetch('/api/agent/analyze-activity', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: inputText })
      });

      if (!response.ok) {
        throw new Error('No se pudo analizar la actividad con el servidor AI.');
      }

      const data = await response.json();
      setEjercicio(data.ejercicio || '');
      setDuracion(Number(data.duracion) || 30);
      setIntensidad(data.intensidad === 'Baja' || data.intensidad === 'Alta' ? data.intensidad : 'Media');
      setCaloriasQuemadas(Number(data.caloriasQuemadas) || 150);
    } catch (err: any) {
      console.error(err);
      setAnalysisError(err?.message || 'Error al analizar actividad con el asistente AI.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleSaveLog = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ejercicio) return;
    setIsSaving(true);

    const newLog: ActivityLog = {
      fecha: todayStr,
      ejercicio,
      duracion,
      intensidad,
      caloriasQuemadas,
      registradoPorIA: inputText.trim() !== ''
    };

    try {
      await appendActivityLog(newLog, token);
      onLogAdded(newLog);
      
      // Reset input panels
      setInputText('');
      setEjercicio('');
      setDuracion(30);
      setIntensidad('Media');
      setCaloriasQuemadas(150);
    } catch (err) {
      console.error('Error saving activity log:', err);
      alert('Error al guardar el registro de ejercicio en Google Sheets.');
    } finally {
      setIsSaving(false);
    }
  };

  // Group calorie burned by date for chart data
  const getChartData = () => {
    const datesMap: { [key: string]: number } = {};
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const str = d.toLocaleDateString('es-ES');
      datesMap[str] = 0;
    }

    logs.forEach(log => {
      if (datesMap[log.fecha] !== undefined) {
        datesMap[log.fecha] += log.caloriasQuemadas;
      }
    });

    return Object.keys(datesMap).map(date => {
      const parts = date.split('/');
      const shortLabel = parts.length > 1 ? `${parts[0]}/${parts[1]}` : date;
      return {
        name: shortLabel,
        KcalQuemadas: datesMap[date]
      };
    });
  };

  const chartData = getChartData();

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 animate-fade-in" id="activity-tracker-container">
      {/* Metrics Card and Chart column */}
      <div className="lg:col-span-2 space-y-6" id="burn-metrics-panel">
        <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white" id="burn-summary-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
            <Flame className="h-5 w-5 text-rose-300 fill-rose-300" />
            Control de Gasto Energético Hoy
          </h3>

          <div className="grid grid-cols-2 gap-4" id="burn-grid">
            <div className="p-4 bg-white/10 rounded-2xl border border-white/10" id="stat-calories">
              <span className="block text-xs font-semibold text-rose-300 uppercase tracking-wider mb-1">Quemado Activo</span>
              <div className="flex items-baseline gap-1" id="burned-val">
                <span className="text-3xl font-extrabold text-white font-display">{totalBurnedToday}</span>
                <span className="text-sm text-white/70 font-semibold">kcal</span>
              </div>
            </div>

            <div className="p-4 bg-white/10 rounded-2xl border border-white/10" id="stat-duration">
              <span className="block text-xs font-semibold text-cyan-300 uppercase tracking-wider mb-1">Duración Total</span>
              <div className="flex items-baseline gap-1" id="duration-val">
                <span className="text-3xl font-extrabold text-white font-display">{totalDurationToday}</span>
                <span className="text-sm text-white/70 font-semibold">min</span>
              </div>
            </div>
          </div>
        </div>

        {/* Burn chart */}
        <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white" id="burn-chart-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
            <BarChart3 className="h-5 w-5 text-rose-300" />
            Consumo Calórico Quemado (Últimos 7 días)
          </h3>
          <div className="h-64 mt-2" id="burn-history-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" tickLine={false} style={{ fontSize: 11, fill: '#64748b' }} />
                <YAxis tickLine={false} style={{ fontSize: 11, fill: '#64748b' }} />
                <Tooltip cursor={{ fill: 'rgba(0, 0, 0, 0.04)' }} contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #cbd5e1', borderRadius: '12px', color: '#1e293b' }} />
                <Bar dataKey="KcalQuemadas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Input panel side */}
      <div className="glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white h-fit" id="burn-input-panel">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
          <Dumbbell className="h-5 w-5 text-rose-300" />
          Registrar Actividad
        </h3>

        {/* Natural description parsing with AI */}
        <div className="space-y-3" id="ai-fitness-helper">
          <label className="block text-xs font-semibold text-rose-300 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            Describir Actividad en Español
          </label>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ej.: Hice una clase de spinning de 45 minutos a alta intensidad..."
            className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-rose-400 focus:outline-none transition-all placeholder-white/30"
            id="ai-fitness-textarea"
          />
          <button
            type="button"
            onClick={handleAnalyzeActivity}
            disabled={isAnalyzing || !inputText.trim()}
            className="w-full px-4 py-2.5 border border-white/10 bg-white/15 hover:bg-white/25 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-75 cursor-pointer shadow-sm"
            id="ai-fitness-analyze-btn"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-350" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-300" />
            )}
            {isAnalyzing ? 'Analizando con IA...' : 'Analizar con IA'}
          </button>
          {analysisError && (
            <p className="text-xs text-red-200 bg-red-900/30 p-2.5 rounded-xl border border-red-500/30 text-center font-sans" id="analysis-fit-err">
              {analysisError}
            </p>
          )}
        </div>

        {/* Refining fields */}
        <form onSubmit={handleSaveLog} className="mt-5 pt-5 border-t border-white/10 space-y-4" id="refine-fit-form">
          <div id="field-ejercicio">
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Ejercicio / Deporte</label>
            <input
              type="text"
              value={ejercicio}
              onChange={(e) => setEjercicio(e.target.value)}
              placeholder="Ej.: Atletismo / Spinning"
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-rose-400 focus:outline-none transition-all"
              required
            />
          </div>

          <div id="field-duracion">
            <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-purple-300" />
              Duración (minutos)
            </label>
            <input
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white focus:ring-2 focus:ring-rose-400 focus:outline-none"
              required
              min="1"
            />
          </div>

          <div id="field-intensidad">
            <label className="block text-xs font-semibold text-white/80 mb-1.5">Intensidad</label>
            <select
              value={intensidad}
              onChange={(e) => setIntensidad(e.target.value as any)}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-teal-900/40 text-white focus:ring-2 focus:ring-rose-400 focus:outline-none cursor-pointer"
              required
            >
              <option className="bg-teal-900 text-white" value="Baja">Baja</option>
              <option className="bg-teal-900 text-white" value="Media">Media</option>
              <option className="bg-teal-900 text-white" value="Alta">Alta</option>
            </select>
          </div>

          <div id="field-calorias-quemadas">
            <label className="block text-xs font-semibold text-white/80 mb-1.5 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-300" />
              Calorías Quemadas (kcal)
            </label>
            <input
              type="number"
              value={caloriasQuemadas}
              onChange={(e) => setCaloriasQuemadas(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white focus:ring-2 focus:ring-rose-400 focus:outline-none"
              required
              min="0"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !ejercicio}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-3 bg-white hover:bg-emerald-50 text-emerald-950 font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            id="fitness-submit-btn"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Registrando...' : 'Registrar Ejercicio'}</span>
          </button>
        </form>
      </div>

      {/* Row listing workouts */}
      <div className="col-span-1 lg:col-span-3 glass-panel p-6 rounded-3xl border border-white/20 shadow-xl text-white" id="today-workouts-log">
        <h3 className="text-base font-bold text-white mb-4 font-display">Registro de Ejercicios del Día</h3>
        {todayLogs.length === 0 ? (
          <p className="text-sm text-white/60 font-sans text-center py-6" id="no-workouts">Aún no has registrado ningún ejercicio hoy.</p>
        ) : (
          <div className="overflow-x-auto" id="workouts-list">
            <table className="w-full text-left text-sm border-collapse" id="workouts-table">
              <thead>
                <tr className="border-b border-white/10 text-xs font-semibold text-white/60 uppercase tracking-wider" id="workouts-hdr">
                  <th className="py-2.5">Ejercicio</th>
                  <th className="py-2.5">Duración</th>
                  <th className="py-2.5">Intensidad</th>
                  <th className="py-2.5">Calorías Quemadas</th>
                  <th className="py-2.5 text-right">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {todayLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-white/5 transition-colors" id={`workout-row-${index}`}>
                    <td className="py-3 font-semibold text-white/90">{log.ejercicio}</td>
                    <td className="py-3 text-white/80 font-sans">{log.duracion} min</td>
                    <td className="py-3 font-semibold text-white/80">{log.intensidad}</td>
                    <td className="py-3 font-bold text-rose-300 font-mono">{log.caloriasQuemadas} kcal</td>
                    <td className="py-3 text-right">
                      {log.registradoPorIA ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/20">
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
