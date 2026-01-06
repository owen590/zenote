import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Globe, Sparkles, Moon, Sun, Smartphone, Cloud, Download, ChevronRight, Star, Github, Menu, X } from 'lucide-react';

interface LandingPageProps {
  onGetApp?: () => void;
  onGoHome?: () => void;
}

interface Translations {
  [key: string]: {
    [key: string]: string;
  };
}

const translations: Translations = {
  'zh-CN': {
    'nav.home': '首页',
    'nav.features': '功能特性',
    'nav.download': '下载',
    'nav.github': 'GitHub',
    'hero.title': 'Zenote',
    'hero.subtitle': '极简主义笔记应用',
    'hero.description': '专注写作，优雅记录。支持 Markdown、AI 智能辅助、多端同步，让笔记成为纯粹的享受。',
    'hero.getStarted': '立即开始',
    'hero.learnMore': '了解更多',
    'feature.markdown.title': 'Markdown 支持',
    'feature.markdown.desc': '原生 Markdown 语法支持，实时预览，让书写更专注。',
    'feature.ai.title': 'AI 智能助手',
    'feature.ai.desc': '集成 Gemini AI，一键生成摘要、智能润色、续写内容。',
    'feature.theme.title': '多主题切换',
    'feature.theme.desc': '深色/浅色模式，多款精美主题可选，护眼舒适。',
    'feature.sync.title': 'WebDAV 同步',
    'feature.sync.desc': '支持 WebDAV 协议，与坚果云等网盘无缝同步。',
    'feature.tags.title': '标签管理',
    'feature.tags.desc': '灵活的标签系统，快速整理和检索你的笔记。',
    'feature.export.title': '多样导出',
    'feature.export.desc': '支持导出为图片、Markdown 文件，分享更便捷。',
    'feature.mobile.title': '移动端适配',
    'feature.mobile.desc': '完美适配手机平板，触屏操作同样流畅。',
    'feature.multilang.title': '多语言支持',
    'feature.multilang.desc': '支持中文、英文、日文，无障碍使用。',
    'section.features': '功能特性',
    'section.download': '下载使用',
    'download.title': '开始使用 Zenote',
    'download.desc': '支持 Web 端和移动端，随时随地记录灵感。',
    'download.web': '网页版',
    'download.web.desc': '无需安装，打开浏览器即可使用',
    'download.android': 'Android App',
    'download.android.desc': '从 Google Play 或 F-Droid 下载',
    'download.ios': 'iOS App',
    'download.ios.desc': '即将推出...',
    'download.source': '源码下载',
    'download.source.desc': '开源免费，欢迎贡献代码',
    'footer.rights': '保留所有权利',
  },
  'en-US': {
    'nav.home': 'Home',
    'nav.features': 'Features',
    'nav.download': 'Download',
    'nav.github': 'GitHub',
    'hero.title': 'Zenote',
    'hero.subtitle': 'Minimalist Note-Taking App',
    'hero.description': 'Focused writing, elegant recording. With Markdown support, AI assistance, and multi-device sync, note-taking becomes pure enjoyment.',
    'hero.getStarted': 'Get Started',
    'hero.learnMore': 'Learn More',
    'feature.markdown.title': 'Markdown Support',
    'feature.markdown.desc': 'Native Markdown syntax with real-time preview for focused writing.',
    'feature.ai.title': 'AI Assistant',
    'feature.ai.desc': 'Integrated Gemini AI for summaries, polishing, and continuing text.',
    'feature.theme.title': 'Multiple Themes',
    'feature.theme.desc': 'Light/dark mode with multiple beautiful themes to choose from.',
    'feature.sync.title': 'WebDAV Sync',
    'feature.sync.desc': 'WebDAV protocol support for seamless sync with cloud storage.',
    'feature.tags.title': 'Tag Management',
    'feature.tags.desc': 'Flexible tag system for easy organization and retrieval.',
    'feature.export.title': 'Multiple Exports',
    'feature.export.desc': 'Export as images or Markdown files for easy sharing.',
    'feature.mobile.title': 'Mobile Ready',
    'feature.mobile.desc': 'Perfect adaptation for phones and tablets with smooth touch.',
    'feature.multilang.title': 'Multi-Language',
    'feature.multilang.desc': 'Support for Chinese, English, and Japanese.',
    'section.features': 'Features',
    'section.download': 'Download',
    'download.title': 'Start Using Zenote',
    'download.desc': 'Web and mobile apps available, write anywhere, anytime.',
    'download.web': 'Web Version',
    'download.web.desc': 'No installation needed, use directly in browser',
    'download.android': 'Android App',
    'download.android.desc': 'Download from Google Play or F-Droid',
    'download.ios': 'iOS App',
    'download.ios.desc': 'Coming soon...',
    'download.source': 'Source Code',
    'download.source.desc': 'Open source and free, contributions welcome',
    'footer.rights': 'All rights reserved',
  },
  'ja-JP': {
    'nav.home': 'ホーム',
    'nav.features': '機能',
    'nav.download': 'ダウンロード',
    'nav.github': 'GitHub',
    'hero.title': 'Zenote',
    'hero.subtitle': 'ミニマリストノートアプリ',
    'hero.description': '集中して書く、优雅に記録する。Markdown、AI支援、マルチデバイス同期で、ノートテイキングが純粋な楽しみになります。',
    'hero.getStarted': '始める',
    'hero.learnMore': '詳細を見る',
    'feature.markdown.title': 'Markdown 対応',
    'feature.markdown.desc': 'ネイティブMarkdown構文、リアルタイムプレビューで集中して書ける。',
    'feature.ai.title': 'AI アシスタント',
    'feature.ai.desc': 'Gemini AI統合、要約、テキスト磨き、続き書きが可能。',
    'feature.theme.title': '複数テーマ',
    'feature.theme.desc': 'ライト/ダークモード、複数の美しいテーマから選択可能。',
    'feature.sync.title': 'WebDAV 同期',
    'feature.sync.desc': 'WebDAVプロトコル対応、クラウドストレージとシームレスに同期。',
    'feature.tags.title': 'タグ管理',
    'feature.tags.desc': '柔軟なタグシステムで簡単整理・検索。',
    'feature.export.title': '複数エクスポート',
    'feature.export.desc': '画像やMarkdownファイルとしてエクスポート、共有が簡単。',
    'feature.mobile.title': 'モバイル対応',
    'feature.mobile.desc': 'スマートフォン・タブレットに完全適応、タッチ操作もスムーズ。',
    'feature.multilang.title': '多言語対応',
    'feature.multilang.desc': '中国語、英語、日本語をサポート。',
    'section.features': '機能',
    'section.download': 'ダウンロード',
    'download.title': 'Zenote を使い始める',
    'download.desc': 'Web版とモバイル版あり、いつでもどこでも記録。',
    'download.web': 'Web版',
    'download.web.desc': 'インストール不要、ブラウザで直接使用',
    'download.android': 'Android アプリ',
    'download.android.desc': 'Google Play または F-Droid からダウンロード',
    'download.ios': 'iOS アプリ',
    'download.ios.desc': '近日公開予定...',
    'download.source': 'ソースコード',
    'download.source.desc': 'オープンソース・フリー、コントリビューション歓迎',
    'footer.rights': '無断複写・転載を禁じます',
  }
};

const features = [
  { key: 'markdown', icon: '✏️' },
  { key: 'ai', icon: '✨' },
  { key: 'theme', icon: '🎨' },
  { key: 'sync', icon: '☁️' },
  { key: 'tags', icon: '🏷️' },
  { key: 'export', icon: '📤' },
  { key: 'mobile', icon: '📱' },
  { key: 'multilang', icon: '🌐' },
];

const LandingPage: React.FC<LandingPageProps> = ({ onGetApp, onGoHome }) => {
  const [language, setLanguage] = useState<string>('zh-CN');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [currentSection, setCurrentSection] = useState(0);
  const sectionsRef = useRef<HTMLDivElement[]>([]);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const touchStartX = useRef<number>(0);
  const touchStartY = useRef<number>(0);
  const isScrolling = useRef<boolean>(false);

  useEffect(() => {
    const savedLang = localStorage.getItem('zenote_landing_language');
    if (savedLang) {
      setLanguage(savedLang);
    }
    
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    setIsDark(prefersDark);
    if (prefersDark) {
      document.documentElement.classList.add('dark');
    }
  }, []);

  const t = (key: string): string => {
    return translations[language]?.[key] || translations['zh-CN'][key] || key;
  };

  const handleLanguageChange = (lang: string) => {
    setLanguage(lang);
    localStorage.setItem('zenote_landing_language', lang);
  };

  const toggleTheme = () => {
    setIsDark(!isDark);
    document.documentElement.classList.toggle('dark');
  };

  const scrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
    setMobileMenuOpen(false);
  };

  const scrollToSectionByIndex = useCallback((index: number) => {
    const sections = ['hero', 'features', 'download'];
    const sectionId = sections[Math.max(0, Math.min(index, sections.length - 1))];
    scrollToSection(sectionId);
  }, []);

  // Touch event handlers for swipe navigation
  const handleTouchStart = useCallback((e: TouchEvent) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
    isScrolling.current = false;
  }, []);

  const handleTouchMove = useCallback((e: TouchEvent) => {
    if (isScrolling.current) return;

    const touchCurrentX = e.touches[0].clientX;
    const touchCurrentY = e.touches[0].clientY;
    const diffX = Math.abs(touchCurrentX - touchStartX.current);
    const diffY = Math.abs(touchCurrentY - touchStartY.current);

    // If horizontal movement is greater than vertical, consider it as potential swipe
    if (diffX > diffY && diffX > 30) {
      isScrolling.current = true;

      // Threshold for swipe detection
      if (diffX > 80) {
        if (touchCurrentX < touchStartX.current) {
          // Swipe left - next section
          setCurrentSection(prev => Math.min(prev + 1, 2));
        } else {
          // Swipe right - previous section
          setCurrentSection(prev => Math.max(prev - 1, 0));
        }
        // Reset scrolling flag after swipe
        setTimeout(() => {
          isScrolling.current = false;
        }, 500);
      }
    }
  }, []);

  const handleTouchEnd = useCallback(() => {
    isScrolling.current = false;
  }, []);

  useEffect(() => {
    const handleWheel = (e: WheelEvent) => {
      if (scrollTimeoutRef.current) return;

      const delta = e.deltaY;
      if (delta === 0) return;

      scrollTimeoutRef.current = setTimeout(() => {
        scrollTimeoutRef.current = null;
      }, 800);

      if (delta > 0) {
        setCurrentSection(prev => Math.min(prev + 1, 2));
      } else {
        setCurrentSection(prev => Math.max(prev - 1, 0));
      }
    };

    // Add touch event listeners for swipe navigation
    const container = document.getElementById('landing-container');
    if (container) {
      container.addEventListener('touchstart', handleTouchStart as unknown as EventListener, { passive: true });
      container.addEventListener('touchmove', handleTouchMove as unknown as EventListener, { passive: true });
      container.addEventListener('touchend', handleTouchEnd as unknown as EventListener, { passive: true });
    }

    window.addEventListener('wheel', handleWheel);

    return () => {
      window.removeEventListener('wheel', handleWheel);
      if (container) {
        container.removeEventListener('touchstart', handleTouchStart as unknown as EventListener);
        container.removeEventListener('touchmove', handleTouchMove as unknown as EventListener);
        container.removeEventListener('touchend', handleTouchEnd as unknown as EventListener);
      }
    };
  }, [handleTouchStart, handleTouchMove, handleTouchEnd]);

  useEffect(() => {
    const sections = ['hero', 'features', 'download'];
    scrollToSectionByIndex(currentSection);
  }, [currentSection, scrollToSectionByIndex]);

  return (
    <div id="landing-container" className={`min-h-screen touch-manipulation ${isDark ? 'dark' : ''}`}>
      <style>{`
        html { scroll-behavior: smooth; touch-action: pan-y; }
        .no-scrollbar::-webkit-scrollbar { display: none; }
        .no-scrollbar { -ms-overflow-style: none; scrollbar-width: none; }
        .gradient-text {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }
        .gradient-bg {
          background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%);
        }
        .touch-optimized {
          touch-action: manipulation;
          -webkit-tap-highlight-color: transparent;
        }
        .section-indicator {
          transition: all 0.3s ease;
        }
        @media (hover: none) and (pointer: coarse) {
          button, a {
            min-height: 44px;
            min-width: 44px;
          }
        }
      `}</style>

      {/* Section Indicator (visible on touch devices) */}
      <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-40 flex gap-2 section-indicator">
        {[0, 1, 2].map((index) => (
          <button
            key={index}
            onClick={() => setCurrentSection(index)}
            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 touch-optimized ${
              currentSection === index
                ? 'bg-accent-600 w-8'
                : 'bg-zinc-300 dark:bg-zinc-600 hover:bg-accent-400'
            }`}
            aria-label={`Go to section ${index + 1}`}
          />
        ))}
      </div>

      {/* Swipe Hint (visible on touch devices) */}
      <div className="fixed bottom-20 left-1/2 -translate-x-1/2 z-30 opacity-50 animate-bounce md:hidden">
        <div className="flex items-center gap-2 text-xs text-zinc-400">
          <span className="transform rotate-180">←</span>
          <span>滑动切换</span>
          <span>→</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 dark:bg-zinc-950/80 backdrop-blur-md border-b border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo */}
            <button onClick={onGoHome} className="flex items-center gap-2 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-lg shadow-lg">
                Z
              </div>
              <span className="text-xl font-bold text-zinc-800 dark:text-white">Zenote</span>
            </button>

            {/* Desktop Navigation */}
            <div className="hidden md:flex items-center gap-8">
              <button onClick={() => scrollToSection('features')} className="text-zinc-600 dark:text-zinc-300 hover:text-accent-600 dark:hover:text-accent-400 transition-colors font-medium">
                {t('nav.features')}
              </button>
              <button onClick={() => scrollToSection('download')} className="text-zinc-600 dark:text-zinc-300 hover:text-accent-600 dark:hover:text-accent-400 transition-colors font-medium">
                {t('nav.download')}
              </button>
              
              {/* Language Selector */}
              <div className="relative group">
                <button className="flex items-center gap-1 text-zinc-600 dark:text-zinc-300 hover:text-accent-600 dark:hover:text-accent-400 transition-colors">
                  <Globe size={18} />
                  <span className="text-sm">
                    {language === 'zh-CN' ? '中文' : language === 'en-US' ? 'EN' : '日本語'}
                  </span>
                </button>
                <div className="absolute right-0 mt-2 w-32 bg-white dark:bg-zinc-800 rounded-lg shadow-xl border border-zinc-200 dark:border-zinc-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200">
                  <button onClick={() => handleLanguageChange('zh-CN')} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                    中文
                  </button>
                  <button onClick={() => handleLanguageChange('en-US')} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                    English
                  </button>
                  <button onClick={() => handleLanguageChange('ja-JP')} className="w-full px-4 py-2 text-left text-sm hover:bg-zinc-50 dark:hover:bg-zinc-700 text-zinc-700 dark:text-zinc-200">
                    日本語
                  </button>
                </div>
              </div>

              {/* Theme Toggle */}
              <button onClick={toggleTheme} className="p-2 text-zinc-600 dark:text-zinc-300 hover:text-accent-600 dark:hover:text-accent-400 transition-colors rounded-lg">
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
              </button>

              {/* GitHub Button */}
              <a href="https://github.com/owen590/zenote" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg hover:opacity-90 transition-opacity font-medium">
                <Github size={18} />
                {t('nav.github')}
              </a>
            </div>

            {/* Mobile Menu Button */}
            <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="md:hidden p-2 text-zinc-600 dark:text-zinc-300">
              {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {/* Mobile Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden bg-white dark:bg-zinc-950 border-b border-zinc-200 dark:border-zinc-800">
            <div className="px-4 py-4 space-y-4">
              <button onClick={() => scrollToSection('features')} className="block w-full text-left text-zinc-600 dark:text-zinc-300 hover:text-accent-600 font-medium py-2">
                {t('nav.features')}
              </button>
              <button onClick={() => scrollToSection('download')} className="block w-full text-left text-zinc-600 dark:text-zinc-300 hover:text-accent-600 font-medium py-2">
                {t('nav.download')}
              </button>
              
              {/* Mobile Language Selector */}
              <div className="flex gap-2 pt-2">
                <button onClick={() => handleLanguageChange('zh-CN')} className={`px-3 py-1 rounded-lg text-sm ${language === 'zh-CN' ? 'bg-accent-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                  中文
                </button>
                <button onClick={() => handleLanguageChange('en-US')} className={`px-3 py-1 rounded-lg text-sm ${language === 'en-US' ? 'bg-accent-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                  English
                </button>
                <button onClick={() => handleLanguageChange('ja-JP')} className={`px-3 py-1 rounded-lg text-sm ${language === 'ja-JP' ? 'bg-accent-600 text-white' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300'}`}>
                  日本語
                </button>
              </div>

              <button onClick={toggleTheme} className="flex items-center gap-2 text-zinc-600 dark:text-zinc-300 py-2">
                {isDark ? <Sun size={18} /> : <Moon size={18} />}
                {isDark ? t('hero.lightMode') || 'Light Mode' : t('hero.darkMode') || 'Dark Mode'}
              </button>

              <a href="https://github.com/owen590/zenote" target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 px-4 py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium justify-center">
                <Github size={18} />
                {t('nav.github')}
              </a>
            </div>
          </div>
        )}
      </nav>

      {/* Hero Section */}
      <section id="hero" className="pt-32 pb-20 px-4 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="max-w-7xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-accent-50 dark:bg-accent-900/30 rounded-full text-accent-600 dark:text-accent-400 text-sm font-medium mb-6">
            <Star size={14} className="fill-current" />
            <span>Minimalist Note-Taking</span>
          </div>
          
          <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">
            <span className="gradient-text">{t('hero.title')}</span>
          </h1>
          
          <p className="text-xl sm:text-2xl text-zinc-600 dark:text-zinc-400 mb-4 max-w-3xl mx-auto">
            {t('hero.subtitle')}
          </p>
          
          <p className="text-lg text-zinc-500 dark:text-zinc-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            {t('hero.description')}
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <button onClick={onGetApp} className="w-full sm:w-auto px-8 py-4 gradient-bg text-white rounded-xl font-semibold text-lg hover:opacity-90 transition-opacity shadow-lg shadow-accent-500/25 flex items-center justify-center gap-2 touch-optimized active:scale-95">
              {t('hero.getStarted')}
              <ChevronRight size={20} />
            </button>
            <button onClick={() => scrollToSection('features')} className="w-full sm:w-auto px-8 py-4 bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 rounded-xl font-semibold text-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors touch-optimized active:scale-95">
              {t('hero.learnMore')}
            </button>
          </div>

          {/* Preview Image Placeholder */}
          <div className="mt-16 mx-auto max-w-5xl">
            <div className="relative rounded-2xl overflow-hidden shadow-2xl border border-zinc-200 dark:border-zinc-800">
              <div className="absolute inset-0 gradient-bg opacity-5"></div>
              <div className="bg-zinc-50 dark:bg-zinc-900 p-4">
                <div className="flex items-center gap-2 mb-4">
                  <div className="w-3 h-3 rounded-full bg-red-500"></div>
                  <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                  <div className="w-3 h-3 rounded-full bg-green-500"></div>
                </div>
                <div className="bg-white dark:bg-zinc-800 rounded-lg p-6 min-h-[300px] flex items-center justify-center text-zinc-400 dark:text-zinc-500">
                  <div className="text-center">
                    <div className="w-16 h-16 rounded-full bg-zinc-100 dark:bg-zinc-700 flex items-center justify-center mx-auto mb-4">
                      <span className="text-3xl">📝</span>
                    </div>
                    <p>App Preview</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-white dark:bg-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              {t('section.features')}
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400 max-w-2xl mx-auto">
              Everything you need for perfect note-taking experience
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature) => (
              <div key={feature.key} className="group p-6 bg-zinc-50 dark:bg-zinc-900 rounded-2xl hover:bg-accent-50 dark:hover:bg-accent-900/20 transition-all duration-300 hover:shadow-lg hover:shadow-accent-500/10 border border-zinc-200 dark:border-zinc-800 hover:border-accent-200 dark:hover:border-accent-800 touch-optimized active:scale-98">
                <div className="text-4xl mb-4 transform group-hover:scale-110 transition-transform duration-300">
                  {feature.icon}
                </div>
                <h3 className="text-lg font-semibold text-zinc-900 dark:text-white mb-2">
                  {t(`feature.${feature.key}.title`)}
                </h3>
                <p className="text-sm text-zinc-600 dark:text-zinc-400 leading-relaxed">
                  {t(`feature.${feature.key}.desc`)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Download Section */}
      <section id="download" className="py-20 px-4 bg-gradient-to-b from-zinc-50 to-white dark:from-zinc-900 dark:to-zinc-950">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-4xl sm:text-5xl font-bold text-zinc-900 dark:text-white mb-4">
              {t('section.download')}
            </h2>
            <p className="text-lg text-zinc-600 dark:text-zinc-400">
              {t('download.desc')}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {/* Web Version */}
            <div className="p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-2xl gradient-bg flex items-center justify-center mb-6">
                <Globe size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                {t('download.web')}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                {t('download.web.desc')}
              </p>
              <button onClick={onGetApp} className="w-full py-3 bg-accent-600 hover:bg-accent-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 touch-optimized active:scale-95">
                {t('hero.getStarted')}
                <ChevronRight size={18} />
              </button>
            </div>

            {/* Android App */}
            <div className="p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-green-500 flex items-center justify-center mb-6">
                <Smartphone size={32} className="text-white" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                {t('download.android')}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                {t('download.android.desc')}
              </p>
              <button className="w-full py-3 bg-green-600 hover:bg-green-700 text-white rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 touch-optimized active:scale-95">
                <Download size={18} />
                Google Play
              </button>
            </div>

            {/* Source Code */}
            <div className="p-8 bg-white dark:bg-zinc-800 rounded-2xl shadow-lg border border-zinc-200 dark:border-zinc-700 hover:shadow-xl transition-shadow">
              <div className="w-16 h-16 rounded-2xl bg-zinc-900 dark:bg-zinc-100 flex items-center justify-center mb-6">
                <Github size={32} className="text-white dark:text-zinc-900" />
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                {t('download.source')}
              </h3>
              <p className="text-zinc-600 dark:text-zinc-400 mb-6">
                {t('download.source.desc')}
              </p>
              <a href="https://github.com/owen590/zenote" target="_blank" rel="noopener noreferrer" className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-semibold transition-colors flex items-center justify-center gap-2 hover:opacity-90 touch-optimized active:scale-95">
                <Github size={18} />
                GitHub
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-8 px-4 bg-zinc-50 dark:bg-zinc-950 border-t border-zinc-200 dark:border-zinc-800">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full gradient-bg flex items-center justify-center text-white font-bold text-sm">
              Z
            </div>
            <span className="font-semibold text-zinc-700 dark:text-zinc-300">Zenote</span>
          </div>
          <p className="text-sm text-zinc-500 dark:text-zinc-400">
            © 2024 Zenote. {t('footer.rights')}
          </p>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
