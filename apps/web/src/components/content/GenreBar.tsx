import { useRef } from 'react';
import { useUiStore } from '../../store/uiStore';
import { useCategories } from '../../hooks/useSiteSettings';
import { Sparkles } from 'lucide-react';

const FALLBACK_CATEGORIES = [
  'All',
  'Masterclasses',
  'Cinema',
  'Documentary',
  'Premieres',
  'Action',
  'Drama',
  'Sci-Fi',
];

export function GenreBar() {
  const { activeGenre, setActiveGenre } = useUiStore();
  const { data: categories } = useCategories();
  const scrollRef = useRef<HTMLDivElement>(null);

  const pills = categories?.length
    ? ['All', ...categories.map((c: any) => c.name)]
    : FALLBACK_CATEGORIES;

  const handleSelect = (category: string) => {
    if (category === 'All' || category === 'All Vault') {
      setActiveGenre(null);
    } else {
      setActiveGenre(activeGenre === category ? null : category);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-1.5">
      <div
        ref={scrollRef}
        className="flex items-center gap-2 overflow-x-auto scrollbar-hide py-1"
        style={{ scrollbarWidth: 'none' }}
      >
        {pills.map((pill) => {
          const isActive = (!activeGenre && (pill === 'All' || pill === 'All Vault')) || activeGenre === pill;
          return (
            <button
              key={pill}
              onClick={() => handleSelect(pill)}
              className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-medium tracking-wide transition-all duration-200 flex items-center gap-1.5 ${
                isActive
                  ? 'bg-[#FF5C00] text-white shadow-[0_0_12px_rgba(255,92,0,0.35)] border border-[#FF5C00]'
                  : 'bg-[#121110] text-[#B0A89C] hover:text-white border border-white/5 hover:border-white/15 hover:bg-[#1A1816]'
              }`}
            >
              {pill.includes('Masterclass') && <Sparkles className="w-3 h-3 text-amber-300" />}
              <span>{pill}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

