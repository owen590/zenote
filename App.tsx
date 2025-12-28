import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Note, Notebook, ViewMode } from './types';
import {
  Plus,
  Search,
  Menu,
  Moon,
  Sun,
  Book,
  Hash,
  Settings,
  ChevronRight,
  FolderOpen,
  X,
  Check
} from 'lucide-react';

// Lazy load heavy components for faster initial load
const NoteEditor = React.lazy(() => import('./components/NoteEditor'));
const ShareCard = React.lazy(() => import('./components/ShareCard'));
const GeminiSettings = React.lazy(() => import('./components/GeminiSettings'));

const MOCK_NOTES: Note[] = [
  {
    id: '1',
    title: 'Welcome to zenote',
    content: `# Welcome to zenote\n\nThis is a minimalist note-taking app designed for focus.\n\n## Features\n- **Markdown** support\n- AI-powered summaries\n- Beautiful export options\n- Dark mode\n\nEnjoy writing!`,
    notebookId: 'default',
    tags: ['welcome', 'guide'],
    createdAt: Date.now(),
    updatedAt: Date.now(),
  },
  {
    id: '2',
    title: 'Project Ideas 2025',
    content: `1. **AI Plant Waterer**: Uses ESP32 and moisture sensors.\n2. **Minimalist To-Do**: A to-do list that only allows 3 items.\n3. **Zenote**: The app you are using right now.`,
    notebookId: 'work',
    tags: ['ideas', 'work'],
    createdAt: Date.now() - 100000,
    updatedAt: Date.now() - 5000,
  }
];

const App: React.FC = () => {
  // --- State ---
  const [notes, setNotes] = useState<Note[]>(() => {
    try {
      const saved = localStorage.getItem('zenote_notes');
      return saved ? JSON.parse(saved) : MOCK_NOTES;
    } catch (error) {
      console.error('Error loading notes from localStorage:', error);
      return MOCK_NOTES;
    }
  });

  const [notebooks, setNotebooks] = useState<Notebook[]>(() => {
    try {
      const saved = localStorage.getItem('zenote_notebooks');
      if (saved) {
        return JSON.parse(saved);
      }
      return [
        { id: 'default', name: 'General' },
        { id: 'work', name: 'Work' },
        { id: 'personal', name: 'Personal' }
      ];
    } catch (error) {
      console.error('Error loading notebooks from localStorage:', error);
      return [
        { id: 'default', name: 'General' },
        { id: 'work', name: 'Work' },
        { id: 'personal', name: 'Personal' }
      ];
    }
  });

  // Performance optimization: Initialize state with minimal data first
  const [initialized, setInitialized] = useState(false);
  useEffect(() => {
    // Initialize app quickly, then load additional data
    setInitialized(true);
  }, []);

  // Loading component for lazy-loaded components
  const LoadingComponent = () => (
    <div className="flex items-center justify-center h-full w-full">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-accent-500"></div>
    </div>
  );

  const [activeNoteId, setActiveNoteId] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<ViewMode>(ViewMode.LIST); // Controls mobile navigation
  const [searchQuery, setSearchQuery] = useState('');
  const searchInputRef = useRef<HTMLInputElement>(null);
  const [searchFocused, setSearchFocused] = useState(false);

  // Keep search input focused when search query changes
  useEffect(() => {
    if (searchFocused && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [searchQuery, searchFocused]);
  const [darkMode, setDarkMode] = useState(() => {
    return localStorage.getItem('zenote_theme') === 'dark';
  });
  const [noteToShare, setNoteToShare] = useState<Note | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState(false); // Mobile sidebar

  // Notebook selection state - for displaying notes in a specific notebook
  const [activeNotebookId, setActiveNotebookId] = useState<string | null>(null);

  // Tag selection state - for displaying notes with a specific tag
  const [activeTagId, setActiveTagId] = useState<string | null>(null);

  // Font size state - for sharing between NoteEditor and ShareCard
  const [fontSize, setFontSize] = useState(16); // Default to 16px

  // Selection state
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedNoteIds, setSelectedNoteIds] = useState<string[]>([]);

  // Dialog State
  const [showDialog, setShowDialog] = useState(false);
  const [dialogTitle, setDialogTitle] = useState('');
  const [dialogInputValue, setDialogInputValue] = useState('');
  const [dialogAction, setDialogAction] = useState<(() => void) | null>(null);
  const [dialogType, setDialogType] = useState<'input' | 'selectNotebook'>('input');
  const [selectedNotebookId, setSelectedNotebookId] = useState<string>('default');

  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [activeSettingsTab, setActiveSettingsTab] = useState<'language' | 'sync' | 'gemini'>('language');

  // Language Settings
  const [language, setLanguage] = useState<string>(() => {
    return localStorage.getItem('zenote_language') || 'zh-CN';
  });

  // Update localStorage when language changes
  useEffect(() => {
    localStorage.setItem('zenote_language', language);
  }, [language]);

  // Handle system navigation bar for Android
  useEffect(() => {
    const handleResize = () => {
      // Set CSS custom properties for safe area insets
      const top = getComputedStyle(document.documentElement).getPropertyValue('--sat') || 'env(safe-area-inset-top)';
      const bottom = getComputedStyle(document.documentElement).getPropertyValue('--sab') || 'env(safe-area-inset-bottom)';
      const left = getComputedStyle(document.documentElement).getPropertyValue('--sal') || 'env(safe-area-inset-left)';
      const right = getComputedStyle(document.documentElement).getPropertyValue('--sar') || 'env(safe-area-inset-right)';

      document.documentElement.style.setProperty('--sat', top);
      document.documentElement.style.setProperty('--sab', bottom);
      document.documentElement.style.setProperty('--sal', left);
      document.documentElement.style.setProperty('--sar', right);
    };

    // Initial setup
    handleResize();

    // Listen for resize events which might happen when keyboard appears/disappears
    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  // Translation Dictionary
  const translations = useMemo(() => ({
    'zh-CN': {
      'language': '语言',
      'sync': '同步',
      'settings': '设置',
      'lightMode': '浅色模式',
      'darkMode': '深色模式',
      'newNote': '新建笔记',
      'createNote': '创建笔记',
      'webdavSync': 'WebDAV 同步',
      'syncNotes': '将您的笔记与 WebDAV 服务器同步',
      'serverUrl': '服务器地址',
      'username': '用户名',
      'password': '密码',
      'accessToken': '访问令牌',
      'folderId': '文件夹 ID',
      'signOut': '退出登录',
      'geminiAI': 'Gemini AI',
      'enableAI': '启用 AI 功能',
      'gemini': '启用AI',
      'geminiSettings': 'Gemini 设置',
      'apiKey': 'API 密钥',
      'enterApiKey': '输入您的 Gemini API 密钥',
      'apiKeyHint': '从以下地址获取您的 API 密钥：',
      'apiKeySecurity': '您的 API 密钥存储在本地设备上，绝不会发送到我们的服务器。',
      'save': '保存',
      'reset': '重置',
      'search': '搜索...',
      'selectNote': '选择笔记或创建新笔记',
      'createShortcut': '按 cmd + n 创建',
      'deleteConfirm': '确定要删除这篇笔记吗？',
      'untitledNote': '无标题笔记',
      'summary': '摘要',
      'polish': '润色',
      'continue': '智能续写',
      'aiSummaryTitle': 'AI 摘要',
      'aiPolishedTextTitle': 'AI 润色文本',
      'aiContinuedTextTitle': 'AI 续写文本',
      'googleAiStudio': 'Google AI Studio',
      'searchInNote': '在笔记中搜索...',
      'noContent': '无内容',
      'noNotesFound': '没有找到笔记',
      'startTyping': '开始输入您的笔记...',
      'manageToolbar': '管理工具栏',
      'selectToolsToShow': '选择要显示的工具',
      'undo': '撤销',
      'redo': '重做',
      'header1': '标题 1',
      'header2': '标题 2',
      'header3': '标题 3',
      'bold': '粗体',
      'italic': '斜体',
      'code': '代码',
      'math': '数学公式',
      'bulletList': '无序列表',
      'orderedList': '有序列表',
      'taskList': '任务列表',
      'decreaseIndent': '减少缩进',
      'increaseIndent': '增加缩进',
      'insertTime': '插入时间',
      'link': '链接',
      'tag': '标签',
      'quote': '引用',
      'hideKeyboard': '隐藏键盘',
      'deleteNote': '删除笔记',
      'geminiApiKeyPlaceholder': '输入您的 Gemini API 密钥',
      'export': '导出',
      'format': '格式',
      'style': '样式',
      'generating': '生成中...',
      'images': '图片',
      'saveImage': '保存图片',
      'themeClassic': '经典',
      'themeNature': '自然',
      'themeDark': '深色',
      'themeLuxury': '奢华',
      'themeMemo': '备忘录',
      'themeOcean': '海洋',
      'themeSunset': '日落',
      'themeMint': '薄荷',
      'themeLavender': '薰衣草',
      'themeTerminal': '终端',
      'zh-CN': '简体中文',
      'en-US': 'English',
      'ja-JP': '日本語',
      'newNotebook': '新建笔记本',
      'newNotebookNamePrompt': '请输入笔记本名称：',
      'renameNotebookPrompt': '请输入新的笔记本名称：',
      'syncNow': '现在同步',
      'syncing': '同步中...',
      'syncSuccess': '同步成功',
      'syncError': '同步失败',
      'apiKeySavedSuccess': 'API 密钥保存成功！',
      'apiKeyRemovedSuccess': 'API 密钥已移除！',
      'apiKeyCleared': 'API 密钥已清除！'
    },
    'en-US': {
      'language': 'Language',
      'sync': 'Sync',
      'settings': 'Settings',
      'lightMode': 'Light Mode',
      'darkMode': 'Dark Mode',
      'newNote': 'New Note',
      'createNote': 'Create Note',
      'webdavSync': 'WebDAV Sync',
      'syncNotes': 'Sync your notes with a WebDAV server',
      'serverUrl': 'Server URL',
      'username': 'Username',
      'password': 'Password',
      'accessToken': 'Access Token',
      'folderId': 'Folder ID',
      'signOut': 'Sign Out',
      'geminiAI': 'Gemini AI',
      'enableAI': 'Enable AI-powered features',
      'gemini': 'Enable AI',
      'geminiSettings': 'Gemini Settings',
      'apiKey': 'API Key',
      'enterApiKey': 'Enter your Gemini API key',
      'apiKeyHint': 'Get your API key from:',
      'apiKeySecurity': 'Your API key is stored locally on your device and will never be sent to our servers.',
      'save': 'Save',
      'reset': 'Reset',
      'search': 'Search...',
      'selectNote': 'Select a note or create a new one',
      'createShortcut': 'cmd + n to create',
      'deleteConfirm': 'Are you sure you want to delete this note?',
      'untitledNote': 'Untitled Note',
      'summary': 'Summary',
      'polish': 'Polish',
      'continue': 'Continue Writing',
      'aiSummaryTitle': 'AI Summary',
      'aiPolishedTextTitle': 'Polished Text',
      'aiContinuedTextTitle': 'Continued Text',
      'googleAiStudio': 'Google AI Studio',
      'searchInNote': 'Search in note...',
      'noContent': 'No content',
      'noNotesFound': 'No notes found',
      'startTyping': 'Start typing your note...',
      'manageToolbar': 'Manage Toolbar',
      'selectToolsToShow': 'Select tools to show',
      'undo': 'Undo',
      'redo': 'Redo',
      'header1': 'Header 1',
      'header2': 'Header 2',
      'header3': 'Header 3',
      'bold': 'Bold',
      'italic': 'Italic',
      'code': 'Code',
      'math': 'Math',
      'bulletList': 'Bullet List',
      'orderedList': 'Numbered List',
      'taskList': 'Task List',
      'decreaseIndent': 'Decrease Indent',
      'increaseIndent': 'Increase Indent',
      'insertTime': 'Insert Time',
      'link': 'Link',
      'tag': 'Tag',
      'quote': 'Quote',
      'hideKeyboard': 'Hide Keyboard',
      'deleteNote': 'Delete Note',
      'geminiApiKeyPlaceholder': 'Enter your Gemini API key',
      'export': 'Export',
      'format': 'Format',
      'style': 'Style',
      'generating': 'Generating...',
      'images': 'Images',
      'saveImage': 'Save Image',
      'themeClassic': 'Classic',
      'themeNature': 'Nature',
      'themeDark': 'Dark',
      'themeLuxury': 'Luxury',
      'themeMemo': 'Memo',
      'themeOcean': 'Ocean',
      'themeSunset': 'Sunset',
      'themeMint': 'Mint',
      'themeLavender': 'Lavender',
      'themeTerminal': 'Terminal',
      'zh-CN': 'Simplified Chinese',
      'en-US': 'English',
      'ja-JP': 'Japanese',
      'newNotebook': 'New Notebook',
      'newNotebookNamePrompt': 'Enter notebook name:',
      'renameNotebookPrompt': 'Enter new notebook name:',
      'syncNow': 'Sync Now',
      'syncing': 'Syncing...',
      'syncSuccess': 'Sync successful',
      'syncError': 'Sync failed',
      'apiKeySavedSuccess': 'API key saved successfully!',
      'apiKeyRemovedSuccess': 'API key removed successfully!',
      'apiKeyCleared': 'API key cleared!'
    },
    'ja-JP': {
      'language': '言語',
      'sync': '同期',
      'settings': '設定',
      'lightMode': 'ライトモード',
      'darkMode': 'ダークモード',
      'newNote': '新規ノート',
      'createNote': 'ノート作成',
      'webdavSync': 'WebDAV 同期',
      'syncNotes': 'WebDAV サーバーとノートを同期',
      'serverUrl': 'サーバー URL',
      'username': 'ユーザー名',
      'password': 'パスワード',
      'accessToken': 'アクセストークン',
      'folderId': 'フォルダ ID',
      'signOut': 'サインアウト',
      'geminiAI': 'Gemini AI',
      'enableAI': 'AI 機能を有効にする',
      'gemini': 'AIを有効にする',
      'geminiSettings': 'Gemini 設定',
      'apiKey': 'API キー',
      'enterApiKey': 'Gemini API キーを入力',
      'apiKeyHint': 'API キーは以下から取得：',
      'apiKeySecurity': 'API キーはデバイス上にローカルに保存され、サーバーに送信されることはありません。',
      'save': '保存',
      'reset': 'リセット',
      'search': '検索...',
      'selectNote': 'ノートを選択または新規作成',
      'createShortcut': 'cmd + n で作成',
      'deleteConfirm': 'このノートを削除してもよろしいですか？',
      'untitledNote': '無題のノート',
      'summary': '要約',
      'polish': '磨く',
      'continue': '続きを書く',
      'aiSummaryTitle': 'AI 要約',
      'aiPolishedTextTitle': 'AI 磨きテキスト',
      'aiContinuedTextTitle': 'AI 続きテキスト',
      'googleAiStudio': 'Google AI Studio',
      'searchInNote': 'ノート内を検索...',
      'noContent': '内容なし',
      'noNotesFound': 'ノートが見つかりません',
      'startTyping': 'ノートを入力し始める...',
      'manageToolbar': 'ツールバーの管理',
      'selectToolsToShow': '表示するツールを選択',
      'undo': '元に戻す',
      'redo': 'やり直す',
      'header1': '見出し 1',
      'header2': '見出し 2',
      'header3': '見出し 3',
      'bold': '太字',
      'italic': '斜体',
      'code': 'コード',
      'math': '数式',
      'bulletList': '箇条書き',
      'orderedList': '番号付きリスト',
      'taskList': 'タスクリスト',
      'decreaseIndent': '字下げ減少',
      'increaseIndent': '字下げ増加',
      'insertTime': '時間挿入',
      'link': 'リンク',
      'tag': 'タグ',
      'quote': '引用',
      'hideKeyboard': 'キーボードを隠す',
      'deleteNote': 'ノートを削除',
      'geminiApiKeyPlaceholder': 'Gemini API キーを入力',
      'export': 'エクスポート',
      'format': 'フォーマット',
      'style': 'スタイル',
      'generating': '生成中...',
      'images': '画像',
      'saveImage': '画像を保存',
      'themeClassic': 'クラシック',
      'themeNature': 'ネイチャー',
      'themeDark': 'ダーク',
      'themeLuxury': 'ラグジュアリー',
      'themeMemo': 'メモ',
      'themeOcean': 'オーシャン',
      'themeSunset': 'サンセット',
      'themeMint': 'ミント',
      'themeLavender': 'ラベンダー',
      'themeTerminal': 'ターミナル',
      'zh-CN': '簡体字中国語',
      'en-US': '英語',
      'ja-JP': '日本語',
      'newNotebook': '新規ノートブック',
      'newNotebookNamePrompt': 'ノートブック名を入力してください：',
      'renameNotebookPrompt': '新しいノートブック名を入力してください：',
      'syncNow': '今すぐ同期',
      'syncing': '同期中...',
      'syncSuccess': '同期成功',
      'syncError': '同期失敗',
      'apiKeySavedSuccess': 'API キーが正常に保存されました！',
      'apiKeyRemovedSuccess': 'API キーが正常に削除されました！',
      'apiKeyCleared': 'API キーが正常にクリアされました！'
    }
  }), []);

  // Translation Function
  const t = (key: string): string => {
    const lang = language || 'en-US';
    return translations[lang as keyof typeof translations]?.[key as keyof typeof translations['en-US']] || key;
  };

  // Sync Settings
  // WebDAV Sync Settings

  // WebDAV Sync Settings
  const [webdavEnabled, setWebdavEnabled] = useState<boolean>(() => {
    return localStorage.getItem('zenote_sync_enabled') === 'true';
  });
  const [syncUrl, setSyncUrl] = useState<string>(() => {
    return localStorage.getItem('zenote_sync_url') || '';
  });
  const [syncUsername, setSyncUsername] = useState<string>(() => {
    return localStorage.getItem('zenote_sync_username') || '';
  });
  const [syncPassword, setSyncPassword] = useState<string>(() => {
    return localStorage.getItem('zenote_sync_password') || '';
  });

  // Common Sync State
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');







  // Auto-save WebDAV settings when they change
  useEffect(() => {
    localStorage.setItem('zenote_sync_enabled', webdavEnabled.toString());
  }, [webdavEnabled]);

  useEffect(() => {
    localStorage.setItem('zenote_sync_url', syncUrl);
  }, [syncUrl]);

  useEffect(() => {
    localStorage.setItem('zenote_sync_username', syncUsername);
  }, [syncUsername]);

  useEffect(() => {
    localStorage.setItem('zenote_sync_password', syncPassword);
  }, [syncPassword]);



  // --- Effects ---
  useEffect(() => {
    localStorage.setItem('zenote_notes', JSON.stringify(notes));
  }, [notes]);

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('zenote_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('zenote_theme', 'light');
    }
  }, [darkMode]);

  // --- Derived State ---
  const filteredNotes = useMemo(() => {
    let filtered = notes;

    // Filter by selected notebook if any
    if (activeNotebookId) {
      filtered = filtered.filter(note => note.notebookId === activeNotebookId);
    }

    // Filter by selected tag if any
    if (activeTagId) {
      filtered = filtered.filter(note => note.tags.includes(activeTagId));
    }

    // Filter by search query if any
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(n =>
        n.title.toLowerCase().includes(q) ||
        n.content.toLowerCase().includes(q) ||
        n.tags.some(t => t.toLowerCase().includes(q))
      );
    }

    // Sort by updated time
    return filtered.sort((a, b) => b.updatedAt - a.updatedAt);
  }, [notes, searchQuery, activeNotebookId, activeTagId]);

  const activeNote = useMemo(() =>
    notes.find(n => n.id === activeNoteId),
    [notes, activeNoteId]);

  // --- Handlers ---
  const handleCreateNote = () => {
    const newNote: Note = {
      id: Date.now().toString(),
      title: '',
      content: '',
      notebookId: activeNotebookId || 'default',
      tags: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    setNotes([newNote, ...notes]);
    setActiveNoteId(newNote.id);
    setMobileView(ViewMode.EDIT);
  };

  const handleUpdateNote = (updatedNote: Note) => {
    setNotes(notes.map(n => n.id === updatedNote.id ? updatedNote : n));
  };



  // WebDAV Sync Function
  const syncToWebDAV = async (notes: Note[], url: string, username: string, password: string) => {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('WebDAV URL必须以http://或https://开头');
    }

    // Additional URL validation
    if (!url.endsWith('/')) {
      url = url + '/';
      console.log('Added trailing slash to URL:', url);
    }

    let baseUrl: URL;
    try {
      baseUrl = new URL(url);
      console.log('Parsed base URL:', {
        href: baseUrl.href,
        origin: baseUrl.origin,
        pathname: baseUrl.pathname,
        host: baseUrl.host,
        protocol: baseUrl.protocol,
        username: username,
        password: password ? '[REDACTED]' : '[EMPTY]'
      });

      // Optional URL reachability test (not required for sync)
      console.log('Testing URL reachability...');
      try {
        const headResponse = await fetch(baseUrl.origin, {
          method: 'HEAD',
          mode: 'no-cors',
          credentials: 'include'
        });
        console.log('HEAD request to origin succeeded:', headResponse.status);
      } catch (headError) {
        console.warn('HEAD request to origin failed (this is not critical):', headError);
        // Continue with sync even if HEAD request fails
      }
    } catch (error) {
      console.error('URL parsing error:', error);
      throw new Error('WebDAV URL格式不正确');
    }

    // Create a directory for the notes if it doesn't exist
    const dirPath = 'zenote-notes/';
    const dirUrl = new URL(dirPath, baseUrl);

    console.log('Attempting to sync to WebDAV:', {
      baseUrl: baseUrl.toString(),
      dirUrl: dirUrl.toString(),
      notesCount: notes.length
    });

    // Check Basic Auth encoding
    // Check Basic Auth encoding - Support UTF-8 for username/password
    const authHeader = 'Basic ' + btoa(unescape(encodeURIComponent(`${username}:${password}`)));
    console.log('Auth header:', authHeader.substring(0, 20) + '...'); // Don't log full credentials

    // Detect Nutstore (坚果云) to provide better tips
    const isNutstore = url.includes('jianguoyun.com');

    // Try to create directory directly (skip PROPFIND to avoid CORS issues)
    let directoryReady = false;

    try {
      console.log('Attempting to check/create directory:', dirUrl.toString());

      // Try MKCOL first. If it fails with 405/409, the directory likely exists.
      const mkcolResponse = await fetch(dirUrl.toString(), {
        method: 'MKCOL',
        headers: {
          'Authorization': authHeader
        },
        mode: 'no-cors',
        credentials: 'include'
      });

      console.log('MKCOL response:', {
        status: mkcolResponse.status,
        statusText: mkcolResponse.statusText,
        url: dirUrl.toString()
      });

      // In no-cors mode, we can't access response status, so assume directory is ready
      directoryReady = true;
      console.log('Directory operation completed (no-cors mode, assuming success)');
    } catch (error) {
      console.error('Directory operation failed:', error);

      // 分析错误类型
      let errorMsg = '未知错误';
      const isBrowser = !((window as any).Capacitor && (window as any).Capacitor.isNative);

      if (error instanceof Error) {
        if (error.message === 'Failed to fetch') {
          if (isBrowser) {
            errorMsg = '网络连接失败或CORS跨域限制。在浏览器环境中，由于坚果云(Nutstore)等服务不支持CORS，同步通常会失败。请在Android/iOS真机上测试，或确保服务器支持CORS。';
          } else {
            errorMsg = '网络连接失败、服务器地址不正确或服务器未响应。';
          }
        } else {
          errorMsg = error.message;
        }
      }

      // 简化错误信息
      let simplifiedError = errorMsg;
      if (isNutstore) {
        simplifiedError += '\n坚果云用户需使用第三方应用密码，并确保地址包含/dav/';
      }

      throw new Error(simplifiedError);
    }

    // Ensure we have a valid directory before proceeding
    if (!directoryReady) {
      throw new Error('无法确认目录存在或创建目录');
    }

    // Sync each note as a separate markdown file
    let uploadCount = 0;
    let failedCount = 0;

    for (const note of notes) {
      const noteFileName = `${note.id}.md`;
      const noteUrl = new URL(noteFileName, dirUrl);

      // Create markdown content
      const markdownContent = `# ${note.title || 'Untitled Note'}\n\n${note.content}`;

      console.log(`Uploading note: ${note.title || 'Untitled Note'}`);

      // Upload the note to WebDAV
      try {
        const response = await fetch(noteUrl.toString(), {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'text/markdown'
        },
        body: markdownContent,
        mode: 'no-cors',
        credentials: 'include'
      });

        console.log('Note upload response:', {
          status: response.status,
          statusText: response.statusText,
          noteTitle: note.title,
          url: noteUrl.toString()
        });

        // In no-cors mode, we can't access response status, so assume upload success
        uploadCount++;
        console.log('Note upload completed (no-cors mode, assuming success):', note.title || 'Untitled Note');
      } catch (error) {
        failedCount++;
        console.error('Note upload error:', error);

        // 分析上传错误类型
        let uploadErrorMsg = '未知错误';
        if (error instanceof Error) {
          if (error.message === 'Failed to fetch') {
            uploadErrorMsg = '网络连接失败或服务器地址不正确';
          } else if (error.message.includes('CORS')) {
            uploadErrorMsg = '跨域资源共享(CORS)配置问题';
          } else {
            uploadErrorMsg = error.message;
          }
        }

        // If it's an authentication error, stop the whole process
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
          throw new Error(`身份验证失败：${uploadErrorMsg}`);
        }

        // 如果是网络连接问题，且这是第一个失败的笔记，也停止同步
        if (error instanceof Error && error.message === 'Failed to fetch' && failedCount === 1) {
          throw new Error(`笔记上传失败：${uploadErrorMsg}\n可能的原因：网络连接问题、服务器地址不正确或WebDAV服务器未响应`);
        }
      }
    }

    console.log('Note upload summary:', {
      totalNotes: notes.length,
      uploaded: uploadCount,
      failed: failedCount
    });

    // If all notes failed to upload, this is a critical error
    if (failedCount === notes.length) {
      throw new Error('所有笔记上传失败，请检查WebDAV配置和网络连接');
    }

    // Also upload a notes.json file with all note metadata
    const notesJsonUrl = new URL('notes.json', dirUrl);
    const notesMetadata = notes.map(note => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      notebookId: note.notebookId
    }));

    const notesJsonContent = JSON.stringify(notesMetadata, null, 2);

    console.log('Uploading notes metadata...');

    try {
      const notesJsonResponse = await fetch(notesJsonUrl.toString(), {
        method: 'PUT',
        headers: {
          'Authorization': authHeader,
          'Content-Type': 'application/json'
        },
        body: notesJsonContent,
        mode: 'no-cors',
        credentials: 'include'
      });

      console.log('Notes metadata upload response:', {
        status: notesJsonResponse.status,
        statusText: notesJsonResponse.statusText
      });

      // In no-cors mode, we can't access response status, so assume metadata upload success
      console.log('Notes metadata upload completed (no-cors mode, assuming success)');
    } catch (error) {
      console.error('Notes metadata upload error:', error);
      // This is not fatal, continue with sync completion
    }

    // Final check: ensure at least some notes were uploaded
    if (uploadCount === 0 && notes.length > 0) {
      throw new Error('未上传任何笔记，请检查WebDAV服务器配置和网络连接');
    }

    console.log('WebDAV sync process completed successfully');
    console.log(`同步结果：共 ${notes.length} 个笔记，成功上传 ${uploadCount} 个，失败 ${failedCount} 个`);
  };

  const handleManualSync = async () => {
    if (!webdavEnabled || !syncUrl || !syncUsername || !syncPassword) {
      setSyncStatus('请先完整配置WebDAV同步设置');
      return;
    }

    try {
      setSyncInProgress(true);
      setSyncStatus(t('syncing'));

      // Perform actual WebDAV sync
      await syncToWebDAV(notes, syncUrl, syncUsername, syncPassword);

      // Show success message with summary
      setSyncStatus(`${t('syncSuccess')}，共${notes.length}个笔记`);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '未知错误';
      console.error('Sync error details:', error);
      setSyncStatus(`${t('syncError')}: ${errorMessage}`);
    } finally {
      setSyncInProgress(false);

      // 5秒后清除状态消息
      setTimeout(() => {
        setSyncStatus('');
      }, 5000);
    }
  };

  const handleDeleteNote = (id: string) => {
    setNotes(notes.filter(n => n.id !== id));
    if (activeNoteId === id) {
      setActiveNoteId(null);
      setMobileView(ViewMode.LIST);
    }
  };

  // Notebook Handlers
  const handleSelectNotebook = useCallback((id: string) => {
    // For General notebook (id='default'), always show all notes
    if (id === 'default') {
      setActiveNotebookId(null);
    } else {
      // For other notebooks, select the notebook (no toggling)
      setActiveNotebookId(id);
    }

    // Close sidebar on mobile after selecting
    setSidebarOpen(false);
  }, []);

  const handleAddNotebook = () => {
    setDialogTitle(t('newNotebookNamePrompt') || 'Enter notebook name:');
    setDialogType('input');
    setDialogInputValue('');
    setDialogAction(() => {
      return () => {
        const newNotebookName = dialogInputValue.trim();
        if (newNotebookName) {
          const newNotebook: Notebook = {
            id: Date.now().toString(),
            name: newNotebookName,
          };
          const updatedNotebooks = [...notebooks, newNotebook];
          setNotebooks(updatedNotebooks);
          localStorage.setItem('zenote_notebooks', JSON.stringify(updatedNotebooks));
        }
      };
    });
    setShowDialog(true);
  };

  const handleRenameNotebook = (id: string) => {
    const notebook = notebooks.find(nb => nb.id === id);
    if (notebook) {
      setDialogTitle(t('renameNotebookPrompt') || 'Enter new notebook name:');
      setDialogType('input');
      setDialogInputValue(notebook.name);
      setDialogAction(() => {
        return () => {
          const newName = dialogInputValue.trim();
          if (newName) {
            const updatedNotebooks = notebooks.map(nb =>
              nb.id === id ? { ...nb, name: newName } : nb
            );
            setNotebooks(updatedNotebooks);
            localStorage.setItem('zenote_notebooks', JSON.stringify(updatedNotebooks));
          }
        };
      });
      setShowDialog(true);
    }
  };

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    setMobileView(ViewMode.EDIT);
    setSidebarOpen(false);
  };

  // --- Components ---\n\n  // NoteItem Component\n  const NoteItem = React.memo(({\n    note,\n    activeNoteId,\n    selectedNoteIds,\n    selectionMode,\n    onSelect,\n    onToggleSelection,\n    onStartSelection,\n    t\n  }: {\n    note: Note;\n    activeNoteId: string | null;\n    selectedNoteIds: string[];\n    selectionMode: boolean;\n    onSelect: (id: string) => void;\n    onToggleSelection: (id: string) => void;\n    onStartSelection: (id: string) => void;\n    t: (key: string) => string;\n  }) => {\n    // Cache expensive calculations\n    const contentPreview = useMemo(() => {\n      return note.content.slice(0, 100).replace(/[#*`]/g, '') || t('noContent');\n    }, [note.content, t]);\n\n    const formattedDate = useMemo(() => {\n      return new Date(note.updatedAt).toLocaleDateString();\n    }, [note.updatedAt]);\n\n    let longPressTimer: NodeJS.Timeout | null = null;\n\n    const handleMouseDown = useCallback(() => {\n      longPressTimer = setTimeout(() => {\n        onStartSelection(note.id);\n      }, 500);\n    }, [note.id, onStartSelection]);\n\n    const handleMouseUp = useCallback(() => {\n      if (longPressTimer) {\n        clearTimeout(longPressTimer);\n        longPressTimer = null;\n      }\n    }, []);\n\n    const handleTouchStart = useCallback(() => {\n      longPressTimer = setTimeout(() => {\n        onStartSelection(note.id);\n      }, 500);\n    }, [note.id, onStartSelection]);\n\n    const handleTouchEnd = useCallback(() => {\n      if (longPressTimer) {\n        clearTimeout(longPressTimer);\n        longPressTimer = null;\n      }\n    }, []);\n\n    const handleClick = useCallback(() => {\n      if (selectionMode) {\n        onToggleSelection(note.id);\n      } else {\n        onSelect(note.id);\n      }\n    }, [note.id, selectionMode, onToggleSelection, onSelect]);\n\n    const handleCheckboxClick = useCallback((e: React.MouseEvent) => {\n      e.stopPropagation();\n      onToggleSelection(note.id);\n    }, [note.id, onToggleSelection]);\n\n    return (\n      <div \n        key={note.id}\n        onClick={handleClick}\n        onMouseDown={handleMouseDown}\n        onMouseUp={handleMouseUp}\n        onMouseLeave={handleMouseUp}\n        onTouchStart={handleTouchStart}\n        onTouchEnd={handleTouchEnd}\n        onTouchCancel={handleTouchEnd}\n        className={`\n          group p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent relative\n          ${activeNoteId === note.id \n            ? 'bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800/50' \n            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-100 dark:hover:border-zinc-800'}\n          ${selectedNoteIds.includes(note.id) ? 'bg-accent-100 dark:bg-accent-900/30 border-accent-300 dark:border-accent-700' : ''}\n        `}\n      >\n        <div className="flex items-start justify-between gap-2">\n          <div className="flex-1">\n            <h3 className={`font-semibold mb-1 line-clamp-2 leading-tight ${activeNoteId === note.id ? 'text-accent-900 dark:text-accent-100' : 'text-zinc-800 dark:text-zinc-200'}`}>\n              {note.title || t('untitledNote')}\n            </h3>\n            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2 leading-normal">\n              {contentPreview}\n            </p>\n            <div className="flex items-center justify-between">\n              <span className="text-[10px] text-zinc-400 font-mono">\n                {formattedDate}\n              </span>\n              {!selectionMode && activeNoteId === note.id && <ChevronRight size={14} className="text-accent-500" />}\n            </div>\n          </div>\n          \n          {/* Selection checkbox */}\n          {selectionMode && (\n            <button\n              className={`\n                w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200\n                ${selectedNoteIds.includes(note.id)\n                  ? 'bg-accent-600 text-white border-2 border-accent-600'\n                  : 'border-2 border-zinc-300 dark:border-zinc-700 hover:border-accent-500'}\n              `}\n              onClick={handleCheckboxClick}\n            >\n              {selectedNoteIds.includes(note.id) && <Check size={12} />}\n            </button>\n          )}\n        </div>\n      </div>\n    );\n  });

  // Custom Dialog Component
  const Dialog = () => (
    showDialog && (
      <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-zinc-900 rounded-xl shadow-xl w-full max-w-md">
          <div className="p-6">
            <h3 className="text-lg font-semibold text-zinc-800 dark:text-white mb-4">{dialogTitle}</h3>

            {dialogType === 'input' ? (
              <input
                type="text"
                value={dialogInputValue}
                onChange={(e) => setDialogInputValue(e.target.value)}
                placeholder="Enter name"
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-accent-500"
                autoFocus
              />
            ) : (
              // Notebook selection dropdown for move action
              <select
                value={selectedNotebookId}
                onChange={(e) => setSelectedNotebookId(e.target.value)}
                className="w-full px-4 py-2 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-zinc-50 dark:bg-zinc-800 text-zinc-900 dark:text-white outline-none focus:ring-2 focus:ring-accent-500"
                autoFocus
              >
                {notebooks.map(notebook => (
                  <option key={notebook.id} value={notebook.id}>
                    {notebook.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="flex justify-end gap-3 p-4 border-t border-zinc-100 dark:border-zinc-800">
            <button
              onClick={() => setShowDialog(false)}
              className="px-4 py-2 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (dialogType === 'selectNotebook') {
                  // 笔记本选择对话框的OK逻辑 - 移动笔记
                  // 实际移动逻辑 - 使用函数式更新确保使用最新的notes状态
                  setNotes(prevNotes => prevNotes.map(note => {
                    if (selectedNoteIds.includes(note.id)) {
                      return { ...note, notebookId: selectedNotebookId };
                    }
                    return note;
                  }));

                  // 自动切换到目标笔记本，让用户看到移动后的笔记
                  handleSelectNotebook(selectedNotebookId);

                  // 关闭选择模式
                  setSelectionMode(false);
                  setSelectedNoteIds([]);

                  // 提供更明确的移动成功反馈
                  const targetNotebook = notebooks.find(nb => nb.id === selectedNotebookId);
                  alert(`笔记已成功移动到笔记本：${targetNotebook?.name || '默认笔记本'}！`);
                } else if (dialogAction) {
                  // 其他类型对话框的原有逻辑
                  dialogAction();
                }
                setShowDialog(false);
              }}
              className="px-4 py-2 bg-accent-600 text-white hover:bg-accent-700 rounded-lg transition-colors"
            >
              OK
            </button>
          </div>
        </div>
      </div>
    )
  );

  const Sidebar = () => (
    <div className={`
      fixed inset-y-0 left-0 z-40 w-64 bg-zinc-50 dark:bg-zinc-950 border-r border-zinc-200 dark:border-zinc-800 transform transition-transform duration-300 ease-in-out
      ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'} md:relative md:translate-x-0 flex flex-col
    `}>
      <div className="h-16 flex items-center px-6 font-bold text-xl tracking-tight gap-2 text-zinc-800 dark:text-white">
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow-sm bg-accent-600 text-white">Z</div>
        zenote
      </div>

      <div className="p-4 flex-1 overflow-y-auto space-y-6">
        <section>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">Notebooks</div>
          <div className="space-y-1">
            {notebooks.map(nb => (
              <button
                key={nb.id}
                className={`w-full flex items-center justify-between gap-3 px-3 py-2 text-sm font-medium transition-colors ${(nb.id === 'default' && !activeNotebookId) || activeNotebookId === nb.id ? 'text-accent-600 dark:text-accent-400 bg-accent-50 dark:bg-accent-900/20' : 'text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800'} rounded-lg`}
                onClick={() => handleSelectNotebook(nb.id)}
                onMouseDown={(e) => {
                  const timer = setTimeout(() => {
                    handleRenameNotebook(nb.id);
                  }, 500);
                  e.currentTarget.onmouseup = () => clearTimeout(timer);
                  e.currentTarget.onmouseleave = () => clearTimeout(timer);
                }}
                onTouchStart={(e) => {
                  const timer = setTimeout(() => {
                    handleRenameNotebook(nb.id);
                  }, 500);
                  e.currentTarget.ontouchend = () => clearTimeout(timer);
                  e.currentTarget.ontouchcancel = () => clearTimeout(timer);
                }}
              >
                <div className="flex items-center gap-3">
                  <Book size={16} />
                  {nb.name}
                </div>
                <Settings size={12} className="text-zinc-400 opacity-0 hover:opacity-100 transition-opacity" />
              </button>
            ))}
            <button
              onClick={handleAddNotebook}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
            >
              <Plus size={14} />
              {t('newNotebook') || 'New Notebook'}
            </button>
          </div>
        </section>

        <section>
          <div className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2 px-2">Tags</div>
          <div className="flex flex-wrap gap-2 px-2">
            {useMemo(() => Array.from(new Set(notes.flatMap(n => n.tags))), [notes]).map(tag => (
              <button
                key={tag}
                className={`px-2 py-1 text-xs rounded-md flex items-center gap-1 transition-colors ${activeTagId === tag ? 'bg-accent-600 text-white' : 'bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-300 dark:hover:bg-zinc-700'}`}
                onClick={() => {
                  // 如果点击的是当前选中的标签，则取消选择
                  if (activeTagId === tag) {
                    setActiveTagId(null);
                  } else {
                    setActiveTagId(tag);
                  }
                  // 关闭侧边栏（移动端）
                  setSidebarOpen(false);
                }}
              >
                <Hash size={10} />
                {tag}
              </button>
            ))}
          </div>
        </section>
      </div>

      <div className="p-4 border-t border-zinc-200 dark:border-zinc-800">
        <button
          onClick={() => setShowSettings(true)}
          className="mt-2 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          <Settings size={16} />
          {t('settings')}
        </button>
        <button
          onClick={() => setDarkMode(!darkMode)}
          className="mt-2 w-full flex items-center gap-3 px-3 py-2 text-sm font-medium text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-800 rounded-lg transition-colors"
        >
          {darkMode ? <Sun size={16} /> : <Moon size={16} />}
          {darkMode ? t('lightMode') : t('darkMode')}
        </button>
      </div>
    </div>
  );

  // NoteItem Component
  const NoteItem = React.memo(({
    note,
    activeNoteId,
    selectedNoteIds,
    selectionMode,
    onSelect,
    onToggleSelection,
    onStartSelection,
    t
  }: {
    note: Note;
    activeNoteId: string | null;
    selectedNoteIds: string[];
    selectionMode: boolean;
    onSelect: (id: string) => void;
    onToggleSelection: (id: string) => void;
    onStartSelection: (id: string) => void;
    t: (key: string) => string;
  }) => {
    // Cache expensive calculations
    const contentPreview = useMemo(() => {
      return note.content.slice(0, 100).replace(/[#*`]/g, '') || t('noContent');
    }, [note.content, t]);

    const formattedDate = useMemo(() => {
      return new Date(note.updatedAt).toLocaleDateString();
    }, [note.updatedAt]);

    let longPressTimer: NodeJS.Timeout | null = null;

    const handleMouseDown = useCallback(() => {
      longPressTimer = setTimeout(() => {
        onStartSelection(note.id);
      }, 500);
    }, [note.id, onStartSelection]);

    const handleMouseUp = useCallback(() => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, []);

    const handleTouchStart = useCallback(() => {
      longPressTimer = setTimeout(() => {
        onStartSelection(note.id);
      }, 500);
    }, [note.id, onStartSelection]);

    const handleTouchEnd = useCallback(() => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
        longPressTimer = null;
      }
    }, []);

    const handleClick = useCallback(() => {
      if (selectionMode) {
        onToggleSelection(note.id);
      } else {
        onSelect(note.id);
      }
    }, [note.id, selectionMode, onToggleSelection, onSelect]);

    const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      onToggleSelection(note.id);
    }, [note.id, onToggleSelection]);

    return (
      <div
        key={note.id}
        onClick={handleClick}
        onMouseDown={handleMouseDown}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
        onTouchStart={handleTouchStart}
        onTouchEnd={handleTouchEnd}
        onTouchCancel={handleTouchEnd}
        className={`
          group p-4 rounded-xl cursor-pointer transition-all duration-200 border border-transparent relative
          ${activeNoteId === note.id
            ? 'bg-accent-50 dark:bg-accent-900/20 border-accent-200 dark:border-accent-800/50'
            : 'hover:bg-zinc-50 dark:hover:bg-zinc-800/50 hover:border-zinc-100 dark:hover:border-zinc-800'}
          ${selectedNoteIds.includes(note.id) ? 'bg-accent-100 dark:bg-accent-900/30 border-accent-300 dark:border-accent-700' : ''}
        `}
      >
        <div className="flex items-start justify-between gap-2">
          <div className="flex-1">
            <h3 className={`font-semibold mb-1 line-clamp-2 leading-tight ${activeNoteId === note.id ? 'text-accent-900 dark:text-accent-100' : 'text-zinc-800 dark:text-zinc-200'}`}>
              {note.title || t('untitledNote')}
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 line-clamp-2 mb-2 leading-normal">
              {contentPreview}
            </p>
            <div className="flex items-center justify-between">
              <span className="text-[10px] text-zinc-400 font-mono">
                {formattedDate}
              </span>
              {!selectionMode && activeNoteId === note.id && <ChevronRight size={14} className="text-accent-500" />}
            </div>
          </div>

          {/* Selection checkbox */}
          {selectionMode && (
            <button
              className={`
                w-5 h-5 rounded-full flex items-center justify-center cursor-pointer transition-all duration-200
                ${selectedNoteIds.includes(note.id)
                  ? 'bg-accent-600 text-white border-2 border-accent-600'
                  : 'border-2 border-zinc-300 dark:border-zinc-700 hover:border-accent-500'}
              `}
              onClick={handleCheckboxClick}
            >
              {selectedNoteIds.includes(note.id) && <Check size={12} />}
            </button>
          )}
        </div>
      </div>
    );
  });

  // NoteList Component
  const NoteList = () => {
    // Stable event handlers
    const handleNoteSelect = useCallback((id: string) => {
      handleSelectNote(id);
    }, []);

    const handleToggleSelection = useCallback((id: string) => {
      setSelectedNoteIds(prev => {
        if (prev.includes(id)) {
          return prev.filter(noteId => noteId !== id);
        } else {
          return [...prev, id];
        }
      });
    }, []);

    const handleStartSelection = useCallback((id: string) => {
      if (!selectionMode) {
        setSelectionMode(true);
        setSelectedNoteIds([id]);
      }
    }, [selectionMode]);

    return (
      <div className={`
      flex flex-col h-full bg-white dark:bg-zinc-900 
      ${mobileView === ViewMode.EDIT ? 'hidden md:flex' : 'flex'}
      md:max-w-md md:flex-1 md:border-r border-zinc-200 dark:border-zinc-800
    `}>
        <div className="h-16 px-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center gap-2">
          {selectionMode ? (
            // Selection Mode Header
            <>
              <button
                onClick={() => {
                  setSelectionMode(false);
                  setSelectedNoteIds([]);
                }}
                className="p-2 -ml-2 text-zinc-500 hover:text-zinc-700 dark:hover:text-zinc-300 flex-shrink-0"
              >
                <X size={20} />
              </button>
              <div className="flex-1 text-center font-medium text-sm">
                已选择 {selectedNoteIds.length} 项
              </div>
              <button
                onClick={() => {
                  if (selectedNoteIds.length === filteredNotes.length) {
                    // 如果已经全选，则取消全选
                    setSelectedNoteIds([]);
                  } else {
                    // 否则全选所有显示的笔记
                    setSelectedNoteIds(filteredNotes.map(note => note.id));
                  }
                }}
                className="p-2 -mr-2 text-accent-600 hover:text-accent-700 dark:hover:text-accent-400 font-medium text-sm flex-shrink-0"
              >
                {selectedNoteIds.length === filteredNotes.length ? '取消全选' : '全选'}
              </button>
            </>
          ) : (
            // Normal Mode Header
            <>
              <div className="md:hidden flex-shrink-0">
                <button onClick={() => setSidebarOpen(!sidebarOpen)} className="p-2 -ml-2 text-zinc-500">
                  <Menu size={20} />
                </button>
              </div>
              <div className="flex-1 min-w-0">
                <div className="relative w-full">
                  <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    ref={searchInputRef}
                    type="text"
                    placeholder={t('search')}
                    value={searchQuery}
                    onChange={(e) => {
                      setSearchQuery(e.target.value);
                    }}
                    onFocus={() => setSearchFocused(true)}
                    onBlur={() => {
                      // Only blur after a short delay to allow other interactions
                      setTimeout(() => setSearchFocused(false), 100);
                    }}
                    className="w-full pl-9 pr-4 py-2 bg-zinc-50 dark:bg-zinc-800 rounded-lg text-sm border-none outline-none focus:ring-1 focus:ring-accent-500"
                    style={{ minHeight: '40px', boxSizing: 'border-box' }}
                  />
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-2">
          {filteredNotes.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-40 text-zinc-400 text-sm">
              <FolderOpen size={32} className="mb-2 opacity-50" />
              {t('noNotesFound')}
            </div>
          ) : (
            filteredNotes.map(note => (
              <NoteItem
                key={note.id}
                note={note}
                activeNoteId={activeNoteId}
                selectedNoteIds={selectedNoteIds}
                selectionMode={selectionMode}
                onSelect={handleNoteSelect}
                onToggleSelection={handleToggleSelection}
                onStartSelection={handleStartSelection}
                t={t}
              />
            ))
          )}
        </div>

        {/* Mobile floating action button */}
        <div className="md:hidden">
          <button
            onClick={(e) => {
              // Only trigger create note if it's not a drag event
              if (!e.currentTarget.dataset.dragging) {
                handleCreateNote();
              }
            }}
            className="fixed bottom-4 right-6 w-16 h-16 bg-accent-600 dark:bg-accent-500 text-white rounded-full font-medium shadow-xl flex items-center justify-center z-40"
            ref={(el) => {
              if (el) {
                let isDragging = false;
                let offset = { x: 0, y: 0 };
                let startPosition = { x: 0, y: 0 };

                const handleMouseDown = (e: React.MouseEvent<HTMLButtonElement>) => {
                  isDragging = false;
                  startPosition.x = e.clientX;
                  startPosition.y = e.clientY;
                  offset.x = e.clientX - el.getBoundingClientRect().left;
                  offset.y = e.clientY - el.getBoundingClientRect().top;
                  document.addEventListener('mousemove', handleMouseMove);
                  document.addEventListener('mouseup', handleMouseUp);
                };

                const handleMouseMove = (e: MouseEvent) => {
                  const deltaX = Math.abs(e.clientX - startPosition.x);
                  const deltaY = Math.abs(e.clientY - startPosition.y);

                  // Consider it a drag if moved more than 5 pixels
                  if (deltaX > 5 || deltaY > 5) {
                    isDragging = true;
                    el.dataset.dragging = 'true';
                  }

                  if (isDragging) {
                    const newX = e.clientX - offset.x;
                    const newY = e.clientY - offset.y;
                    el.style.left = `${Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newX))}px`;
                    el.style.top = `${Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newY))}px`;
                  }
                };

                const handleMouseUp = () => {
                  delete el.dataset.dragging;
                  isDragging = false;
                  // 保存当前位置到localStorage
                  localStorage.setItem('zenote_fab_position', JSON.stringify({
                    left: el.style.left,
                    top: el.style.top
                  }));
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                };

                const handleTouchStart = (e: TouchEvent) => {
                  isDragging = false;
                  const touch = e.touches[0];
                  startPosition.x = touch.clientX;
                  startPosition.y = touch.clientY;
                  offset.x = touch.clientX - el.getBoundingClientRect().left;
                  offset.y = touch.clientY - el.getBoundingClientRect().top;
                  document.addEventListener('touchmove', handleTouchMove);
                  document.addEventListener('touchend', handleTouchEnd);
                };

                const handleTouchMove = (e: TouchEvent) => {
                  const touch = e.touches[0];
                  const deltaX = Math.abs(touch.clientX - startPosition.x);
                  const deltaY = Math.abs(touch.clientY - startPosition.y);

                  // Consider it a drag if moved more than 5 pixels
                  if (deltaX > 5 || deltaY > 5) {
                    isDragging = true;
                    el.dataset.dragging = 'true';
                  }

                  if (isDragging) {
                    const newX = touch.clientX - offset.x;
                    const newY = touch.clientY - offset.y;
                    el.style.left = `${Math.max(0, Math.min(window.innerWidth - el.offsetWidth, newX))}px`;
                    el.style.top = `${Math.max(0, Math.min(window.innerHeight - el.offsetHeight, newY))}px`;
                  }
                };

                const handleTouchEnd = () => {
                  delete el.dataset.dragging;
                  isDragging = false;
                  // 保存当前位置到localStorage
                  localStorage.setItem('zenote_fab_position', JSON.stringify({
                    left: el.style.left,
                    top: el.style.top
                  }));
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                };

                // 从localStorage读取保存的位置
                const savedPosition = localStorage.getItem('zenote_fab_position');
                if (savedPosition) {
                  try {
                    const { left, top } = JSON.parse(savedPosition);
                    if (left) el.style.left = left;
                    if (top) el.style.top = top;
                  } catch (e) {
                    console.error('Failed to parse saved position:', e);
                  }
                }

                el.addEventListener('mousedown', handleMouseDown as unknown as EventListener);
                el.addEventListener('touchstart', handleTouchStart as unknown as EventListener);

                // Cleanup event listeners on unmount
                return () => {
                  el.removeEventListener('mousedown', handleMouseDown as unknown as EventListener);
                  el.removeEventListener('touchstart', handleTouchStart as unknown as EventListener);
                  document.removeEventListener('mousemove', handleMouseMove);
                  document.removeEventListener('mouseup', handleMouseUp);
                  document.removeEventListener('touchmove', handleTouchMove);
                  document.removeEventListener('touchend', handleTouchEnd);
                };
              }
            }}
          >
            <Plus size={24} />
          </button>
        </div>
        {/* Desktop FAB is usually not needed if "New Note" is accessible, but for consistency let's put it in the list header or bottom */}
        <div className="hidden md:block p-4 border-t border-zinc-100 dark:border-zinc-800">
          <button
            onClick={handleCreateNote}
            className="w-full py-2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-lg font-medium shadow-sm hover:opacity-90 transition-opacity flex items-center justify-center gap-2"
          >
            <Plus size={18} /> {t('createNote')}
          </button>
        </div>

        {/* Bottom Action Bar for Selection Mode */}
        {selectionMode && (
          <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-zinc-900 border-t border-zinc-200 dark:border-zinc-800 flex justify-around items-center gap-2 py-3 px-4 shadow-lg z-40 pb-safe">
            <button
              className="flex-1 flex flex-col items-center justify-center p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => {
                // 实现移动功能
                // 设置默认目标笔记本为当前活动笔记本（如果有的话）
                setSelectedNotebookId(activeNotebookId || 'default');
                setDialogTitle('选择目标笔记本');
                setDialogType('selectNotebook');
                setDialogAction(null); // 不需要预定义的action
                setShowDialog(true);
              }}
            >
              <FolderOpen size={18} className="text-accent-500 mb-1" />
              <span className="text-xs font-medium">{t('移动') || 'Move'}</span>
            </button>

            <button
              className="flex-1 flex flex-col items-center justify-center p-3 rounded-lg hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors"
              onClick={() => {
                // 实现置顶功能
                const now = Date.now();
                setNotes(notes.map(note => {
                  if (selectedNoteIds.includes(note.id)) {
                    return { ...note, updatedAt: now };
                  }
                  return note;
                }));
                // 关闭选择模式
                setSelectionMode(false);
                setSelectedNoteIds([]);
              }}
            >
              <ChevronRight size={18} className="text-accent-500 mb-1" />
              <span className="text-xs font-medium">{t('置顶') || 'Pin'}</span>
            </button>

            <button
              className="flex-1 flex flex-col items-center justify-center p-3 rounded-lg hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors text-red-500"
              onClick={() => {
                // 实现删除功能
                setNotes(notes.filter(note => !selectedNoteIds.includes(note.id)));
                // 如果当前编辑的笔记被删除，重置activeNoteId
                if (activeNoteId && selectedNoteIds.includes(activeNoteId)) {
                  setActiveNoteId(null);
                  setMobileView(ViewMode.LIST);
                }
                // 关闭选择模式
                setSelectionMode(false);
                setSelectedNoteIds([]);
              }}
            >
              <X size={18} className="mb-1" />
              <span className="text-xs font-medium">{t('删除') || 'Delete'}</span>
            </button>
          </div>
        )}
      </div>
    );
  };

  // Settings Modal Component - Lazy loaded for performance
  const SettingsModal = React.memo(() => {
    const handleSaveSettings = () => {
      // Save language settings
      localStorage.setItem('zenote_language', language);

      // Save sync settings
      localStorage.setItem('zenote_sync_enabled', webdavEnabled.toString());
      localStorage.setItem('zenote_sync_url', syncUrl);
      localStorage.setItem('zenote_sync_username', syncUsername);
      localStorage.setItem('zenote_sync_password', syncPassword);

      // Additional settings can be saved here

      setShowSettings(false);
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-3 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between h-16">
            <h2 className="text-xl font-bold text-zinc-800 dark:text-white">{t('settings')}</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-1 text-zinc-500 hover:text-accent-600 rounded-lg transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex">
              <button
                onClick={() => setActiveSettingsTab('language')}
                className={`px-6 py-2 font-medium transition-colors relative ${activeSettingsTab === 'language' ? 'text-accent-600' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                {t('language')}
                {activeSettingsTab === 'language' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveSettingsTab('sync')}
                className={`px-6 py-2 font-medium transition-colors relative ${activeSettingsTab === 'sync' ? 'text-accent-600' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                {t('sync')}
                {activeSettingsTab === 'sync' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveSettingsTab('gemini')}
                className={`px-6 py-2 font-medium transition-colors relative ${activeSettingsTab === 'gemini' ? 'text-accent-600' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                {t('gemini')}
                {activeSettingsTab === 'gemini' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-600"></div>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeSettingsTab === 'language' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('language')}</label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value)}
                    className="w-full px-4 py-3 border border-zinc-300 dark:border-zinc-700 rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent"
                  >
                    <option value="zh-CN">{t('zh-CN')}</option>
                    <option value="en-US">{t('en-US')}</option>
                    <option value="ja-JP">{t('ja-JP')}</option>
                  </select>
                </div>
              </div>
            )}

            {activeSettingsTab === 'sync' && (
              <div className="space-y-6">


                {/* WebDAV Sync Settings */}
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">{t('webdavSync')}</h3>
                      <p className="text-xs text-zinc-500 dark:text-zinc-500 mt-1">{t('syncNotes')}</p>
                    </div>
                    <div className="relative inline-block w-12 h-6">
                      <input
                        type="checkbox"
                        id="webdav-toggle"
                        checked={webdavEnabled}
                        onChange={(e) => setWebdavEnabled(e.target.checked)}
                        className="sr-only"
                      />
                      <label
                        htmlFor="webdav-toggle"
                        className={`absolute inset-0 rounded-full transition-colors cursor-pointer ${webdavEnabled ? 'bg-accent-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                      >
                        <span
                          className={`absolute top-0.5 left-0.5 bg-white rounded-full w-5 h-5 transition-transform ${webdavEnabled ? 'transform translate-x-6' : ''}`}
                        ></span>
                      </label>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('serverUrl')}</label>
                      <input
                        type="text"
                        value={syncUrl}
                        onChange={(e) => setSyncUrl(e.target.value)}
                        placeholder="https://dav.jianguoyun.com/dav/"
                        disabled={!webdavEnabled}
                        className={`w-full px-4 py-3 border ${webdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!webdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                      {syncUrl.includes('jianguoyun.com') && (
                        <p className="text-[10px] text-accent-600 mt-1 italic">提醒：坚果云地址结尾需包含 /dav/，且必须使用“第三方应用密码”</p>
                      )}
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('username')}</label>
                      <input
                        type="text"
                        value={syncUsername}
                        onChange={(e) => setSyncUsername(e.target.value)}
                        disabled={!webdavEnabled}
                        className={`w-full px-4 py-3 border ${webdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!webdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('password')}</label>
                      <input
                        type="password"
                        value={syncPassword}
                        onChange={(e) => setSyncPassword(e.target.value)}
                        disabled={!webdavEnabled}
                        className={`w-full px-4 py-3 border ${webdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!webdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>
                  </div>

                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={handleManualSync}
                      disabled={!webdavEnabled || syncInProgress || !syncUrl || !syncUsername || !syncPassword}
                      className={`flex-1 px-2 py-1.5 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${!webdavEnabled || !syncUrl || !syncUsername || !syncPassword ? 'bg-zinc-300 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed' : syncInProgress ? 'bg-accent-400 dark:bg-accent-700 text-white' : 'bg-accent-600 hover:bg-accent-700 dark:bg-accent-600 dark:hover:bg-accent-700 text-white'}`}
                    >
                      {syncInProgress ? (
                        <>
                          <div className="animate-spin rounded-full h-3 w-3 border-2 border-white border-t-transparent"></div>
                          {t('syncing')}
                        </>
                      ) : (
                        t('syncNow')
                      )}
                    </button>

                    <button
                      onClick={handleSaveSettings}
                      className="flex-1 px-2 py-1.5 bg-accent-600 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors shadow-md"
                    >
                      {t('save')}
                    </button>
                  </div>
                </div>

                {syncStatus && (
                  <p className={`text-xs mt-2 ${syncStatus.includes(t('syncSuccess')) ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                    {syncStatus}
                  </p>
                )}
              </div>
            )}

            {activeSettingsTab === 'gemini' && (
              <GeminiSettings t={t} />
            )}
          </div>
        </div>
      </div>
    );
  }); // Close the React.memo

  return (
    <div className="flex h-screen pt-safe pb-safe bg-white dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden font-sans">
      {/* Mobile Sidebar Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-30 md:hidden backdrop-blur-sm"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <Sidebar />
      <NoteList />

      {/* Editor Area */}
      <div className={`flex-1 flex flex-col h-full ${mobileView === ViewMode.LIST ? 'hidden md:flex' : 'flex z-20 fixed inset-0 md:static bg-white dark:bg-zinc-900'}`}>
        {activeNote ? (
          <React.Suspense fallback={<LoadingComponent />}>
            <NoteEditor
              note={activeNote}
              onUpdate={handleUpdateNote}
              onDelete={handleDeleteNote}
              onShare={(n) => setNoteToShare(n)}
              onBack={() => setMobileView(ViewMode.LIST)}
              t={t}
              fontSize={fontSize}
              setFontSize={setFontSize}
            />
          </React.Suspense>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-zinc-400 bg-zinc-50/50 dark:bg-zinc-900/50">
            <div className="w-16 h-16 rounded-2xl bg-zinc-100 dark:bg-zinc-800 flex items-center justify-center mb-4 shadow-inner">
              <div className="w-8 h-8 rounded bg-accent-500/20"></div>
            </div>
            <p className="font-medium">{t('selectNote')}</p>
            <p className="text-sm mt-2 opacity-60">{t('createShortcut')}</p>
          </div>
        )}
      </div>

      {noteToShare && (
        <React.Suspense fallback={<LoadingComponent />}>
          <ShareCard note={noteToShare} onClose={() => setNoteToShare(null)} t={t} fontSize={fontSize} />
        </React.Suspense>
      )}

      <Dialog />

      {/* Settings Modal */}
      {showSettings && (
        <React.Suspense fallback={<LoadingComponent />}>
          <SettingsModal />
        </React.Suspense>
      )}
    </div>
  );
};

export default App;