import { initializeApp } from 'firebase/app';
import { getAuth, signInWithPopup, GoogleAuthProvider, onAuthStateChanged, User } from 'firebase/auth';
import firebaseJson from '../../firebase-applet-config.json';

const env = (import.meta.env || {}) as Record<string, any>;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY ?? firebaseJson.apiKey,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN ?? firebaseJson.authDomain,
  projectId: env.VITE_FIREBASE_PROJECT_ID ?? firebaseJson.projectId,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET ?? firebaseJson.storageBucket,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? firebaseJson.messagingSenderId,
  appId: env.VITE_FIREBASE_APP_ID ?? firebaseJson.appId,
  measurementId: env.VITE_FIREBASE_MEASUREMENT_ID ?? (firebaseJson.measurementId || ''),
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);

let isSigningIn = false;
let cachedAccessToken: string | null = null;

function buildProvider() {
  const p = new GoogleAuthProvider();
  p.addScope('https://www.googleapis.com/auth/spreadsheets');
  p.addScope('https://www.googleapis.com/auth/userinfo.profile');
  p.addScope('https://www.googleapis.com/auth/userinfo.email');
  return p;
}

export const initAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
        return;
      }
      if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, buildProvider());
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('No se pudo obtener el token de acceso de Google.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: any) {
    console.error('Error de login:', error);
    if (error?.code === 'auth/popup-blocked') {
      throw new Error('El navegador bloqueó la ventana emergente. Permite popups para este sitio e intenta de nuevo.');
    }
    if (error?.code === 'auth/popup-closed-by-user') {
      throw new Error('La ventana de inicio de sesión se cerró antes de completar el acceso.');
    }
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};
