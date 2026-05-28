import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { saveProfile } from '../lib/sheets';
import { User, Activity, Flame, Save, RefreshCw } from 'lucide-react';

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  token: string;
  onProfileUpdated: (profile: UserProfile) => void;
}

export default function ProfileForm({ initialProfile, token, onProfileUpdated }: ProfileFormProps) {
  const [edad, setEdad] = useState<number>(30);
  const [altura, setAltura] = useState<number>(170);
  const [pesoActual, setPesoActual] = useState<number>(70);
  const [pesoObjetivo, setPesoObjetivo] = useState<number>(65);
  const [objetivo, setObjetivo] = useState<string>('Perder peso');
  const [kcalObjetivo, setKcalObjetivo] = useState<number>(2000);
  const [proteinasObjetivo, setProteinasObjetivo] = useState<number>(120);
  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    if (initialProfile) {
      setEdad(initialProfile.edad);
      setAltura(initialProfile.altura);
      setPesoActual(initialProfile.pesoActual);
      setPesoObjetivo(initialProfile.pesoObjetivo);
      setObjetivo(initialProfile.objetivo);
      setKcalObjetivo(initialProfile.kcalObjetivo);
      setProteinasObjetivo(initialProfile.proteinasObjetivo);
    }
  }, [initialProfile]);

  const autoEstimateTargets = () => {
    const baseBMR = 10 * pesoActual + 6.25 * altura - 5 * edad + 5;
    let dailyKcal = Math.round(baseBMR * 1.375);
    let dailyPro = Math.round(pesoActual * 1.6);

    if (objetivo === 'Perder peso') {
      dailyKcal -= 450;
      dailyPro = Math.round(pesoActual * 1.8);
    } else if (objetivo === 'Ganar masa muscular') {
      dailyKcal += 350;
      dailyPro = Math.round(pesoActual * 2.0);
    }

    setKcalObjetivo(Math.max(1200, dailyKcal));
    setProteinasObjetivo(Math.max(50, dailyPro));
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setSaveStatus(null);

    const updatedProfile: UserProfile = {
      fecha: new Date().toLocaleDateString('es-ES'),
      edad,
      altura,
      pesoActual,
      pesoObjetivo,
      objetivo,
      kcalObjetivo,
      proteinasObjetivo
    };

    try {
      await saveProfile(updatedProfile, token);
      onProfileUpdated(updatedProfile);
      setSaveStatus({ type: 'success', message: '¡Perfil sincronizado con Google Sheets exitosamente!' });
    } catch (err: any) {
      console.error(err);
      setSaveStatus({ type: 'error', message: err?.message || 'Error al guardar el perfil en Google Sheets.' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-700/30 shadow-2xl" id="profile-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" id="profile-header">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-indigo-500/20 backdrop-blur-md rounded-xl flex items-center justify-center text-indigo-300 border border-indigo-500/30 shadow-md">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Parámetros Físicos</h3>
            <p className="text-xs text-slate-400">Define tus objetivos para personalizar tus planes</p>
          </div>
        </div>
        <button
          type="button"
          onClick={autoEstimateTargets}
          className="text-xs px-3.5 py-2 border border-slate-600/50 bg-slate-800/40 text-slate-300 rounded-xl font-bold hover:bg-slate-700/60 active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-sm"
          id="profile-estimate-btn"
        >
          <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
          Auto-Calcular Metas
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5" id="profile-form">
        <div className="grid grid-cols-2 gap-4" id="profile-grid-1">
          <div id="field-edad">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Edad (años)</label>
            <input
              type="number"
              value={edad}
              onChange={(e) => setEdad(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              required
              min="10"
              max="120"
            />
          </div>
          <div id="field-altura">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Altura (cm)</label>
            <input
              type="number"
              value={altura}
              onChange={(e) => setAltura(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              required
              min="100"
              max="250"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4" id="profile-grid-2">
          <div id="field-pesoActual">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Peso Actual (kg)</label>
            <input
              type="number"
              step="0.1"
              value={pesoActual}
              onChange={(e) => setPesoActual(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              required
              min="30"
              max="300"
            />
          </div>
          <div id="field-pesoObjetivo">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5">Peso Objetivo (kg)</label>
            <input
              type="number"
              step="0.1"
              value={pesoObjetivo}
              onChange={(e) => setPesoObjetivo(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              required
              min="30"
              max="300"
            />
          </div>
        </div>

        <div id="field-objetivo">
          <label className="block text-xs font-semibold text-slate-300 mb-1.5">Objetivo General</label>
          <select
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/60 text-white focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all cursor-pointer"
            required
          >
            <option className="bg-slate-800 text-white" value="Perder peso">Perder peso (Déficit Calórico)</option>
            <option className="bg-slate-800 text-white" value="Mantener peso">Mantener peso (Normocalórica)</option>
            <option className="bg-slate-800 text-white" value="Ganar masa muscular">Ganar masa muscular (Superávit Calórico)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-slate-700/30" id="profile-grid-3">
          <div id="field-kcal">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-400 fill-amber-400" />
              Meta Energía (kcal/día)
            </label>
            <input
              type="number"
              value={kcalObjetivo}
              onChange={(e) => setKcalObjetivo(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              required
              min="800"
              max="6000"
            />
          </div>
          <div id="field-proteinas">
            <label className="block text-xs font-semibold text-slate-300 mb-1.5 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-cyan-400" />
              Meta Proteína (g/día)
            </label>
            <input
              type="number"
              value={proteinasObjetivo}
              onChange={(e) => setProteinasObjetivo(Number(e.target.value))}
              className="w-full px-3 py-2 border border-slate-600/50 rounded-xl text-sm bg-slate-800/40 text-white placeholder-slate-500 focus:ring-2 focus:ring-indigo-500 focus:outline-none transition-all"
              required
              min="30"
              max="400"
            />
          </div>
        </div>

        {saveStatus && (
          <div
            className={`p-3 rounded-xl text-xs leading-5 border font-semibold text-center ${
              saveStatus.type === 'success'
                ? 'bg-indigo-500/15 text-indigo-300 border-indigo-500/25'
                : 'bg-red-500/15 text-red-300 border-red-500/25'
            }`}
            id="profile-status"
          >
            {saveStatus.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-indigo-500 hover:bg-indigo-400 text-white font-bold text-sm rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-75 cursor-pointer"
          id="profile-save-btn"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin text-white" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{isSaving ? 'Sincronizando...' : 'Guardar y Sincronizar'}</span>
        </button>
      </form>
    </div>
  );
}
