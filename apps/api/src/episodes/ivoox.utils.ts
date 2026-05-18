/**
 * Extrae el ID numérico de audio de iVoox a partir de cualquier URL compatible (enclosure RSS o página web).
 */
export function extractIvooxId(url: string): string | null {
  if (!url) return null;
  
  // Buscar patrones comunes de iVoox como _mf_173781546_ o _rf_173781546_
  const match = url.match(/_(?:mf|rf)_(\d+)/i);
  if (match) return match[1];

  // Buscar listen_md_173781546 o listen_mn_173781546
  const matchListen = url.match(/listen_(?:md|mn)_(\d+)/i);
  if (matchListen) return matchListen[1];
  
  // Buscar último bloque numérico largo antes de la extensión (ej. .../podcast-download_ep_173781546_1.html)
  const matchNumeric = url.match(/\/(\d+)(?:_[^/]+)?\.(?:mp3|html)/i);
  if (matchNumeric) return matchNumeric[1];

  // Buscar cualquier número largo secuencial (de entre 7 y 10 dígitos) que suele representar el ID de audio en iVoox
  const matchDigits = url.match(/\b(\d{7,10})\b/);
  if (matchDigits) return matchDigits[1];

  return null;
}

/**
 * Limpia y reescribe la URL de iVoox al formato limpio de streaming del reproductor web (listen_mn).
 * Si la URL no es de iVoox o no se puede extraer el ID, se retorna la URL original como fallback.
 */
export function cleanIvooxUrl(url: string): string {
  if (!url) return url;
  
  // Verificar si es de iVoox
  if (!url.includes('ivoox.com')) {
    return url;
  }
  
  const audioId = extractIvooxId(url);
  if (audioId) {
    return `https://www.ivoox.com/listen_mn_${audioId}_1.mp3`;
  }
  
  return url;
}
