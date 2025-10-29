import React, { useState, useEffect, useMemo, useRef } from 'react';
import { Employee, AbsenceRecord, ABSENCE_TYPES, AbsenceType } from '../types';
import { getEmployees, getAbsences, addEmployee, NewEmployeeData, updateEmployee, deleteEmployee } from '../services/absenceService';
import { UsersIcon, BarChartIcon, AlertTriangleIcon, UserPlusIcon, DownloadIcon, PencilIcon, TrashIcon, XMarkIcon, CheckCircleIcon } from './icons';
import { durationMinutes, formatMinutes } from '../services/timeUtils';

// Tell TypeScript that Chart is globally available from the CDN
declare const Chart: any;

interface Metrics {
  totalEmployees: number;
  absencesThisMonth: number;
  mostCommonAbsenceType: string;
}

const MetricCard: React.FC<{ title: string; value: string | number; icon: React.ReactNode }> = ({ title, value, icon }) => (
  <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg flex items-center gap-4">
    <div className="bg-primary-100 dark:bg-primary-900/50 p-3 rounded-full text-primary-600 dark:text-primary-300">
      {icon}
    </div>
    <div>
      <p className="text-sm text-slate-500 dark:text-slate-400">{title}</p>
      <p className="text-2xl font-bold">{value}</p>
    </div>
  </div>
);

const DashboardPage: React.FC = () => {
  const [employees, setEmployees] = useState<Employee[]>([]);
  const [absences, setAbsences] = useState<AbsenceRecord[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // States for filters
  const [selectedEmployee, setSelectedEmployee] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');

  // States for employee management
  const [newEmployeeName, setNewEmployeeName] = useState('');
  const [newEmployeeRole, setNewEmployeeRole] = useState('');
  const [isAddingEmployee, setIsAddingEmployee] = useState(false);
  const [addEmployeeError, setAddEmployeeError] = useState<string | null>(null);

  const [editingEmployee, setEditingEmployee] = useState<Employee | null>(null);
  const [isUpdatingEmployee, setIsUpdatingEmployee] = useState(false);
  const [updateEmployeeError, setUpdateEmployeeError] = useState<string | null>(null);

  const [notification, setNotification] = useState<{ message: string; type: 'success' } | null>(null);


  // Refs for charts
  const chartByTypeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartByTypeInstanceRef = useRef<any | null>(null);
  const chartByEmployeeCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const chartByEmployeeInstanceRef = useRef<any | null>(null);


  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const [empData, absData] = await Promise.all([getEmployees(), getAbsences()]);
        setEmployees(empData.sort((a,b) => a.name.localeCompare(b.name)));
        setAbsences(absData);
      } catch (e) {
        setError("Erreur lors de la récupération des données du dashboard.");
      } finally {
        setIsLoading(false);
      }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  const handleDatePreset = (preset: 'last7days' | 'thisMonth' | 'lastMonth') => {
    const getISODateString = (date: Date) => date.toISOString().split('T')[0];
    const today = new Date();
    let start = new Date();
    let end = new Date();

    switch(preset) {
        case 'last7days':
            end = new Date(today);
            start.setDate(today.getDate() - 6);
            break;
        case 'thisMonth':
            end = new Date(today);
            start = new Date(today.getFullYear(), today.getMonth(), 1);
            break;
        case 'lastMonth':
            start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
            end = new Date(today.getFullYear(), today.getMonth(), 0);
            break;
    }
    setStartDate(getISODateString(start));
    setEndDate(getISODateString(end));
  };

  const metrics: Metrics = useMemo(() => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const absencesThisMonth = absences.filter(a => {
      const date = new Date(a.date);
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    const typeCounts: { [key: string]: number } = {};
    absencesThisMonth.forEach(a => {
      typeCounts[a.type] = (typeCounts[a.type] || 0) + 1;
    });

    const mostCommonType = Object.entries(typeCounts).sort(([, a], [, b]) => b - a)[0]?.[0] || 'N/A';
    
    return {
      totalEmployees: employees.length,
      absencesThisMonth: absencesThisMonth.length,
      mostCommonAbsenceType: mostCommonType
    };
  }, [employees, absences]);
  
  const filteredAbsences = useMemo(() => {
    return absences
    .map(absence => ({
        ...absence,
        employeeName: employees.find(e => e.id === absence.employeeId)?.name || 'Inconnu'
    }))
    .filter(absence => {
        const employeeMatch = selectedEmployee === 'all' || absence.employeeId === selectedEmployee;
        const typeMatch = selectedType === 'all' || absence.type === selectedType;
        const startDateMatch = !startDate || absence.date >= startDate;
        const endDateMatch = !endDate || absence.date <= endDate;
        
        return employeeMatch && typeMatch && startDateMatch && endDateMatch;
    })
    .sort((a, b) => b.date.localeCompare(a.date));
  }, [absences, employees, selectedEmployee, selectedType, startDate, endDate]);

  const chartData = useMemo(() => {
    const dateFiltered = absences.filter(absence => {
        const startDateMatch = !startDate || absence.date >= startDate;
        const endDateMatch = !endDate || absence.date <= endDate;
        return startDateMatch && endDateMatch;
    });

    const byType = dateFiltered.reduce((acc, a) => {
        acc[a.type] = (acc[a.type] || 0) + 1;
        return acc;
    }, {} as Record<AbsenceType, number>);

    const byEmployee = dateFiltered.reduce((acc, a) => {
        const employeeName = employees.find(e => e.id === a.employeeId)?.name || 'Inconnu';
        acc[employeeName] = (acc[employeeName] || 0) + 1;
        return acc;
    }, {} as Record<string, number>);

    const sortedByEmployee = Object.entries(byEmployee).sort(([, a], [, b]) => b - a);

    return { byType, byEmployee: sortedByEmployee };
  }, [absences, employees, startDate, endDate]);

  // Statistiques avancées (durée totale, moyennes, tops)
  const advancedStats = useMemo(() => {
    const dateFiltered = absences.filter(a => (!startDate || a.date >= startDate) && (!endDate || a.date <= endDate));
    let totalMinutes = 0;
    const minutesByEmployee = new Map<string, number>();
    const countsByType = new Map<AbsenceType, number>();

    for (const a of dateFiltered) {
      const mins = durationMinutes(a.startTime, a.endTime, { allowOverMidnight: false });
      totalMinutes += mins;
      const empName = employees.find(e => e.id === a.employeeId)?.name || 'Inconnu';
      minutesByEmployee.set(empName, (minutesByEmployee.get(empName) || 0) + mins);
      countsByType.set(a.type, (countsByType.get(a.type) || 0) + 1);
    }

    const topEmployeesByDuration = Array.from(minutesByEmployee.entries()).sort((a,b) => b[1]-a[1]).slice(0, 5);
    const topTypes = Array.from(countsByType.entries()).sort((a,b) => b[1]-a[1]).slice(0, 3);

    const avgPerDay = (() => {
      const days = new Set(dateFiltered.map(a => a.date)).size || 1;
      return Math.round(totalMinutes / days);
    })();

    return {
      totalMinutes,
      totalFormatted: formatMinutes(totalMinutes),
      topEmployeesByDuration,
      topTypes,
      avgPerDayMinutes: avgPerDay,
      avgPerDayFormatted: formatMinutes(avgPerDay),
      count: dateFiltered.length,
    };
  }, [absences, employees, startDate, endDate]);

  useEffect(() => {
    if (!chartByTypeCanvasRef.current) return;
    
    const isDark = document.documentElement.classList.contains('dark');
    const ctx = chartByTypeCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartByTypeInstanceRef.current) {
        chartByTypeInstanceRef.current.destroy();
    }

    const absenceTypeColors: { [key in AbsenceType]: string } = {
        'Maladie': 'rgba(239, 68, 68, 0.8)',
        'Congés Payés': 'rgba(34, 197, 94, 0.8)',
        'Personnel': 'rgba(59, 130, 246, 0.8)',
        'Non Justifiée': 'rgba(234, 179, 8, 0.8)',
        'Retard': 'rgba(168, 85, 247, 0.8)',
    };

    const data = chartData.byType;
    const labels = Object.keys(data) as AbsenceType[];
    
    if (labels.length === 0) return;

    chartByTypeInstanceRef.current = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                label: 'Absences',
                data: labels.map(label => data[label]),
                backgroundColor: labels.map(label => absenceTypeColors[label]),
                borderColor: isDark ? '#1e293b' : '#ffffff',
                borderWidth: 3,
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { position: 'bottom', labels: { color: isDark ? '#cbd5e1' : '#475569', padding: 15 } },
            }
        }
    });
  }, [chartData]);
  
  useEffect(() => {
    if (!chartByEmployeeCanvasRef.current) return;

    const isDark = document.documentElement.classList.contains('dark');
    const ctx = chartByEmployeeCanvasRef.current.getContext('2d');
    if (!ctx) return;

    if (chartByEmployeeInstanceRef.current) {
        chartByEmployeeInstanceRef.current.destroy();
    }

    const data = chartData.byEmployee;
    if (data.length === 0) return;

    chartByEmployeeInstanceRef.current = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: data.map(d => d[0]),
            datasets: [{
                label: 'Nb. d\'absences',
                data: data.map(d => d[1]),
                backgroundColor: 'rgba(59, 130, 246, 0.8)',
                borderColor: 'rgba(59, 130, 246, 1)',
                borderWidth: 1
            }]
        },
        options: {
            indexAxis: 'y',
            responsive: true,
            maintainAspectRatio: false,
            scales: {
                x: {
                    beginAtZero: true,
                    grid: { color: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)' },
                    ticks: { color: isDark ? '#cbd5e1' : '#475569', precision: 0 },
                },
                y: {
                    grid: { display: false },
                    ticks: { color: isDark ? '#cbd5e1' : '#475569' }
                }
            },
            plugins: { legend: { display: false } }
        }
    });
  }, [chartData]);


  const handleExportToCSV = () => {
    if (filteredAbsences.length === 0) return;
    const escapeCsvCell = (cell: any): string => {
        const cellString = String(cell ?? '');
        if (cellString.includes(',') || cellString.includes('"') || cellString.includes('\n')) {
            return `"${cellString.replace(/"/g, '""')}"`;
        }
        return cellString;
    };
    const headers = ['Employé', 'Date', 'Type', 'Heure de début', 'Heure de fin', 'Notes'];
    const rows = filteredAbsences.map(a => [
        a.employeeName, new Date(a.date).toLocaleDateString('fr-CA', { timeZone: 'UTC' }),
        a.type, a.startTime, a.endTime, a.notes || ''
    ].map(escapeCsvCell));
    const csvContent = [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    const filename = `export-absences-${new Date().toISOString().split('T')[0]}.csv`;
    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleAddNewEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEmployeeName.trim() || !newEmployeeRole.trim()) {
        setAddEmployeeError("Le nom et le rôle ne peuvent pas être vides.");
        return;
    }
    setIsAddingEmployee(true);
    setAddEmployeeError(null);
    try {
        const newEmployeeData: NewEmployeeData = { name: newEmployeeName, role: newEmployeeRole };
        const addedEmployee = await addEmployee(newEmployeeData);
        setEmployees(prev => [...prev, addedEmployee].sort((a,b) => a.name.localeCompare(b.name)));
        setNewEmployeeName('');
        setNewEmployeeRole('');
        setNotification({ message: 'Employé ajouté avec succès !', type: 'success' });
    } catch (err) {
        setAddEmployeeError("Erreur lors de l'ajout de l'employé.");
    } finally {
        setIsAddingEmployee(false);
    }
  };

  const handleDeleteEmployee = async (employeeId: string) => {
    if(window.confirm("Êtes-vous sûr de vouloir supprimer cet employé ? Toutes ses absences seront également effacées définitivement.")) {
        try {
            await deleteEmployee(employeeId);
            setEmployees(prev => prev.filter(emp => emp.id !== employeeId));
            setAbsences(prev => prev.filter(abs => abs.employeeId !== employeeId));
            setNotification({ message: 'Employé supprimé avec succès.', type: 'success' });
        } catch (err) {
            alert("Erreur lors de la suppression de l'employé.");
        }
    }
  };

  const handleUpdateEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingEmployee || !editingEmployee.name.trim() || !editingEmployee.role.trim()) {
        setUpdateEmployeeError("Le nom et le rôle sont requis.");
        return;
    }
    setIsUpdatingEmployee(true);
    setUpdateEmployeeError(null);
    try {
        const updated = await updateEmployee(editingEmployee.id, { name: editingEmployee.name, role: editingEmployee.role });
        setEmployees(prev => prev.map(emp => emp.id === updated.id ? updated : emp).sort((a,b) => a.name.localeCompare(b.name)));
        setEditingEmployee(null);
        setNotification({ message: 'Employé mis à jour avec succès.', type: 'success' });
    } catch(err) {
        setUpdateEmployeeError("Erreur lors de la mise à jour.");
    } finally {
        setIsUpdatingEmployee(false);
    }
  };

  if (isLoading) return <div className="text-center p-10">Chargement du dashboard...</div>;
  if (error) return <div className="text-center p-10 text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        <MetricCard title="Total Employés" value={metrics.totalEmployees} icon={<UsersIcon className="w-6 h-6" />} />
        <MetricCard title="Absences ce mois-ci" value={metrics.absencesThisMonth} icon={<BarChartIcon className="w-6 h-6" />} />
        <MetricCard title="Type le plus fréquent" value={metrics.mostCommonAbsenceType} icon={<AlertTriangleIcon className="w-6 h-6" />} />
      </div>

       <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
           <h3 className="text-xl font-bold mb-4">Absences par Type</h3>
           <div className="relative h-80">
             {Object.keys(chartData.byType).length > 0 ? (
               <canvas ref={chartByTypeCanvasRef}></canvas>
             ) : (
               <div className="flex items-center justify-center h-full text-slate-500">
                 Aucune donnée pour la période sélectionnée.
               </div>
             )}
           </div>
         </div>
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
           <h3 className="text-xl font-bold mb-4">Absences par Employé</h3>
           <div className="relative h-80">
             {chartData.byEmployee.length > 0 ? (
               <canvas ref={chartByEmployeeCanvasRef}></canvas>
             ) : (
               <div className="flex items-center justify-center h-full text-slate-500">
                 Aucune donnée pour la période sélectionnée.
               </div>
             )}
           </div>
         </div>
       </div>

      <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h2 className="text-2xl font-bold whitespace-nowrap">Historique des absences</h2>
            <div className="w-full md:w-auto flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-2">
                <select
                    aria-label="Filtrer par employé"
                    value={selectedEmployee}
                    onChange={e => setSelectedEmployee(e.target.value)}
                    className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="all">Tous les employés</option>
                    {employees.map(emp => (
                        <option key={emp.id} value={emp.id}>{emp.name}</option>
                    ))}
                </select>
                <select
                    aria-label="Filtrer par type d'absence"
                    value={selectedType}
                    onChange={e => setSelectedType(e.target.value)}
                    className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                >
                    <option value="all">Tous les types</option>
                    {ABSENCE_TYPES.map(type => (
                        <option key={type} value={type}>{type}</option>
                    ))}
                </select>
                <div className="flex flex-col gap-2">
                    <div className="flex items-center gap-2">
                        <input 
                            type="date"
                            aria-label="Date de début"
                            value={startDate}
                            onChange={e => setStartDate(e.target.value)}
                            max={endDate || ''}
                            className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
                        />
                        <span className="text-slate-500">-</span>
                        <input 
                            type="date"
                            aria-label="Date de fin"
                            value={endDate}
                            onChange={e => setEndDate(e.target.value)}
                            min={startDate || ''}
                            className="p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500 w-full"
                        />
                    </div>
                     <div className="flex items-center gap-2">
                        <button type="button" onClick={() => handleDatePreset('last7days')} className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-300 dark:hover:bg-primary-900 rounded-md transition-colors">7 jours</button>
                        <button type="button" onClick={() => handleDatePreset('thisMonth')} className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-300 dark:hover:bg-primary-900 rounded-md transition-colors">Ce mois-ci</button>
                        <button type="button" onClick={() => handleDatePreset('lastMonth')} className="px-2 py-1 text-xs font-medium text-primary-700 bg-primary-100 hover:bg-primary-200 dark:bg-primary-900/50 dark:text-primary-300 dark:hover:bg-primary-900 rounded-md transition-colors">Mois dernier</button>
                    </div>
                </div>
                <button 
                    onClick={() => {
                        setSelectedEmployee('all');
                        setSelectedType('all');
                        setStartDate('');
                        setEndDate('');
                    }} 
                    className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-300 bg-slate-200 dark:bg-slate-600 hover:bg-slate-300 dark:hover:bg-slate-500 rounded-md transition-colors"
                >
                    Réinitialiser
                </button>
                <button 
                    onClick={handleExportToCSV}
                    disabled={filteredAbsences.length === 0}
                    className="px-4 py-2 flex items-center gap-2 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 rounded-md transition-colors disabled:bg-green-300 dark:disabled:bg-green-800 disabled:cursor-not-allowed"
                >
                    <DownloadIcon className="w-4 h-4" />
                    Exporter (Excel)
                </button>
            </div>
        </div>

        <div className="overflow-auto max-h-[60vh] border border-slate-200 dark:border-slate-700 rounded-lg">
            <table className="w-full text-left">
                <thead className="bg-slate-100 dark:bg-slate-700 sticky top-0 z-10 border-b-2 border-slate-300 dark:border-slate-600">
                    <tr>
                        <th className="p-3 font-semibold">Employé</th>
                        <th className="p-3 font-semibold">Date</th>
                        <th className="p-3 font-semibold">Type</th>
                        <th className="p-3 font-semibold">Période</th>
                        <th className="p-3 font-semibold hidden md:table-cell">Notes</th>
                    </tr>
                </thead>
                <tbody>
                    {filteredAbsences.map(absence => (
                        <tr key={absence.id} className="border-b border-slate-200 dark:border-slate-700 even:bg-slate-50 dark:even:bg-slate-700/40 hover:bg-slate-100 dark:hover:bg-slate-600">
                            <td className="p-3 font-medium">{absence.employeeName}</td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{new Date(absence.date).toLocaleDateString('fr-FR', {timeZone: 'UTC'})}</td>
                            <td className="p-3">
                                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                                  absence.type === 'Maladie' ? 'bg-red-200 text-red-800' :
                                  absence.type === 'Congés Payés' ? 'bg-green-200 text-green-800' :
                                  absence.type === 'Personnel' ? 'bg-blue-200 text-blue-800' :
                                  'bg-yellow-200 text-yellow-800'
                                }`}>
                                  {absence.type}
                                </span>
                            </td>
                            <td className="p-3 text-slate-600 dark:text-slate-400">{absence.startTime} - {absence.endTime}</td>
                            <td className="p-3 text-sm text-slate-500 hidden md:table-cell max-w-xs truncate">{absence.notes}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            {filteredAbsences.length === 0 && <p className="text-center p-8 text-slate-500">Aucune absence ne correspond à vos filtres.</p>}
        </div>
      </div>
       <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-4">Gestion des employés</h3>
            
            <div className="mb-6 max-h-48 overflow-y-auto pr-2 space-y-2">
                {employees.map(emp => (
                    <div key={emp.id} className="flex justify-between items-center p-2 bg-slate-100 dark:bg-slate-700 rounded-md">
                        <div>
                            <p className="font-semibold">{emp.name}</p>
                            <p className="text-sm text-slate-500 dark:text-slate-400">{emp.role}</p>
                        </div>
                        <div className="flex items-center gap-3">
                            <button onClick={() => setEditingEmployee(emp)} className="text-slate-500 hover:text-primary-600 dark:hover:text-primary-400" aria-label={`Modifier ${emp.name}`}>
                                <PencilIcon className="w-5 h-5"/>
                            </button>
                            <button onClick={() => handleDeleteEmployee(emp.id)} className="text-slate-500 hover:text-red-600 dark:hover:text-red-400" aria-label={`Supprimer ${emp.name}`}>
                                <TrashIcon className="w-5 h-5"/>
                            </button>
                        </div>
                    </div>
                ))}
            </div>
            
            <form onSubmit={handleAddNewEmployee} className="space-y-3 border-t border-slate-200 dark:border-slate-700 pt-4">
                <h4 className="font-semibold">Ajouter un nouvel employé</h4>
                <div>
                    <label htmlFor="employeeName" className="block text-sm font-medium mb-1">Nom complet</label>
                    <input 
                        id="employeeName"
                        type="text"
                        placeholder="Ex: Jean Martin"
                        value={newEmployeeName}
                        onChange={e => setNewEmployeeName(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                <div>
                    <label htmlFor="employeeRole" className="block text-sm font-medium mb-1">Rôle</label>
                    <input 
                        id="employeeRole"
                        type="text"
                        placeholder="Ex: Développeur"
                        value={newEmployeeRole}
                        onChange={e => setNewEmployeeRole(e.target.value)}
                        className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                    />
                </div>
                {addEmployeeError && <p className="text-sm text-red-500">{addEmployeeError}</p>}
                <button type="submit" disabled={isAddingEmployee} className="w-full flex justify-center items-center gap-2 bg-primary-600 text-white font-bold py-2 px-4 rounded-md hover:bg-primary-700 disabled:bg-primary-300 transition-colors">
                    {isAddingEmployee ? 'Ajout en cours...' : <><UserPlusIcon className="w-5 h-5" /> Ajouter l'employé</>}
                </button>
            </form>
         </div>
         <div className="bg-white dark:bg-slate-800 p-6 rounded-xl shadow-lg">
            <h3 className="text-xl font-bold mb-2">Rapports & Statistiques</h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                <p className="text-sm text-slate-500">Durée totale (période)</p>
                <p className="text-2xl font-bold">{advancedStats.totalFormatted}</p>
                <p className="text-xs text-slate-500">{advancedStats.count} événements</p>
              </div>
              <div className="p-4 rounded-lg bg-slate-50 dark:bg-slate-700/40">
                <p className="text-sm text-slate-500">Moyenne par jour</p>
                <p className="text-2xl font-bold">{advancedStats.avgPerDayFormatted}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h4 className="font-semibold mb-2">Top employés (durée)</h4>
                {advancedStats.topEmployeesByDuration.length > 0 ? (
                  <ul className="space-y-1">
                    {advancedStats.topEmployeesByDuration.map(([name, mins]) => (
                      <li key={name} className="flex justify-between text-sm">
                        <span>{name}</span>
                        <span className="font-medium">{formatMinutes(mins)}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm">Aucune donnée</p>
                )}
              </div>
              <div>
                <h4 className="font-semibold mb-2">Types les plus fréquents</h4>
                {advancedStats.topTypes.length > 0 ? (
                  <ul className="space-y-1">
                    {advancedStats.topTypes.map(([type, count]) => (
                      <li key={type} className="flex justify-between text-sm">
                        <span>{type}</span>
                        <span className="font-medium">{count}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-slate-500 text-sm">Aucune donnée</p>
                )}
              </div>
            </div>
         </div>
       </div>

      {editingEmployee && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" aria-modal="true" role="dialog">
            <div className="bg-white dark:bg-slate-800 rounded-xl shadow-2xl p-6 w-full max-w-md relative">
                <button onClick={() => setEditingEmployee(null)} className="absolute top-3 right-3 text-slate-500 hover:text-slate-800 dark:hover:text-slate-200" aria-label="Fermer la fenêtre de modification">
                    <XMarkIcon className="w-6 h-6"/>
                </button>
                <h3 className="text-xl font-bold mb-4">Modifier l'employé</h3>
                <form onSubmit={handleUpdateEmployee} className="space-y-4">
                     <div>
                        <label htmlFor="editEmployeeName" className="block text-sm font-medium mb-1">Nom complet</label>
                        <input 
                            id="editEmployeeName"
                            type="text"
                            value={editingEmployee.name}
                            onChange={e => setEditingEmployee(prev => prev ? {...prev, name: e.target.value} : null)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    <div>
                        <label htmlFor="editEmployeeRole" className="block text-sm font-medium mb-1">Rôle</label>
                        <input 
                            id="editEmployeeRole"
                            type="text"
                            value={editingEmployee.role}
                            onChange={e => setEditingEmployee(prev => prev ? {...prev, role: e.target.value} : null)}
                            className="w-full p-2 border border-slate-300 dark:border-slate-600 rounded-md bg-white dark:bg-slate-700 focus:ring-2 focus:ring-primary-500 focus:border-primary-500"
                        />
                    </div>
                    {updateEmployeeError && <p className="text-sm text-red-500">{updateEmployeeError}</p>}
                    <div className="flex justify-end gap-3 pt-2">
                        <button type="button" onClick={() => setEditingEmployee(null)} className="px-4 py-2 text-sm font-semibold text-slate-700 bg-slate-200 hover:bg-slate-300 dark:text-slate-200 dark:bg-slate-600 dark:hover:bg-slate-500 rounded-md transition-colors">
                            Annuler
                        </button>
                        <button type="submit" disabled={isUpdatingEmployee} className="px-4 py-2 text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:bg-primary-300 rounded-md transition-colors">
                            {isUpdatingEmployee ? 'Sauvegarde...' : 'Sauvegarder'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
      )}

      {notification && (
        <div 
          role="alert"
          className="fixed bottom-5 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 px-6 py-3 rounded-lg shadow-lg text-white bg-green-600 animate-fade-in-up"
        >
          <CheckCircleIcon className="w-6 h-6" /> 
          <span className="font-semibold">{notification.message}</span>
        </div>
      )}
    </div>
  );
};

export default DashboardPage;

