import { Employee, AbsenceRecord } from '../types';

// Fallback localStorage pour environnements sans DOM (tests/SSR)
const hasLocalStorage = typeof globalThis !== 'undefined' && typeof (globalThis as any).localStorage !== 'undefined';
if (!hasLocalStorage) {
  const mem: Record<string, string> = {};
  (globalThis as any).localStorage = {
    getItem(key: string) { return Object.prototype.hasOwnProperty.call(mem, key) ? mem[key] : null; },
    setItem(key: string, value: string) { mem[key] = String(value); },
    removeItem(key: string) { delete mem[key]; },
    clear() { for (const k of Object.keys(mem)) delete mem[k]; },
    key(i: number) { return Object.keys(mem)[i] ?? null; },
    get length() { return Object.keys(mem).length; },
  } as any;
}

// Configuration API: si VITE_API_URL est défini, on utilise l'API Express
const API_URL = (import.meta as any)?.env?.VITE_API_URL as string | undefined;
const useApi = Boolean(API_URL);

// -------------------- Backend API (Express) --------------------
async function apiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) {
    const msg = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${msg || res.statusText}`);
  }
  // 204 No Content
  if (res.status === 204) return undefined as unknown as T;
  return (await res.json()) as T;
}

// -------------------- Backend localStorage (fallback) --------------------
const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Alice Dubois', role: 'Développeuse Frontend' },
  { id: '2', name: 'Bob Martin', role: 'Chef de Projet' },
  { id: '3', name: 'Charlie Dupont', role: 'Designer UX/UI' },
  { id: '4', name: 'David Lefebvre', role: 'Ingénieur Backend' },
];

const EMPLOYEES_KEY = 'employees';
const ABSENCES_KEY = 'absences';

const initializeData = () => {
  if (!localStorage.getItem(EMPLOYEES_KEY)) {
    localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(MOCK_EMPLOYEES));
  }
  if (!localStorage.getItem(ABSENCES_KEY)) {
    localStorage.setItem(ABSENCES_KEY, JSON.stringify([]));
  }
};

if (!useApi) {
  // On n'initialise le localStorage que si l'API n'est pas utilisée
  try { initializeData(); } catch { /* ignore for non-browser envs */ }
}

// -------------------- API publique (contrat stable) --------------------
export type NewAbsenceData = Omit<AbsenceRecord, 'id'>;
export type NewEmployeeData = Omit<Employee, 'id'>;

export const getEmployees = async (): Promise<Employee[]> => {
  if (useApi) {
    return apiFetch<Employee[]>('/employees', { method: 'GET' });
  }
  const employees = localStorage.getItem(EMPLOYEES_KEY);
  return employees ? JSON.parse(employees) : [];
};

export const getAbsences = async (): Promise<AbsenceRecord[]> => {
  if (useApi) {
    return apiFetch<AbsenceRecord[]>('/absences', { method: 'GET' });
  }
  const absences = localStorage.getItem(ABSENCES_KEY);
  return absences ? JSON.parse(absences) : [];
};

export const addAbsence = async (newAbsence: NewAbsenceData): Promise<AbsenceRecord> => {
  if (useApi) {
    return apiFetch<AbsenceRecord>('/absences', {
      method: 'POST',
      body: JSON.stringify(newAbsence),
    });
  }
  const allAbsences = await getAbsences();
  const record: AbsenceRecord = {
    ...newAbsence,
    id: new Date().toISOString() + Math.random(),
  };
  const updatedAbsences = [...allAbsences, record];
  localStorage.setItem(ABSENCES_KEY, JSON.stringify(updatedAbsences));
  return record;
};

export const addEmployee = async (newEmployee: NewEmployeeData): Promise<Employee> => {
  if (useApi) {
    return apiFetch<Employee>('/employees', {
      method: 'POST',
      body: JSON.stringify(newEmployee),
    });
  }
  const allEmployees = await getEmployees();
  const employee: Employee = {
    ...newEmployee,
    id: new Date().toISOString() + Math.random(),
  };
  const updatedEmployees = [...allEmployees, employee];
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updatedEmployees));
  return employee;
};

export const updateEmployee = async (
  employeeId: string,
  updatedData: Omit<Employee, 'id'>
): Promise<Employee> => {
  if (useApi) {
    return apiFetch<Employee>(`/employees/${employeeId}`, {
      method: 'PUT',
      body: JSON.stringify(updatedData),
    });
  }
  const allEmployees = await getEmployees();
  const employeeIndex = allEmployees.findIndex((e) => e.id === employeeId);
  if (employeeIndex === -1) {
    throw new Error('Employé non trouvé');
  }
  const updatedEmployee = { ...allEmployees[employeeIndex], ...updatedData };
  allEmployees[employeeIndex] = updatedEmployee;
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(allEmployees));
  return updatedEmployee;
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  if (useApi) {
    await apiFetch<void>(`/employees/${employeeId}`, { method: 'DELETE' });
    return;
  }
  const allEmployees = await getEmployees();
  const allAbsences = await getAbsences();
  const updatedEmployees = allEmployees.filter((e) => e.id !== employeeId);
  const updatedAbsences = allAbsences.filter((a) => a.employeeId !== employeeId);
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updatedEmployees));
  localStorage.setItem(ABSENCES_KEY, JSON.stringify(updatedAbsences));
};
