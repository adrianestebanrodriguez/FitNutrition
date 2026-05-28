import { UserProfile, CalorieLog, ActivityLog, WeeklyPlan, DayPlan } from '../types';

export const SPREADSHEET_ID = "15UobRkTQ_Vr0hyYCqmZnzBxt7OTPP14HVx_XC95Lmrk";

// Helper to make Google Sheets API requests
async function makeSheetsRequest(endpoint: string, options: RequestInit, token: string) {
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${SPREADSHEET_ID}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    }
  });

  if (!response.ok) {
    const err = await response.json().catch(() => null);
    console.error(`Google Sheets API Error on ${endpoint}:`, err);
    throw new Error(err?.error?.message || `Error en la llamada a Google Sheets (${response.status})`);
  }

  return response.json();
}

// 1. Initialize and Setup sheets structure if not present
export async function initializeSpreadsheet(token: string): Promise<string[]> {
  try {
    // Check which sheets currently exist in the workbook
    const info = await makeSheetsRequest('', { method: 'GET' }, token);
    const existingTitles = info.sheets?.map((s: any) => s.properties?.title) || [];
    
    const requiredSheets = ['Perfil_Usuario', 'Calorias_Diarias', 'Actividad_Fisica', 'Plan_Semanal'];
    const sheetsToCreate = requiredSheets.filter(title => !existingTitles.includes(title));

    if (sheetsToCreate.length > 0) {
      const requests = sheetsToCreate.map(title => ({
        addSheet: {
          properties: {
            title
          }
        }
      }));

      // Create the missing sheets
      await makeSheetsRequest(':batchUpdate', {
        method: 'POST',
        body: JSON.stringify({ requests })
      }, token);

      // Now set the headers for the newly created sheets
      await initializeHeaders(sheetsToCreate, token);
    }
    
    return requiredSheets;
  } catch (err: any) {
    console.error('Error al inicializar la hoja de cálculo:', err);
    throw err;
  }
}

// Helper to write specific sheet headers
async function initializeHeaders(sheetTitles: string[], token: string) {
  const updates = [];

  if (sheetTitles.includes('Perfil_Usuario')) {
    updates.push({
      range: 'Perfil_Usuario!A1:H1',
      values: [['Fecha', 'Edad', 'Altura (cm)', 'Peso Actual (kg)', 'Peso Objetivo (kg)', 'Objetivo General', 'Calorías Diarias Objetivo', 'Proteínas Objetivo (g)']]
    });
  }

  if (sheetTitles.includes('Calorias_Diarias')) {
    updates.push({
      range: 'Calorias_Diarias!A1:F1',
      values: [['Fecha', 'Comida', 'Alimentos', 'Calorías', 'Proteínas (g)', 'Registrado por IA']]
    });
  }

  if (sheetTitles.includes('Actividad_Fisica')) {
    updates.push({
      range: 'Actividad_Fisica!A1:F1',
      values: [['Fecha', 'Ejercicio', 'Duración (min)', 'Intensidad', 'Calorías Quemadas', 'Registrado por IA']]
    });
  }

  if (sheetTitles.includes('Plan_Semanal')) {
    updates.push({
      range: 'Plan_Semanal!A1:G1',
      values: [['Día', 'Desayuno', 'Almuerzo', 'Cena', 'Snacks', 'Calorías Estimadas', 'Entrenamiento']]
    });
  }

  if (updates.length > 0) {
    await makeSheetsRequest('/values:batchUpdate', {
      method: 'POST',
      body: JSON.stringify({
        valueInputOption: 'USER_ENTERED',
        data: updates
      })
    }, token);
  }
}

// 2. Fetch User Profile
export async function getProfile(token: string): Promise<UserProfile | null> {
  try {
    const data = await makeSheetsRequest('/values/Perfil_Usuario!A2:H100', { method: 'GET' }, token);
    const rows = data.values;
    if (!rows || rows.length === 0) return null;
    
    // Get the latest row (most recent update)
    const latestRow = rows[rows.length - 1];
    return {
      fecha: latestRow[0] || '',
      edad: Number(latestRow[1]) || 30,
      altura: Number(latestRow[2]) || 170,
      pesoActual: Number(latestRow[3]) || 70,
      pesoObjetivo: Number(latestRow[4]) || 65,
      objetivo: latestRow[5] || 'Mantener peso',
      kcalObjetivo: Number(latestRow[6]) || 2000,
      proteinasObjetivo: Number(latestRow[7]) || 100
    };
  } catch (error) {
    console.warn('Error al leer Perfil_Usuario, podría estar vacía:', error);
    return null;
  }
}

// 3. Save User Profile
export async function saveProfile(profile: UserProfile, token: string): Promise<void> {
  const row = [
    profile.fecha,
    profile.edad,
    profile.altura,
    profile.pesoActual,
    profile.pesoObjetivo,
    profile.objetivo,
    profile.kcalObjetivo,
    profile.proteinasObjetivo
  ];

  await makeSheetsRequest('/values/Perfil_Usuario!A:H:append?valueInputOption=USER_ENTERED', {
    method: 'POST',
    body: JSON.stringify({
      range: 'Perfil_Usuario!A:H',
      majorDimension: 'ROWS',
      values: [row]
    })
  }, token);
}

// 4. Fetch Calorie Logs
export async function getCalorieLogs(token: string): Promise<CalorieLog[]> {
  try {
    const data = await makeSheetsRequest('/values/Calorias_Diarias!A2:F1000', { method: 'GET' }, token);
    const rows = data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row: any) => ({
      fecha: row[0] || '',
      comida: row[1] || '',
      alimentos: row[2] || '',
      calorias: Number(row[3]) || 0,
      proteinas: Number(row[4]) || 0,
      registradoPorIA: row[5] === 'TRUE' || row[5] === 'Si' || row[5] === 'SI'
    }));
  } catch (error) {
    console.warn('No se pudieron recuperar logs de calorías o pestaña vacía:', error);
    return [];
  }
}

// 5. Append Calorie Log
export async function appendCalorieLog(log: CalorieLog, token: string): Promise<void> {
  const row = [
    log.fecha,
    log.comida,
    log.alimentos,
    log.calorias,
    log.proteinas,
    log.registradoPorIA ? 'SI' : 'NO'
  ];

  await makeSheetsRequest('/values/Calorias_Diarias!A:F:append?valueInputOption=USER_ENTERED', {
    method: 'POST',
    body: JSON.stringify({
      range: 'Calorias_Diarias!A:F',
      majorDimension: 'ROWS',
      values: [row]
    })
  }, token);
}

// 6. Delete Calorie Log (we actually overwrite rows, or clear them. For simple tracking let's clear or rewrite).
// For simplicity in spreadsheets, appending is easy, and we can delete standard logs if custom interface demands. 
// It's safer to just provide append since deleting rows dynamically in Sheets API requires complicated requests.

// 7. Fetch Activity Logs
export async function getActivityLogs(token: string): Promise<ActivityLog[]> {
  try {
    const data = await makeSheetsRequest('/values/Actividad_Fisica!A2:F1000', { method: 'GET' }, token);
    const rows = data.values;
    if (!rows || rows.length === 0) return [];

    return rows.map((row: any) => ({
      fecha: row[0] || '',
      ejercicio: row[1] || '',
      duracion: Number(row[2]) || 0,
      intensidad: row[3] || 'Media',
      caloriasQuemadas: Number(row[4]) || 0,
      registradoPorIA: row[5] === 'TRUE' || row[5] === 'Si' || row[5] === 'SI'
    }));
  } catch (error) {
    console.warn('No se pudieron recuperar logs de actividad o pestaña vacía:', error);
    return [];
  }
}

// 8. Append Activity Log
export async function appendActivityLog(log: ActivityLog, token: string): Promise<void> {
  const row = [
    log.fecha,
    log.ejercicio,
    log.duracion,
    log.intensidad,
    log.caloriasQuemadas,
    log.registradoPorIA ? 'SI' : 'NO'
  ];

  await makeSheetsRequest('/values/Actividad_Fisica!A:F:append?valueInputOption=USER_ENTERED', {
    method: 'POST',
    body: JSON.stringify({
      range: 'Actividad_Fisica!A:F',
      majorDimension: 'ROWS',
      values: [row]
    })
  }, token);
}

// 9. Fetch Weekly Plan
export async function getWeeklyPlan(token: string): Promise<WeeklyPlan | null> {
  try {
    const data = await makeSheetsRequest('/values/Plan_Semanal!A2:G8', { method: 'GET' }, token);
    const rows = data.values;
    if (!rows || rows.length === 0) return null;

    const planesPorDia: DayPlan[] = rows.map((row: any) => ({
      dia: row[0] || '',
      desayuno: row[1] || '',
      almuerzo: row[2] || '',
      cena: row[3] || '',
      snacks: row[4] || '',
      kcalEstimada: Number(row[5]) || 0,
      entrenamiento: row[6] || ''
    }));

    return {
      creadoEn: new Date().toLocaleDateString(),
      objetivo: 'Sincronizado',
      planesPorDia,
      consejosGenerales: 'Plan cargado directamente desde tu Google Sheet.'
    };
  } catch (error) {
    console.warn('No se pudo recuperar el plan semanal o pestaña vacía:', error);
    return null;
  }
}

// 10. Save Weekly Plan
export async function saveWeeklyPlan(plan: WeeklyPlan, token: string): Promise<void> {
  // Clear existing values of Plan_Semanal first
  try {
    await makeSheetsRequest('/values/Plan_Semanal!A2:G100:clear', {
      method: 'POST'
    }, token);
  } catch (e) {
    console.warn('Intentando limpiar plan existente:', e);
  }

  // Format rows
  const rows = plan.planesPorDia.map(day => [
    day.dia,
    day.desayuno,
    day.almuerzo,
    day.cena,
    day.snacks,
    day.kcalEstimada,
    day.entrenamiento
  ]);

  await makeSheetsRequest('/values/Plan_Semanal!A2:G8?valueInputOption=USER_ENTERED', {
    method: 'PUT',
    body: JSON.stringify({
      range: 'Plan_Semanal!A2:G8',
      majorDimension: 'ROWS',
      values: rows
    })
  }, token);
}
