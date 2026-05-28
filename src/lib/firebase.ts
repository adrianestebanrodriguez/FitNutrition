import type { AuthUser } from '../types';

declare global {
  interface Window {
    google?: {
      accounts?: {
        oauth2?: {
          initTokenClient: (options: {
            client_id: string;
            scope: string;
            callback: (response: any) => void;
            prompt?: string;
          }) => { callback: (response: any) => void; requestAccessToken: (options?: { prompt?: string }) => void };
          revoke: (token: string, callback: (done: any) => void) => void;
        };
      };
    };
  }
}

const CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID as string | undefined;
const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
  'https://www.googleapis.com/auth/userinfo.profile',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');
const STORAGE_KEY = 'fitnutrition_access_token';

let tokenClient: any = null;
let cachedAccessToken: string | null = null;
let cachedUser: AuthUser | null = null;
let authSuccessCallback: ((user: AuthUser, token: string) => void) | undefined;
let authFailureCallback: (() => void) | undefined;

function loadGoogleIdentityScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined') {
      reject(new Error('El cliente de Google solo está disponible en el navegador.'));
      return;
    }

    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector<HTMLScriptElement>('script[src="https://accounts.google.com/gsi/client"]');
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () => reject(new Error('No se pudo cargar Google Identity Services.')));
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('No se pudo cargar Google Identity Services.'));
    document.head.appendChild(script);
  });
}

async function ensureTokenClient(): Promise<void> {
  if (!CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID no está definido. Añade tu Client ID de Google en .env.');
  }

  await loadGoogleIdentityScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services no está disponible en este navegador.');
  }

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: CLIENT_ID,
      scope: SCOPES,
      callback: async (response: any) => {
        await handleTokenResponse(response);
      }
    });
  }
}

async function fetchGoogleUser(token: string): Promise<AuthUser | null> {
  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: {
      Authorization: `Bearer ${token}`
    }
  });

  if (!response.ok) {
    throw new Error('No autorizado para recuperar perfil de usuario.');
  }

  const profile = await response.json();
  return {
    displayName: profile.name || profile.email,
    email: profile.email,
    picture: profile.picture,
    id: profile.sub
  };
}

async function handleTokenResponse(response: any) {
  if (!response || response.error) {
    authFailureCallback?.();
    return;
  }

  if (!response.access_token) {
    authFailureCallback?.();
    return;
  }

  cachedAccessToken = response.access_token;
  sessionStorage.setItem(STORAGE_KEY, cachedAccessToken);

  try {
    const user = await fetchGoogleUser(cachedAccessToken);
    if (user) {
      cachedUser = user;
      authSuccessCallback?.(user, cachedAccessToken);
    } else {
      authFailureCallback?.();
    }
  } catch (error) {
    console.error('Error al obtener perfil de Google:', error);
    authFailureCallback?.();
  }
}

export const initAuth = async (
  onAuthSuccess?: (user: AuthUser, token: string) => void,
  onAuthFailure?: () => void
) => {
  authSuccessCallback = onAuthSuccess;
  authFailureCallback = onAuthFailure;
  cachedAccessToken = sessionStorage.getItem(STORAGE_KEY);

  if (!cachedAccessToken) {
    onAuthFailure?.();
    return () => {
      authSuccessCallback = undefined;
      authFailureCallback = undefined;
    };
  }

  try {
    const user = await fetchGoogleUser(cachedAccessToken);
    if (user) {
      cachedUser = user;
      onAuthSuccess?.(user, cachedAccessToken);
    } else {
      throw new Error('No se pudo recuperar el usuario desde Google.');
    }
  } catch (error) {
    console.warn('Token guardado inválido o expirado:', error);
    cachedAccessToken = null;
    sessionStorage.removeItem(STORAGE_KEY);
    onAuthFailure?.();
  }

  return () => {
    authSuccessCallback = undefined;
    authFailureCallback = undefined;
  };
};

export const googleSignIn = async (): Promise<{ user: AuthUser; accessToken: string } | null> => {
  await ensureTokenClient();

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('No se pudo inicializar el cliente de Google.'));
      return;
    }

    tokenClient.callback = async (response: any) => {
      if (!response || response.error) {
        reject(new Error(response?.error || 'Error en la autenticación de Google.'));
        authFailureCallback?.();
        return;
      }

      if (!response.access_token) {
        const error = new Error('No se pudo obtener el token de acceso de Google.');
        reject(error);
        authFailureCallback?.();
        return;
      }

      cachedAccessToken = response.access_token;
      sessionStorage.setItem(STORAGE_KEY, cachedAccessToken);

      try {
        const user = await fetchGoogleUser(cachedAccessToken);
        if (!user) throw new Error('No se pudo obtener el perfil de usuario.');

        cachedUser = user;
        authSuccessCallback?.(user, cachedAccessToken);
        resolve({ user, accessToken: cachedAccessToken });
      } catch (error) {
        reject(error);
        authFailureCallback?.();
      }
    };

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
};

export const getAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const setAccessToken = (token: string | null) => {
  cachedAccessToken = token;
  if (!token) {
    sessionStorage.removeItem(STORAGE_KEY);
    cachedUser = null;
  }
};

export const logout = async () => {
  const token = cachedAccessToken;
  cachedAccessToken = null;
  cachedUser = null;
  sessionStorage.removeItem(STORAGE_KEY);

  if (token && window.google?.accounts?.oauth2?.revoke) {
    window.google.accounts.oauth2.revoke(token, () => {});
  }
};
