import { useRef } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useCategories } from '../../hooks/useSiteSettings';
import { Sparkles } from 'lucide-react';

const FALLBACK_CATEGORIES = [
  'All',
  'Movies',
  'TV Shows',
  'Sports',
  'Music',
  'Originals',
  'Action',
  'Drama',
  'Sci-Fi',
  'Horror',
  'Comedy',
  'Documentary',
  'Anime',
];

export function GenreBar() {
  const { activeGenre, setActiveGenre } = useUiStore();
  const { data: categories } = useCategories();
  const scrollRef = useRef<HTMLDivElement>(null);

  const pills = categories?.length
    ? ['All', ...categories.map((c) => c.name)]
    : FALLBACK_CATEGORIES;

  const handleSelect = (category: string) => {
    if (category === 'All') {
      setActiveGenre(null);
    } else {
      setActiveGenre(activeGenre === category ? null : category);
    }
  };

  return (
    <div className="w-full relative px-4 sm:px-8 md:px-16 lg:px-20 py-2 select-none">
      <div
        ref={scrollRef}
        className="flex items-center gap-2.5 overflow-x-auto scrollbar-hide py-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {pills.map((pill) => {
          const isActive = (!activeGenre && pill === 'All') || activeGenre === pill;
          return (
            <button
              key={pill}
              onClick={() => handleSelect(pill)}
              className={`flex-shrink-0 px-4 sm:px-5 py-2 rounded-full text-xs sm:text-sm font-bold tracking-wide transition-all duration-300 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#FF5C00] text-white shadow-[0_0_18px_rgba(255,92,0,0.45)] border border-[#FF5C00] scale-105'
                  : 'bg-[#181410]/80 text-[#C8C2B8] hover:text-white border border-white/10 hover:border-white/20 hover:bg-[#241F1A]'
              }`}
            >
              {pill === 'Originals' && <Sparkles className="w-3.5 h-3.5 text-amber-300" />}
              <span>{pill}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

