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
  const [inputText, setInputText] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  const [ejercicio, setEjercicio] = useState('');
  const [duracion, setDuracion] = useState(30);
  const [intensidad, setIntensidad] = useState<'Baja' | 'Media' | 'Alta'>('Media');
  const [caloriasQuemadas, setCaloriasQuemadas] = useState(150);
  const [isSaving, setIsSaving] = useState(false);

  const todayStr = new Date().toLocaleDateString('es-ES');

  const todayLogs = logs.filter(log => log.fecha === todayStr);
  const totalBurnedToday = todayLogs.reduce((acc, curr) => acc + curr.caloriasQuemadas, 0);
  const totalDurationToday = todayLogs.reduce((acc, curr) => acc + curr.duracion, 0);

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
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="activity-tracker-container">
      <div className="lg:col-span-2 space-y-6" id="burn-metrics-panel">
        <div className="glass-panel p-6 rounded-3xl border border-slate-700/30 shadow-xl text-slate-200" id="burn-summary-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
            <Flame className="h-5 w-5 text-rose-400 fill-rose-400" />
            Control de Gasto Energético Hoy
          </h3>

          <div className="grid grid-cols-2 gap-4" id="burn-grid">
            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30" id="stat-calories">
              <span className="block text-xs font-semibold text-rose-400 uppercase tracking-wider mb-1">Quemado Activo</span>
              <div className="flex items-baseline gap-1" id="burned-val">
                <span className="text-3xl font-extrabold text-white font-display">{totalBurnedToday}</span>
                <span className="text-sm text-slate-400 font-semibold">kcal</span>
              </div>
            </div>

            <div className="p-4 bg-slate-800/40 rounded-2xl border border-slate-700/30" id="stat-duration">
              <span className="block text-xs font-semibold text-cyan-400 uppercase tracking-wider mb-1">Duración Total</span>
              <div className="flex items-baseline gap-1" id="duration-val">
                <span className="text-3xl font-extrabold text-white font-display">{totalDurationToday}</span>
                <span className="text-sm text-slate-400 font-semibold">min</span>
              </div>
            </div>
          </div>
        </div>

        <div className="glass-panel p-6 rounded-3xl border border-slate-700/30 shadow-xl text-slate-200" id="burn-chart-card">
          <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
            <BarChart3 className="h-5 w-5 text-rose-400" />
            Consumo Calórico Quemado (Últimos 7 días)
          </h3>
          <div className="h-64 mt-2" id="burn-history-chart">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(71, 85, 105, 0.3)" />
                <XAxis dataKey="name" tickLine={false} style={{ fontSize: 11, fill: '#94a3b8' }} />
                <YAxis tickLine={false} style={{ fontSize: 11, fill: '#94a3b8' }} />
                <Tooltip cursor={{ fill: 'rgba(244, 63, 94, 0.1)' }} contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.95)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '12px', color: '#e2e8f0' }} />
                <Bar dataKey="KcalQuemadas" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <div className="glass-panel p-6 rounded-3xl border border-slate-700/30 shadow-xl text-slate-200 h-fit" id="burn-input-panel">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-1.5 font-display">
          <Dumbbell className="h-5 w-5 text-rose-400" />
          Registrar Actividad
        </h3>

        <div className="space-y-3" id="ai-fitness-helper">
          <label className="block text-xs font-semibold text-rose-400 uppercase tracking-wider flex items-center gap-1">
            <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            Describir Actividad en Español
          </label>
          <textarea
            rows={3}
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Ej.: Hice una clase de spinning de 45 minutos a alta intensidad..."
            className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all"
            id="ai-fitness-textarea"
          />
          <button
            type="button"
            onClick={handleAnalyzeActivity}
            disabled={isAnalyzing || !inputText.trim()}
            className="w-full px-4 py-2.5 border border-slate-600/50 bg-slate-800/40 hover:bg-slate-700/60 active:scale-[0.98] text-slate-200 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1.5 disabled:opacity-75 cursor-pointer shadow-sm"
            id="ai-fitness-analyze-btn"
          >
            {isAnalyzing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin text-rose-400" />
            ) : (
              <Sparkles className="h-3.5 w-3.5 text-amber-400" />
            )}
            {isAnalyzing ? 'Analizando con IA...' : 'Analizar con IA'}
          </button>
          {analysisError && (
            <p className="text-xs text-red-300 bg-red-500/15 p-2.5 rounded-xl border border-red-500/25 text-center font-sans" id="analysis-fit-err">
              {analysisError}
            </p>
          )}
        </div>

        <form onSubmit={handleSaveLog} className="mt-5 pt-5 border-t border-slate-700/30 space-y-4" id="refine-fit-form">
          <div id="field-ejercicio">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Ejercicio / Deporte</label>
            <input
              type="text"
              value={ejercicio}
              onChange={(e) => setEjercicio(e.target.value)}
              placeholder="Ej.: Atletismo / Spinning"
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-rose-500 focus:outline-none transition-all"
              required
            />
          </div>

          <div id="field-duracion">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Clock className="h-3.5 w-3.5 text-purple-400" />
              Duración (minutos)
            </label>
            <input
              type="number"
              value={duracion}
              onChange={(e) => setDuracion(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
              min="1"
            />
          </div>

          <div id="field-intensidad">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Intensidad</label>
            <select
              value={intensidad}
              onChange={(e) => setIntensidad(e.target.value as any)}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/60 text-white focus:ring-2 focus:ring-rose-500 focus:outline-none cursor-pointer"
              required
            >
              <option className="bg-slate-800 text-white" value="Baja">Baja</option>
              <option className="bg-slate-800 text-white" value="Media">Media</option>
              <option className="bg-slate-800 text-white" value="Alta">Alta</option>
            </select>
          </div>

          <div id="field-calorias-quemadas">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400" />
              Calorías Quemadas (kcal)
            </label>
            <input
              type="number"
              value={caloriasQuemadas}
              onChange={(e) => setCaloriasQuemadas(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white focus:ring-2 focus:ring-rose-500 focus:outline-none"
              required
              min="0"
            />
          </div>

          <button
            type="submit"
            disabled={isSaving || !ejercicio}
            className="w-full mt-2 flex items-center justify-center gap-1.5 px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-extrabold text-sm rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-50 cursor-pointer"
            id="fitness-submit-btn"
          >
            {isSaving ? (
              <RefreshCw className="h-4 w-4 animate-spin text-white" />
            ) : (
              <Plus className="h-4 w-4" />
            )}
            <span>{isSaving ? 'Registrando...' : 'Registrar Ejercicio'}</span>
          </button>
        </form>
      </div>

      <div className="col-span-1 lg:col-span-3 glass-panel p-6 rounded-3xl border border-slate-700/30 shadow-xl text-slate-200" id="today-workouts-log">
        <h3 className="text-base font-bold text-white mb-4 font-display">Registro de Ejercicios del Día</h3>
        {todayLogs.length === 0 ? (
          <p className="text-sm text-slate-500 font-sans text-center py-6" id="no-workouts">Aún no has registrado ningún ejercicio hoy.</p>
        ) : (
          <div className="overflow-x-auto" id="workouts-list">
            <table className="w-full text-left text-sm border-collapse" id="workouts-table">
              <thead>
                <tr className="border-b border-slate-700/30 text-xs font-semibold text-slate-500 uppercase tracking-wider" id="workouts-hdr">
                  <th className="py-2.5 pr-4">Ejercicio</th>
                  <th className="py-2.5 pr-4">Duración</th>
                  <th className="py-2.5 pr-4">Intensidad</th>
                  <th className="py-2.5 pr-4">Calorías Quemadas</th>
                  <th className="py-2.5 text-right">Método</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {todayLogs.map((log, index) => (
                  <tr key={index} className="hover:bg-slate-800/30 transition-colors" id={`workout-row-${index}`}>
                    <td className="py-3 pr-4 font-semibold text-white/90">{log.ejercicio}</td>
                    <td className="py-3 pr-4 text-slate-300 font-sans">{log.duracion} min</td>
                    <td className="py-3 pr-4 font-semibold text-slate-300">{log.intensidad}</td>
                    <td className="py-3 pr-4 font-bold text-rose-400 font-mono">{log.caloriasQuemadas} kcal</td>
                    <td className="py-3 text-right">
                      {log.registradoPorIA ? (
                        <span className="inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/25">
                          <Sparkles className="h-3 w-3 text-amber-400" />
                          IA
                        </span>
                      ) : (
                        <span className="inline-flex items-center text-xs text-slate-400 bg-slate-800/40 px-2 py-0.5 rounded-full border border-slate-700/30 font-semibold">Manual</span>
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
