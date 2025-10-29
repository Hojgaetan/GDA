import { Employee, AbsenceRecord, AbsenceType } from '../types';

const MOCK_EMPLOYEES: Employee[] = [
  { id: '1', name: 'Alice Dubois', role: 'Développeuse Frontend' },
  { id: '2', name: 'Bob Martin', role: 'Chef de Projet' },
  { id: '3', name: 'Charlie Dupont', role: 'Designer UX/UI' },
  { id: '4', name: 'David Lefebvre', role: 'Ingénieur Backend' },
];

const EMPLOYEES_KEY = 'employees';
const ABSENCES_KEY = 'absences';

// Initialize with mock data if localStorage is empty
const initializeData = () => {
    if (!localStorage.getItem(EMPLOYEES_KEY)) {
        localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(MOCK_EMPLOYEES));
    }
    if (!localStorage.getItem(ABSENCES_KEY)) {
        localStorage.setItem(ABSENCES_KEY, JSON.stringify([]));
    }
};

initializeData();

export const getEmployees = async (): Promise<Employee[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const employees = localStorage.getItem(EMPLOYEES_KEY);
      resolve(employees ? JSON.parse(employees) : []);
    }, 200);
  });
};

export const getAbsences = async (): Promise<AbsenceRecord[]> => {
  return new Promise((resolve) => {
    setTimeout(() => {
      const absences = localStorage.getItem(ABSENCES_KEY);
      resolve(absences ? JSON.parse(absences) : []);
    }, 300);
  });
};

export type NewAbsenceData = Omit<AbsenceRecord, 'id'>;
export type NewEmployeeData = Omit<Employee, 'id'>;

export const addAbsence = async (newAbsence: NewAbsenceData): Promise<AbsenceRecord> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const allAbsences = await getAbsences();
      const record: AbsenceRecord = {
        ...newAbsence,
        id: new Date().toISOString() + Math.random(),
      };
      const updatedAbsences = [...allAbsences, record];
      localStorage.setItem(ABSENCES_KEY, JSON.stringify(updatedAbsences));
      resolve(record);
    }, 400);
  });
};

export const addEmployee = async (newEmployee: NewEmployeeData): Promise<Employee> => {
  return new Promise((resolve) => {
    setTimeout(async () => {
      const allEmployees = await getEmployees();
      const employee: Employee = {
        ...newEmployee,
        id: new Date().toISOString() + Math.random(),
      };
      const updatedEmployees = [...allEmployees, employee];
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updatedEmployees));
      resolve(employee);
    }, 300);
  });
};

export const updateEmployee = async (employeeId: string, updatedData: Omit<Employee, 'id'>): Promise<Employee> => {
  return new Promise(async (resolve, reject) => {
    setTimeout(async () => {
      const allEmployees = await getEmployees();
      const employeeIndex = allEmployees.findIndex(e => e.id === employeeId);
      if (employeeIndex === -1) {
        return reject(new Error("Employé non trouvé"));
      }
      const updatedEmployee = { ...allEmployees[employeeIndex], ...updatedData };
      allEmployees[employeeIndex] = updatedEmployee;
      localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(allEmployees));
      resolve(updatedEmployee);
    }, 300);
  });
};

export const deleteEmployee = async (employeeId: string): Promise<void> => {
  // Simulate network delay
  await new Promise(resolve => setTimeout(resolve, 400));

  // Get current data
  const allEmployees = await getEmployees();
  const allAbsences = await getAbsences();

  // Filter out the deleted employee and their absences
  const updatedEmployees = allEmployees.filter(e => e.id !== employeeId);
  const updatedAbsences = allAbsences.filter(a => a.employeeId !== employeeId);

  // Save the updated data back to localStorage
  localStorage.setItem(EMPLOYEES_KEY, JSON.stringify(updatedEmployees));
  localStorage.setItem(ABSENCES_KEY, JSON.stringify(updatedAbsences));
};