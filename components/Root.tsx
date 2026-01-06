import React, { useState, useCallback } from 'react';
import LandingPage from './LandingPage';

const Root: React.FC = () => {
  const [view, setView] = useState<'landing' | 'app'>(() => {
    const saved = localStorage.getItem('zenote_view');
    if (saved === 'app') {
      localStorage.removeItem('zenote_view');
      return 'landing';
    }
    return 'landing';
  });

  const handleGoHome = useCallback(() => {
    setView('landing');
  }, []);

  const handleEnterApp = useCallback(() => {
    // Reset scroll position and body styles before entering app
    window.scrollTo(0, 0);
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.backgroundColor = '';
    document.documentElement.style.overflow = '';
    document.documentElement.style.scrollBehavior = '';
    document.documentElement.style.overscrollBehavior = '';
    setView('app');
  }, []);

  if (view === 'app') {
    const App = React.lazy(() => import('../App'));
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center h-screen bg-zinc-50 dark:bg-zinc-950">
          <div className="text-center">
            <div className="w-16 h-16 rounded-full bg-accent-600 flex items-center justify-center mx-auto mb-4 animate-pulse">
              <span className="text-white font-bold text-2xl">z</span>
            </div>
            <p className="text-zinc-600 dark:text-zinc-400">Loading Zenote...</p>
          </div>
        </div>
      }>
        <App />
      </React.Suspense>
    );
  }

  return <LandingPage onGetApp={handleEnterApp} onGoHome={handleGoHome} />;
};

export default Root;
