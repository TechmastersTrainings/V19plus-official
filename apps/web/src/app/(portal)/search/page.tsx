'use client';

import { Suspense, useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { Mic, History, TrendingUp, SlidersHorizontal, X, ChevronDown, Search, Sparkles } from 'lucide-react';
import { searchApi } from '../../../api/search';
import { ContentCard } from '../../../components/content/ContentCard';
import { Skeleton } from '../../../components/ui/Skeleton';
import type { Content } from '../../../api/content';

const FILTERS = [
  { value: '', label: 'All' },
  { value: 'MOVIE', label: 'Movies' },
  { value: 'SERIES', label: 'TV Shows' },
  { value: 'DOCUMENTARY', label: 'Docs' },
];

const TRENDING_TERMS = [
  'Action Blockbusters',
  'V19Plus Originals',
  'Sci-Fi Thrillers',
  '4K Ultra HD',
  'Top Rated Series',
  'Award Winners'
];

const GENRES = ['Action', 'Comedy', 'Drama', 'Sci-Fi', 'Thriller', 'Horror', 'Documentary', 'Sports', 'Music'];
const YEARS = ['2026', '2025', '2024', '2023', '2022', 'Older'];
const RATINGS = ['8.5+ IMDb', '7.5+ IMDb', '6.5+ IMDb', 'All Ratings'];

function SearchContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [suggestions, setSuggestions] = useState<{ title: string; slug: string; thumbnailUrl: string; type: string }[]>([]);
  const [results, setResults] = useState<Content[]>([]);
  const [loading, setLoading] = useState(false);
  const [typeFilter, setTypeFilter] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Custom states
  const [recentSearches, setRecentSearches] = useState<string[]>([]);
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  const [selectedGenre, setSelectedGenre] = useState('');
  const [selectedYear, setSelectedYear] = useState('');
  const [selectedRating, setSelectedRating] = useState('');
  const [voiceActive, setVoiceActive] = useState(false);

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);

  // Auto focus and load recent searches on mount
  useEffect(() => {
    inputRef.current?.focus();
    const stored = localStorage.getItem('v19_recent_searches');
    if (stored) {
      try {
        setRecentSearches(JSON.parse(stored));
      } catch {
        setRecentSearches([]);
      }
    }
  }, []);

  // Run initial search if query param exists
  useEffect(() => {
    const q = searchParams.get('q');
    if (q) {
      setQuery(q);
      performSearch(q);
    }
  }, [searchParams]);

  // Auto-suggestions
  useEffect(() => {
    if (query.length < 2) {
      setSuggestions([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const { data } = await searchApi.suggestions(query);
        setSuggestions(data.slice(0, 6));
      } catch {
        setSuggestions([]);
      }
    }, 200);
    return () => clearTimeout(timer);
  }, [query]);

  // Close suggestions on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (
        suggestionsRef.current &&
        !suggestionsRef.current.contains(e.target as Node) &&
        !inputRef.current?.contains(e.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const saveRecentSearch = (term: string) => {
    if (!term.trim()) return;
    const filtered = recentSearches.filter((t) => t.toLowerCase() !== term.toLowerCase());
    const updated = [term, ...filtered].slice(0, 5);
    setRecentSearches(updated);
    localStorage.setItem('v19_recent_searches', JSON.stringify(updated));
  };

  const clearRecentSearches = () => {
    setRecentSearches([]);
    localStorage.removeItem('v19_recent_searches');
  };

  const performSearch = async (q: string) => {
    if (!q.trim()) return;
    setShowSuggestions(false);
    setLoading(true);
    saveRecentSearch(q);
    try {
      const { data } = await searchApi.search(q);
      setResults(data.results || []);
      
      const params = new URLSearchParams(window.location.search);
      params.set('q', q);
      router.replace(`/search?${params.toString()}`);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  };

  // Simulate Voice Search
  const handleVoiceSearchClick = () => {
    setVoiceActive(true);
    setTimeout(() => {
      const randomTerm = TRENDING_TERMS[Math.floor(Math.random() * TRENDING_TERMS.length)];
      setQuery(randomTerm);
      setVoiceActive(false);
      performSearch(randomTerm);
    }, 2000);
  };

  // Dynamic filter pipeline
  const filtered = results.filter((item) => {
    if (typeFilter && item.type !== typeFilter) return false;
    if (selectedGenre && !item.genre?.some((g) => g.toLowerCase() === selectedGenre.toLowerCase())) return false;
    if (selectedYear) {
      if (selectedYear === 'Older') {
        if (item.releaseYear && item.releaseYear >= 2022) return false;
      } else {
        if (item.releaseYear !== parseInt(selectedYear)) return false;
      }
    }
    if (selectedRating) {
      const score = item.imdbScore || 0;
      if (selectedRating.includes('8.5') && score < 8.5) return false;
      if (selectedRating.includes('7.5') && score < 7.5) return false;
      if (selectedRating.includes('6.5') && score < 6.5) return false;
    }
    return true;
  });

  const hasSearched = results.length > 0 || (!!query && !loading);

  return (
    <div className="min-h-screen bg-[#0A0806] pt-24 sm:pt-28 pb-24 md:pb-16 animate-fade-in select-none text-white">
      {/* Search Header Container */}
      <div className="px-4 sm:px-8 md:px-16 lg:px-20 mb-8 max-w-5xl">
        <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-white mb-2 tracking-tight">
          Search Cinema
        </h1>
        <p className="text-xs sm:text-sm text-[#A49C90] mb-6">
          Find movies, shows, series, sports events, actors, and genres.
        </p>

        {/* Input bar */}
        <div className="relative flex gap-3 max-w-3xl">
          <div className="flex-1 flex items-center gap-3 px-5 py-4 bg-[#14110D]/90 border border-white/10 rounded-2xl focus-within:border-[#FF5C00] focus-within:shadow-[0_0_20px_rgba(255,92,0,0.25)] transition-all backdrop-blur-xl">
            <Search className="w-5 h-5 text-[#8C8478] flex-shrink-0" />
            <input
              ref={inputRef}
              value={query}
              onChange={(e) => { setQuery(e.target.value); setShowSuggestions(true); }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') performSearch(query);
                if (e.key === 'Escape') setShowSuggestions(false);
              }}
              onFocus={() => query.length >= 2 && setShowSuggestions(true)}
              placeholder="Search movies, shows, sports, creators..."
              className="flex-1 bg-transparent text-white placeholder:text-[#8C8478] text-sm sm:text-base outline-none font-medium"
            />
            {query && (
              <button
                onClick={() => { setQuery(''); setResults([]); setSuggestions([]); }}
                className="text-[#8C8478] hover:text-white transition-colors"
                aria-label="Clear search"
              >
                <X className="w-5 h-5" />
              </button>
            )}
          </div>

          {/* Voice Search Button */}
          <button
            onClick={handleVoiceSearchClick}
            className="w-14 h-14 bg-[#14110D]/90 hover:bg-[#201B15] border border-white/10 hover:border-[#FF5C00]/40 rounded-2xl flex items-center justify-center text-[#A49C90] hover:text-[#FF5C00] transition-all shadow-md active:scale-95"
            title="Voice Search"
          >
            <Mic className="w-5 h-5" />
          </button>

          {/* Advanced Filters Toggle */}
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className={`w-14 h-14 border rounded-2xl flex items-center justify-center transition-all active:scale-95 ${
              showAdvancedFilters 
                ? 'bg-[#FF5C00]/15 border-[#FF5C00] text-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.3)]' 
                : 'bg-[#14110D]/90 border-white/10 text-[#A49C90] hover:border-white/20 hover:text-white'
            }`}
            title="Filters"
          >
            <SlidersHorizontal className="w-5 h-5" />
          </button>

          {/* Suggestions Dropdown */}
          {showSuggestions && suggestions.length > 0 && (
            <div
              ref={suggestionsRef}
              className="absolute top-full left-0 right-16 mt-2 bg-[#14110D]/98 border border-white/10 rounded-2xl overflow-hidden shadow-[0_20px_50px_rgba(0,0,0,0.9)] z-40 backdrop-blur-2xl"
            >
              {suggestions.map((s) => (
                <button
                  key={s.slug}
                  onClick={() => { setQuery(s.title); performSearch(s.title); }}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-white/5 transition-colors text-left border-b border-white/5 last:border-0"
                >
                  <div className="w-10 h-14 rounded-lg overflow-hidden bg-[#1E1914] flex-shrink-0">
                    {s.thumbnailUrl && (
                      <img src={s.thumbnailUrl} alt="" className="w-full h-full object-cover" />
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{s.title}</p>
                    <p className="text-xs text-[#8C8478] capitalize">{s.type?.toLowerCase()}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Collapsible Advanced Filters Section */}
        <AnimatePresence>
          {showAdvancedFilters && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.25 }}
              className="overflow-hidden max-w-3xl mt-4"
            >
              <div className="bg-[#14110D]/90 border border-white/10 rounded-2xl p-5 grid grid-cols-1 sm:grid-cols-3 gap-4 backdrop-blur-xl">
                {/* Genre Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#8C8478] font-black uppercase tracking-wider">Genre</label>
                  <div className="relative">
                    <select
                      value={selectedGenre}
                      onChange={(e) => setSelectedGenre(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-[#1C1814] border border-white/10 rounded-xl text-xs text-white cursor-pointer focus:outline-none appearance-none focus:border-[#FF5C00]"
                    >
                      <option value="">All Genres</option>
                      {GENRES.map((g) => <option key={g} value={g}>{g}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8478] pointer-events-none" />
                  </div>
                </div>

                {/* Year Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#8C8478] font-black uppercase tracking-wider">Release Year</label>
                  <div className="relative">
                    <select
                      value={selectedYear}
                      onChange={(e) => setSelectedYear(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-[#1C1814] border border-white/10 rounded-xl text-xs text-white cursor-pointer focus:outline-none appearance-none focus:border-[#FF5C00]"
                    >
                      <option value="">All Years</option>
                      {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8478] pointer-events-none" />
                  </div>
                </div>

                {/* Rating Selector */}
                <div className="space-y-1.5">
                  <label className="text-[10px] text-[#8C8478] font-black uppercase tracking-wider">IMDb Score</label>
                  <div className="relative">
                    <select
                      value={selectedRating}
                      onChange={(e) => setSelectedRating(e.target.value)}
                      className="w-full pl-3.5 pr-8 py-2.5 bg-[#1C1814] border border-white/10 rounded-xl text-xs text-white cursor-pointer focus:outline-none appearance-none focus:border-[#FF5C00]"
                    >
                      <option value="">All Ratings</option>
                      {RATINGS.map((r) => <option key={r} value={r}>{r}</option>)}
                    </select>
                    <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8C8478] pointer-events-none" />
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Type Filter Pills */}
      {results.length > 0 && (
        <div className="px-4 sm:px-8 md:px-16 lg:px-20 mb-6 flex gap-2 overflow-x-auto pb-1 scrollbar-hide">
          {FILTERS.map((f) => (
            <button
              key={f.value}
              onClick={() => setTypeFilter(f.value)}
              className={`px-5 py-2 rounded-full text-xs sm:text-sm font-bold transition-all border ${
                typeFilter === f.value
                  ? 'bg-[#FF5C00] text-white border-[#FF5C00] shadow-[0_0_15px_rgba(255,92,0,0.4)]'
                  : 'bg-[#14110D] text-[#C8C2B8] border-white/10 hover:border-white/20 hover:text-white'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      )}

      {/* Main Results or Empty Previews */}
      <div className="px-4 sm:px-8 md:px-16 lg:px-20">
        {loading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4">
            {Array.from({ length: 12 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[2/3] rounded-2xl" />
            ))}
          </div>
        ) : filtered.length > 0 ? (
          <>
            <p className="text-xs sm:text-sm text-[#A49C90] mb-4">
              Showing {filtered.length} matching cinematic release{filtered.length !== 1 ? 's' : ''}
            </p>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-3 sm:gap-4">
              {filtered.map((item) => (
                <ContentCard key={item.id} content={item} size="sm" />
              ))}
            </div>
          </>
        ) : hasSearched && query ? (
          <div className="flex flex-col items-center justify-center py-24 text-center max-w-md mx-auto">
            <div className="w-16 h-16 rounded-2xl bg-[#FF5C00]/10 border border-[#FF5C00]/20 flex items-center justify-center text-[#FF5C00] mb-4">
              <Search className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-white mb-2">No results found for "{query}"</h2>
            <p className="text-[#8C8478] text-sm leading-relaxed">
              Try searching for another title, director, genre, or select from the trending suggestions below.
            </p>
          </div>
        ) : (
          /* Empty Search Previews (Trending and Recent Searches) */
          <div className="grid grid-cols-1 md:grid-cols-2 gap-10 max-w-4xl pt-4">
            {/* Recent Searches */}
            {recentSearches.length > 0 && (
              <div className="space-y-4">
                <div className="flex items-center justify-between text-[#8C8478]">
                  <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#C8C2B8]">
                    <History className="w-4 h-4 text-[#FF5C00]" /> Recent Searches
                  </span>
                  <button onClick={clearRecentSearches} className="text-2xs hover:text-white transition-colors">
                    Clear All
                  </button>
                </div>
                <div className="space-y-2">
                  {recentSearches.map((term) => (
                    <button
                      key={term}
                      onClick={() => { setQuery(term); performSearch(term); }}
                      className="w-full flex items-center justify-between px-4 py-3 bg-[#14110D] hover:bg-[#1C1814] border border-white/5 rounded-2xl text-left text-sm text-[#D4CDC3] hover:text-white transition-colors"
                    >
                      <span>{term}</span>
                      <ChevronDown className="-rotate-90 w-3.5 h-3.5 text-[#8C8478]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Trending Categories */}
            <div className="space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 text-[#C8C2B8]">
                <TrendingUp className="w-4 h-4 text-[#FF5C00]" /> Trending Searches
              </span>
              <div className="flex flex-wrap gap-2.5">
                {TRENDING_TERMS.map((term) => (
                  <button
                    key={term}
                    onClick={() => { setQuery(term); performSearch(term); }}
                    className="px-4 py-2.5 bg-[#14110D] hover:bg-[#201B15] border border-white/5 hover:border-[#FF5C00]/40 rounded-2xl text-xs text-[#D4CDC3] hover:text-white font-bold transition-all flex items-center gap-2"
                  >
                    <span>{term}</span>
                    <Sparkles className="w-3.5 h-3.5 text-[#FF5C00]" />
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Voice Search Simulated Overlay */}
      <AnimatePresence>
        {voiceActive && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center backdrop-blur-md"
          >
            <div className="text-center space-y-6">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <motion.div
                  className="absolute inset-0 rounded-full bg-[#FF5C00]/20"
                  animate={{ scale: [1, 1.8, 1], opacity: [0.6, 0, 0.6] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut' }}
                />
                <motion.div
                  className="absolute inset-2 rounded-full bg-[#FF5C00]/30"
                  animate={{ scale: [1, 1.4, 1], opacity: [0.8, 0, 0.8] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeOut', delay: 0.3 }}
                />
                <div className="w-16 h-16 rounded-full bg-[#FF5C00] flex items-center justify-center text-white relative z-10 shadow-[0_0_30px_rgba(255,92,0,0.5)]">
                  <Mic className="w-7 h-7" />
                </div>
              </div>

              <div className="space-y-1">
                <h3 className="text-xl font-black text-white">Listening...</h3>
                <p className="text-sm text-[#8C8478]">Say movie title, genre, or cast member</p>
              </div>

              <div className="flex justify-center gap-1 h-6 items-end">
                {[1, 2, 3, 4, 5].map((bar) => (
                  <motion.div
                    key={bar}
                    className="w-1 bg-[#FF5C00] rounded-full"
                    animate={{ height: [4, 24, 4] }}
                    transition={{
                      duration: 0.6,
                      repeat: Infinity,
                      ease: 'easeInOut',
                      delay: bar * 0.1
                    }}
                    style={{ height: 4 }}
                  />
                ))}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#0A0806] pt-24 pb-16" />}>
      <SearchContent />
    </Suspense>
  );
}

