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
        <div className="flex items-end justify-between mb-3">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2 tracking-tight group-hover/row:text-[#FF8A00] transition-colors">
              <span className="w-1 h-4 rounded-full bg-[#FF5C00] shadow-[0_0_8px_#FF5C00]" />
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs text-[#8C8478] font-normal ml-3 mt-0.5">
                {subtitle}
              </p>
            )}
          </div>

          {seeAllHref ? (
            <Link
              href={seeAllHref}
              className="flex items-center gap-1 text-xs font-semibold text-[#A49C90] hover:text-[#FF5C00] transition-all group/link"
            >
              <span>Explore All</span>
              <ArrowRight className="w-3.5 h-3.5 transform group-hover/link:translate-x-0.5 transition-transform" />
            </Link>
          ) : (
            <button
              onClick={() => scroll('right')}
              className="hidden sm:flex items-center gap-1 text-xs font-semibold text-[#A49C90] hover:text-[#FF5C00] transition-colors"
            >
              <span>Scroll</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Row with Scroll Container & Gradient Action Arrows */}
        <div className="relative">
          {/* Left Arrow Button */}
          {canScrollLeft && (
            <button
              onClick={() => scroll('left')}
              className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl bg-[#090807]/90 hover:bg-[#FF5C00] text-white items-center justify-center border border-white/10 hover:border-[#FF5C00] shadow-lg backdrop-blur-xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 active:scale-95"
              aria-label="Scroll left"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {/* Scrollable Cards Container */}
          <div
            ref={scrollRef}
            onScroll={updateScrollState}
            className="flex gap-4 sm:gap-5 overflow-x-auto pb-4 pt-3 px-1 scrollbar-hide scroll-smooth"
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
              className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-30 w-10 h-10 rounded-xl bg-[#090807]/90 hover:bg-[#FF5C00] text-white items-center justify-center border border-white/10 hover:border-[#FF5C00] shadow-lg backdrop-blur-xl opacity-0 group-hover/row:opacity-100 transition-all duration-200 active:scale-95"
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
