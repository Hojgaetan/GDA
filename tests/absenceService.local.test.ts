import { describe, it, expect, beforeEach } from 'vitest';
import * as service from '../services/absenceService';
import { ABSENCE_TYPES, AbsenceRecord, Employee } from '../types';

// On force le mode localStorage en s'assurant que VITE_API_URL est undefined
// Vitest utilise JSDOM -> localStorage disponible.

declare const global: any;

function resetLocalStorage() {
  localStorage.clear();
}

function sampleEmployee(name = 'Test User'): Omit<Employee, 'id'> {
  return { name, role: 'Dev' };
}

function sampleAbsence(employeeId: string): Omit<AbsenceRecord, 'id'> {
  return {
    employeeId,
    date: '2025-01-15',
    type: ABSENCE_TYPES[0],
    startTime: '09:00',
    endTime: '10:00',
    notes: 'Test'
  };
}

describe('absenceService (localStorage)', () => {
  beforeEach(() => {
    resetLocalStorage();
    // Ré-initialise les données mock si le service s'attend à le faire au import.
    // Ici, comme l'initialisation est au module load, on s'assure que getEmployees/Absences créent les clés si absentes.
  });

  it('ajoute et récupère un employé', async () => {
    const added = await service.addEmployee(sampleEmployee('Alice'));
    expect(added.id).toBeTruthy();
    const employees = await service.getEmployees();
    // Le service ajoute des MOCK_EMPLOYEES si non définis; comme on clear, il ré-initialise avec mocks.
    expect(employees.some(e => e.id === added.id)).toBe(true);
  });

  it('met à jour un employé', async () => {
    const emp = await service.addEmployee(sampleEmployee('Bob'));
    const updated = await service.updateEmployee(emp.id, { name: 'Bobby', role: 'Lead' });
    expect(updated.name).toBe('Bobby');
    const employees = await service.getEmployees();
    const found = employees.find(e => e.id === emp.id)!;
    expect(found.role).toBe('Lead');
  });

  it('supprime un employé et ses absences', async () => {
    const emp = await service.addEmployee(sampleEmployee('Charlie'));
    const abs = await service.addAbsence(sampleAbsence(emp.id));
    let absences = await service.getAbsences();
    expect(absences.some(a => a.id === abs.id)).toBe(true);

    await service.deleteEmployee(emp.id);

    const employees = await service.getEmployees();
    expect(employees.some(e => e.id === emp.id)).toBe(false);

    absences = await service.getAbsences();
    expect(absences.some(a => a.employeeId === emp.id)).toBe(false);
  });
});

