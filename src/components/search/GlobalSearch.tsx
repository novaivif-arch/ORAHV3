import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Search,
  X,
  Users,
  Bot,
  Phone,
  Settings,
  Navigation,
  Clock,
  ArrowRight,
  Command,
  Loader2,
  User,
  AlertCircle,
} from 'lucide-react';
import { cn } from '../../lib/utils';
import { useGlobalSearch, SearchResult } from '../../hooks/useGlobalSearch';

interface GlobalSearchProps {
  className?: string;
}

const typeIcons: Record<string, typeof Users> = {
  lead: Users,
  user: User,
  agent: Bot,
  call: Phone,
  setting: Settings,
  navigation: Navigation,
};

const typeLabels: Record<string, string> = {
  lead: 'Leads',
  user: 'Users',
  agent: 'Agents',
  call: 'Calls',
  setting: 'Settings',
  navigation: 'Pages',
};

const typeColors: Record<string, string> = {
  lead: 'bg-blue-100 text-blue-600',
  user: 'bg-emerald-100 text-emerald-600',
  agent: 'bg-amber-100 text-amber-600',
  call: 'bg-rose-100 text-rose-600',
  setting: 'bg-slate-100 text-slate-600',
  navigation: 'bg-cyan-100 text-cyan-600',
};

export function GlobalSearch({ className }: GlobalSearchProps) {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const resultsRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const {
    query,
    setQuery,
    results,
    categories,
    isLoading,
    error,
    recentSearches,
    clearSearch,
    trackClick,
  } = useGlobalSearch();

  const flatResults = Object.values(categories).flat();

  const handleOpen = useCallback(() => {
    setIsOpen(true);
    setSelectedIndex(0);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, []);

  const handleClose = useCallback(() => {
    setIsOpen(false);
    clearSearch();
    setSelectedIndex(0);
  }, [clearSearch]);

  const handleSelect = useCallback((result: SearchResult) => {
    trackClick(result);
    navigate(result.redirectUrl);
    handleClose();
  }, [navigate, trackClick, handleClose]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    const totalResults = flatResults.length;

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        setSelectedIndex(prev => (prev + 1) % Math.max(totalResults, 1));
        break;
      case 'ArrowUp':
        e.preventDefault();
        setSelectedIndex(prev => (prev - 1 + Math.max(totalResults, 1)) % Math.max(totalResults, 1));
        break;
      case 'Enter':
        e.preventDefault();
        if (flatResults[selectedIndex]) {
          handleSelect(flatResults[selectedIndex]);
        }
        break;
      case 'Escape':
        e.preventDefault();
        handleClose();
        break;
    }
  }, [flatResults, selectedIndex, handleSelect, handleClose]);

  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        if (isOpen) {
          handleClose();
        } else {
          handleOpen();
        }
      }
      if (e.key === '/' && !isOpen && document.activeElement?.tagName !== 'INPUT') {
        e.preventDefault();
        handleOpen();
      }
    };

    document.addEventListener('keydown', handleGlobalKeyDown);
    return () => document.removeEventListener('keydown', handleGlobalKeyDown);
  }, [isOpen, handleOpen, handleClose]);

  useEffect(() => {
    setSelectedIndex(0);
  }, [results]);

  useEffect(() => {
    if (resultsRef.current && flatResults.length > 0) {
      const selectedElement = resultsRef.current.querySelector(`[data-index="${selectedIndex}"]`);
      selectedElement?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedIndex, flatResults.length]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        handleClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, handleClose]);

  const highlightMatch = (text: string, query: string) => {
    if (!query || query.length < 2) return text;
    const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
    const parts = text.split(regex);
    return parts.map((part, i) =>
      regex.test(part) ? (
        <mark key={i} className="bg-yellow-200 text-yellow-900 rounded px-0.5">
          {part}
        </mark>
      ) : (
        part
      )
    );
  };

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <button
        onClick={handleOpen}
        className="hidden md:flex items-center gap-2 bg-slate-100 hover:bg-slate-200 rounded-xl px-4 py-2 transition-colors"
        aria-label="Open search"
      >
        <Search className="w-4 h-4 text-slate-400" />
        <span className="text-sm text-slate-500">Search...</span>
        <kbd className="hidden lg:flex items-center gap-0.5 px-1.5 py-0.5 bg-white rounded text-[10px] text-slate-400 font-mono border border-slate-200">
          <Command className="w-2.5 h-2.5" />K
        </kbd>
      </button>

      <button
        onClick={handleOpen}
        className="md:hidden p-2.5 hover:bg-slate-100 rounded-xl transition-colors"
        aria-label="Open search"
      >
        <Search className="w-5 h-5 text-slate-500" />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50" onClick={handleClose} />

          <div
            className="fixed inset-x-4 top-4 md:inset-auto md:absolute md:top-0 md:left-1/2 md:-translate-x-1/2 md:w-[600px] bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden z-50"
            role="dialog"
            aria-modal="true"
            aria-label="Search dialog"
          >
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200">
              <Search className="w-5 h-5 text-slate-400 flex-shrink-0" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search leads, agents, settings..."
                className="flex-1 bg-transparent border-none outline-none text-slate-900 placeholder:text-slate-400"
                aria-label="Search input"
                aria-autocomplete="list"
                aria-controls="search-results"
                aria-activedescendant={flatResults[selectedIndex]?.id}
              />
              {isLoading && <Loader2 className="w-4 h-4 text-slate-400 animate-spin" />}
              {query && !isLoading && (
                <button
                  onClick={() => setQuery('')}
                  className="p-1 hover:bg-slate-100 rounded-lg transition-colors"
                  aria-label="Clear search"
                >
                  <X className="w-4 h-4 text-slate-400" />
                </button>
              )}
              <kbd className="hidden sm:block px-2 py-1 bg-slate-100 rounded text-xs text-slate-400 font-mono">
                ESC
              </kbd>
            </div>

            <div
              ref={resultsRef}
              id="search-results"
              className="max-h-[60vh] md:max-h-[400px] overflow-y-auto"
              style={{ scrollbarWidth: 'thin', scrollbarColor: '#cbd5e1 #f1f5f9' }}
              role="listbox"
            >
              {error && (
                <div className="flex items-center gap-3 px-4 py-8 text-rose-600">
                  <AlertCircle className="w-5 h-5" />
                  <span className="text-sm">{error}</span>
                </div>
              )}

              {!query && recentSearches.length > 0 && (
                <div className="p-2">
                  <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider">
                    Recent Searches
                  </p>
                  {recentSearches.map((search, idx) => (
                    <button
                      key={idx}
                      onClick={() => setQuery(search)}
                      className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-slate-50 rounded-lg transition-colors text-left"
                    >
                      <Clock className="w-4 h-4 text-slate-400" />
                      <span className="text-sm text-slate-600">{search}</span>
                    </button>
                  ))}
                </div>
              )}

              {query && query.length >= 2 && !isLoading && flatResults.length === 0 && !error && (
                <div className="flex flex-col items-center justify-center py-12 text-slate-400">
                  <Search className="w-12 h-12 mb-3 opacity-50" />
                  <p className="text-sm font-medium">No results found</p>
                  <p className="text-xs mt-1">Try adjusting your search terms</p>
                </div>
              )}

              {Object.entries(categories).map(([type, typeResults]) => {
                if (typeResults.length === 0) return null;
                const Icon = typeIcons[type] || Navigation;
                const label = typeLabels[type] || type;

                return (
                  <div key={type} className="p-2">
                    <p className="px-3 py-2 text-xs font-semibold text-slate-400 uppercase tracking-wider flex items-center gap-2">
                      <Icon className="w-3.5 h-3.5" />
                      {label}
                    </p>
                    {typeResults.map((result) => {
                      const globalIndex = flatResults.findIndex(r => r.id === result.id);
                      const isSelected = globalIndex === selectedIndex;
                      const ResultIcon = typeIcons[result.type] || Navigation;

                      return (
                        <button
                          key={result.id}
                          data-index={globalIndex}
                          onClick={() => handleSelect(result)}
                          onMouseEnter={() => setSelectedIndex(globalIndex)}
                          className={cn(
                            'w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-all text-left group',
                            isSelected ? 'bg-blue-50' : 'hover:bg-slate-50'
                          )}
                          role="option"
                          aria-selected={isSelected}
                        >
                          <div className={cn('p-2 rounded-lg flex-shrink-0', typeColors[result.type] || 'bg-slate-100 text-slate-600')}>
                            <ResultIcon className="w-4 h-4" />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className={cn('text-sm font-medium truncate', isSelected ? 'text-blue-900' : 'text-slate-900')}>
                              {highlightMatch(result.title, query)}
                            </p>
                            <p className={cn('text-xs truncate', isSelected ? 'text-blue-600' : 'text-slate-500')}>
                              {highlightMatch(result.subtitle || '', query)}
                            </p>
                          </div>
                          <ArrowRight className={cn(
                            'w-4 h-4 flex-shrink-0 transition-all',
                            isSelected ? 'text-blue-500 translate-x-0 opacity-100' : 'text-slate-300 -translate-x-2 opacity-0 group-hover:translate-x-0 group-hover:opacity-100'
                          )} />
                        </button>
                      );
                    })}
                  </div>
                );
              })}
            </div>

            <div className="px-4 py-3 bg-slate-50 border-t border-slate-200 flex items-center justify-between text-xs text-slate-400">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono">↑</kbd>
                  <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono">↓</kbd>
                  to navigate
                </span>
                <span className="flex items-center gap-1">
                  <kbd className="px-1.5 py-0.5 bg-white rounded border border-slate-200 font-mono">↵</kbd>
                  to select
                </span>
              </div>
              <span className="hidden sm:block">{flatResults.length} results</span>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
