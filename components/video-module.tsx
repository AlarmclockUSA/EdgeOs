'use client';

import { ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';

interface VideoModuleProps {
  title: string;
  description: string;
  date: string;
  progress: number;
  videoWatched: boolean;
  worksheetCompleted: boolean;
  onWatch: () => void;
  onReview: () => void;
  onPrevious?: () => void;
  onNext?: () => void;
  thumbnailUrl?: string;
}

export function VideoModule({
  title,
  description,
  date,
  progress,
  videoWatched,
  worksheetCompleted,
  onWatch,
  onReview,
  onPrevious,
  onNext,
  thumbnailUrl = '/path/to/default/thumbnail.jpg'
}: VideoModuleProps) {
  return (
    <div>
      {/* Hero Section */}
      <div className="relative h-[600px] bg-gradient-to-r from-black/90 to-black/70">
        <img 
          src={thumbnailUrl} 
          alt={title}
          className="absolute inset-0 w-full h-full object-cover opacity-70"
        />
        
        {/* Content Overlay */}
        <div className="absolute inset-0 flex flex-col justify-end bg-gradient-to-t from-black/95 via-black/60 to-transparent">
          <div className="px-8 pb-8 relative">
            <div className="max-w-[50%]">
              <h1 className="text-4xl font-semibold text-white mb-3 break-words">{title}</h1>
              <p className="text-white/90 text-lg mb-6 line-clamp-3">{description}</p>
              
              {/* Progress Section */}
              <div className="mb-6 w-full">
                {/* Progress Bar */}
                <div className="relative h-2 bg-white/20 rounded-full overflow-hidden w-full mb-2">
                  <div 
                    className="absolute left-0 top-0 h-full bg-[#22C55E] transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>

                {/* Status Indicators */}
                <div className="flex gap-6 text-sm">
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      videoWatched ? "text-[#22C55E]" : "text-white/70"
                    )}>
                      Video Not Watched
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn(
                      worksheetCompleted ? "text-[#22C55E]" : "text-white/70"
                    )}>
                      Worksheet Completed
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-4">
                <button 
                  onClick={onWatch}
                  className="bg-white hover:bg-gray-100 text-black px-12 py-3 rounded-lg font-medium"
                >
                  Watch
                </button>
                <button 
                  onClick={onReview}
                  className="bg-black hover:bg-black/90 text-white px-12 py-3 rounded-lg font-medium"
                >
                  Review
                </button>
              </div>
            </div>

            {/* Navigation Buttons - Now positioned bottom right */}
            <div className="absolute bottom-8 right-8 flex gap-2">
              <button 
                onClick={onPrevious}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Previous video"
              >
                <ChevronLeft className="w-6 h-6" />
              </button>
              <button 
                onClick={onNext}
                className="p-2 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
                aria-label="Next video"
              >
                <ChevronRight className="w-6 h-6" />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 