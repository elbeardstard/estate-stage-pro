import React, { useState, useEffect, useRef, useCallback } from 'react';
import { MoveHorizontal, Maximize2, Split } from 'lucide-react';

interface ComparisonSliderProps {
  beforeImage: string;
  afterImage: string;
  className?: string;
}

export const ComparisonSlider: React.FC<ComparisonSliderProps> = ({ 
  beforeImage, 
  afterImage,
  className = ''
}) => {
  const [sliderPosition, setSliderPosition] = useState(50);
  const [isResizing, setIsResizing] = useState(false);
  const [viewMode, setViewMode] = useState<'split' | 'staged'>('split');
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMove = useCallback((clientX: number) => {
    if (!isResizing || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = Math.max(0, Math.min(clientX - rect.left, rect.width));
    setSliderPosition((x / rect.width) * 100);
  }, [isResizing]);

  const onMouseMove = useCallback((e: MouseEvent) => handleMove(e.clientX), [handleMove]);
  const onTouchMove = useCallback((e: TouchEvent) => handleMove(e.touches[0].clientX), [handleMove]);
  const onEnd = useCallback(() => setIsResizing(false), []);

  useEffect(() => {
    if (isResizing) {
      window.addEventListener('mousemove', onMouseMove);
      window.addEventListener('mouseup', onEnd);
      window.addEventListener('touchmove', onTouchMove);
      window.addEventListener('touchend', onEnd);
    }
    return () => {
      window.removeEventListener('mousemove', onMouseMove);
      window.removeEventListener('mouseup', onEnd);
      window.removeEventListener('touchmove', onTouchMove);
      window.removeEventListener('touchend', onEnd);
    };
  }, [isResizing, onMouseMove, onTouchMove, onEnd]);

  if (viewMode === 'staged') {
    return (
      <div className={`relative w-full h-full bg-white ${className} border-2 border-black`}>
        <button 
          onClick={() => setViewMode('split')}
          className="absolute top-4 right-4 z-30 bg-black text-white px-4 py-2 font-bold text-[10px] uppercase border-2 border-black shadow-[4px_4px_0px_rgba(0,0,0,0.2)] hover:shadow-none hover:translate-x-[2px] hover:translate-y-[2px]"
        >
          [ COMPARE_VIEW ]
        </button>
        <img src={afterImage} alt="Staged" className="w-full h-full object-contain" />
      </div>
    );
  }

  return (
    <div 
      className={`relative w-full h-full overflow-hidden select-none bg-white border-2 border-black ${className}`}
      ref={containerRef}
      onMouseDown={() => setIsResizing(true)}
    >
      {/* Background Layer: Original */}
      <div className="absolute inset-0 flex items-center justify-center grayscale contrast-125">
        <img src={beforeImage} alt="Original" className="max-w-full max-h-full object-contain pointer-events-none opacity-40" />
        <div className="absolute top-4 left-4 bg-white border-2 border-black px-2 py-1 text-[8px] font-black tracking-widest z-10">
          DATASET.ORIGINAL
        </div>
      </div>

      {/* Clipped Layer: Staged */}
      <div 
        className="absolute inset-0 overflow-hidden flex items-center justify-center pointer-events-none z-10"
        style={{ width: `${sliderPosition}%` }}
      >
        <div className="absolute inset-0 flex items-center justify-center" style={{ width: containerRef.current?.clientWidth || '100%' }}>
            <img 
              src={afterImage} 
              alt="Staged" 
              className="max-w-full max-h-full object-contain"
              style={{ width: containerRef.current?.clientWidth || '100%' }}
            />
        </div>
        <div className="absolute top-4 left-4 bg-black text-white px-2 py-1 text-[8px] font-black tracking-widest z-20 whitespace-nowrap border-2 border-white">
          MODEL.GENERATED
        </div>
      </div>

      {/* Slider Handle (Stark Line) */}
      <div 
        className="absolute top-0 bottom-0 w-[2px] bg-black z-40 pointer-events-none"
        style={{ left: `${sliderPosition}%` }}
      >
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-12 h-12 bg-white border-2 border-black flex items-center justify-center cursor-ew-resize pointer-events-auto shadow-[4px_4px_0px_#000] active:shadow-none active:translate-x-[2px] active:translate-y-[2px]"
          onMouseDown={() => setIsResizing(true)}
        >
          <div className="w-1 h-6 bg-black mx-1" />
          <div className="w-1 h-6 bg-black mx-1" />
        </div>
      </div>
    </div>
  );
};