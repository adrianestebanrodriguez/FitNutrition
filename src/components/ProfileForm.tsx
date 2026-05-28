import React, { useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { saveProfile } from '../lib/sheets';
import { User, Activity, Flame, Save, RefreshCw, Heart, AlertTriangle, CheckCircle2, TrendingUp, TrendingDown, Info } from 'lucide-react';

interface ProfileFormProps {
  initialProfile: UserProfile | null;
  token: string;
  onProfileUpdated: (profile: UserProfile) => void;
  profileHistory: UserProfile[];
}

export default function ProfileForm({ initialProfile, token, onProfileUpdated, profileHistory }: ProfileFormProps) {
  const [edad, setEdad] = useState<number>(30);
  const [altura, setAltura] = useState<number>(170);
  const [pesoActual, setPesoActual] = useState<number>(70);
  const [pesoObjetivo, setPesoObjetivo] = useState<number>(65);
  const [objetivo, setObjetivo] = useState<string>('Perder peso');
  const [kcalObjetivo, setKcalObjetivo] = useState<number>(2000);
  const [proteinasObjetivo, setProteinasObjetivo] = useState<number>(120);
  const [glucosaSangre, setGlucosaSangre] = useState<number | ''>('');
  const [trigliceridos, setTrigliceridos] = useState<number | ''>('');
  const [colesterolHDL, setColesterolHDL] = useState<number | ''>('');
  const [colesterolLDL, setColesterolLDL] = useState<number | ''>('');
  const [horasSueno, setHorasSueno] = useState<number | ''>('');
  const [tshTiroides, setTshTiroides] = useState<number | ''>('');
  const [pcrUs, setPcrUs] = useState<number | ''>('');

  // Medical conditions and physical restrictions
  const [enfermedades, setEnfermedades] = useState<string>('');
  const [lesiones, setLesiones] = useState<string>('');
  const [problemasMusculares, setProblemasMusculares] = useState<string>('');

  const [isSaving, setIsSaving] = useState(false);
  const [saveStatus, setSaveStatus] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Initialize form when initialProfile changes
  useEffect(() => {
    if (initialProfile) {
      setEdad(initialProfile.edad);
      setAltura(initialProfile.altura);
      setPesoActual(initialProfile.pesoActual);
      setPesoObjetivo(initialProfile.pesoObjetivo);
      setObjetivo(initialProfile.objetivo);
      setKcalObjetivo(initialProfile.kcalObjetivo);
      setProteinasObjetivo(initialProfile.proteinasObjetivo);
      setGlucosaSangre(initialProfile.glucosaSangre !== undefined ? initialProfile.glucosaSangre : '');
      setTrigliceridos(initialProfile.trigliceridos !== undefined ? initialProfile.trigliceridos : '');
      setColesterolHDL(initialProfile.colesterolHDL !== undefined ? initialProfile.colesterolHDL : '');
      setColesterolLDL(initialProfile.colesterolLDL !== undefined ? initialProfile.colesterolLDL : '');
      setHorasSueno(initialProfile.horasSueno !== undefined ? initialProfile.horasSueno : '');
      setTshTiroides(initialProfile.tshTiroides !== undefined ? initialProfile.tshTiroides : '');
      setPcrUs(initialProfile.pcrUs !== undefined ? initialProfile.pcrUs : '');
      setEnfermedades(initialProfile.enfermedades || '');
      setLesiones(initialProfile.lesiones || '');
      setProblemasMusculares(initialProfile.problemasMusculares || '');
    }
  }, [initialProfile]);

  // CLINICAL RISK EVALUATION MATHEMATICS & PROGRESSION ENGINE
  // 1. BMI Calculation
  const imc = pesoActual && altura ? Number((pesoActual / Math.pow(altura / 100, 2)).toFixed(1)) : 22;

  // 2. Risk Calculations based on live inputs
  const tgHdlRatio = (glucosaSangre !== '' && colesterolHDL !== '' && trigliceridos !== '')
    ? Number((Number(trigliceridos) / Number(colesterolHDL)).toFixed(2))
    : 1.5;

  // Diabetes risk levels
  let diabetesLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Muy Alto' = 'Bajo';
  let diabetesExplanation = "";
  if (glucosaSangre !== '') {
    const gluc = Number(glucosaSangre);
    if (gluc >= 126) {
      diabetesLevel = 'Alto';
      diabetesExplanation = "Nivel de glucosa en ayunas en rango de alerta metabólica diagnóstica (≥126 mg/dL). Es prioritario consultar a un profesional médico.";
    } else if (gluc >= 100) {
      diabetesLevel = 'Moderado';
      diabetesExplanation = "Glucosa en rango de prediabetes (100-125 mg/dL). Controlar carbohidratos de carga glucémica rápida y elevar entrenamientos musculares.";
    } else {
      diabetesLevel = 'Bajo';
      diabetesExplanation = "Glucosa óptima en ayunas (<100 mg/dL). Sensibilidad a la insulina preservada.";
    }
    
    if (tgHdlRatio > 3.0) {
      if (diabetesLevel === 'Bajo') {
        diabetesLevel = 'Moderado';
        diabetesExplanation += " No obstante, tu relación Triglicéridos/HDL es alta (>3.0), insinuando resistencia inicial a la insulina.";
      } else {
        diabetesLevel = 'Alto';
        diabetesExplanation += " Tu alta relación Triglicéridos/HDL (>3.0) refuerza fuertemente la sospecha de resistencia insulínica metabólica.";
      }
    }
  } else {
    diabetesExplanation = "Ingresa tu nivel de glucosa en sangre de ayuno para evaluar científicamente tu riesgo a diabetes.";
  }

  if (enfermedades.toLowerCase().includes('diabetes') || enfermedades.toLowerCase().includes('resistencia a la insulina') || enfermedades.toLowerCase().includes('insulinorresistencia')) {
    diabetesLevel = 'Muy Alto';
    diabetesExplanation = "Condición médica de diabetes o resistencia a la insulina pre-existente reportada. Regulación estricta de índice glucémico y sobrecarga progresiva muscular diaria sugerida.";
  }

  // Cardiovascular risk levels
  let cardioLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Muy Alto' = 'Bajo';
  let cardioExplanation = "";
  const ldlNum = colesterolLDL !== '' ? Number(colesterolLDL) : 0;
  const hdlNum = colesterolHDL !== '' ? Number(colesterolHDL) : 60;
  const tgNum = trigliceridos !== '' ? Number(trigliceridos) : 0;

  if (ldlNum > 0 || tgNum > 0 || hdlNum < 60) {
    if (ldlNum >= 160 || tgNum >= 200) {
      cardioLevel = 'Alto';
      cardioExplanation = "Niveles elevados de Colesterol LDL (malo) o Triglicéridos circulantes incrementan el riesgo aterogenético acumulativo.";
    } else if (ldlNum >= 130 || tgNum >= 150 || hdlNum < 40) {
      cardioLevel = 'Moderado';
      cardioExplanation = "Desbalances lipídicos leves a moderados detectados. El ejercicio cardiovascular de resistencia continuo e ingesta de ácidos grasos monoinsaturados (palta, nueces) favorecerá.";
    } else {
      cardioLevel = 'Bajo';
      cardioExplanation = "Tus niveles de lípidos en sangre indican una óptima salud coronario/vascular basal.";
    }
  } else {
    cardioExplanation = "Ingresa tus valores de Colesterol LDL, Colesterol HDL y Triglicéridos para obtener tu perfil de riesgo arterial de Framingham.";
  }

  if (enfermedades.toLowerCase().includes('hipertension') || enfermedades.toLowerCase().includes('hipertensión') || enfermedades.toLowerCase().includes('hta') || enfermedades.toLowerCase().includes('infarto') || enfermedades.toLowerCase().includes('coronaria')) {
    cardioLevel = 'Muy Alto';
    cardioExplanation = "Diagnóstico pre-existente de hipertensión o patología coronario/arterial reportada. Mantener cargas físicas progresivas estables y regular sodio a menos de 2g.";
  }

  // Chronic inflammation risk levels
  let inflamacionLevel: 'Bajo' | 'Moderado' | 'Alto' | 'Muy Alto' = 'Bajo';
  let inflamacionExplanation = "";
  const pcrVal = pcrUs !== '' ? Number(pcrUs) : 0;
  const sleepVal = horasSueno !== '' ? Number(horasSueno) : 8;

  if (pcrVal > 0) {
    if (pcrVal > 3.0) {
      inflamacionLevel = 'Alto';
      inflamacionExplanation = "Tu Proteína C Reactiva ultrasensible (PCR-us) es alta (>3 mg/L), implicando riesgo de inflamación sistémica activa o reactividad cardiovascular.";
    } else if (pcrVal >= 1.0) {
      inflamacionLevel = 'Moderado';
      inflamacionExplanation = "Muestras inflamación de bajo grado average (1.0-3.0 mg/L). Recomendado antioxidantes naturales y mantener un sueño reparador profundo.";
    } else {
      inflamacionLevel = 'Bajo';
      inflamacionExplanation = "Salud protectora de marcadores de inflamación sistémica (<1.0 mg/L).";
    }

    if (sleepVal < 6.5) {
      if (inflamacionLevel === 'Bajo') inflamacionLevel = 'Moderado';
      inflamacionExplanation += " Sin embargo, dormir menos de 6.5 horas diarias añade estrés inflamatorio celular constante.";
    }
    if (imc > 30) {
      inflamacionLevel = 'Alto';
      inflamacionExplanation += " La adiposidad por un IMC > 30 cataliza inflamación tisular silenciosa persistente.";
    }
  } else {
    inflamacionExplanation = "Registra tu marcador PCR-us ultrasensible para evaluar inflamación celular endotelial de bajo grado.";
    if (imc > 30) {
      inflamacionLevel = 'Moderado';
      inflamacionExplanation = "Riesgo moderado indirecto de inflamación silenciosa debido a IMC en rango de obesidad metabólica.";
    }
  }

  if (enfermedades.toLowerCase().includes('lupus') || enfermedades.toLowerCase().includes('artritis') || enfermedades.toLowerCase().includes('crohn') || enfermedades.toLowerCase().includes('colitis') || enfermedades.toLowerCase().includes('fibromialgia')) {
    inflamacionLevel = 'Muy Alto';
    inflamacionExplanation = "Antecedente de patología inmunológica o inflamatoria digestiva/articular declarada en perfil (Artritis, Crohn, Colitis o Fibromialgia). Requiere supervisión médica especializada y dieta antiinflamatoria rigurosa.";
  }

  // 3. Historical Progression comparison
  // Compute comparison relative to past saved rows
  let progressionReport: Array<{
    parametro: string;
    actual: string;
    anterior: string;
    tipo: 'mejorado' | 'empeorado' | 'neutro';
    comentario: string;
  }> = [];

  if (profileHistory && profileHistory.length >= 2) {
    const currentPro = profileHistory[profileHistory.length - 1];
    const previousPro = profileHistory[profileHistory.length - 2];

    // Check weight change
    if (currentPro.pesoActual && previousPro.pesoActual && currentPro.pesoActual !== previousPro.pesoActual) {
      const diff = currentPro.pesoActual - previousPro.pesoActual;
      let tipo: 'mejorado' | 'empeorado' | 'neutro' = 'neutro';
      let comentario = "";
      
      if (currentPro.objetivo === 'Perder peso') {
        tipo = diff < 0 ? 'mejorado' : 'empeorado';
        comentario = diff < 0 
          ? `¡Bajaste ${Math.abs(diff).toFixed(1)} kg! Excelente disciplina para tu meta de definición.`
          : `Aumentaste +${diff.toFixed(1)} kg. Vigila el superávit calórico inadvertido.`;
      } else if (currentPro.objetivo === 'Ganar masa muscular') {
        tipo = diff > 0 ? 'mejorado' : 'empeorado';
        comentario = diff > 0
          ? `¡Ganaste +${diff.toFixed(1)} kg! Favorece tu objetivo de hipertrofia muscular progresiva.`
          : `Disminuiste -${Math.abs(diff).toFixed(1)} kg. Procura cubrir tus metas calóricas y de proteína diaria.`;
      } else {
        tipo = 'neutro';
        comentario = `Tu peso pasó de ${previousPro.pesoActual} kg a ${currentPro.pesoActual} kg.`;
      }

      progressionReport.push({
        parametro: "Peso Corporal",
        actual: `${currentPro.pesoActual} kg`,
        anterior: `${previousPro.pesoActual} kg`,
        tipo,
        comentario
      });
    }

    // Check glucose change
    if (currentPro.glucosaSangre !== undefined && previousPro.glucosaSangre !== undefined) {
      const diff = currentPro.glucosaSangre - previousPro.glucosaSangre;
      if (diff !== 0) {
        const tipo = diff < 0 ? 'mejorado' : 'empeorado';
        const comentario = diff < 0
          ? `Disminuyó -${Math.abs(diff)} mg/dL. ¡Espectacular mejora de control de la insulina y respuesta celular!`
          : `Aumentó +${diff} mg/dL. Se aconseja regular el glucógeno y reducir cargas glucémicas simples.`;
        progressionReport.push({
          parametro: "Glucosa en Ayunas",
          actual: `${currentPro.glucosaSangre} mg/dL`,
          anterior: `${previousPro.glucosaSangre} mg/dL`,
          tipo,
          comentario
        });
      }
    }

    // Check triglycerides change
    if (currentPro.trigliceridos !== undefined && previousPro.trigliceridos !== undefined) {
      const diff = currentPro.trigliceridos - previousPro.trigliceridos;
      if (diff !== 0) {
        const tipo = diff < 0 ? 'mejorado' : 'empeorado';
        const comentario = diff < 0
          ? `Bajaron -${Math.abs(diff)} mg/dL. Menor saturación e grasa circulante y óptima salud hepática.`
          : `Subieron +${diff} mg/dL. Modera los carbohidratos simples procesados, grasas saturadas y alcohol.`;
        progressionReport.push({
          parametro: "Triglicéridos",
          actual: `${currentPro.trigliceridos} mg/dL`,
          anterior: `${previousPro.trigliceridos} mg/dL`,
          tipo,
          comentario
        });
      }
    }

    // Check LDL change
    if (currentPro.colesterolLDL !== undefined && previousPro.colesterolLDL !== undefined) {
      const diff = currentPro.colesterolLDL - previousPro.colesterolLDL;
      if (diff !== 0) {
        const tipo = diff < 0 ? 'mejorado' : 'empeorado';
        const comentario = diff < 0
          ? `Bajó -${Math.abs(diff)} mg/dL. ¡Favorable! Menor acumulación lipídica de placas arteriales.`
          : `Aumentó +${diff} mg/dL. Modera el consumo de grasas de origen animal e hidrogenadas.`;
        progressionReport.push({
          parametro: "Colesterol LDL",
          actual: `${currentPro.colesterolLDL} mg/dL`,
          anterior: `${previousPro.colesterolLDL} mg/dL`,
          tipo,
          comentario
        });
      }
    }

    // Check PCR-us change
    if (currentPro.pcrUs !== undefined && previousPro.pcrUs !== undefined) {
      const diff = currentPro.pcrUs - previousPro.pcrUs;
      if (diff !== 0) {
        const tipo = diff < 0 ? 'mejorado' : 'empeorado';
        const comentario = diff < 0
          ? `Redujo -${Math.abs(diff).toFixed(2)} mg/L. ¡Progreso rotundo ante la inflamación celular silente!`
          : `Subió +${diff.toFixed(2)} mg/L. Mayor carga de estrés oxidativo o alerta inflamatoria detectable.`;
        progressionReport.push({
          parametro: "Inflamación (PCR-us)",
          actual: `${currentPro.pcrUs} mg/L`,
          anterior: `${previousPro.pcrUs} mg/L`,
          tipo,
          comentario
        });
      }
    }

    // Check sleep hours change
    if (currentPro.horasSueno !== undefined && previousPro.horasSueno !== undefined) {
      const diff = currentPro.horasSueno - previousPro.horasSueno;
      if (diff !== 0) {
        const tipo = diff > 0 ? 'mejorado' : 'empeorado';
        const comentario = diff > 0
          ? `Aumentó +${diff.toFixed(1)} h. Favorable para la homeostasis inmunológica y síntesis proteica.`
          : `Disminuyó -${Math.abs(diff).toFixed(1)} h. Desregulación circadiana que eleva cortisol inflamatorio.`;
        progressionReport.push({
          parametro: "Sueño Diario Promedio",
          actual: `${currentPro.horasSueno} h`,
          anterior: `${previousPro.horasSueno} h`,
          tipo,
          comentario
        });
      }
    }
  }

  // Recalculate target calories based on settings and goal
  const autoEstimateTargets = () => {
    // Basic BMR calculation (approx Harris-Benedict)
    const baseBMR = 10 * pesoActual + 6.25 * altura - 5 * edad + 5; // simplified
    let dailyKcal = Math.round(baseBMR * 1.375); // active modifier (light exercise)
    let dailyPro = Math.round(pesoActual * 1.6); // 1.6 g/kg typical target

    if (objetivo === 'Perder peso') {
      dailyKcal -= 450; // deficit
      dailyPro = Math.round(pesoActual * 1.8); // preserve muscle
    } else if (objetivo === 'Ganar masa muscular') {
      dailyKcal += 350; // surplus
      dailyPro = Math.round(pesoActual * 2.0); // high protein
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
      proteinasObjetivo,
      glucosaSangre: glucosaSangre !== '' ? Number(glucosaSangre) : undefined,
      trigliceridos: trigliceridos !== '' ? Number(trigliceridos) : undefined,
      colesterolHDL: colesterolHDL !== '' ? Number(colesterolHDL) : undefined,
      colesterolLDL: colesterolLDL !== '' ? Number(colesterolLDL) : undefined,
      horasSueno: horasSueno !== '' ? Number(horasSueno) : undefined,
      tshTiroides: tshTiroides !== '' ? Number(tshTiroides) : undefined,
      pcrUs: pcrUs !== '' ? Number(pcrUs) : undefined,
      enfermedades: enfermedades.trim(),
      lesiones: lesiones.trim(),
      problemasMusculares: problemasMusculares.trim()
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
    <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/20 shadow-2xl" id="profile-card">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6" id="profile-header">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 bg-white/20 backdrop-blur-md rounded-xl flex items-center justify-center text-emerald-300 border border-white/20 shadow-md">
            <User className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-white">Parámetros Físicos</h3>
            <p className="text-xs text-white/70">Define tus objetivos para personalizar tus planes</p>
          </div>
        </div>
        <button
          type="button"
          onClick={autoEstimateTargets}
          className="text-xs px-3.5 py-2 border border-white/20 bg-white/15 text-white rounded-xl font-bold hover:bg-white/25 active:scale-[0.98] transition-all flex items-center gap-1.5 shrink-0 self-start sm:self-auto cursor-pointer shadow-sm"
          id="profile-estimate-btn"
        >
          <Flame className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
          Auto-Calcular Metas
        </button>
      </div>

      <form onSubmit={handleSave} className="space-y-5" id="profile-form">
        <div className="grid grid-cols-2 gap-4" id="profile-grid-1">
          <div id="field-edad">
            <label className="block text-xs font-semibold text-white/90 mb-1.5">Edad (años)</label>
            <input
              type="number"
              value={edad}
              onChange={(e) => setEdad(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              required
              min="10"
              max="120"
            />
          </div>
          <div id="field-altura">
            <label className="block text-xs font-semibold text-white/90 mb-1.5">Altura (cm)</label>
            <input
              type="number"
              value={altura}
              onChange={(e) => setAltura(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              required
              min="100"
              max="250"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4" id="profile-grid-2">
          <div id="field-pesoActual">
            <label className="block text-xs font-semibold text-white/90 mb-1.5">Peso Actual (kg)</label>
            <input
              type="number"
              step="0.1"
              value={pesoActual}
              onChange={(e) => setPesoActual(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              required
              min="30"
              max="300"
            />
          </div>
          <div id="field-pesoObjetivo">
            <label className="block text-xs font-semibold text-white/90 mb-1.5">Peso Objetivo (kg)</label>
            <input
              type="number"
              step="0.1"
              value={pesoObjetivo}
              onChange={(e) => setPesoObjetivo(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              required
              min="30"
              max="300"
            />
          </div>
        </div>

        <div id="field-objetivo">
          <label className="block text-xs font-semibold text-white/90 mb-1.5">Objetivo General</label>
          <select
            value={objetivo}
            onChange={(e) => setObjetivo(e.target.value)}
            className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-teal-900/40 text-white focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all cursor-pointer"
            required
          >
            <option className="bg-teal-900 text-white" value="Perder peso">Perder peso (Déficit Calórico)</option>
            <option className="bg-teal-900 text-white" value="Mantener peso">Mantener peso (Normocalórica)</option>
            <option className="bg-teal-900 text-white" value="Ganar masa muscular">Ganar masa muscular (Superávit Calórico)</option>
          </select>
        </div>

        <div className="grid grid-cols-2 gap-4 pt-3.5 border-t border-white/10" id="profile-grid-3">
          <div id="field-kcal">
            <label className="block text-xs font-semibold text-white/90 mb-1.5 flex items-center gap-1">
              <Flame className="h-3.5 w-3.5 text-amber-300 fill-amber-300" />
              Meta Energía (kcal/día)
            </label>
            <input
              type="number"
              value={kcalObjetivo}
              onChange={(e) => setKcalObjetivo(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              required
              min="800"
              max="6000"
            />
          </div>
          <div id="field-proteinas">
            <label className="block text-xs font-semibold text-white/90 mb-1.5 flex items-center gap-1">
              <Activity className="h-3.5 w-3.5 text-cyan-300" />
              Meta Proteína (g/día)
            </label>
            <input
              type="number"
              value={proteinasObjetivo}
              onChange={(e) => setProteinasObjetivo(Number(e.target.value))}
              className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              required
              min="30"
              max="400"
            />
          </div>
        </div>

        {/* Antecedentes Médicos y Limitaciones Físicas */}
        <div className="border-t border-white/10 pt-5 mt-5">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Condiciones Médicas y Limitaciones Físicas
          </h4>
          <p className="text-xs text-white/70 mb-4">
            Registra cualquier condición médica, lesiones vigentes o problemas físicos. Los agentes de IA adaptarán automáticamente tu dieta y tus entrenamientos para priorizar tu salud y seguridad.
          </p>

          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Enfermedades o Condiciones Médicas Previas</span>
                <span className="text-slate-400 text-[10px] font-sans">ej: Hipertensión, Diabetes, Hipotiroidismo, Resistencia a la Insulina</span>
              </label>
              <input
                type="text"
                value={enfermedades}
                onChange={(e) => setEnfermedades(e.target.value)}
                placeholder="Ninguna"
                className="w-full px-3 py-2.5 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                  <span>Lesiones Activas u Operaciones Recientes</span>
                  <span className="text-slate-400 text-[10px] font-sans">ej: Esguince en tobillo derecho</span>
                </label>
                <input
                  type="text"
                  value={lesiones}
                  onChange={(e) => setLesiones(e.target.value)}
                  placeholder="Ninguna"
                  className="w-full px-3 py-2.5 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                  <span>Problemas Musculares o de Articulaciones</span>
                  <span className="text-slate-400 text-[10px] font-sans">ej: Dolor lumbar crónico, desgaste rodilla</span>
                </label>
                <input
                  type="text"
                  value={problemasMusculares}
                  onChange={(e) => setProblemasMusculares(e.target.value)}
                  placeholder="Ninguno o dolor leve"
                  className="w-full px-3 py-2.5 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-amber-400 focus:outline-none transition-all"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Clinica & Biomedicina Section */}
        <div className="border-t border-white/10 pt-5 mt-5">
          <h4 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
            <Heart className="h-4 w-4 text-emerald-400 fill-emerald-400/20" />
            Perfil Clínico y Biomarcadores
          </h4>
          <p className="text-xs text-white/60 mb-4 font-sans">Registra tus últimos exámenes de laboratorio y parámetros clínicos para tu control nutricional y de bienestar.</p>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Glucosa en Sangre</span>
                <span className="text-slate-400 font-mono text-[10px]">mg/dL</span>
              </label>
              <input
                type="number"
                value={glucosaSangre}
                onChange={(e) => setGlucosaSangre(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ej: 90"
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Triglicéridos</span>
                <span className="text-slate-400 font-mono text-[10px]">mg/dL</span>
              </label>
              <input
                type="number"
                value={trigliceridos}
                onChange={(e) => setTrigliceridos(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ej: 140"
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Colesterol HDL</span>
                <span className="text-slate-400 font-mono text-[10px]">mg/dL</span>
              </label>
              <input
                type="number"
                value={colesterolHDL}
                onChange={(e) => setColesterolHDL(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ej: 50"
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Colesterol LDL</span>
                <span className="text-slate-400 font-mono text-[10px]">mg/dL</span>
              </label>
              <input
                type="number"
                value={colesterolLDL}
                onChange={(e) => setColesterolLDL(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ej: 100"
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Hormona TSH</span>
                <span className="text-slate-400 font-mono text-[10px]">µIU/mL</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={tshTiroides}
                onChange={(e) => setTshTiroides(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ej: 2.1"
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Proteína C Reactiva (PCR-us)</span>
                <span className="text-slate-400 font-mono text-[10px]">mg/L</span>
              </label>
              <input
                type="number"
                step="0.01"
                value={pcrUs}
                onChange={(e) => setPcrUs(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ej: 0.9"
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              />
            </div>

            <div className="sm:col-span-2 md:col-span-3">
              <label className="block text-xs font-semibold text-white/90 mb-1.5 flex justify-between">
                <span>Horas de Sueño Diario Promedio</span>
                <span className="text-slate-400 font-mono text-[10px]">horas</span>
              </label>
              <input
                type="number"
                step="0.5"
                value={horasSueno}
                onChange={(e) => setHorasSueno(e.target.value === '' ? '' : Number(e.target.value))}
                placeholder="ej: 7.5"
                className="w-full px-3 py-2 border border-white/20 rounded-xl text-sm bg-white/10 text-white placeholder-white/40 focus:ring-2 focus:ring-emerald-400 focus:outline-none transition-all"
              />
            </div>
          </div>
        </div>

        {saveStatus && (
          <div
            className={`p-3 rounded-xl text-xs leading-5 border font-semibold text-center ${
              saveStatus.type === 'success'
                ? 'bg-emerald-500/20 text-emerald-200 border-emerald-500/30'
                : 'bg-red-500/20 text-red-200 border-red-500/30'
            }`}
            id="profile-status"
          >
            {saveStatus.message}
          </div>
        )}

        <button
          type="submit"
          disabled={isSaving}
          className="w-full mt-3 flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-emerald-50 text-emerald-950 font-bold text-sm rounded-xl shadow-lg hover:shadow-xl active:scale-[0.98] transition-all disabled:opacity-75 cursor-pointer"
          id="profile-save-btn"
        >
          {isSaving ? (
            <RefreshCw className="h-4 w-4 animate-spin text-emerald-600" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          <span>{isSaving ? 'Sincronizando...' : 'Guardar y Sincronizar'}</span>
        </button>
      </form>

      {/* Renders dynamic health risk screening dashboard */}
      <div className="space-y-6 mt-8" id="health-risk-screening-dashboard">
        <div className="border-t border-white/10 pt-6">
          <h3 className="text-base font-bold text-white mb-2 flex items-center gap-2">
            <Heart className="h-5 w-5 text-[#3b82f6]" />
            Evaluación Clínica de Riesgo Personalizado
          </h3>
          <p className="text-xs text-slate-300 leading-relaxed mb-4">
            Análisis preliminar calculado en tiempo real basándose en tus antecedentes médicos declarados, antropometría y biometría sanguínea de laboratorio actual.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Diabetes Risk Card */}
            <div className="bg-[#091124] border border-[#1e2e4a] rounded-2xl p-4 flex flex-col justify-between" id="diabetes-risk-card">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">Diabetes Tipo 2</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    diabetesLevel === 'Muy Alto' || diabetesLevel === 'Alto'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : diabetesLevel === 'Moderado'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {diabetesLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{diabetesExplanation}</p>
              </div>
              {glucosaSangre !== '' && (
                <div className="mt-3 border-t border-[#1e2e4a] pt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>Glucosa: {glucosaSangre} mg/dL</span>
                  <span>Ratio TG/HDL: {tgHdlRatio}</span>
                </div>
              )}
            </div>

            {/* Cardiovascular Risk Card */}
            <div className="bg-[#091124] border border-[#1e2e4a] rounded-2xl p-4 flex flex-col justify-between" id="cardio-risk-card">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">Enf. Cardiovascular</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    cardioLevel === 'Muy Alto' || cardioLevel === 'Alto'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : cardioLevel === 'Moderado'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {cardioLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{cardioExplanation}</p>
              </div>
              {(colesterolLDL !== '' || trigliceridos !== '') && (
                <div className="mt-3 border-t border-[#1e2e4a] pt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>LDL: {colesterolLDL || 'N/A'}</span>
                  <span>HDL: {colesterolHDL || 'N/A'}</span>
                </div>
              )}
            </div>

            {/* Chronic Inflammation Card */}
            <div className="bg-[#091124] border border-[#1e2e4a] rounded-2xl p-4 flex flex-col justify-between" id="inflammation-risk-card">
              <div>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-bold text-slate-400">Inflamación Crónica</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                    inflamacionLevel === 'Muy Alto' || inflamacionLevel === 'Alto'
                      ? 'bg-red-500/20 text-red-300 border border-red-500/30'
                      : inflamacionLevel === 'Moderado'
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  }`}>
                    {inflamacionLevel}
                  </span>
                </div>
                <p className="text-xs text-slate-300 font-sans leading-relaxed">{inflamacionExplanation}</p>
              </div>
              {pcrUs !== '' && (
                <div className="mt-3 border-t border-[#1e2e4a] pt-2 flex justify-between items-center text-[10px] text-slate-500 font-mono">
                  <span>PCR-us: {pcrUs} mg/L</span>
                  <span>Sueño: {horasSueno || 'N/A'} h</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Historical Progression Comparison Tracker */}
        <div className="bg-[#0a152d]/90 border border-[#1b3152] rounded-3xl p-6 shadow-xl" id="progression-comparison-panel">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp className="h-4.5 w-4.5 text-emerald-400" />
              Calculadora de Progresión y Cambios Clínicos
            </h4>
            <span className="text-[10px] text-slate-400 font-mono">Base Histórica Google Sheets</span>
          </div>
          
          {profileHistory && profileHistory.length >= 2 ? (
            <div className="space-y-4">
              <p className="text-xs text-slate-300 font-sans">
                Comparativa generada entre el registro actual (<span className="text-white font-semibold">{profileHistory[profileHistory.length - 1].fecha || 'Hoy'}</span>) y tu control clínico anterior (<span className="text-white font-semibold">{profileHistory[profileHistory.length - 2].fecha}</span>).
              </p>

              {progressionReport.length > 0 ? (
                <div className="divide-y divide-white/5 space-y-3.5 pt-2">
                  {progressionReport.map((rep, idx) => (
                    <div key={idx} className="pt-3.5 flex flex-col md:flex-row gap-3 md:items-center justify-between" id={`prog-item-${idx}`}>
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5 font-display">
                          {rep.tipo === 'mejorado' ? (
                            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
                          ) : rep.tipo === 'empeorado' ? (
                            <span className="h-2 w-2 rounded-full bg-red-550 bg-red-500 animate-pulse"></span>
                          ) : (
                            <span className="h-2 w-2 rounded-full bg-slate-500"></span>
                          )}
                          {rep.parametro}
                        </span>
                        <p className="text-[11px] text-slate-400 leading-normal font-sans">{rep.comentario}</p>
                      </div>
                      <div className="flex items-center gap-3 self-start md:self-auto font-mono text-xs">
                        <div className="text-right">
                          <span className="block text-[9px] text-slate-500 uppercase tracking-widest font-sans">Anterior</span>
                          <span className="text-slate-400">{rep.anterior}</span>
                        </div>
                        <div className="text-slate-600">→</div>
                        <div className="text-right">
                          <span className="block text-[9px] text-[#38bdf8] uppercase tracking-widest font-sans">Actual</span>
                          <span className={
                            rep.tipo === 'mejorado' 
                              ? 'text-emerald-400 font-bold' 
                              : rep.tipo === 'empeorado' 
                              ? 'text-red-400 font-bold' 
                              : 'text-slate-300 font-bold'
                          }>{rep.actual}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="p-3 bg-white/5 border border-white/10 rounded-xl text-xs text-slate-300 text-center font-sans">
                  Tus parámetros clínicos más recientes se mantienen estables respecto a la medición anterior registrada.
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-center gap-2 p-4 text-center">
              <Info className="h-5 w-5 text-slate-400" />
              <p className="text-xs text-slate-300 leading-relaxed max-w-sm font-sans">
                Se requiere tener al menos dos registros guardados en tu historial de Google Sheets para poder calcular de forma automática las variaciones y mejoras relativas en tus biomarcadores sanguíneos.
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
