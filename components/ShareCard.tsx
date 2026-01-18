import React, { useState, useEffect, useRef } from 'react';
import { Note } from '../types';
import { X, Download, FileText, FileType, Image as ImageIcon, ChevronLeft, ChevronRight, Layers } from 'lucide-react';
import { toPng } from 'html-to-image';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Dynamic import for html2canvas to reduce initial bundle size
let html2canvasPromise: Promise<any> | null = null;
const getHtml2Canvas = async () => {
  if (!html2canvasPromise) {
    html2canvasPromise = import('html2canvas');
  }
  return html2canvasPromise;
};

interface ShareCardProps {
  note: Note;
  onClose: () => void;
  t: (key: string) => string;
  fontSize?: number;
}

type AspectRatio = 'Full' | '3:4';

interface ThemeConfig {
  id: string;
  name: string;
  className: string;
  logoBg: string;
  logoText: string;
  proseClass?: string;
}



// Helper to paginate markdown text roughly
const paginateContent = (text: string, maxWeight: number = 1000, aspectRatio: AspectRatio): string[] => {
  if (!text) return [''];
  
  const lines = text.split('\n');
  const pages: string[] = [];
  let currentPage = '';
  let currentWeight = 0;

  // Adjust weight factors based on aspect ratio
  const header1Weight = aspectRatio === '3:4' ? 180 : 150;
  const header2Weight = aspectRatio === '3:4' ? 150 : 120;
  const header3Weight = aspectRatio === '3:4' ? 130 : 100;
  const emptyLineWeight = aspectRatio === '3:4' ? 60 : 50;
  const listItemWeight = aspectRatio === '3:4' ? 40 : 30;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Heuristic: Headers take more vertical space
    let weight = line.length;
    if (line.startsWith('# ')) weight = header1Weight;
    else if (line.startsWith('## ')) weight = header2Weight;
    else if (line.startsWith('### ')) weight = header3Weight;
    else if (line.trim() === '') weight = emptyLineWeight;
    else if (line.startsWith('- ') || line.startsWith('1. ')) weight += listItemWeight;

    if (currentWeight + weight > maxWeight && currentPage.trim().length > 0) {
      // Try to avoid breaking in the middle of a paragraph
      if (i > 0 && !lines[i-1].trim().endsWith('.') && !lines[i-1].trim().endsWith('!') && !lines[i-1].trim().endsWith('?') && lines[i-1].trim() !== '') {
        // Find the last sentence ending
        let lastSentenceIndex = currentPage.lastIndexOf('.\n');
        if (lastSentenceIndex === -1) lastSentenceIndex = currentPage.lastIndexOf('!\n');
        if (lastSentenceIndex === -1) lastSentenceIndex = currentPage.lastIndexOf('?\n');
        if (lastSentenceIndex === -1) lastSentenceIndex = currentPage.lastIndexOf('\n\n');
        
        if (lastSentenceIndex !== -1) {
          // Split at the last sentence boundary
          const pageContent = currentPage.substring(0, lastSentenceIndex + 2);
          pages.push(pageContent);
          
          // Start next page with the remaining content
          const remainingContent = currentPage.substring(lastSentenceIndex + 2) + line + '\n';
          currentPage = remainingContent;
          currentWeight = weight; // Recalculate weight for remaining content
          continue;
        }
      }
      
      pages.push(currentPage);
      currentPage = line + '\n';
      currentWeight = weight;
    } else {
      currentPage += line + '\n';
      currentWeight += weight;
    }
  }
  if (currentPage) pages.push(currentPage);
  return pages;
};

// Extracted Component to avoid re-renders and React key issues
const CardContent = ({ 
  content, 
  pageNum, 
  totalPages, 
  theme, 
  dateStr, 
  tags,
  fontSize,
  aspectRatio
}: { 
  content: string, 
  pageNum: number, 
  totalPages: number, 
  theme: ThemeConfig, 
  dateStr: string,
  tags: string[],
  fontSize?: number,
  aspectRatio: AspectRatio
}) => (
  <div className={`relative w-full h-full flex flex-col justify-between p-10 ${theme.className}`}>
    <div className="flex-1 overflow-hidden min-h-0 flex flex-col">
        <div className="text-sm opacity-50 mb-6 font-mono tracking-wider uppercase text-right border-b border-current border-opacity-10 pb-2 shrink-0">
          {dateStr}
        </div>

      {/* 
         Font: prose-sm (14px) - Optimized for mobile reading
         Leading: leading-loose (2.0) - High spacing for Zen aesthetic (~12 lines per page)
         Buffer: Added extra bottom margin for 3:4 format to prevent text truncation
      */}
      <div 
        className={`prose prose-sm max-w-none flex-1
          prose-headings:text-current 
          prose-p:text-current 
          prose-strong:text-current 
          prose-ul:text-current 
          prose-ol:text-current 
          prose-li:text-current 
          prose-a:text-current 
          prose-code:text-current 
          prose-blockquote:text-current prose-blockquote:border-current/30
          prose-th:text-current prose-td:text-current
          marker:text-current/50
          [&>:first-child]:mt-0
          leading-loose
          ${aspectRatio === '3:4' ? 'prose-p:mb-4 prose-headings:mb-4 prose-ul:mb-4 prose-ol:mb-4 prose-blockquote:mb-4' : ''}
          ${theme.proseClass || ''}
        `}
        style={{
          fontSize: fontSize ? `${fontSize}px` : undefined,
          // Keep line height closer to original for better content density
          lineHeight: aspectRatio === '3:4' ? '2.1' : '2.0'
        }}
      >
        <ReactMarkdown remarkPlugins={[remarkGfm]}>
          {content}
        </ReactMarkdown>
      </div>
    </div>
    
    <div className="mt-8 pt-6 border-t border-current border-opacity-20 flex items-center justify-between shrink-0">
      <div className="flex items-center gap-4">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold shadow-sm ${theme.logoBg} ${theme.logoText}`}>Z</div>
        <span className="text-sm font-bold tracking-[0.2em] uppercase opacity-70">zenote</span>
      </div>
      
      <div className="flex items-center gap-3">
        {totalPages > 1 && (
          <span className="text-xs font-mono opacity-50 whitespace-nowrap">Page {pageNum} / {totalPages}</span>
        )}
        <div className="flex gap-2">
          {tags.map(t => (
            <span key={t} className="text-xs px-2 py-1 rounded border border-current border-opacity-20 opacity-60 font-medium">#{t}</span>
          ))}
        </div>
      </div>
    </div>
  </div>
);

const ShareCard: React.FC<ShareCardProps> = ({ note, onClose, t, fontSize }) => {
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('Full');
  const [selectedThemeId, setSelectedThemeId] = useState<string>('light');
  const [downloading, setDownloading] = useState(false);
  
  // Pagination State
  const [currentPageIndex, setCurrentPageIndex] = useState(0);
  const [pages, setPages] = useState<string[]>([note.content]);

  // We use a ref array to hold references to ALL page elements for batch downloading
  const hiddenPageRefs = useRef<(HTMLDivElement | null)[]>([]);

  const THEMES: ThemeConfig[] = [
    { 
      id: 'light', 
      name: t('themeClassic'), 
      className: 'bg-white text-zinc-900 border-zinc-200', 
      logoBg: 'bg-zinc-900', 
      logoText: 'text-white' 
    },
    { 
      id: 'nature', 
      name: t('themeNature'), 
      className: 'bg-white text-emerald-800 border-emerald-100', 
      logoBg: 'bg-emerald-800', 
      logoText: 'text-white' 
    },
    { 
      id: 'dark', 
      name: t('themeDark'), 
      // Deep Grey background (zinc-800) instead of black (zinc-950)
      className: 'bg-zinc-800 text-white border-zinc-700', 
      logoBg: 'bg-white', 
      logoText: 'text-zinc-800',
      proseClass: 'prose-invert'
    },
    { 
      id: 'luxury', 
      name: t('themeLuxury'), 
      // Matches logo #fde047
      className: 'bg-zinc-950 text-white border-yellow-900/50', 
      logoBg: 'bg-[#fde047]', 
      logoText: 'text-zinc-950',
      proseClass: 'prose-invert prose-headings:text-white prose-p:text-white prose-li:text-white prose-a:text-white prose-strong:text-white prose-em:text-white'
    },
    { 
      id: 'memo', 
      name: t('themeMemo'), 
      className: 'bg-[#fef9c3] text-yellow-900 border-yellow-200/50 font-mono', 
      logoBg: 'bg-yellow-900', 
      logoText: 'text-[#fef9c3]' 
    },
    { 
      id: 'ocean', 
      name: t('themeOcean'), 
      // Matches logo #0ea5e9
      className: 'bg-[#0f172a] text-white border-cyan-900', 
      logoBg: 'bg-[#0ea5e9]', 
      logoText: 'text-white',
      proseClass: 'prose-invert prose-headings:text-white prose-p:text-white prose-li:text-white prose-a:text-white prose-strong:text-white prose-em:text-white'
    },
    { 
      id: 'sunset', 
      name: t('themeSunset'), 
      className: 'bg-gradient-to-br from-orange-100 to-rose-100 text-rose-900 border-rose-200', 
      logoBg: 'bg-rose-600', 
      logoText: 'text-white' 
    },
    { 
      id: 'mint', 
      name: t('themeMint'), 
      className: 'bg-teal-50 text-teal-900 border-teal-200', 
      logoBg: 'bg-teal-700', 
      logoText: 'text-white' 
    },
    { 
      id: 'lavender', 
      name: t('themeLavender'), 
      className: 'bg-violet-50 text-violet-900 border-violet-200', 
      logoBg: 'bg-violet-600', 
      logoText: 'text-white' 
    },
    { 
      id: 'terminal', 
      name: t('themeTerminal'), 
      // Matches logo #4ade80 (Green) - Using opaque hex
      className: 'bg-black text-white border-green-900 font-mono', 
      logoBg: 'bg-[#4ade80]', 
      logoText: 'text-black',
      proseClass: 'prose-invert prose-headings:text-white prose-p:text-white prose-li:text-white prose-a:text-white prose-strong:text-white prose-em:text-white'
    }
  ];

  const theme = THEMES.find(t => t.id === selectedThemeId) || THEMES[0];

  useEffect(() => {
    // Determine char limit based on aspect ratio
    // TUNED for ~14-15 lines of text per page with 'leading-loose' and prose-sm font size
    let limit = 500;
    if (aspectRatio === '3:4') limit = 950; // Increased limit to reduce bottom whitespace
    if (aspectRatio === 'Full') {
      // No pagination for Full format - use a very large limit to ensure single page
      limit = 100000;
    }

    let paginated = paginateContent(note.content, limit, aspectRatio);
    
    // Remove last page if it's completely blank in 3:4 format
    if (aspectRatio === '3:4' && paginated.length > 1) {
      const lastPage = paginated[paginated.length - 1];
      if (lastPage.trim().length === 0) {
        paginated = paginated.slice(0, -1);
      }
    }
    
    // Ensure at least one page
    setPages(paginated.length > 0 ? paginated : [note.content || '']);
    setCurrentPageIndex(0);
  }, [note.content, aspectRatio]);

  const getDimensions = () => {
    switch (aspectRatio) {
      case 'Full': return ''; // No fixed aspect ratio for Full format
      case '3:4': return 'aspect-[3/4]';
      default: return 'aspect-[3/4]';
    }
  };

  const handleDownloadImages = async () => {
    setDownloading(true);
    try {
      // Use hidden refs for high-res capture
      const refsToUse = hiddenPageRefs.current;
      
      for (let i = 0; i < pages.length; i++) {
        const ref = refsToUse[i];
        if (ref) {
          // First try the original method
          const dataUrl = await toPng(ref, { 
            cacheBust: true, 
            pixelRatio: 2,
            backgroundColor: theme.className.includes('bg-white') ? '#ffffff' : 
                           theme.className.includes('bg-zinc-800') ? '#2d2d2d' : 
                           theme.className.includes('bg-zinc-950') ? '#0f0f0f' : 
                           theme.className.includes('bg-black') ? '#000000' : null,
            skipFonts: true,
            width: ref.offsetWidth * 2,
            height: ref.offsetHeight * 2,
            style: {
              transform: 'scale(2)',
              transformOrigin: 'top left',
              width: `${ref.offsetWidth}px`,
              height: `${ref.offsetHeight}px`
            }
          });
          
          const link = document.createElement('a');
          const suffix = pages.length > 1 ? `-${i+1}` : '';
          link.download = `zenote${suffix}.png`;
          link.href = dataUrl;
          // Use a more reliable download method for production
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          
          if (pages.length > 1) await new Promise(r => setTimeout(r, 300));
        }
      }
    } catch (err) {
      console.error('Primary download method failed', err);
      // Fallback to html2canvas method if primary method fails
      try {
        const refsToUse = hiddenPageRefs.current;
        
        for (let i = 0; i < pages.length; i++) {
          const ref = refsToUse[i];
          if (ref) {
            const html2canvas = (await getHtml2Canvas()).default;
            const canvasResult = await html2canvas(ref, {
              scale: 2,
              backgroundColor: theme.className.includes('bg-zinc-800') ? '#2d2d2d' : 
                             theme.className.includes('bg-zinc-950') ? '#0f0f0f' : 
                             theme.className.includes('bg-black') ? '#000000' : '#ffffff',
              useCORS: true,
              allowTaint: true,
              logging: false,
              width: ref.offsetWidth,
              height: ref.offsetHeight,
              scrollX: 0,
              scrollY: 0,
            });
            
            const dataUrl = canvasResult.toDataURL('image/png', 1.0);
            
            const link = document.createElement('a');
            const suffix = pages.length > 1 ? `-${i+1}` : '';
            link.download = `zenote${suffix}.png`;
            link.href = dataUrl;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            
            if (pages.length > 1) await new Promise(r => setTimeout(r, 300));
          }
        }
      } catch (fallbackErr) {
        console.error('Fallback download also failed', fallbackErr);
        alert('Could not generate images. Please try again. Note: Some browsers may block downloads from iframes or require user interaction.');
      }
    } finally {
      setDownloading(false);
    }
  };

  const handleDownloadFile = (format: 'md' | 'txt') => {
    const element = document.createElement("a");
    const file = new Blob(['\uFEFF' + note.content], {type: 'text/plain;charset=utf-8'});
    element.href = URL.createObjectURL(file);
    element.download = `zenote_${note.title.replace(/[^a-z0-9]/gi, '_').toLowerCase() || 'note'}.${format}`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const currentDate = new Date(note.updatedAt).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      
      {/* 
         HIDDEN RENDER AREA 
      */}
      <div className="fixed top-0 left-[-9999px] flex flex-col pointer-events-none opacity-0">
        {pages.map((pageContent, idx) => (
          <div 
            key={`hidden-page-${idx}`}
            ref={el => { hiddenPageRefs.current[idx] = el }}
            // We force a width here for the export image quality
            className={`w-[600px] ${theme.className} relative flex flex-col`}
            style={{ 
              aspectRatio: aspectRatio === 'Full' ? undefined : aspectRatio.replace(':', '/'),
              minHeight: aspectRatio === 'Full' ? '100%' : undefined
            }}
          >
            <CardContent 
              content={pageContent} 
              pageNum={idx + 1} 
              totalPages={pages.length} 
              theme={theme}
              dateStr={currentDate}
              tags={note.tags}
              fontSize={fontSize}
              aspectRatio={aspectRatio}
            />
          </div>
        ))}
      </div>

      <div className="bg-white dark:bg-zinc-900 w-full max-w-6xl rounded-2xl shadow-2xl flex flex-col md:flex-row overflow-hidden h-[90vh] md:h-auto md:max-h-[95vh]">
        
        {/* Preview Area 
            - On mobile, it needs flex-1 to take up available space.
            - We center the card content.
        */}
        <div className="flex-1 bg-zinc-100 dark:bg-zinc-950 p-4 md:p-8 flex flex-col items-center justify-center overflow-auto relative min-h-0 md:min-h-full">
          
          {/* The Visible Card */}
          <div 
            className={`relative w-full max-w-md shadow-2xl rounded-xl transition-all duration-300 overflow-hidden flex-shrink-0 my-auto ${getDimensions()} ${theme.className}`}
          >
            {pages.length > 0 && (
              <CardContent 
                content={pages[currentPageIndex]} 
                pageNum={currentPageIndex + 1} 
                totalPages={pages.length} 
                theme={theme}
                dateStr={currentDate}
                tags={note.tags}
                fontSize={fontSize}
                aspectRatio={aspectRatio}
              />
            )}
          </div>

          {/* Pagination Controls - Floating on mobile to save space, standard on desktop */}
          {pages.length > 1 && (
            <div className="flex items-center gap-4 mt-6 bg-white dark:bg-zinc-800 p-2 rounded-full shadow-lg border border-zinc-200 dark:border-zinc-700 animate-in slide-in-from-bottom-2 shrink-0 z-10 sticky bottom-2 md:relative md:bottom-auto">
              <button 
                onClick={() => setCurrentPageIndex(p => Math.max(0, p - 1))}
                disabled={currentPageIndex === 0}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="font-mono text-sm font-medium text-zinc-600 dark:text-zinc-300">
                {currentPageIndex + 1}/{pages.length}
              </span>
              <button 
                onClick={() => setCurrentPageIndex(p => Math.min(pages.length - 1, p + 1))}
                disabled={currentPageIndex === pages.length - 1}
                className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-700 disabled:opacity-30 transition-colors"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>

        {/* Controls Area 
            - On mobile, we limit max-height to ensure preview stays visible (max-h-[45%]).
            - On desktop, it's a side panel (w-80 h-full).
        */}
        <div className="w-full md:w-80 p-6 flex flex-col gap-6 border-t md:border-t-0 md:border-l border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-y-auto shrink-0 max-h-[45%] md:max-h-full">
          <div className="flex justify-between items-center shrink-0">
            <h3 className="font-semibold text-lg flex items-center gap-2">
              <Download size={18} className="text-zinc-400" /> 
              {t('export')}
            </h3>
            <button onClick={onClose} className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-full transition-colors">
              <X size={20} />
            </button>
          </div>

          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('format')}</label>
              <div className="grid grid-cols-2 gap-2">
                {(['Full', '3:4'] as AspectRatio[]).map(ratio => (
                  <button
                    key={ratio}
                    onClick={() => setAspectRatio(ratio)}
                    className={`py-2 text-sm rounded-lg border font-medium transition-all ${
                      aspectRatio === ratio 
                        ? 'border-accent-600 bg-accent-50 text-accent-600 dark:bg-accent-900/30 dark:border-accent-500 dark:text-accent-400 ring-1 ring-accent-500' 
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-400'
                    }`}
                  >
                    {ratio}
                  </button>
                ))}
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-bold text-zinc-400 uppercase tracking-wider">{t('style')}</label>
              <div className="grid grid-cols-2 gap-2 max-h-32 md:max-h-64 overflow-y-auto pr-1 custom-scrollbar">
                {THEMES.map(t => (
                  <button 
                    key={t.id}
                    onClick={() => setSelectedThemeId(t.id)}
                    className={`p-2 rounded-lg border text-left flex items-center gap-3 transition-all ${
                      selectedThemeId === t.id 
                        ? 'border-accent-600 ring-1 ring-accent-600 bg-accent-50 dark:bg-accent-900/20' 
                        : 'border-zinc-200 dark:border-zinc-700 hover:bg-zinc-50 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <div className={`w-5 h-5 rounded-full border border-black/10 shadow-sm shrink-0 ${t.logoBg}`}></div>
                    <span className="text-xs font-medium truncate dark:text-zinc-300">{t.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="space-y-3 border-t border-zinc-100 dark:border-zinc-800 pt-4 mt-auto">
            <div className="grid grid-cols-1 gap-2">
              <button 
                onClick={handleDownloadImages}
                disabled={downloading}
                className="w-full py-3 bg-zinc-900 dark:bg-zinc-100 text-white dark:text-zinc-900 rounded-xl font-bold text-sm flex items-center justify-center gap-2 hover:opacity-90 transition-all active:scale-[0.98] disabled:opacity-70 disabled:active:scale-100 shadow-lg shadow-zinc-200 dark:shadow-zinc-900/50"
              >
                {downloading ? (  
                  <span className="animate-spin">⌛</span>
                ) : (
                  <>
                    {pages.length > 1 ? <Layers size={18} /> : <ImageIcon size={18} />}
                  </>
                )}
                {downloading ? t('generating') : pages.length > 1 ? `${t('save')} ${pages.length} ${t('images')}` : t('saveImage')}
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button 
                  onClick={() => handleDownloadFile('md')}
                  className="py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                  <FileText size={14} /> MD
                </button>
                <button 
                  onClick={() => handleDownloadFile('txt')}
                  className="py-2.5 bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl font-semibold text-xs flex items-center justify-center gap-2 hover:bg-zinc-200 dark:hover:bg-zinc-700 transition-colors border border-zinc-200 dark:border-zinc-700"
                >
                  <FileType size={14} /> TXT
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ShareCard;