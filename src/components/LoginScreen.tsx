import { useState } from 'react';
import { googleSignIn } from '../lib/firebase';
import { Sparkles, Calendar, TrendingUp, RefreshCw, Key } from 'lucide-react';
import type { AuthUser } from '../types';

interface LoginScreenProps {
  onLoginSuccess: (user: AuthUser, token: string) => void;
}

export default function LoginScreen({ onLoginSuccess }: LoginScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  const handleSignIn = async () => {
    setIsLoggingIn(true);
    setError(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onLoginSuccess(result.user, result.accessToken);
      }
    } catch (err: any) {
      console.error('Error de autenticación:', err);
      setError(err?.message || 'Error al iniciar sesión con Google.');
    } finally {
      setIsLoggingIn(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-transparent px-4 py-12" id="login-container">
      <div className="max-w-md w-full space-y-8 glass-panel-heavy p-8 rounded-3xl" id="login-card">
        <div className="text-center">
          <div className="mx-auto h-12 w-12 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-emerald-300 mb-4 shadow-lg border border-white/20" id="login-icon-container">
            <Sparkles className="h-6 w-6" id="login-sparkle-icon" />
          </div>
          <h2 className="text-3xl font-bold text-white tracking-tight font-display" id="login-title">
            FitNutrition AI
          </h2>
          <p className="mt-2 text-sm text-white/80 font-sans" id="login-subtitle">
            Tu agente personal de nutrición y ejercicio sincronizado con Google Sheets
          </p>
        </div>

        <div className="rounded-2xl bg-white/10 backdrop-blur-md border border-white/10 p-5 space-y-4 text-sm text-white/95" id="login-features">
          <div className="flex items-start gap-3" id="feat-1">
            <Calendar className="h-4.5 w-4.5 text-emerald-300 mt-1 shrink-0" />
            <p><strong>Menú Semanal Inteligente:</strong> Crea menús completos y rutinas de ejercicio diarias de Lunes a Domingo adaptados a tu meta.</p>
          </div>
          <div className="flex items-start gap-3" id="feat-2">
            <TrendingUp className="h-4.5 w-4.5 text-emerald-300 mt-1 shrink-0" />
            <p><strong>Entrenamientos y Calorías:</strong> Registra lo que comes y tus entrenamientos usando lenguaje natural en español.</p>
          </div>
          <div className="flex items-start gap-3" id="feat-3">
            <RefreshCw className="h-4.5 w-4.5 text-emerald-300 mt-1 shrink-0" />
            <p><strong>Sincronización Total:</strong> Todos los registros se guardan de forma instantánea en tu hoja de cálculo compartida.</p>
          </div>
        </div>

        {error && (
          <div className="p-3 text-xs text-red-200 bg-red-900/30 rounded-lg border border-red-500/30 font-medium text-center" id="login-error">
            {error}
          </div>
        )}

        <div className="pt-2" id="login-action">
          <button
            onClick={handleSignIn}
            disabled={isLoggingIn}
            className="w-full flex items-center justify-center gap-3 px-4 py-3.5 rounded-xl bg-white text-emerald-950 text-sm font-bold hover:bg-emerald-50 active:scale-[0.98] transition-all shadow-lg disabled:opacity-75 cursor-pointer"
            id="login-button"
          >
            {isLoggingIn ? (
              <RefreshCw className="h-5 w-5 animate-spin text-emerald-600" id="login-loader" />
            ) : (
              <svg className="h-5 w-5 shrink-0" viewBox="0 0 48 48" id="google-logo" xmlns="http://www.w3.org/2000/svg">
                <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"></path>
                <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"></path>
                <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"></path>
                <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"></path>
                <path fill="none" d="M0 0h48v48H0z"></path>
              </svg>
            )}
            <span id="login-btn-text">
              {isLoggingIn ? 'Iniciando sesión...' : 'Iniciar Sesión con Google'}
            </span>
          </button>
        </div>

        <p className="text-center text-xs text-white/60 pt-4 border-t border-white/10" id="login-footer">
          Elige tu cuenta de Google donde se encuentra la hoja de Google Sheets.
        </p>
      </div>
    </div>
  );
}
