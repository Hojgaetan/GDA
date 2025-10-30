import React, { useState, useEffect } from 'react';
import { ClockIcon, DashboardIcon, MoonIcon, SunIcon } from './components/icons';
import ClockingPage from './components/ClockingPage';
import DashboardPage from './components/DashboardPage';

type Page = 'clocking' | 'dashboard';

const App: React.FC = () => {
  const [page, setPage] = useState<Page>('clocking');
  const [isDarkMode, setIsDarkMode] = useState(false);
  // Version exposée via Vite
  const appVersion = (process.env.APP_VERSION as string) || '0.0.0';

  useEffect(() => {
    if (window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches) {
      setIsDarkMode(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    setIsDarkMode(!isDarkMode);
    document.documentElement.classList.toggle('dark');
  };

  const NavButton: React.FC<{
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }> = ({ active, onClick, children }) => (
    <button
      onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-colors ${
        active
          ? 'bg-primary-500 text-white'
          : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
      }`}
    >
      {children}
    </button>
  );

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white dark:bg-slate-800 shadow-md sticky top-0 z-10">
        <div className="container mx-auto px-4 py-3 flex justify-between items-center">
          <h1 className="text-xl md:text-2xl font-bold text-primary-600 dark:text-primary-400">
            GDA
          </h1>
          <nav className="flex items-center gap-2 md:gap-4">
            <NavButton active={page === 'clocking'} onClick={() => setPage('clocking')}>
              <ClockIcon className="w-5 h-5" />
              <span className="hidden md:inline">Pointage</span>
            </NavButton>
            <NavButton active={page === 'dashboard'} onClick={() => setPage('dashboard')}>
              <DashboardIcon className="w-5 h-5" />
              <span className="hidden md:inline">Dashboard</span>
            </NavButton>
            <button onClick={toggleDarkMode} className="p-2 rounded-full hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300">
              {isDarkMode ? <SunIcon className="w-5 h-5" /> : <MoonIcon className="w-5 h-5" />}
            </button>
          </nav>
        </div>
      </header>

      <main className="flex-grow container mx-auto p-4 md:p-6">
        {page === 'clocking' ? <ClockingPage /> : <DashboardPage />}
      </main>

      <footer className="text-center p-4 text-sm text-slate-500 dark:text-slate-400">
        <p>Développé avec ❤️ pour la gestion d'entreprise. Données sauvegardées localement.</p>
        <p className="mt-1">
          Application créée par{' '}
          <a
            href="https://joelhassam.com/"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 underline decoration-dotted underline-offset-2 hover:opacity-90"
          >
            Joel Gaetan HASSAM OBAH
          </a>
        </p>
        <p className="mt-1">Version {appVersion}</p>
      </footer>
    </div>
  );
};

export default App;
