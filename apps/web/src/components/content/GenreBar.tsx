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
              className={`flex-shrink-0 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide transition-all duration-200 flex items-center gap-1.5 cursor-pointer ${
                isActive
                  ? 'bg-[#3EFFC0] text-[#121212] shadow-[0_0_16px_rgba(62,255,192,0.45)] border border-[#3EFFC0]'
                  : 'bg-[#181818] text-[#D0D0D0] hover:text-white border border-white/10 hover:border-[#00E5FF]/40 hover:bg-[#222222]'
              }`}
            >
              {pill.includes('Masterclass') && <Sparkles className={`w-3 h-3 ${isActive ? 'text-[#121212]' : 'text-[#3EFFC0]'}`} />}
              <span>{pill}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

