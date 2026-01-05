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
import { createClient } from 'webdav';

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
      'apiKeyCleared': 'API 密钥已清除！',
      'autoSync': '自动同步',
      'syncFolder': '同步文件夹',
      'deviceName': '设备名'
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
      'apiKeyCleared': 'API key cleared!',
      'autoSync': 'Auto Sync',
      'syncFolder': 'Sync Folder',
      'deviceName': 'Device Name'
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
      'apiKeyCleared': 'API キーが正常にクリアされました！',
      'autoSync': '自動同期',
      'syncFolder': '同期フォルダ',
      'deviceName': 'デバイス名'
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
  const [autoSyncEnabled, setAutoSyncEnabled] = useState<boolean>(() => {
    // 默认启用自动同步
    const saved = localStorage.getItem('zenote_auto_sync');
    return saved === null || saved === 'true';
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
  const [syncFolder, setSyncFolder] = useState<string>(() => {
    return localStorage.getItem('zenote_sync_folder') || 'zenote-notes/';
  });
  // 设备名设置，用于WebDAV同步时的文件名前缀
  const [deviceName, setDeviceName] = useState<string>(() => {
    // 默认设备名为"Device_"+随机字符串
    return localStorage.getItem('zenote_device_name') || `Device_${Math.random().toString(36).substring(2, 8)}`;
  });

  // Common Sync State
  const [syncInProgress, setSyncInProgress] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<string>('');
  
  // Auto-sync debounce timer
  const syncDebounceTimer = useRef<NodeJS.Timeout | null>(null);







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

  useEffect(() => {
    localStorage.setItem('zenote_sync_folder', syncFolder);
  }, [syncFolder]);

  useEffect(() => {
    localStorage.setItem('zenote_auto_sync', autoSyncEnabled.toString());
  }, [autoSyncEnabled]);

  useEffect(() => {
    localStorage.setItem('zenote_device_name', deviceName);
  }, [deviceName]);

  // Define syncToWebDAV first using useCallback
  const syncToWebDAV = useCallback(async (notes: Note[], url: string, username: string, password: string) => {
    // Validate URL format
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      throw new Error('WebDAV URL必须以http://或https://开头');
    }

    // Additional URL validation
    if (!url.endsWith('/')) {
      url = url + '/';
      console.log('Added trailing slash to URL:', url);
    }

    // Check if we're in a browser environment
    const isBrowser = typeof window !== 'undefined' && !((window as any).Capacitor && (window as any).Capacitor.isNative);
    
    // Detect Nutstore (坚果云) to provide better tips and use proxy
    const isNutstore = url.includes('jianguoyun.com');
    
    // Determine if we're in local development environment
    const isLocalDev = isBrowser && (window.location.origin.includes('localhost') || window.location.origin.includes('127.0.0.1'));
    
    // Determine if we're in Vercel environment
    const isVercel = isBrowser && window.location.hostname.includes('vercel.app');
    
    // Log environment information for debugging
    console.log('WebDAV Environment Debug:', {
      isBrowser: isBrowser,
      origin: isBrowser ? window.location.origin : 'Not in browser',
      isLocalDev: isLocalDev,
      isVercel: isVercel,
      isNutstore: isNutstore,
      originalUrl: url
    });
    
    // Use proxy path for Nutstore in both local development and Vercel environment
    let clientUrl = url;
    if (isBrowser && isNutstore) {
      // Replace Nutstore URL with proxy URL path (including /dav/) for both environments
      const urlObj = new URL(url);
      // Extract pathname (including /dav/) for proxy
      clientUrl = urlObj.pathname;
      console.log('Using proxy URL for Nutstore:', clientUrl, 'in', isLocalDev ? 'local' : 'Vercel', 'environment');
    }
    
    // Additional URL validation for Nutstore
    if (isNutstore && !url.includes('/dav/')) {
      console.warn('Nutstore URL should contain /dav/ path for proper access');
    }

    // Create WebDAV client
    const client = createClient(clientUrl, {
      username,
      password,
      // Configure for better compatibility with various WebDAV servers
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': '*/*',
        'Connection': 'keep-alive'
      }
    });

    console.log('Created WebDAV client:', {
      url: url,
      username: username
    });

    // Create a directory for the notes if it doesn't exist
    let dirPath = syncFolder;
    // Ensure folder ends with trailing slash
    if (!dirPath.endsWith('/')) {
      dirPath = dirPath + '/';
    }
    // Ensure folder starts with slash
    if (!dirPath.startsWith('/')) {
      dirPath = '/' + dirPath;
    }

    console.log('Attempting to sync to WebDAV:', {
      baseUrl: url,
      clientUrl: clientUrl,
      dirPath: dirPath,
      notesCount: notes.length
    });

    try {
      console.log('Testing WebDAV connection...');
      // Test connection by getting directory contents
      await client.getDirectoryContents('/');
      console.log('WebDAV connection successful');
    } catch (error) {
      console.error('WebDAV connection test failed:', error);
      
      let errorMsg = 'WebDAV连接失败：';
      if (error instanceof Error) {
        errorMsg += error.message;
      } else {
        errorMsg += '未知错误';
      }
      
      if (isNutstore) {
        errorMsg += '\n\n【坚果云用户提示】：\n1. 必须使用“第三方应用密码”，在坚果云官网设置->安全中生成\n2. 地址必须包含 /dav/，例如：https://dav.jianguoyun.com/dav/';
      }
      
      throw new Error(errorMsg);
    }

    // Try to create directory
    try {
      console.log('Attempting to check/create directory:', dirPath);
      
      // Check if directory exists
      let contents;
      try {
        contents = await client.getDirectoryContents(dirPath);
        console.log('Directory already exists:', dirPath);
      } catch (error) {
        console.log('Directory does not exist, attempting to create:', dirPath);
        // Directory doesn't exist, try to create it
        // For Nutstore, we need a special approach
        if (isNutstore) {
          // Nutstore workaround: create an empty file in the directory
          await client.putFileContents(`${dirPath}/.empty`, '', {
            overwrite: true,
            headers: {
              'Content-Type': 'text/plain'
            }
          });
          console.log('Created Nutstore directory via workaround:', dirPath);
        } else {
          // Standard WebDAV directory creation
          await client.createDirectory(dirPath, { recursive: true });
          console.log('Created directory successfully:', dirPath);
        }
      }
    } catch (error) {
      console.error('Directory operation failed:', error);
      
      let errorMsg = '目录操作失败：';
      if (error instanceof Error) {
        errorMsg += error.message;
      } else {
        errorMsg += '未知错误';
      }
      
      if (isNutstore) {
        errorMsg += '\n\n【坚果云用户提示】：\n1. 必须使用“第三方应用密码”，在坚果云官网设置->安全中生成\n2. 地址必须包含 /dav/，例如：https://dav.jianguoyun.com/dav/';
      }
      
      throw new Error(errorMsg);
    }

    // Sync each note as a separate markdown file
    let uploadCount = 0;
    let failedCount = 0;

    for (const note of notes) {
      // 生成文件名：设备名+标题.md
      // 处理边界情况：空标题、特殊字符、唯一性
      const safeTitle = note.title?.trim() || '无标题';
      // 移除文件名中可能导致问题的特殊字符
      const sanitizedTitle = safeTitle.replace(/[<>:/"|?*]/g, '-');
      // 限制文件名长度
      const truncatedTitle = sanitizedTitle.substring(0, 50);
      // 生成最终文件名
      const noteFileName = `${deviceName}-${truncatedTitle}.md`;
      const notePath = `${dirPath}${noteFileName}`;

      // Create markdown content
      const markdownContent = `# ${note.title || 'Untitled Note'}\n\n${note.content}`;

      console.log(`Uploading note: ${note.title || 'Untitled Note'} to ${notePath}`);

      // Upload the note to WebDAV
      try {
        await client.putFileContents(notePath, markdownContent, {
          overwrite: true,
          headers: {
            'Content-Type': 'text/markdown'
          }
        });

        console.log('Note upload successful:', note.title || 'Untitled Note');
        uploadCount++;
      } catch (error) {
        failedCount++;
        console.error('Note upload error:', error);
        
        // If it's an authentication error, stop the whole process
        if (error instanceof Error && (error.message.includes('401') || error.message.includes('403'))) {
          throw new Error(`身份验证失败：${error.message}`);
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
    const notesJsonPath = `${dirPath}notes.json`;
    const notesMetadata = notes.map(note => ({
      id: note.id,
      title: note.title,
      createdAt: note.createdAt,
      updatedAt: note.updatedAt,
      tags: note.tags,
      notebookId: note.notebookId
    }));

    const notesJsonContent = JSON.stringify(notesMetadata, null, 2);

    console.log('Uploading notes metadata to:', notesJsonPath);

    try {
      await client.putFileContents(notesJsonPath, notesJsonContent, {
        overwrite: true,
        headers: {
          'Content-Type': 'application/json'
        }
      });
      console.log('Notes metadata upload successful');
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
  }, [syncFolder, deviceName]);

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

  // Handle Tag Action (Rename or Delete)
  const handleTagAction = (tag: string) => {
    // Create a dialog to ask user if they want to rename or delete the tag
    const action = window.confirm(`选择操作：\n1. 点击"确定"重命名标签"${tag}"\n2. 点击"取消"删除标签"${tag}"`);
    
    if (action) {
      // Rename tag
      const newTagName = window.prompt(`请输入新的标签名：`, tag);
      if (newTagName && newTagName.trim() && newTagName !== tag) {
        // Update all notes that have this tag
        setNotes(prevNotes => prevNotes.map(note => {
          if (note.tags.includes(tag)) {
            return {
              ...note,
              tags: note.tags.map(t => t === tag ? newTagName.trim() : t)
            };
          }
          return note;
        }));
        
        // Update active tag if it was the one being renamed
        if (activeTagId === tag) {
          setActiveTagId(newTagName.trim());
        }
      }
    } else {
      // Delete tag
      const confirmDelete = window.confirm(`确定要删除标签"${tag}"吗？\n这将从所有笔记中移除该标签。`);
      if (confirmDelete) {
        // Update all notes to remove this tag
        setNotes(prevNotes => prevNotes.map(note => {
          return {
            ...note,
            tags: note.tags.filter(t => t !== tag)
          };
        }));
        
        // Update active tag if it was the one being deleted
        if (activeTagId === tag) {
          setActiveTagId(null);
        }
      }
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
<<<<<<< HEAD
        <button
          onClick={onGoHome}
          className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow-sm bg-accent-600 text-white hover:bg-accent-700 transition-colors"
          title="Go to home"
        >
          Z
        </button>
        <span>zenote</span>
=======
        <div className="w-8 h-8 rounded-full flex items-center justify-center text-lg font-bold shadow-sm bg-accent-600 text-white">Z</div>
        zenote
>>>>>>> d9281b1fc6c9a4c3a95768ac72edd079d6f6e859
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
                onMouseDown={(e) => {
                  const timer = setTimeout(() => {
                    handleTagAction(tag);
                  }, 500);
                  e.currentTarget.onmouseup = () => clearTimeout(timer);
                  e.currentTarget.onmouseleave = () => clearTimeout(timer);
                }}
                onTouchStart={(e) => {
                  const timer = setTimeout(() => {
                    handleTagAction(tag);
                  }, 500);
                  e.currentTarget.ontouchend = () => clearTimeout(timer);
                  e.currentTarget.ontouchcancel = () => clearTimeout(timer);
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

  // Settings Modal Component
  const SettingsModal = () => {
    // 修复输入框失去焦点问题：使用局部变量保存初始值，避免直接依赖App状态
    const initialLanguage = language;
    const initialWebdavEnabled = webdavEnabled;
    const initialSyncUrl = syncUrl;
    const initialSyncUsername = syncUsername;
    const initialSyncPassword = syncPassword;
    const initialSyncFolder = syncFolder;
    const initialAutoSyncEnabled = autoSyncEnabled;
    const initialDeviceName = deviceName;

    // 使用本地状态管理，避免直接依赖App组件状态导致的重新渲染
    const [localLanguage, setLocalLanguage] = useState(initialLanguage);
    const [localWebdavEnabled, setLocalWebdavEnabled] = useState(initialWebdavEnabled);
    const [localSyncUrl, setLocalSyncUrl] = useState(initialSyncUrl);
    const [localSyncUsername, setLocalSyncUsername] = useState(initialSyncUsername);
    const [localSyncPassword, setLocalSyncPassword] = useState(initialSyncPassword);
    const [localSyncFolder, setLocalSyncFolder] = useState(initialSyncFolder);
    const [localAutoSyncEnabled, setLocalAutoSyncEnabled] = useState(initialAutoSyncEnabled);
    const [localDeviceName, setLocalDeviceName] = useState(initialDeviceName);

    const handleSaveSettings = (closeModal = true) => {
      // Save language settings
      localStorage.setItem('zenote_language', localLanguage);
      setLanguage(localLanguage);

      // Save sync settings
      localStorage.setItem('zenote_sync_enabled', localWebdavEnabled.toString());
      setWebdavEnabled(localWebdavEnabled);
      localStorage.setItem('zenote_sync_url', localSyncUrl);
      setSyncUrl(localSyncUrl);
      localStorage.setItem('zenote_sync_username', localSyncUsername);
      setSyncUsername(localSyncUsername);
      localStorage.setItem('zenote_sync_password', localSyncPassword);
      setSyncPassword(localSyncPassword);
      localStorage.setItem('zenote_sync_folder', localSyncFolder);
      setSyncFolder(localSyncFolder);
      localStorage.setItem('zenote_auto_sync', localAutoSyncEnabled.toString());
      setAutoSyncEnabled(localAutoSyncEnabled);
      localStorage.setItem('zenote_device_name', localDeviceName);
      setDeviceName(localDeviceName);

      if (closeModal) {
        setShowSettings(false);
      }
    };

      return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
        <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl overflow-hidden">
          {/* Header */}
          <div className="p-6 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
            <h2 className="text-2xl font-bold text-zinc-800 dark:text-white">{t('settings')}</h2>
            <button
              onClick={() => setShowSettings(false)}
              className="p-2 text-zinc-500 hover:text-accent-600 rounded-lg transition-colors"
            >
              <X size={24} />
            </button>
          </div>

          {/* Tabs */}
          <div className="border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex">
              <button
                onClick={() => setActiveSettingsTab('language')}
                className={`px-6 py-4 font-medium transition-colors relative ${activeSettingsTab === 'language' ? 'text-accent-600' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                {t('language')}
                {activeSettingsTab === 'language' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveSettingsTab('sync')}
                className={`px-6 py-4 font-medium transition-colors relative ${activeSettingsTab === 'sync' ? 'text-accent-600' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                {t('sync')}
                {activeSettingsTab === 'sync' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-600"></div>
                )}
              </button>
              <button
                onClick={() => setActiveSettingsTab('gemini')}
                className={`px-6 py-4 font-medium transition-colors relative ${activeSettingsTab === 'gemini' ? 'text-accent-600' : 'text-zinc-500 hover:text-zinc-700 dark:text-zinc-400 dark:hover:text-zinc-200'}`}
              >
                {t('gemini')}
                {activeSettingsTab === 'gemini' && (
                  <div className="absolute bottom-0 left-0 right-0 h-1 bg-accent-600"></div>
                )}
              </button>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeSettingsTab === 'language' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-2">{t('language')}</label>
                  <select
                    value={localLanguage}
                    onChange={(e) => setLocalLanguage(e.target.value)}
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
                <div className="border border-zinc-200 dark:border-zinc-800 rounded-xl p-3">
                  <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('webdavSync')}</span>
                        <div className="relative inline-block w-12 h-6">
                          <input
                            type="checkbox"
                            id="webdav-toggle"
                            checked={localWebdavEnabled}
                            onChange={(e) => setLocalWebdavEnabled(e.target.checked)}
                            className="sr-only"
                          />
                          <label
                            htmlFor="webdav-toggle"
                            className={`absolute inset-0 rounded-full transition-colors cursor-pointer ${localWebdavEnabled ? 'bg-accent-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 bg-white rounded-full w-5 h-5 transition-transform ${localWebdavEnabled ? 'transform translate-x-6' : ''}`}
                            ></span>
                          </label>
                        </div>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-sm text-zinc-600 dark:text-zinc-400">{t('autoSync')}</span>
                        <div className="relative inline-block w-12 h-6">
                          <input
                            type="checkbox"
                            id="auto-sync-toggle"
                            checked={localAutoSyncEnabled}
                            onChange={(e) => setLocalAutoSyncEnabled(e.target.checked)}
                            className="sr-only"
                          />
                          <label
                            htmlFor="auto-sync-toggle"
                            className={`absolute inset-0 rounded-full transition-colors cursor-pointer ${localAutoSyncEnabled ? 'bg-accent-600' : 'bg-zinc-300 dark:bg-zinc-600'}`}
                          >
                            <span
                              className={`absolute top-0.5 left-0.5 bg-white rounded-full w-5 h-5 transition-transform ${localAutoSyncEnabled ? 'transform translate-x-6' : ''}`}
                            ></span>
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('serverUrl')}</label>
                      <input
                        type="text"
                        value={localSyncUrl}
                        onChange={(e) => setLocalSyncUrl(e.target.value)}
                        placeholder="https://dav.jianguoyun.com/dav/"
                        disabled={!localWebdavEnabled}
                        className={`w-full px-3 py-2 border ${localWebdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!localWebdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('username')}</label>
                        <input
                          type="text"
                          value={localSyncUsername}
                          onChange={(e) => setLocalSyncUsername(e.target.value)}
                          disabled={!localWebdavEnabled}
                          className={`w-full px-3 py-2 border ${localWebdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!localWebdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('password')}</label>
                        <input
                          type="password"
                          value={localSyncPassword}
                          onChange={(e) => setLocalSyncPassword(e.target.value)}
                          disabled={!localWebdavEnabled}
                          className={`w-full px-3 py-2 border ${localWebdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!localWebdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('syncFolder')}</label>
                        <input
                          type="text"
                          value={localSyncFolder}
                          onChange={(e) => setLocalSyncFolder(e.target.value)}
                          disabled={!localWebdavEnabled}
                          placeholder="zenote-notes/"
                          className={`w-full px-3 py-2 border ${localWebdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!localWebdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                      
                      <div>
                        <label className="block text-sm font-medium text-zinc-700 dark:text-zinc-300 mb-1">{t('deviceName')}</label>
                        <input
                          type="text"
                          value={localDeviceName}
                          onChange={(e) => setLocalDeviceName(e.target.value)}
                          disabled={!localWebdavEnabled}
                          placeholder="输入设备名，用于同步文件名前缀"
                          className={`w-full px-3 py-2 border ${localWebdavEnabled ? 'border-zinc-300 dark:border-zinc-700' : 'border-zinc-200 dark:border-zinc-800'} rounded-lg bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-accent-500 focus:border-transparent ${!localWebdavEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
                        />
                      </div>
                    </div>


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

          {/* Footer */}
          <div className="p-4 border-t border-zinc-100 dark:border-zinc-800 flex justify-end gap-3">
            {/* 现在同步按钮 - 只在同步标签页显示 */}
            {activeSettingsTab === 'sync' && (
              <button
                onClick={() => {
                  // Before manual sync, make sure to save current local settings to App state
                  // Don't close modal so user can see sync result
                  handleSaveSettings(false);
                  // Then perform manual sync
                  handleManualSync();
                }}
                disabled={!localWebdavEnabled || syncInProgress || !localSyncUrl || !localSyncUsername || !localSyncPassword}
                className={`px-6 py-2 rounded-lg font-medium transition-colors flex items-center justify-center gap-2 ${!localWebdavEnabled || !localSyncUrl || !localSyncUsername || !localSyncPassword ? 'bg-zinc-300 dark:bg-zinc-600 text-zinc-500 dark:text-zinc-400 cursor-not-allowed' : syncInProgress ? 'bg-accent-400 dark:bg-accent-700 text-white' : 'bg-accent-600 hover:bg-accent-700 dark:bg-accent-600 dark:hover:bg-accent-700 text-white'}`}
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
            )}
            
            {/* 保存按钮 - 在同步和语言标签页都显示 */}
            {(activeSettingsTab === 'sync' || activeSettingsTab === 'language') && (
              <button
                onClick={() => handleSaveSettings()}
                className="px-6 py-2 bg-accent-600 hover:bg-accent-600 text-white font-medium rounded-lg transition-colors shadow-md"
              >
                {t('save')}
              </button>
            )}
          </div>
        </div>
      </div>
    );
  };

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
      {showSettings && <SettingsModal />}
    </div>
  );
};

export default App;