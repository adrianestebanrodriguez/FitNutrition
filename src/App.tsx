import { useState, useEffect, useCallback } from 'react';
import type { AuthUser } from './types';
import { initAuth, logout, setAccessToken } from './lib/firebase';
import { initializeSpreadsheet, getProfile, getCalorieLogs, getActivityLogs, getWeeklyPlan, getProfileHistory } from './lib/sheets';
import { UserProfile, CalorieLog, ActivityLog, WeeklyPlan } from './types';

// Importing Components
import LoginScreen from './components/LoginScreen';
import ProfileForm from './components/ProfileForm';
import CalorieTracker from './components/CalorieTracker';
import ActivityTracker from './components/ActivityTracker';
import WeeklyPlanner from './components/WeeklyPlanner';
import RecipeGenerator from './components/RecipeGenerator';

// Icons
import { 
  Sparkles, 
  Calendar, 
  Flame, 
  Dumbbell, 
  User as UserIcon, 
  ExternalLink, 
  LogOut, 
  RefreshCw,
  TrendingUp,
  Award,
  ChefHat,
  Bell,
  AlertTriangle
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);

  // Active view tab
  const [activeTab, setActiveTab] = useState<'planner' | 'calories' | 'activity' | 'recipes' | 'profile'>('planner');

  // Application synced data states
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [profileHistory, setProfileHistory] = useState<UserProfile[]>([]);
  const [calorieLogs, setCalorieLogs] = useState<CalorieLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);

  // Synchronizers
  const loadAllData = useCallback(async (authToken: string) => {
    setIsSyncing(true);
    try {
      // 1. Ensure sheets exist & write default headers if not
      await initializeSpreadsheet(authToken);

      // 2. Parallel fetching of database components (including clinical history)
      const [userProfile, userHistory, cLogs, aLogs, wPlan] = await Promise.all([
        getProfile(authToken),
        getProfileHistory(authToken),
        getCalorieLogs(authToken),
        getActivityLogs(authToken),
        getWeeklyPlan(authToken)
      ]);

      setProfile(userProfile);
      setProfileHistory(userHistory);
      setCalorieLogs(cLogs);
      setActivityLogs(aLogs);
      setWeeklyPlan(wPlan);
    } catch (e) {
      console.error("Error al recuperar datos desde Google Sheets:", e);
    } finally {
      setIsSyncing(false);
      setIsLoading(false);
    }
  }, []);

  // Listen for login status dynamically on mount
  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAccessToken(accessToken); // sync library cache
        setNeedsAuth(false);
        loadAllData(accessToken);
      },
      () => {
        setNeedsAuth(true);
        setUser(null);
        setToken(null);
        setIsLoading(false);
      }
    );
    return () => unsubscribe();
  }, [loadAllData]);

  // Auth success callback from login component
  const handleLoginSuccess = (signedInUser: AuthUser, accessToken: string) => {
    setUser(signedInUser);
    setToken(accessToken);
    setAccessToken(accessToken); // sync library cache
    setNeedsAuth(false);
    loadAllData(accessToken);
  };

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await logout();
      setUser(null);
      setToken(null);
      setAccessToken(null);
      setProfile(null);
      setCalorieLogs([]);
      setActivityLogs([]);
      setWeeklyPlan(null);
      setNeedsAuth(true);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  // Profile Form action callback
  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
    setProfileHistory(prev => [...prev, updatedProfile]);
  };

  // Food log addition callback
  const handleCalorieLogAdded = (newLog: CalorieLog) => {
    setCalorieLogs(prev => [...prev, newLog]);
  };

  // Activity log addition callback
  const handleActivityLogAdded = (newLog: ActivityLog) => {
    setActivityLogs(prev => [...prev, newLog]);
  };

  // Plan generation success callback
  const handlePlanUpdated = (newPlan: WeeklyPlan) => {
    setWeeklyPlan(newPlan);
  };

  // 1. Today's date string
  const todayStr = new Date().toLocaleDateString('es-ES');

  // Filter logs for today
  const todayCalorieLogs = calorieLogs.filter(log => log.fecha === todayStr);
  const todayActivityLogs = activityLogs.filter(log => log.fecha === todayStr);

  const todayConsumedKcal = todayCalorieLogs.reduce((acc, curr) => acc + curr.calorias, 0);
  const todayBurnedKcal = todayActivityLogs.reduce((acc, curr) => acc + curr.caloriasQuemadas, 0);

  const targetKcal = profile?.kcalObjetivo || 2000;
  
  // Track alerts
  const alerts: Array<{
    id: string;
    type: 'warning' | 'danger' | 'info';
    title: string;
    message: string;
  }> = [];

  if (profile) {
    if (todayConsumedKcal > targetKcal) {
      alerts.push({
        id: 'kcal-exceeded',
        type: 'danger',
        title: 'Límite de Calorías Superado',
        message: `Has consumido ${todayConsumedKcal} kcal hoy, superando tu meta diaria de ${targetKcal} kcal por ${todayConsumedKcal - targetKcal} kcal.`
      });
    }

    if (todayActivityLogs.length === 0) {
      alerts.push({
        id: 'no-activity',
        type: 'warning',
        title: 'Sin Actividad Física Hoy',
        message: 'No has registrado ninguna actividad física para el día de hoy. Recuerda realizar algún ejercicio.'
      });
    } else if (todayBurnedKcal < 150) {
      alerts.push({
        id: 'low-activity',
        type: 'warning',
        title: 'Muy Baja Quema de Calorías',
        message: `Has quemado solo ${todayBurnedKcal} kcal mediante ejercicio físico hoy. Se aconseja una meta mínima diaria de 150 kcal para mantener activo tu metabolismo.`
      });
    }

    if (profile.glucosaSangre !== undefined && profile.glucosaSangre >= 126) {
      alerts.push({
        id: 'high-glucose-alert',
        type: 'danger',
        title: 'Alerta de Glicemia Elevada (≥126 mg/dL)',
        message: `Tu glucosa registrada en ayuno es de ${profile.glucosaSangre} mg/dL. Prioriza restringir carbohidratos simples y realizar tu sesión semanal adaptada.`
      });
    }

    if (profile.pcrUs !== undefined && profile.pcrUs > 3.0) {
      alerts.push({
        id: 'high-pcr-alert',
        type: 'warning',
        title: 'Alerta de Inflamación Celular Sistémica (>3 mg/L)',
        message: `Carga de inflamación de bajo grado detectable (${profile.pcrUs} mg/L). Recomendado maximizar descanso y priorizar alimentos con alto poder antioxidante.`
      });
    }
  }

  // Return loading screen
  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#060b16] flex flex-col items-center justify-center p-4" id="app-loading-screen">
        <RefreshCw className="h-10 w-10 text-[#0ea5e9] animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-300 font-sans">Inicializando conexión segura con Google Sheets...</p>
      </div>
    );
  }

  // Return login picker if not logged in
  if (needsAuth || !token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-transparent text-slate-100 flex flex-col font-sans" id="app-root">
      {/* Top Banner indicating synchronization status with live link */}
      <div className="bg-[#0b172a] text-[#38bdf8] border-b border-[#1b3152] py-2.5 px-4 text-xs font-semibold" id="app-sync-banner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></div>
            <span className="font-semibold text-slate-200">Base de Datos de Google Sheets vinculada de forma segura</span>
          </div>
          <a 
            href="https://docs.google.com/spreadsheets/d/15UobRkTQ_Vr0hyYCqmZnzBxt7OTPP14HVx_XC95Lmrk/edit?usp=sharing" 
            target="_blank" 
            rel="noopener noreferrer" 
            className="inline-flex items-center gap-1 text-[#38bdf8] hover:text-[#0ea5e9] underline transition-colors"
            id="sheet-link"
          >
            Abrir mi Hoja de Cálculo en Google Sheets
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      {/* Main App Header */}
      <header className="bg-[#0e1a30]/90 backdrop-blur-xl border-b border-[#1f2e4d] sticky top-0 z-50 shadow-md" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-col lg:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl font-extrabold text-white tracking-tight font-display flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-[#38bdf8]" />
              FitNutrition AI
            </span>
            <span className="text-xs bg-[#102a4a] text-[#38bdf8] border border-[#1a4a75] font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Agente Privado</span>
          </div>

          {/* Tab Navigation (Fully Responsive wrap-around menu) */}
          <nav className="flex flex-wrap items-center justify-center gap-1 bg-[#091124] p-1 rounded-xl border border-[#1e2e4a] w-full lg:w-auto" id="tab-nav">
            <button
              onClick={() => setActiveTab('planner')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'planner'
                  ? 'bg-[#0284c7] text-white shadow-sm scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#132247]/50'
              }`}
              id="tab-btn-planner"
            >
              <Calendar className="h-3.5 w-3.5" />
              Plan Semanal
            </button>
            <button
              onClick={() => setActiveTab('calories')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'calories'
                  ? 'bg-[#0284c7] text-white shadow-sm scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#132247]/50'
              }`}
              id="tab-btn-calories"
            >
              <Flame className="h-3.5 w-3.5" />
              Registrar Dieta
            </button>
            <button
              onClick={() => setActiveTab('activity')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'activity'
                  ? 'bg-[#0284c7] text-white shadow-sm scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#132247]/50'
              }`}
              id="tab-btn-activity"
            >
              <Dumbbell className="h-3.5 w-3.5" />
              Ejercicio
            </button>
            <button
              onClick={() => setActiveTab('recipes')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'recipes'
                  ? 'bg-[#0284c7] text-white shadow-sm scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#132247]/50'
              }`}
              id="tab-btn-recipes"
            >
              <ChefHat className="h-3.5 w-3.5" />
              Recetas IA
            </button>
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-3 py-2 sm:px-4 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'profile'
                  ? 'bg-[#0284c7] text-white shadow-sm scale-[1.02]'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-[#132247]/50'
              }`}
              id="tab-btn-profile"
            >
              <UserIcon className="h-3.5 w-3.5" />
              Mi Perfil
            </button>
          </nav>

          {/* Authenticated User Status */}
          <div className="flex items-center justify-between sm:justify-end w-full lg:w-auto gap-3 border-t lg:border-t-0 border-[#1f2e4d] pt-3 lg:pt-0" id="user-status-indicator">
            <div className="text-left">
              <p className="text-xs font-bold text-slate-200">{user?.displayName}</p>
              <p className="text-[10px] text-slate-400 font-sans">{user?.email}</p>
            </div>
            <div className="flex items-center gap-1.5">
              {isSyncing ? (
                <RefreshCw className="h-4 w-4 text-[#38bdf8] animate-spin" title="Actualizando..." />
              ) : (
                <button
                  onClick={() => loadAllData(token)}
                  className="p-2 bg-[#091124] border border-[#1e2e4a] text-slate-300 hover:bg-[#132247] rounded-lg transition-all"
                  title="Sincronizar Datos"
                  id="manual-resync-btn"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                </button>
              )}
              <button
                onClick={handleLogout}
                className="p-2 bg-red-950/40 border border-red-900/60 text-red-400 hover:bg-red-900/60 rounded-lg transition-all"
                title="Cerrar Sesión"
                id="app-logout-btn"
              >
                <LogOut className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8" id="app-main-content">
        
        {/* Healthcare Alerts & Notifications Center */}
        {profile && alerts.length > 0 && (
          <div className="mb-6 space-y-3" id="health-alerts-panel">
            <div className="flex items-center gap-2 mb-1">
              <span className="flex h-2 w-2 relative">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <h4 className="text-xs font-bold uppercase tracking-wider text-[#38bdf8] font-display flex items-center gap-1.5">
                <Bell className="h-3.5 w-3.5 text-[#38bdf8]" />
                Monitoreo Clínico en Tiempo Real - Alertas
              </h4>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {alerts.map((alert) => (
                <div 
                  key={alert.id}
                  className={`p-4 rounded-2xl border flex gap-3 transition-all ${
                    alert.type === 'danger'
                      ? 'bg-red-950/40 border-red-900/60 text-red-100'
                      : 'bg-amber-950/40 border-amber-900/60 text-amber-100'
                  }`}
                  id={`alert-${alert.id}`}
                >
                  <AlertTriangle className={`h-5 w-5 shrink-0 ${
                    alert.type === 'danger' ? 'text-red-400' : 'text-amber-400'
                  }`} />
                  <div>
                    <h5 className="text-sm font-bold leading-none mb-1">{alert.title}</h5>
                    <p className="text-xs opacity-90 leading-normal">{alert.message}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {activeTab === 'planner' && (
          <WeeklyPlanner 
            currentPlan={weeklyPlan}
            profile={profile}
            token={token}
            onPlanUpdated={handlePlanUpdated}
          />
        )}

        {activeTab === 'calories' && (
          <CalorieTracker 
            logs={calorieLogs}
            profile={profile}
            token={token}
            onLogAdded={handleCalorieLogAdded}
          />
        )}

        {activeTab === 'activity' && (
          <ActivityTracker 
            logs={activityLogs}
            profile={profile}
            token={token}
            onLogAdded={handleActivityLogAdded}
          />
        )}

        {activeTab === 'recipes' && (
          <RecipeGenerator 
            profile={profile}
            token={token}
            onLogAdded={handleCalorieLogAdded}
          />
        )}

        {activeTab === 'profile' && (
          <div className="max-w-2xl mx-auto space-y-6 font-sans">
            <ProfileForm 
              initialProfile={profile}
              token={token}
              onProfileUpdated={handleProfileUpdated}
              profileHistory={profileHistory}
            />

            {/* Quick Metrics display card */}
            {profile && (
              <div className="glass-panel p-6 rounded-3xl text-white shadow-xl flex items-center justify-between border border-white/20" id="quick-meta-card">
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-emerald-200 uppercase tracking-widest flex items-center gap-1 font-display">
                    <TrendingUp className="h-3 w-3" />
                    Estado de tu Meta
                  </span>
                  <h4 className="text-xl font-bold flex items-baseline gap-1">
                    {profile.objetivo}
                  </h4>
                  <p className="text-xs text-white/80 font-sans leading-relaxed">
                    Peso actual: <span className="font-bold">{profile.pesoActual} kg</span> → Peso deseado: <span className="font-bold">{profile.pesoObjetivo} kg</span>
                  </p>
                </div>
                <div className="h-12 w-12 bg-white/20 rounded-xl flex items-center justify-center shrink-0 border border-white/20 text-white" id="quick-meta-icon">
                  <Award className="h-6 w-6" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Footer */}
      <footer className="bg-black/20 border-t border-[#1b3152]/60 py-8 text-center text-xs text-slate-400 font-sans mt-auto" id="app-footer">
        <p>© 2026 FitNutrition AI. Todos los datos se sincronizan y persisten de manera segura en tu Google Sheet.</p>
      </footer>
    </div>
  );
}
