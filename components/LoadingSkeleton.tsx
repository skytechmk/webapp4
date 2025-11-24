import React from 'react';

interface LoadingSkeletonProps {
  className?: string;
  height?: string;
  width?: string;
}

export const LoadingSkeleton: React.FC<LoadingSkeletonProps> = ({
  className = '',
  height = 'h-4',
  width = 'w-full'
}) => {
  return (
    <div
      className={`animate-pulse bg-slate-200 rounded ${height} ${width} ${className}`}
      style={{ animation: 'pulse 1.5s ease-in-out infinite' }}
    />
  );
};

export const GallerySkeleton: React.FC = () => {
  return (
    <div className="columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="break-inside-avoid bg-slate-100 rounded-2xl overflow-hidden shadow-sm animate-pulse">
          <div className="w-full h-48 bg-slate-200" />
          <div className="p-4 space-y-2">
            <LoadingSkeleton height="h-3" width="w-3/4" />
            <LoadingSkeleton height="h-3" width="w-1/2" />
          </div>
        </div>
      ))}
    </div>
  );
};

export const EventSkeleton: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200">
        <div className="flex items-center space-x-4 mb-4">
          <LoadingSkeleton height="h-16" width="h-16" className="rounded-2xl" />
          <div className="flex-1 space-y-2">
            <LoadingSkeleton height="h-6" width="w-1/3" />
            <LoadingSkeleton height="h-4" width="w-1/4" />
          </div>
        </div>
        <LoadingSkeleton height="h-20" width="w-full" />
      </div>
      <GallerySkeleton />
    </div>
  );
};