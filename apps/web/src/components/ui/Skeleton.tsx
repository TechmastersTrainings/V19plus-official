import React from 'react';

interface SkeletonProps {
  className?: string;
  key?: any;
  [key: string]: any;
}

export function Skeleton({ className = '', ...props }: SkeletonProps) {
  return (
    <div
      className={`relative overflow-hidden bg-n-surface rounded ${className}`}
      {...props}
    >
      <div className="absolute inset-0 bg-shimmer-gradient animate-shimmer bg-[length:400%_100%]" />
    </div>
  );
}

export function ContentRowSkeleton() {
  return (
    <div className="mb-10">
      <div className="px-4 md:px-12 mb-3">
        <Skeleton className="h-5 w-40 rounded" />
      </div>
      <div className="flex gap-2 px-4 md:px-12 overflow-hidden">
        {Array.from({ length: 7 }).map((_, i) => (
          <Skeleton key={i} className="flex-shrink-0 w-36 md:w-44 aspect-[2/3] rounded-md" />
        ))}
      </div>
    </div>
  );
}

export function HeroBannerSkeleton() {
  return (
    <div className="relative h-[80vh] min-h-[560px]">
      <Skeleton className="absolute inset-0 rounded-none" />
      <div className="absolute bottom-16 left-12 space-y-4">
        <Skeleton className="h-12 w-96 rounded" />
        <Skeleton className="h-4 w-80 rounded" />
        <Skeleton className="h-4 w-64 rounded" />
        <div className="flex gap-3 mt-4">
          <Skeleton className="h-11 w-32 rounded" />
          <Skeleton className="h-11 w-36 rounded" />
        </div>
      </div>
    </div>
  );
}
