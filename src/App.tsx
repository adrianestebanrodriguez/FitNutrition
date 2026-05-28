import { useState, useEffect, useCallback } from 'react';
import { User } from 'firebase/auth';
import { initAuth, logout, setAccessToken } from './lib/firebase';
import { initializeSpreadsheet, getProfile, getCalorieLogs, getActivityLogs, getWeeklyPlan } from './lib/sheets';
import { UserProfile, CalorieLog, ActivityLog, WeeklyPlan } from './types';

import LoginScreen from './components/LoginScreen';
import ProfileForm from './components/ProfileForm';
import CalorieTracker from './components/CalorieTracker';
import ActivityTracker from './components/ActivityTracker';
import WeeklyPlanner from './components/WeeklyPlanner';
import RecipeGenerator from './components/RecipeGenerator';

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
  Menu,
  X
} from 'lucide-react';

export default function App() {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [needsAuth, setNeedsAuth] = useState(true);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [activeTab, setActiveTab] = useState<'planner' | 'calories' | 'activity' | 'recipes' | 'profile'>('planner');

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [calorieLogs, setCalorieLogs] = useState<CalorieLog[]>([]);
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyPlan | null>(null);

  const loadAllData = useCallback(async (authToken: string) => {
    setIsSyncing(true);
    try {
      await initializeSpreadsheet(authToken);
      const [userProfile, cLogs, aLogs, wPlan] = await Promise.all([
        getProfile(authToken),
        getCalorieLogs(authToken),
        getActivityLogs(authToken),
        getWeeklyPlan(authToken)
      ]);
      setProfile(userProfile);
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

  useEffect(() => {
    const unsubscribe = initAuth(
      (currentUser, accessToken) => {
        setUser(currentUser);
        setToken(accessToken);
        setAccessToken(accessToken);
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

  const handleLoginSuccess = (signedInUser: User, accessToken: string) => {
    setUser(signedInUser);
    setToken(accessToken);
    setAccessToken(accessToken);
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

  const handleProfileUpdated = (updatedProfile: UserProfile) => {
    setProfile(updatedProfile);
  };

  const handleCalorieLogAdded = (newLog: CalorieLog) => {
    setCalorieLogs(prev => [...prev, newLog]);
  };

  const handleActivityLogAdded = (newLog: ActivityLog) => {
    setActivityLogs(prev => [...prev, newLog]);
  };

  const handlePlanUpdated = (newPlan: WeeklyPlan) => {
    setWeeklyPlan(newPlan);
  };

  const tabs = [
    { id: 'planner' as const, label: 'Plan Semanal', icon: Calendar },
    { id: 'calories' as const, label: 'Registrar Dieta', icon: Flame },
    { id: 'activity' as const, label: 'Ejercicio', icon: Dumbbell },
    { id: 'recipes' as const, label: 'Recetas IA', icon: ChefHat },
    { id: 'profile' as const, label: 'Mi Perfil', icon: UserIcon },
  ];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0b1120] flex flex-col items-center justify-center p-4" id="app-loading-screen">
        <RefreshCw className="h-10 w-10 text-indigo-400 animate-spin mb-3" />
        <p className="text-sm font-semibold text-slate-300 font-sans">Inicializando conexión segura con Google Sheets...</p>
      </div>
    );
  }

  if (needsAuth || !token) {
    return <LoginScreen onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="min-h-screen bg-[#0b1120] text-slate-200 flex flex-col font-sans" id="app-root">
      <div className="bg-slate-800/60 backdrop-blur-md text-slate-300 border-b border-slate-700/50 py-2.5 px-4 text-xs font-semibold" id="app-sync-banner">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 rounded-full bg-indigo-400 animate-pulse"></div>
            <span>Base de Datos de Google Sheets vinculada de forma segura</span>
          </div>
          <a
            href="https://docs.google.com/spreadsheets/d/15UobRkTQ_Vr0hyYCqmZnzBxt7OTPP14HVx_XC95Lmrk/edit?usp=sharing"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-indigo-300 hover:text-white underline transition-colors"
            id="sheet-link"
          >
            Abrir mi Hoja de Cálculo en Google Sheets
            <ExternalLink className="h-3.5 w-3.5" />
          </a>
        </div>
      </div>

      <header className="bg-slate-900/80 backdrop-blur-xl border-b border-slate-700/50 sticky top-0 z-50 shadow-lg" id="app-header">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 shrink-0">
            <span className="text-lg sm:text-xl font-extrabold text-white tracking-tight font-display flex items-center gap-1.5">
              <Sparkles className="h-5 w-5 text-indigo-400" />
              FitNutrition AI
            </span>
            <span className="hidden sm:inline text-xs bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 font-bold px-2 py-0.5 rounded-full uppercase tracking-wider">Agente Privado</span>
          </div>

          <nav className="hidden md:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/50" id="tab-nav">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-500 text-white shadow-md scale-[1.02]'
                      : 'text-slate-400 hover:text-white hover:bg-slate-700/40'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden lg:inline">{tab.label}</span>
                  <span className="lg:hidden">{tab.label.split(' ')[0]}</span>
                </button>
              );
            })}
          </nav>

          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 bg-slate-800/60 border border-slate-600/50 text-slate-300 rounded-lg hover:bg-slate-700/60 transition-all"
            id="mobile-menu-toggle"
          >
            {mobileMenuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>

          <div className="hidden sm:flex items-center gap-3" id="user-status-indicator">
            <div className="text-right hidden md:block">
              <p className="text-xs font-bold text-white">{user?.displayName}</p>
              <p className="text-[10px] text-slate-400 font-sans">{user?.email}</p>
            </div>
            {isSyncing ? (
              <RefreshCw className="h-4 w-4 text-indigo-400 animate-spin" title="Actualizando..." />
            ) : (
              <button
                onClick={() => loadAllData(token)}
                className="p-2 bg-slate-800/60 border border-slate-600/50 text-slate-300 hover:bg-slate-700/60 rounded-lg transition-all"
                title="Sincronizar Datos"
                id="manual-resync-btn"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </button>
            )}
            <button
              onClick={handleLogout}
              className="p-2 bg-slate-800/60 border border-slate-600/50 text-red-400 hover:text-red-300 hover:bg-red-500/20 rounded-lg transition-all"
              title="Cerrar Sesión"
              id="app-logout-btn"
            >
              <LogOut className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>

        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-700/50 bg-slate-900/95 backdrop-blur-xl px-4 py-3 space-y-1" id="mobile-menu">
            {tabs.map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => { setActiveTab(tab.id); setMobileMenuOpen(false); }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold transition-all ${
                    activeTab === tab.id
                      ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/30'
                      : 'text-slate-400 hover:text-white hover:bg-slate-800/40'
                  }`}
                >
                  <Icon className="h-4.5 w-4.5" />
                  {tab.label}
                </button>
              );
            })}
            <div className="pt-3 mt-3 border-t border-slate-700/50 flex items-center justify-between">
              <div className="text-xs text-slate-400">
                <p className="font-bold text-white">{user?.displayName}</p>
                <p>{user?.email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 bg-slate-800/60 border border-slate-600/50 text-red-400 rounded-lg hover:bg-red-500/20 transition-all"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </header>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8" id="app-main-content">
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
          <div className="max-w-2xl mx-auto space-y-6">
            <ProfileForm
              initialProfile={profile}
              token={token}
              onProfileUpdated={handleProfileUpdated}
            />

            {profile && (
              <div className="glass-panel p-6 rounded-3xl text-slate-200 shadow-xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-slate-700/30" id="quick-meta-card">
                <div className="space-y-1">
                  <span className="block text-xs font-semibold text-indigo-300 uppercase tracking-widest flex items-center gap-1 font-display">
                    <TrendingUp className="h-3 w-3" />
                    Estado de tu Meta
                  </span>
                  <h4 className="text-xl font-bold flex items-baseline gap-1 text-white">
                    {profile.objetivo}
                  </h4>
                  <p className="text-xs text-slate-400 font-sans leading-relaxed">
                    Peso actual: <span className="font-bold text-white">{profile.pesoActual} kg</span> → Peso deseado: <span className="font-bold text-white">{profile.pesoObjetivo} kg</span>
                  </p>
                </div>
                <div className="h-12 w-12 bg-indigo-500/20 rounded-xl flex items-center justify-center shrink-0 border border-indigo-500/30 text-indigo-300" id="quick-meta-icon">
                  <Award className="h-6 w-6" />
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-slate-900/50 border-t border-slate-800/50 py-8 text-center text-xs text-slate-500 font-sans mt-auto" id="app-footer">
        <p>© 2026 FitNutrition AI. Todos los datos se sincronizan y persisten de manera segura en tu Google Sheet.</p>
      </footer>
    </div>
  );
}
