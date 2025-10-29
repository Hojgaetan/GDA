
export interface Employee {
  id: string;
  name: string;
  role: string;
}

export const ABSENCE_TYPES = ['Maladie', 'Congés Payés', 'Personnel', 'Non Justifiée', 'Retard'] as const;
export type AbsenceType = typeof ABSENCE_TYPES[number];


export interface AbsenceRecord {
  id: string;
  employeeId: string;
  date: string; // YYYY-MM-DD
  type: AbsenceType;
  startTime: string; // HH:MM
  endTime: string; // HH:MM
  notes?: string;
}
