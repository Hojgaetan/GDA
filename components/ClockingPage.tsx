import React, { useState, useEffect, useCallback } from 'react';
import { Employee, AbsenceRecord, AbsenceType, ABSENCE_TYPES } from '../types';
import { getEmployees, getAbsences, addAbsence, NewAbsenceData } from '../services/absenceService';
import { UserIcon, CalendarIcon, CheckCircleIcon, UserPlusIcon, ClockIcon, ChevronDownIcon } from './icons';

const ClockingPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string>('');
  const [todaysAbsences, setTodaysAbsences] = useState<AbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [newAbsence, setNewAbsence] = useState<Omit<NewAbsenceData, 'employeeId' | 'date'>>({
    type: 'Maladie',
    startTime: '09:00',
    endTime: '17:00',
    notes: '',
  });

  const fetchInitialData = useCallback(async () => {
    try {
      setIsLoading(true);
      const fetchedEmployees = await getEmployees();
      const sortedEmployees = fetchedEmployees.sort((a, b) => a.name.localeCompare(b.name));
      setEmployees(sortedEmployees);
      if (sortedEmployees.length > 0) {
        setSelectedEmployeeId(sortedEmployees[0].id);
      }
    } catch (e) {
      setError('Erreur lors du chargement des employés.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const fetchAbsencesForEmployee = useCallback(async () => {
    if (!selectedEmployeeId) return;
    try {
      const allAbsences = await getAbsences();
      const today = new Date().toISOString().split('T')[0];
      const filtered = allAbsences.filter(
        (a) => a.employeeId === selectedEmployeeId && a.date === today
      ).sort((a,b) => a.startTime.localeCompare(b.startTime));
      setTodaysAbsences(filtered);
    } catch (e) {
      setError('Erreur lors du chargement des absences.');
    }
  }, [selectedEmployeeId]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

  useEffect(() => {
    fetchAbsencesForEmployee();
  }, [fetchAbsencesForEmployee]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setNewAbsence((prev) => ({ ...prev, [name]: value }));
  };
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedEmployeeId) {
      setError('Veuillez sélectionner un employé.');
      return;
    }
    if (newAbsence.startTime >= newAbsence.endTime) {
        setError('L\'heure de début doit être antérieure à l\'heure de fin.');
        return;
    }

    setIsSubmitting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const absenceData: NewAbsenceData = {
        ...newAbsence,
        employeeId: selectedEmployeeId,
        date: new Date().toISOString().split('T')[0],
      };
      await addAbsence(absenceData);
      setSuccessMessage('Absence enregistrée avec succès !');
      fetchAbsencesForEmployee(); // Refresh list
      // Reset form
      setNewAbsence({ type: 'Maladie', startTime: '09:00', endTime: '17:00', notes: '' });
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (e) {
      setError('Une erreur est survenue lors de l\'enregistrement.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getDuration = (start: string, end: string) => {
    const [startH, startM] = start.split(':').map(Number);
    const [endH, endM] = end.split(':').map(Number);
    const diffMinutes = (endH * 60 + endM) - (startH * 60 + startM);
    if (diffMinutes < 0) return '0h';
    const hours = Math.floor(diffMinutes / 60);
    const minutes = diffMinutes % 60;
    return `${hours}h ${minutes > 0 ? `${minutes}min` : ''}`.trim();
  };
  
  const absenceTypeStyles: { [key in AbsenceType]: { border: string; bg: string; text: string; } } = {
    'Maladie': { border: 'border-red-500', bg: 'bg-red-100 dark:bg-red-900/50', text: 'text-red-800 dark:text-red-300' },
    'Congés Payés': { border: 'border-green-500', bg: 'bg-green-100 dark:bg-green-900/50', text: 'text-green-800 dark:text-green-300' },
    'Personnel': { border: 'border-blue-500', bg: 'bg-blue-100 dark:bg-blue-900/50', text: 'text-blue-800 dark:text-blue-300' },
    'Non Justifiée': { border: 'border-yellow-500', bg: 'bg-yellow-100 dark:bg-yellow-900/50', text: 'text-yellow-800 dark:text-yellow-300' },
    'Retard': { border: 'border-purple-500', bg: 'bg-purple-100 dark:bg-purple-900/50', text: 'text-purple-800 dark:text-purple-300' },
  };


  if (isLoading) {
    return <div className="text-center p-10">Chargement...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-8 items-start">
      <div className="lg:col-span-2">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg h-full sticky top-24">
          <h2 className="text-2xl font-bold mb-6 text-center">Pointage Journalier</h2>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="employee" className="block text-sm font-medium text-slate-600 dark:text-slate-300 mb-2">
                Employé
              </label>
              <div className="relative">
                 <UserIcon className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400"/>
                 <select
                    id="employee"
                    value={selectedEmployeeId}
                    onChange={(e) => setSelectedEmployeeId(e.target.value)}
                    className="w-full appearance-none p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                  >
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name}
                      </option>
                    ))}
                 </select>
                 <ChevronDownIcon className="pointer-events-none absolute top-1/2 -translate-y-1/2 right-3 h-5 w-5 text-slate-400"/>
              </div>
            </div>
          </div>


          {selectedEmployeeId && (
            <form onSubmit={handleSubmit} className="mt-6 space-y-5">
              <div>
                <label htmlFor="type" className="block text-sm font-medium mb-2">Type d'absence</label>
                <select id="type" name="type" value={newAbsence.type} onChange={handleInputChange} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500">
                  {ABSENCE_TYPES.map(type => <option key={type} value={type}>{type}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label htmlFor="startTime" className="block text-sm font-medium mb-2">Début</label>
                  <div className="relative">
                    <ClockIcon className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400"/>
                    <input type="time" id="startTime" name="startTime" value={newAbsence.startTime} onChange={handleInputChange} className="w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                </div>
                <div>
                  <label htmlFor="endTime" className="block text-sm font-medium mb-2">Fin</label>
                  <div className="relative">
                    <ClockIcon className="pointer-events-none absolute top-1/2 -translate-y-1/2 left-3 h-5 w-5 text-slate-400"/>
                    <input type="time" id="endTime" name="endTime" value={newAbsence.endTime} onChange={handleInputChange} className="w-full p-3 pl-10 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" />
                  </div>
                </div>
              </div>
              <div>
                <label htmlFor="notes" className="block text-sm font-medium mb-2">Notes (optionnel)</label>
                <textarea id="notes" name="notes" value={newAbsence.notes} onChange={handleInputChange} rows={3} className="w-full p-3 border border-slate-300 dark:border-slate-600 rounded-lg bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500" placeholder="Raison de l'absence..."></textarea>
              </div>
              
              {error && <p className="text-red-500 text-sm">{error}</p>}
              
              <button type="submit" disabled={isSubmitting} className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-primary-700 disabled:bg-primary-300 transition-colors shadow-md hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500">
                {isSubmitting ? 'Enregistrement...' : <> <UserPlusIcon className="w-5 h-5" /> Enregistrer l'absence </>}
              </button>

              {successMessage && (
                <div className="mt-4 p-3 flex items-center gap-3 bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 rounded-lg">
                   <CheckCircleIcon className="w-6 h-6"/>
                   <span className="font-semibold">{successMessage}</span>
                </div>
              )}
            </form>
          )}
        </div>
      </div>

      <div className="lg:col-span-3">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg h-full">
          <h3 className="text-2xl font-bold mb-4 flex items-center gap-3">
            <CalendarIcon className="w-7 h-7 text-primary-500" />
            <span>Absences du jour pour <span className="text-primary-600 dark:text-primary-400">{employees.find(e => e.id === selectedEmployeeId)?.name || '...'}</span></span>
          </h3>
          {todaysAbsences.length > 0 ? (
            <ul className="space-y-4">
              {todaysAbsences.map(absence => {
                  const styles = absenceTypeStyles[absence.type];
                  return (
                    <li key={absence.id} className={`bg-slate-50 dark:bg-slate-700/40 rounded-lg border-l-4 ${styles.border} flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 shadow-sm`}>
                      <div className="flex-grow">
                        <div className="flex justify-between items-start">
                           <span className={`px-2 py-1 text-xs font-semibold rounded-full ${styles.bg} ${styles.text}`}>
                            {absence.type}
                           </span>
                           <p className="font-bold text-lg text-primary-600 dark:text-primary-400 text-right">{getDuration(absence.startTime, absence.endTime)}</p>
                        </div>
                        <p className="font-semibold text-slate-700 dark:text-slate-300 mt-2">{absence.startTime} - {absence.endTime}</p>
                        {absence.notes && <p className="text-sm text-slate-500 dark:text-slate-400 mt-2 italic">"{absence.notes}"</p>}
                      </div>
                    </li>
                  );
                })}
            </ul>
          ) : (
            <div className="text-center text-slate-500 dark:text-slate-400 p-8 flex flex-col items-center justify-center h-[calc(100%-4rem)]">
              <CheckCircleIcon className="w-16 h-16 text-green-400 dark:text-green-500 mb-4" />
              <h4 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Journée complète !</h4>
              <p>Aucune absence n'a été enregistrée pour aujourd'hui.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ClockingPage;

