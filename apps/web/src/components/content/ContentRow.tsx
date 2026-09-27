import { useRef, useState } from 'react';
import Link from 'next/link';
import { Content } from '../../api/content';
import { ContentCard } from './ContentCard';
import { ContentRowSkeleton } from '../ui/Skeleton';
import { ChevronLeft, ChevronRight, ArrowRight } from 'lucide-react';

interface ContentRowProps {
  title: string;
  items?: Content[];
  historyItems?: { content: Content; progress: number }[];
  isLoading?: boolean;
  showRank?: boolean;
  size?: 'sm' | 'md' | 'lg' | 'wide';
  seeAllHref?: string;
}

export function ContentRow({
  title,
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

  const hasItems =
    (items && items.length > 0) || (historyItems && historyItems.length > 0);
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
    const amount = el.clientWidth * 0.8;
    el.scrollBy({ left: dir === 'left' ? -amount : amount, behavior: 'smooth' });
    setTimeout(updateScrollState, 350);
  };

  return (
    <section className="mb-8 sm:mb-10 group/row relative select-none">
      {/* Section Header */}
      <div className="flex items-center justify-between px-4 sm:px-8 md:px-16 lg:px-20 mb-3 sm:mb-4">
        <h2 className="text-lg sm:text-xl md:text-2xl font-black text-white flex items-center gap-2 group-hover/row:text-[#FF8A00] transition-colors">
          <span className="w-1.5 h-5 rounded-full bg-[#FF5C00]" />
          {title}
        </h2>

        {seeAllHref ? (
          <Link
            href={seeAllHref}
            className="flex items-center gap-1 text-xs sm:text-sm font-bold text-[#A49C90] hover:text-[#FF5C00] transition-colors"
          >
            <span>See All</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        ) : (
          <button
            onClick={() => scroll('right')}
            className="hidden sm:flex items-center gap-1 text-xs sm:text-sm font-bold text-[#A49C90] hover:text-[#FF5C00] transition-colors"
          >
            <span>Explore</span>
            <ChevronRight className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Row with Arrow Buttons */}
      <div className="relative">
        {/* Left Arrow Button */}
        {canScrollLeft && (
          <button
            onClick={() => scroll('left')}
            className="hidden md:flex absolute left-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#181410]/90 hover:bg-[#FF5C00] text-white items-center justify-center border border-white/10 hover:border-[#FF5C00] shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-300 active:scale-95"
            aria-label="Scroll left"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
        )}

        {/* Scrollable Cards Container */}
        <div
          ref={scrollRef}
          onScroll={updateScrollState}
          className="flex gap-3 sm:gap-4 overflow-x-auto px-4 sm:px-8 md:px-16 lg:px-20 pb-4 pt-1 scrollbar-hide scroll-smooth"
          style={{ scrollbarWidth: 'none' }}
        >
          {historyItems?.map((item) => (
            <ContentCard
              key={item.content.id}
              content={item.content}
              progress={item.progress}
              size={size}
            />
          ))}
          {items?.map((item, i) => (
            <ContentCard
              key={item.id}
              content={item}
              rank={showRank ? i + 1 : undefined}
              size={size}
            />
          ))}
        </div>

        {/* Right Arrow Button */}
        {canScrollRight && (
          <button
            onClick={() => scroll('right')}
            className="hidden md:flex absolute right-4 top-1/2 -translate-y-1/2 z-30 w-11 h-11 rounded-full bg-[#181410]/90 hover:bg-[#FF5C00] text-white items-center justify-center border border-white/10 hover:border-[#FF5C00] shadow-[0_4px_20px_rgba(0,0,0,0.8)] backdrop-blur-md opacity-0 group-hover/row:opacity-100 transition-all duration-300 active:scale-95"
            aria-label="Scroll right"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        )}
      </div>
    </section>
  );
}

