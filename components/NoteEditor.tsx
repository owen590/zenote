import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { 
  Sparkles, 
  Share, 
  Trash2, 
  Eye, 
  Edit3,
  Wand2,
  CheckCircle2,
  ArrowLeft,
  Bold,
  Italic,
  Heading1,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  CheckSquare,
  Code,
  Quote,
  Settings,
  X,
  Calendar,
  Link as LinkIcon,
  Tag,
  Sigma,
  Indent,
  Outdent,
  Search,
  Keyboard,
  GripHorizontal,
  Undo2,
  Redo2,
  Type,
  Plus as PlusIcon,
  Minus as MinusIcon
} from 'lucide-react';
import { summarizeNote, polishText, continueText, detectLanguage } from '../services/geminiService';

interface NoteEditorProps {
  note: Note;
  onUpdate: (note: Note) => void;
  onDelete: (id: string) => void;
  onShare: (note: Note) => void;
  onBack?: () => void;
  t: (key: string) => string;
  fontSize?: number;
  setFontSize?: React.Dispatch<React.SetStateAction<number>>;
}

// --- Tool Definitions ---
type ToolId = 'undo' | 'redo' | 'h1' | 'h2' | 'h3' | 'bold' | 'italic' | 'code' | 'math' | 'list' | 'list-ordered' | 'task' | 'outdent' | 'indent' | 'date' | 'link' | 'tag' | 'quote' | 'search' | 'hide-keyboard' | 'delete' | 'fontSize';

interface ToolDef {
  id: ToolId;
  label: string;
  icon: React.ReactNode;
  action: (text: string, start: number, end: number) => { newText: string, newCursor: number, selectionLen?: number };
}

// Helper for wrapping text
const wrapText = (text: string, start: number, end: number, wrapper: string) => {
  const before = text.substring(0, start);
  const selection = text.substring(start, end);
  const after = text.substring(end);
  return {
    newText: `${before}${wrapper}${selection}${wrapper}${after}`,
    newCursor: start + wrapper.length,
    selectionLen: selection.length
  };
};

// Helper for inserting line prefix
const insertLinePrefix = (text: string, start: number, end: number, prefix: string) => {
  const before = text.substring(0, start);
  const after = text.substring(end);
  return {
    newText: `${before}\n${prefix} ${after}`,
    newCursor: start + prefix.length + 2
  };
};

// Default tools order: Undo, Redo, then H2 as requested
const DEFAULT_TOOLS: ToolId[] = [
  'undo', 'redo', 'fontSize', 'h2', 'bold', 'italic', 'code', 'math', 'list-ordered', 'list', 'task', 'outdent', 'indent', 'date', 'link', 'tag', 'search', 'delete'
];

const NoteEditor: React.FC<NoteEditorProps> = ({ note, onUpdate, onDelete, onShare, onBack, t, fontSize, setFontSize }) => {
  // Generate tools with translated labels
  const TOOLS: Record<ToolId, ToolDef> = {
    'fontSize': {
      id: 'fontSize', label: t('fontSize'), icon: <Type size={20} />,
      action: (t, s, e) => ({ newText: t, newCursor: s, selectionLen: e - s }) // No text modification
    },
    'undo': {
      id: 'undo', label: t('undo'), icon: <Undo2 size={18} />,
      action: (t, s, e) => ({ newText: t, newCursor: s }) // Handled specially
    },
    'redo': {
      id: 'redo', label: t('redo'), icon: <Redo2 size={18} />,
      action: (t, s, e) => ({ newText: t, newCursor: s }) // Handled specially
    },
    'h1': { 
      id: 'h1', label: t('header1'), icon: <span className="font-bold text-sm">H1</span>,
      action: (t, s, e) => insertLinePrefix(t, s, e, '#')
    },
    'h2': { 
      id: 'h2', label: t('header2'), icon: <span className="font-bold text-sm">H2</span>,
      action: (t, s, e) => insertLinePrefix(t, s, e, '##')
    },
    'h3': { 
      id: 'h3', label: t('header3'), icon: <span className="font-bold text-sm">H3</span>,
      action: (t, s, e) => insertLinePrefix(t, s, e, '###')
    },
    'bold': { 
      id: 'bold', label: t('bold'), icon: <Bold size={18} strokeWidth={2.5} />,
      action: (t, s, e) => wrapText(t, s, e, '**')
    },
    'italic': { 
      id: 'italic', label: t('italic'), icon: <Italic size={18} />,
      action: (t, s, e) => wrapText(t, s, e, '_')
    },
    'code': { 
      id: 'code', label: t('code'), icon: <Code size={18} />,
      action: (t, s, e) => wrapText(t, s, e, '`')
    },
    'math': { 
      id: 'math', label: t('math'), icon: <Sigma size={18} />,
      action: (t, s, e) => {
        const before = t.substring(0, s);
        const after = t.substring(e);
        return {
          newText: `${before}$$\n\n$$${after}`,
          newCursor: s + 3
        }
      }
    },
    'list': { 
      id: 'list', label: t('bulletList'), icon: <List size={18} />,
      action: (t, s, e) => insertLinePrefix(t, s, e, '-')
    },
    'list-ordered': { 
      id: 'list-ordered', label: t('orderedList'), icon: <ListOrdered size={18} />,
      action: (t, s, e) => insertLinePrefix(t, s, e, '1.')
    },
    'task': { 
      id: 'task', label: t('taskList'), icon: <CheckSquare size={18} />,
      action: (t, s, e) => insertLinePrefix(t, s, e, '- [ ]')
    },
    'outdent': { 
      id: 'outdent', label: t('decreaseIndent'), icon: <Outdent size={18} />,
      action: (t, s, e) => ({ newText: t, newCursor: s }) // Simplified
    },
    'indent': { 
      id: 'indent', label: t('increaseIndent'), icon: <Indent size={18} />,
      action: (t, s, e) => insertLinePrefix(t, s, e, '  ')
    },
    'date': { 
      id: 'date', label: t('insertTime'), icon: <Calendar size={18} />,
      action: (t, s, e) => {
        const dateStr = new Date().toLocaleString();
        const before = t.substring(0, s);
        const after = t.substring(e);
        return { newText: `${before}${dateStr}${after}`, newCursor: s + dateStr.length };
      }
    },
    'link': { 
      id: 'link', label: t('link'), icon: <LinkIcon size={18} />,
      action: (t, s, e) => {
        const before = t.substring(0, s);
        const sel = t.substring(s, e);
        const after = t.substring(e);
        const link = `[${sel || 'text'}](url)`;
        return { newText: `${before}${link}${after}`, newCursor: s + 1, selectionLen: sel.length || 4 };
      }
    },
    'tag': { 
      id: 'tag', label: t('tag'), icon: <Tag size={18} />,
      action: (t, s, e) => {
        const before = t.substring(0, s);
        const after = t.substring(e);
        return { newText: `${before}#${after}`, newCursor: s + 1 };
      }
    },
    'quote': {
      id: 'quote', label: t('quote'), icon: <Quote size={18} />,
      action: (t, s, e) => insertLinePrefix(t, s, e, '>')
    },
    'search': {
      id: 'search', label: t('search'), icon: <Search size={18} />,
      action: (t, s, e) => ({ newText: t, newCursor: s }) // UI handled separately
    },
    'hide-keyboard': {
      id: 'hide-keyboard', label: t('hideKeyboard'), icon: <Keyboard size={18} />,
      action: (t, s, e) => ({ newText: t, newCursor: s }) // UI handled separately
    },
    'delete': {
      id: 'delete', label: t('deleteNote'), icon: <Trash2 size={18} />,
      action: (t, s, e) => ({ newText: t, newCursor: s }) // UI handled separately
    }
  };
  const [isPreview, setIsPreview] = useState(false);
  const [isAiLoading, setIsAiLoading] = useState(false);
  const [showAiMenu, setShowAiMenu] = useState(false);
  const [aiMessage, setAiMessage] = useState<string | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Function to handle font size changes
  const increaseFontSize = () => {
    effectiveSetFontSize(prev => Math.min(prev + 2, 32)); // Max 32px
  };

  const decreaseFontSize = () => {
    effectiveSetFontSize(prev => Math.max(prev - 2, 12)); // Min 12px
  };

  // Toolbar State
  const [visibleTools, setVisibleTools] = useState<ToolId[]>(() => {
    const saved = localStorage.getItem('zenote_toolbar_config');
    return saved ? JSON.parse(saved) : DEFAULT_TOOLS;
  });
  const [showToolbarSettings, setShowToolbarSettings] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);

  // Use font size from props if provided, otherwise use local state
  const [localFontSize, setLocalFontSize] = useState(16); // Default to 16px
  const effectiveFontSize = fontSize !== undefined ? fontSize : localFontSize;
  const effectiveSetFontSize = setFontSize || setLocalFontSize;
  const [showFontSizeModal, setShowFontSizeModal] = useState(false);
  
  // Search State
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<{start: number, end: number}[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(-1);
  const [isSearchActive, setIsSearchActive] = useState(false);

  // History State
  const historyRef = useRef<string[]>([note.content]);
  const historyStepRef = useRef<number>(0);
  const typingTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Reset history when note changes
  useEffect(() => {
    historyRef.current = [note.content];
    historyStepRef.current = 0;
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    // Auto-resize on load
    adjustTextareaHeight();
  }, [note.id, note.content]);

  const adjustTextareaHeight = () => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = 'auto';
      textarea.style.height = textarea.scrollHeight + 'px';
    }
  };
  
  // Search functionality
  const searchText = (query: string, content: string) => {
    if (!query) {
      setSearchResults([]);
      setCurrentMatchIndex(-1);
      return;
    }
    
    const results: {start: number, end: number}[] = [];
    const lowerQuery = query.toLowerCase();
    const lowerContent = content.toLowerCase();
    let startIndex = 0;
    
    while ((startIndex = lowerContent.indexOf(lowerQuery, startIndex)) !== -1) {
      const endIndex = startIndex + query.length;
      results.push({start: startIndex, end: endIndex});
      startIndex = endIndex;
    }
    
    setSearchResults(results);
    setCurrentMatchIndex(results.length > 0 ? 0 : -1);
    return results;
  };
  
  // Focus on current match
  const focusCurrentMatch = () => {
    if (currentMatchIndex >= 0 && currentMatchIndex < searchResults.length && textareaRef.current) {
      const match = searchResults[currentMatchIndex];
      textareaRef.current.focus();
      textareaRef.current.setSelectionRange(match.start, match.end);
    }
  };
  
  // Navigate through matches
  const nextMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex((prev) => (prev === searchResults.length - 1 ? 0 : prev + 1));
  };
  
  const prevMatch = () => {
    if (searchResults.length === 0) return;
    setCurrentMatchIndex((prev) => (prev === 0 ? searchResults.length - 1 : prev - 1));
  };
  
  // Focus on current match when results or index changes
  useEffect(() => {
    if (isSearchActive && searchResults.length > 0) {
      focusCurrentMatch();
    }
  }, [currentMatchIndex, searchResults, isSearchActive]);
  
  // Update search state when content changes
  useEffect(() => {
    if (isSearchActive && searchQuery) {
      searchText(searchQuery, note.content);
    }
  }, [note.content, isSearchActive, searchQuery]);
  
  // Update search active state when search bar visibility changes
  useEffect(() => {
    if (showSearchBar) {
      setIsSearchActive(true);
    } else {
      setIsSearchActive(false);
    }
  }, [showSearchBar]);

  useEffect(() => {
    localStorage.setItem('zenote_toolbar_config', JSON.stringify(visibleTools));
  }, [visibleTools]);

  // 当切换到编辑模式时，重新计算textarea高度
  useEffect(() => {
    if (!isPreview) {
      // 使用setTimeout确保DOM已经更新
      setTimeout(() => {
        adjustTextareaHeight();
      }, 0);
    }
  }, [isPreview]);

  const saveToHistory = (content: string) => {
    // Only save if different from current history step
    if (content !== historyRef.current[historyStepRef.current]) {
      const newHistory = historyRef.current.slice(0, historyStepRef.current + 1);
      newHistory.push(content);
      historyRef.current = newHistory;
      historyStepRef.current = newHistory.length - 1;
    }
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const newVal = e.target.value;
    
    // Derive title from first line
    const firstLine = newVal.split('\n')[0] || '';
    // Remove markdown characters for the clean title list view
    const cleanTitle = firstLine.replace(/^[#\s]+/, '').replace(/[*_`]/g, '').trim();
    const finalTitle = cleanTitle.substring(0, 100) || 'Untitled Note';

    onUpdate({ 
      ...note, 
      content: newVal, 
      title: finalTitle,
      updatedAt: Date.now() 
    });
    
    adjustTextareaHeight();
    
    // Debounce saving to history for normal typing
    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      saveToHistory(newVal);
    }, 800); // Capture snapshot after 800ms idle
  };

  const handleAISummarize = async () => {
    saveToHistory(note.content); // Save state before AI change
    setIsAiLoading(true);
    setShowAiMenu(false);
    try {
      const language = await detectLanguage(note.content);
      const summary = await summarizeNote(note.content, language);
      const newContent = `## 🤖 ${t('aiSummaryTitle')}\n${summary}\n\n${note.content}`;
      onUpdate({ ...note, content: newContent, updatedAt: Date.now() });
      saveToHistory(newContent);
      setAiMessage("Summary added.");
    } catch (error) {
      console.error("Error in AI summarize:", error);
      setAiMessage("Error generating summary.");
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setAiMessage(null), 3000);
    }
  };

  const handleAIPolish = async () => {
    saveToHistory(note.content); // Save state before AI change
    setIsAiLoading(true);
    setShowAiMenu(false);
    try {
      const language = await detectLanguage(note.content);
      const polished = await polishText(note.content, language);
      const newContent = `${note.content}\n\n## 🤖 ${t('aiPolishedTextTitle')}\n${polished}`;
      onUpdate({ ...note, content: newContent, updatedAt: Date.now() });
      saveToHistory(newContent);
      setAiMessage("Text polished.");
    } catch (error) {
      console.error("Error in AI polish:", error);
      setAiMessage("Error polishing text.");
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setAiMessage(null), 3000);
    }
  };

  const handleAIContinue = async () => {
    saveToHistory(note.content); // Save state before AI change
    setIsAiLoading(true);
    setShowAiMenu(false);
    try {
      const language = await detectLanguage(note.content);
      const continuation = await continueText(note.content, language);
      if (continuation) {
        const newContent = `${note.content}

## 🤖 ${t('aiContinuedTextTitle')}
${continuation}`;
        onUpdate({ ...note, content: newContent, updatedAt: Date.now() });
        saveToHistory(newContent);
        setAiMessage("Text continued.");
      }
    } catch (error) {
      console.error("Error in AI continue:", error);
      setAiMessage("Error continuing text.");
    } finally {
      setIsAiLoading(false);
      setTimeout(() => setAiMessage(null), 3000);
    }
  };

  const executeTool = (toolId: ToolId) => {
    if (toolId === 'hide-keyboard') {
      textareaRef.current?.blur();
      return;
    }
    if (toolId === 'search') {
      setShowSearchBar(!showSearchBar);
      return;
    }
    if (toolId === 'delete') {
      if (window.confirm(t('deleteConfirm'))) {
        onDelete(note.id);
      }
      return;
    }

    // Handle Undo
    if (toolId === 'undo') {
      const currentContent = note.content;
      const historyContent = historyRef.current[historyStepRef.current];

      if (currentContent !== historyContent) {
        // Revert pending changes
        onUpdate({ ...note, content: historyContent, updatedAt: Date.now() });
        return;
      }

      if (historyStepRef.current > 0) {
        historyStepRef.current -= 1;
        const prevContent = historyRef.current[historyStepRef.current];
        onUpdate({ ...note, content: prevContent, updatedAt: Date.now() });
      }
      return;
    }

    // Handle Redo
    if (toolId === 'redo') {
      if (historyStepRef.current < historyRef.current.length - 1) {
        historyStepRef.current += 1;
        const nextContent = historyRef.current[historyStepRef.current];
        onUpdate({ ...note, content: nextContent, updatedAt: Date.now() });
      }
      return;
    }

    // Handle Font Size
    if (toolId === 'fontSize') {
      setShowFontSizeModal(true);
      return;
    }

    const textarea = textareaRef.current;
    if (!textarea) return;

    saveToHistory(note.content);

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const text = note.content;
    
    const tool = TOOLS[toolId];
    if (tool) {
      const { newText, newCursor, selectionLen } = tool.action(text, start, end);
      
      // Calculate new title if the change affected the first line
      const firstLine = newText.split('\n')[0] || '';
      const cleanTitle = firstLine.replace(/^[#\s]+/, '').replace(/[*_`]/g, '').trim();
      const finalTitle = cleanTitle.substring(0, 100) || t('untitledNote');

      onUpdate({ ...note, content: newText, title: finalTitle, updatedAt: Date.now() });
      
      const newHistory = historyRef.current.slice(0, historyStepRef.current + 1);
      newHistory.push(newText);
      historyRef.current = newHistory;
      historyStepRef.current = newHistory.length - 1;
      
      setTimeout(() => {
        textarea.focus();
        textarea.setSelectionRange(newCursor, newCursor + (selectionLen || 0));
        adjustTextareaHeight();
      }, 0);
    }
  };

  const toggleToolVisibility = (id: ToolId) => {
    setVisibleTools(prev => 
      prev.includes(id) ? prev.filter(t => t !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col h-full bg-white dark:bg-zinc-900 relative">
      {/* Top Bar */}
      <div className="h-16 pt-safe border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between px-4 lg:px-8 shrink-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-sm z-20">
        <div className="flex items-center gap-2">
          {onBack && (
            <button onClick={onBack} className="md:hidden p-2 -ml-2 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100">
              <ArrowLeft size={20} />
            </button>
          )}
          <span className="text-xs font-mono text-zinc-400">
            {new Date(note.updatedAt).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
          </span>
        </div>
        
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setIsPreview(!isPreview)}
            className="p-3 text-zinc-500 hover:text-accent-600 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg transition-colors"
          >
            {isPreview ? <Edit3 size={20} /> : <Eye size={20} />}
          </button>
          
          <div className="relative">
            <button 
              onClick={() => setShowAiMenu(!showAiMenu)}
              className={`p-3 rounded-lg transition-colors flex items-center gap-1 ${
                isAiLoading ? 'text-accent-600 bg-accent-50 dark:bg-accent-900/30' : 'text-zinc-500 hover:text-accent-600 hover:bg-zinc-50 dark:hover:bg-zinc-800'
              }`}
            >
               {isAiLoading ? <span className="animate-spin">✨</span> : <Sparkles size={20} />}
            </button>
            
            {showAiMenu && (
              <div className="absolute top-full right-0 mt-2 w-48 bg-white dark:bg-zinc-800 rounded-xl shadow-xl border border-zinc-100 dark:border-zinc-700 overflow-hidden z-20">
                <button onClick={handleAISummarize} className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-sm flex items-center gap-2">
                  <Sparkles size={14} className="text-accent-500" /> {t('summary')}
                </button>
                <button onClick={handleAIPolish} className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-sm flex items-center gap-2">
                  <Wand2 size={14} className="text-purple-500" /> {t('polish')}
                </button>
                <button onClick={handleAIContinue} className="w-full text-left px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-700/50 text-sm flex items-center gap-2">
                  <Sparkles size={14} className="text-blue-500" /> {t('continue')}
                </button>
              </div>
            )}
          </div>

          <button onClick={() => onShare(note)} className="p-3 text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100 rounded-lg">
            <Share size={20} />
          </button>
        </div>
      </div>

      {/* Content Area */}
      <div className="flex-1 overflow-y-auto overflow-x-hidden relative bg-[#F7F9FC] dark:bg-[#09090b]">
        <div className="max-w-3xl mx-auto px-6 py-8 md:py-12 pb-32 min-h-full bg-white dark:bg-zinc-900 shadow-sm border-x border-zinc-100 dark:border-zinc-800/50">
          
          {showSearchBar && (
            <div className="mb-4 p-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
              <Search size={16} className="text-zinc-400" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  searchText(e.target.value, note.content);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    if (e.shiftKey) {
                      prevMatch();
                    } else {
                      nextMatch();
                    }
                  }
                }}
                placeholder={t('searchInNote')}
                className="flex-1 bg-transparent border-none outline-none text-sm text-zinc-700 dark:text-zinc-300"
                autoFocus
              />
              <div className="flex items-center gap-1">
                <button onClick={prevMatch} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m19 12-7 7-7-7" />
                  </svg>
                </button>
                <button onClick={nextMatch} className="p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded text-zinc-500">
                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="m5 12 7 7 7-7" />
                  </svg>
                </button>
                <span className="text-xs text-zinc-400">
                  {currentMatchIndex + 1} / {searchResults.length}
                </span>
              </div>
              <button onClick={() => {
                setShowSearchBar(false);
                setSearchQuery('');
                setSearchResults([]);
                setCurrentMatchIndex(-1);
              }} className="ml-auto p-1 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded"><X size={14} /></button>
            </div>
          )}

          {isPreview ? (
            <div className="prose prose-zinc dark:prose-invert max-w-none" style={{ fontSize: `${effectiveFontSize}px` }}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{note.content || `*${t('noContent')}*`}</ReactMarkdown>
            </div>
          ) : (
            <div className="relative">
              {/* Highlight overlay */}
              {searchResults.length > 0 && (
                <div 
                  className="absolute inset-0 pointer-events-none whitespace-pre-wrap break-words text-lg text-transparent leading-relaxed font-mono overflow-hidden"
                  style={{ height: 'auto' }}
                >
                  {note.content.split('').map((char, index) => {
                    const isMatch = searchResults.some(result => index >= result.start && index < result.end);
                    const isCurrentMatch = currentMatchIndex >= 0 && 
                                           index >= searchResults[currentMatchIndex].start && 
                                           index < searchResults[currentMatchIndex].end;
                    return (
                      <span 
                        key={index} 
                        className={`${isMatch ? 'bg-accent-200 dark:bg-accent-900/50' : ''} ${isCurrentMatch ? 'bg-accent-400 dark:bg-accent-700/80' : ''}`}
                      >
                        {char}
                      </span>
                    );
                  })}
                </div>
              )}
              {/* Actual textarea */}
              <textarea
                ref={textareaRef}
                value={note.content}
                onChange={handleContentChange}
                placeholder={t('startTyping')}
                className="w-full min-h-[200px] resize-none bg-transparent border-none outline-none text-zinc-700 dark:text-zinc-300 leading-relaxed font-mono overflow-hidden"
                spellCheck={false}
                style={{ height: 'auto', fontSize: `${effectiveFontSize}px` }}
              />
            </div>
          )}
        </div>
      </div>

      {/* Toolbar Area */}
      {!isPreview && (
        <div className="absolute bottom-0 left-0 right-0 bg-[#F2F4F7] dark:bg-[#18181b] border-t border-zinc-200 dark:border-zinc-800 flex items-center px-2 py-2 gap-2 z-10 pb-safe">
          
          {/* Scrollable Tools */}
          <div className="flex-1 flex items-center gap-2 overflow-x-auto no-scrollbar mask-gradient-right pr-4">
            {visibleTools.map((toolId) => (
              <button
                key={toolId}
                onClick={() => executeTool(toolId)}
                className="flex-shrink-0 w-10 h-10 flex items-center justify-center text-accent-600 dark:text-accent-400 rounded hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm transition-all active:scale-95"
                title={TOOLS[toolId].label}
              >
                {TOOLS[toolId].icon}
              </button>
            ))}
          </div>

          {/* Fixed Settings Button */}
          <div className="flex-shrink-0 pl-2 border-l border-zinc-300 dark:border-zinc-700">
            <button
              onClick={() => setShowToolbarSettings(true)}
              className="w-10 h-10 flex items-center justify-center text-accent-600 dark:text-accent-400 rounded hover:bg-white dark:hover:bg-zinc-800 hover:shadow-sm transition-all"
            >
              <Settings size={20} />
            </button>
          </div>
        </div>
      )}

      {/* Settings Modal */}
      {showToolbarSettings && (
        <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-end md:items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[80vh] animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="p-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
              <h3 className="font-semibold text-lg">{t('manageToolbar')}</h3>
              <button onClick={() => setShowToolbarSettings(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="flex-1 overflow-y-auto p-2">
              <p className="px-4 py-2 text-xs text-zinc-400 uppercase tracking-wider font-medium">{t('selectToolsToShow')}</p>
              <div className="space-y-1">
                {Object.values(TOOLS).map((tool) => (
                  <label key={tool.id} className="flex items-center gap-3 px-4 py-3 hover:bg-zinc-50 dark:hover:bg-zinc-800 rounded-lg cursor-pointer transition-colors">
                    <div className={`w-5 h-5 rounded border flex items-center justify-center transition-colors ${visibleTools.includes(tool.id) ? 'bg-accent-600 border-accent-600' : 'border-zinc-300 dark:border-zinc-600'}`}>
                      {visibleTools.includes(tool.id) && <CheckSquare size={14} className="text-white" />}
                    </div>
                    <div className="w-8 h-8 flex items-center justify-center bg-zinc-100 dark:bg-zinc-800 rounded text-zinc-600 dark:text-zinc-300">
                      {tool.icon}
                    </div>
                    <span className="font-medium text-sm">{tool.label}</span>
                    <input 
                      type="checkbox" 
                      className="hidden" 
                      checked={visibleTools.includes(tool.id)}
                      onChange={() => toggleToolVisibility(tool.id)}
                    />
                    <GripHorizontal className="ml-auto text-zinc-300" size={16} />
                  </label>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Font Size Modal */}
      {showFontSizeModal && (
        <div className="absolute inset-0 z-50 bg-black/20 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white dark:bg-zinc-900 w-full max-w-md rounded-2xl shadow-2xl p-6 animate-in slide-in-from-bottom-10 fade-in duration-300">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-lg">{t('fontSize')}</h3>
              <button onClick={() => setShowFontSizeModal(false)} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full">
                <X size={20} />
              </button>
            </div>
            
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <label className="flex-1">{t('fontSize')} (12-32px):</label>
                <input
                  type="number"
                  min="12"
                  max="32"
                  value={effectiveFontSize}
                  onChange={(e) => effectiveSetFontSize(Math.min(32, Math.max(12, parseInt(e.target.value) || 16)))}
                  className="w-24 px-3 py-2 bg-zinc-100 dark:bg-zinc-800 rounded-lg border border-zinc-200 dark:border-zinc-700"
                />
              </div>
              
              <div className="flex gap-2">
                <button 
                  onClick={() => effectiveSetFontSize(prev => Math.max(12, prev - 2))}
                  className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <MinusIcon size={18} className="mx-auto" />
                </button>
                <button 
                  onClick={() => effectiveSetFontSize(prev => Math.min(32, prev + 2))}
                  className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  <PlusIcon size={18} className="mx-auto" />
                </button>
              </div>
              
              <div className="pt-4 flex gap-3">
                <button 
                  onClick={() => {
                    effectiveSetFontSize(16);
                  }}
                  className="flex-1 py-2 bg-zinc-100 dark:bg-zinc-800 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-lg transition-colors"
                >
                  {t('reset')}
                </button>
                <button 
                  onClick={() => setShowFontSizeModal(false)}
                  className="flex-1 py-2 bg-accent-600 text-white hover:bg-accent-700 rounded-lg transition-colors"
                >
                  {t('apply')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AI Toast */}
      {aiMessage && (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 px-4 py-2 rounded-full shadow-lg flex items-center gap-2 text-sm font-medium z-40">
          <CheckCircle2 size={16} className="text-green-500" />
          {aiMessage}
        </div>
      )}
    </div>
  );
};

export default NoteEditor;