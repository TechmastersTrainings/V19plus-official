import { useRef, useState } from 'react';
import Link from 'next/link';
import { Content } from '../../api/content';
import { ContentCard } from './ContentCard';
import { ContentRowSkeleton } from '../ui/Skeleton';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface ContentRowProps {
  title: string;
  subtitle?: string;
  items?: Content[];
  historyItems?: { content: Content; progress: number }[];
  isLoading?: boolean;
  showRank?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'wide';
  seeAllHref?: string;
}

export function ContentRow({
  title,
  subtitle,
  items,
  historyItems,
  isLoading,
  showRank,
  size = 'md',
  seeAllHref,
}: ContentRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);

  if (isLoading) return <ContentRowSkeleton />;

  const validHistoryItems = (historyItems || []).filter((item) => item && item.content && item.content.id);
  const validItems = (items || []).filter((item) => item && item.id);

  const hasItems = validItems.length > 0 || validHistoryItems.length > 0;
  if (!hasItems) return null;

  const updateScrollState = () => {
    const el = scrollRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 10);
    setCanScrollRight(el.scrollLeft < el.scrollWidth - el.clientWidth - 10);
  };

  const scroll = (dir: 'left' | 'right') => {
    const el = scrollRef.current;
    if (!el) return;
    const amount = el.clientWidth * 0.75;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(updateScrollState, 350);
  };

  return (
    <section className="mb-8 sm:mb-10 group/row relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Section Header */}
        <div className="flex items-end justify-between mb-3.5">
          <div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white flex items-center gap-2.5 tracking-tight group-hover/row:text-[#FF5C00] transition-colors">
              <span
                className={`w-1.5 h-5 rounded-full ${
                  title.toLowerCase().includes('trending')
                    ? 'bg-[#E50914] shadow-[0_0_12px_#E50914]'
                    : 'bg-gradient-to-b from-[#E50914] to-[#FF5C00] shadow-[0_0_12px_#FF5C00]'
                }`}
              />
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#CCCCCC] font-normal ml-4 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {seeAllHref ? (
            <Link
              href={seeAllHref}
              className="flex items-center gap-1.5 text-xs font-bold text-[#D4D4D4] hover:text-[#FF5C00] transition-all group/link"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover/link:translate-x-1 text-[#FF5C00] transition-transform" />
            </Link>
          ) : (
            <button
              onClick={() => scroll('right')}
              className="hidden sm:flex items-center gap-1 text-xs font-bold text-[#D4D4D4] hover:text-[#FF5C00] transition-colors"
            >
              <span>Scroll</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row with Scroll Container & Gradient Action Arrows */}
        <div className="relative group/carousel">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="hidden sm:flex absolute left-0 sm:-left-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#141414]/95 hover:bg-[#E50914] text-white hover:text-white items-center justify-center border border-white/20 hover:border-[#FF5C00] shadow-[0_4px_25px_rgba(0,0,0,0.9)] backdrop-blur-xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Scrollable Cards Container */}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-3.5 sm:gap-4 overflow-x-auto pb-3 pt-1 px-1 scrollbar-hide scroll-smooth"
            style={{ scrollbarWidth: 'none' }}
          >
            {validHistoryItems.map((item) => (
              <ContentCard
                key={item.content.id}
                content={item.content}
                progress={item.progress}
                size={size}
              />
            ))}
            {validItems.map((item, index) => (
              <ContentCard
                key={item.id}
                content={item}
                size={size}
                rank={showRank ? index + 1 : undefined}
              />
            ))}
          </div>

          {/* Right Arrow Button */}
          {canScrollRight && (
            <button
              onClick={() => scroll('right')}
              className="hidden sm:flex absolute right-0 sm:-right-3 top-1/2 -translate-y-1/2 z-30 w-9 h-9 sm:w-10 sm:h-10 rounded-full bg-[#141414]/95 hover:bg-[#E50914] text-white hover:text-white items-center justify-center border border-white/20 hover:border-[#FF5C00] shadow-[0_4px_25px_rgba(0,0,0,0.9)] backdrop-blur-xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 active:scale-95"
              aria-label="Scroll right"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}
        </div>
      </div>
    </section>
  );
}
