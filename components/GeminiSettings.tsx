import React, { useState, useEffect } from 'react';
import { Settings, CheckCircle2, X, Key, Lock, Eye, EyeOff } from 'lucide-react';

interface GeminiSettingsProps {
  t: (key: string) => string;
}

const GeminiSettings: React.FC<GeminiSettingsProps> = ({ t }) => {
  const [apiKey, setApiKey] = useState('');
  const [showKey, setShowKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);

  // Load API key from localStorage on component mount
  useEffect(() => {
    const savedKey = localStorage.getItem('zenote_gemini_api_key');
    if (savedKey) {
      setApiKey(savedKey);
    }
  }, []);

  const handleSaveKey = () => {
    setIsSaving(true);
    
    // Save API key to localStorage
    if (apiKey.trim()) {
      localStorage.setItem('zenote_gemini_api_key', apiKey.trim());
      setSaveMessage(t('apiKeySavedSuccess'));
    } else {
      localStorage.removeItem('zenote_gemini_api_key');
      setSaveMessage(t('apiKeyRemovedSuccess'));
    }

    // Clear message after 2 seconds
    setTimeout(() => {
      setSaveMessage(null);
    }, 2000);

    setIsSaving(false);
  };

  const handleResetKey = () => {
    setApiKey('');
    localStorage.removeItem('zenote_gemini_api_key');
    setSaveMessage(t('apiKeyCleared'));
    setTimeout(() => {
      setSaveMessage(null);
    }, 2000);
  };

  return (
    <div className="space-y-6">
        <div>
          <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-3 flex items-center gap-2">
            <Key size={18} className="text-zinc-500" />
            {t('apiKey') || 'API Key'}
          </h3>
          
          <div className="relative">
            <input
              type={showKey ? 'text' : 'password'}
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={t('enterApiKey') || 'Enter your Gemini API key'}
              className="w-full px-4 py-3 rounded-lg border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-600 focus:border-transparent"
            />
            
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300"
            >
              {showKey ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>
          
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2">
            {t('apiKeyHint') || 'Get your API key from '}
            <a 
              href="https://aistudio.google.com/app/apikey" 
              target="_blank" 
              rel="noopener noreferrer"
              className="text-accent-600 hover:underline"
            >
              {t('googleAiStudio')}
            </a>
          </p>
        </div>

        <div className="pt-4">
          <div className="flex gap-3">
            <button
              onClick={handleSaveKey}
              disabled={isSaving}
              className="flex-1 py-3 px-4 bg-accent-600 hover:bg-accent-700 text-white rounded-lg font-medium transition-colors disabled:bg-accent-300 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              {isSaving ? (
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              ) : (
                <CheckCircle2 size={18} />
              )}
              {t('save') || 'Save'}
            </button>
            
            <button
              onClick={handleResetKey}
              disabled={isSaving || !apiKey}
              className="py-3 px-4 bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-300 rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
            >
              <X size={18} />
              {t('reset') || 'Reset'}
            </button>
          </div>

          {/* Save message */}
          {saveMessage && (
            <div className="mt-4 p-3 bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg flex items-center gap-2 text-sm text-green-700 dark:text-green-300">
              <CheckCircle2 size={16} className="text-green-500" />
              {saveMessage}
            </div>
          )}
        </div>

        <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg">
          <div className="flex items-start gap-3">
            <Lock size={18} className="text-yellow-500 mt-0.5 flex-shrink-0" />
            <p className="text-xs text-yellow-700 dark:text-yellow-300">
              {t('apiKeySecurity')}
            </p>
          </div>
        </div>
      </div>
  );
};

export default GeminiSettings;