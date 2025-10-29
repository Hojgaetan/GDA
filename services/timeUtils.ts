// Utilitaires de temps pour calculer des durées et valider des horaires
// Contrat:
// - parseTimeHHMM("HH:MM") -> minutes depuis minuit (throws si invalide)
// - durationMinutes("HH:MM","HH:MM", { allowOverMidnight?: boolean }) -> minutes (>=0)
// - formatMinutes(min) -> "HhMM" (ex: 1h05)

export function parseTimeHHMM(value: string): number {
  if (typeof value !== 'string') throw new Error('Heure invalide');
  const m = value.match(/^([01]?\d|2[0-3]):([0-5]\d)$/);
  if (!m) throw new Error(`Heure invalide: ${value}`);
  const hours = parseInt(m[1], 10);
  const minutes = parseInt(m[2], 10);
  return hours * 60 + minutes;
}

export function durationMinutes(start: string, end: string, opts: { allowOverMidnight?: boolean } = {}): number {
  const s = parseTimeHHMM(start);
  const e = parseTimeHHMM(end);
  if (e < s) {
    if (opts.allowOverMidnight) {
      // passage minuit: ajouter 24h
      return (e + 24 * 60) - s;
    }
    throw new Error('Heure de fin antérieure à l\'heure de début');
  }
  return e - s;
}

export function formatMinutes(total: number): string {
  if (!Number.isFinite(total) || total < 0) return '0h00';
  const h = Math.floor(total / 60);
  const m = Math.round(total % 60);
  return `${h}h${m.toString().padStart(2, '0')}`;
}

