import React, { useState, useCallback } from 'react';
import LandingPage from './LandingPage';

const Root: React.FC = () => {
  const [view, setView] = useState<'landing' | 'app'>('landing');

  const handleGoHome = useCallback(() => {
    setView('landing');
  }, []);

  if (view === 'app') {
    const App = React.lazy(() => import('../App'));
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-gradient-to-br from-accent-500 to-purple-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white font-bold text-2xl">Z</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">Loading Zenote...</p>
          </div>
        </div>
      }>
        <App onGoHome={handleGoHome} />
      </React.Suspense>
    );
  }

  return <LandingPage onGetApp={() => setView('app')} onGoHome={handleGoHome} />;
};

export default Root;
