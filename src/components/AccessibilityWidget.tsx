/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import { Type, Plus, Minus, RotateCcw, GripVertical, HelpCircle, X, Sparkles } from 'lucide-react';

export default function AccessibilityWidget() {
  // 1. Accessibility preferences state loaded from persistent cache
  const [fontScale, setFontScale] = useState<number>(() => {
    const cached = localStorage.getItem('mmt_font_scale');
    return cached ? parseFloat(cached) : 1.0;
  });

  // UI state variables
  const [isOpen, setIsOpen] = useState<boolean>(false);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [isDragUnlocked, setIsDragUnlocked] = useState<boolean>(false);
  const [hasDragged, setHasDragged] = useState<boolean>(false);
  
  // Custom fixed position bounds
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    // Default initial coordinates centered/bottom-right
    const w = typeof window !== 'undefined' ? window.innerWidth : 1024;
    const h = typeof window !== 'undefined' ? window.innerHeight : 768;
    return { x: w - 340, y: h - 250 };
  });

  const containerRef = useRef<HTMLDivElement>(null);
  
  // Pointer/Touch gesture helper references
  const isPointerDownRef = useRef<boolean>(false);
  const isDragUnlockedRef = useRef<boolean>(false);
  const longPressTimerRef = useRef<any>(null);

  const pointerStartRef = useRef<{ x: number; y: number; posX: number; posY: number; timestamp: number }>({
    x: 0,
    y: 0,
    posX: 0,
    posY: 0,
    timestamp: 0,
  });

  // ==========================================
  // SYNC ACCESSIBILITY SETTINGS WITH THE DOM
  // ==========================================
  useEffect(() => {
    // 1. Store state variables in localStorage
    localStorage.setItem('mmt_font_scale', fontScale.toFixed(1));

    // 2. Set root CSS custom variable for modular text scaling
    // This updates .prose and .learning-content rules globally in real-time
    document.documentElement.style.setProperty('--learning-text-multiplier', fontScale.toString());
  }, [fontScale]);

  // Adjust widget position gracefully if window resizes so it stays in boundaries
  useEffect(() => {
    const handleResize = () => {
      setPosition((prev) => {
        const maxX = window.innerWidth - 320;
        const maxY = window.innerHeight - 200;
        return {
          x: Math.max(10, Math.min(maxX, prev.x)),
          y: Math.max(10, Math.min(maxY, prev.y))
        };
      });
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  // ==========================================
  // DRAGGER POINTER TRIGGERS & BOUNDS
  // ==========================================
  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;

    // For any button or input inside the expanded Panel, do NOT initiate absolute dragging
    if (isOpen) {
      if (target.closest('button') || target.closest('input')) {
        return;
      }

      // In open mode, we strictly drag using the top header (.drag-zone)
      if (!target.closest('.drag-zone')) {
        return;
      }
    }

    isPointerDownRef.current = true;
    isDragUnlockedRef.current = false;
    setIsDragUnlocked(false);
    setIsDragging(false);

    pointerStartRef.current = {
      x: e.clientX,
      y: e.clientY,
      posX: position.x,
      posY: position.y,
      timestamp: Date.now()
    };

    // Capture the pointer stream so we receive move events regardless of mouse leaving container
    e.currentTarget.setPointerCapture(e.pointerId);

    // Setup Hold to Drag Timer (350ms for premium fluid drag confirmation)
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
    }
    longPressTimerRef.current = setTimeout(() => {
      if (isPointerDownRef.current) {
        isDragUnlockedRef.current = true;
        setIsDragUnlocked(true);
        setIsDragging(true);
        setHasDragged(true);
        
        // Gentle haptic feedback if supported on modern devices
        if (typeof navigator !== 'undefined' && navigator.vibrate) {
          try {
            navigator.vibrate(20);
          } catch (_) {}
        }
      }
    }, 350);
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!isPointerDownRef.current) return;

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // If they have not unlocked drag mode yet, check if they are moving with speed
    if (!isDragUnlockedRef.current) {
      // If they moved significantly, cancel the hold timer because they are likely scrolling/swiping
      if (dist > 8) {
        if (longPressTimerRef.current) {
          clearTimeout(longPressTimerRef.current);
          longPressTimerRef.current = null;
        }
      }
      return;
    }

    // Active dragging coordinates:
    const maxW = isOpen ? 300 : 180;
    const maxH = isOpen ? 260 : 70;
    const maxX = window.innerWidth - maxW;
    const maxY = window.innerHeight - maxH;

    setPosition({
      x: Math.max(10, Math.min(maxX, pointerStartRef.current.posX + dx)),
      y: Math.max(10, Math.min(maxY, pointerStartRef.current.posY + dy))
    });
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = false;
    
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }

    const wasDragging = isDragUnlockedRef.current;
    
    setIsDragging(false);
    setIsDragUnlocked(false);
    isDragUnlockedRef.current = false;

    e.currentTarget.releasePointerCapture(e.pointerId);

    const dx = e.clientX - pointerStartRef.current.x;
    const dy = e.clientY - pointerStartRef.current.y;
    const dragDistance = Math.sqrt(dx * dx + dy * dy);
    const duration = Date.now() - pointerStartRef.current.timestamp;

    // Click threshold check: If they did NOT unlock drag mode (did not hold 350ms),
    // and didn't move far, handle as a standard discrete tap click action.
    if (!wasDragging && dragDistance < 10 && duration < 400) {
      if (!isOpen) {
        setIsOpen(true);
      }
    }
  };

  const handlePointerCancel = (e: React.PointerEvent<HTMLDivElement>) => {
    isPointerDownRef.current = false;
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    setIsDragging(false);
    setIsDragUnlocked(false);
    isDragUnlockedRef.current = false;
    e.currentTarget.releasePointerCapture(e.pointerId);
  };

  // ==========================================
  // ACCESSIBILITY LOGIC MUTATORS
  // ==========================================
  const handleIncreaseSize = () => {
    setFontScale((prev) => Math.min(1.6, prev + 0.1));
  };

  const handleDecreaseSize = () => {
    setFontScale((prev) => Math.max(0.8, prev - 0.1));
  };

  const handleResetAllScale = () => {
    setFontScale(1.0);
  };

  return (
    <>
      {/* DRAGGABLE FLOATING CONTROL COMPONENT CONTAINER */}
      <div
        id="accessibility-container-scaffold"
        ref={containerRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerCancel}
        style={{
          left: hasDragged ? `${position.x}px` : undefined,
          top: hasDragged ? `${position.y}px` : undefined,
        }}
        className={`fixed z-50 select-none touch-none transition-transform duration-200 ${
          !hasDragged ? 'bottom-6 right-6' : ''
        } ${isDragUnlocked ? 'scale-105 ring-4 ring-indigo-500/50 shadow-2xl' : ''}`}
      >
        {/* BUTTON TOGGLER CAPSULE (COLLAPSED STATE) */}
        {!isOpen && (
          <div className="relative group">
            <button
              id="btn-accessibility-fab"
              type="button"
              className={`flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-4 py-3 rounded-full shadow-lg border border-indigo-500 transition-all pointer-events-none ${
                isDragging ? 'cursor-grabbing bg-indigo-805' : 'cursor-grab'
              }`}
            >
              <Type className="w-4 h-4 shrink-0" />
              <div className="text-left flex flex-col">
                <span className="text-xs font-bold font-sans">Adjust Text Size</span>
                <span className="text-[8px] opacity-70 font-medium tracking-tight">Hold to drag</span>
              </div>
              <span className="w-5 h-5 flex items-center justify-center bg-indigo-500 rounded-full text-[10px] shrink-0 font-sans font-black">
                {(fontScale * 100).toFixed(0)}%
              </span>
            </button>
            
            {/* Quick mini assistance tooltip for learners */}
            <div className="absolute right-0 bottom-full mb-2 hidden group-hover:block bg-slate-900 text-white text-[9.5px] font-sans font-bold px-2 py-1 rounded shadow-md pointer-events-none whitespace-nowrap">
              Press & Hold to reposition
            </div>
          </div>
        )}

        {/* FULL ADJUSTMENT CONTROL CENTER PANEL (EXPANDED STATE) */}
        {isOpen && (
          <div
            id="accessibility-dashboard-panel"
            className="w-72 bg-white/95 backdrop-blur-md rounded-2xl border border-slate-200/90 flex flex-col overflow-hidden text-slate-800 shadow-2xl animate-scale-in"
          >
            {/* Header / Drag Zone Grip bar */}
            <div className={`drag-zone bg-slate-900 px-4 py-3.5 flex items-center justify-between text-white border-b border-slate-800 shrink-0 transition-colors ${
              isDragUnlocked ? 'bg-indigo-950 border-indigo-800' : ''
            }`}>
              <div className="flex items-center gap-2">
                <GripVertical className={`w-3.5 h-3.5 transition-colors ${isDragUnlocked ? 'text-indigo-400' : 'text-slate-400'}`} />
                <div className="text-left">
                  <h4 className="text-xs font-bold font-display tracking-tight flex items-center gap-1 font-sans">
                    Accessibility Menu <Sparkles className="w-3 h-3 text-indigo-400 fill-indigo-400/30 font-sans" />
                  </h4>
                  <span className="text-[9px] text-slate-400 font-mono font-medium block">Hold header to drag & move</span>
                </div>
              </div>
              <button
                id="btn-accessibility-close"
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  setIsOpen(false);
                }}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer flex items-center justify-center border-0 outline-none"
                aria-label="Minimize options"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Active Control Panels */}
            <div className="p-4 space-y-4">
              
              {/* Size Zoom Incrementor block */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-wider">Learning Text Size:</span>
                  <span className="text-xs font-black font-mono text-indigo-700 bg-indigo-50 border border-indigo-100 px-2 py-0.5 rounded-md font-sans">
                    {(fontScale * 100).toFixed(0)}%
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    id="btn-access-size-decrease"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDecreaseSize();
                    }}
                    disabled={fontScale <= 0.8}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200/90 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-slate-700 font-bold transition-all cursor-pointer text-xs font-sans"
                    title="Decrease font scale"
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>A-</span>
                  </button>
                  <button
                    id="btn-access-size-increase"
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleIncreaseSize();
                    }}
                    disabled={fontScale >= 1.6}
                    className="flex-1 inline-flex items-center justify-center gap-1 px-3 py-2.5 bg-slate-100 hover:bg-slate-200/90 disabled:opacity-40 disabled:cursor-not-allowed border border-slate-200 rounded-xl text-slate-700 font-bold transition-all cursor-pointer text-xs font-sans"
                    title="Increase font scale"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>A+</span>
                  </button>
                </div>

                <div className="text-[10px] text-slate-400 leading-normal flex items-start gap-1 pt-1">
                  <HelpCircle className="w-3.5 h-3.5 mt-0.5 shrink-0 text-slate-400" />
                  <span className="font-sans">Increases readability across curriculum guides, homework questions, quiz answers and textbook course notes.</span>
                </div>
              </div>

              {/* Reset Control triggers */}
              <div className="border-t border-slate-150 pt-3 flex items-center justify-between">
                <button
                  id="btn-access-reset-settings"
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleResetAllScale();
                  }}
                  className="inline-flex items-center gap-1 text-[10px] uppercase font-bold tracking-wide text-slate-400 hover:text-rose-600 cursor-pointer transition select-none font-sans"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Reset size</span>
                </button>
                <div className="flex gap-1 items-center font-sans">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block animate-pulse"></span>
                  <span className="text-[9px] font-mono text-slate-400">Settings Saved</span>
                </div>
              </div>

            </div>
          </div>
        )}
      </div>
    </>
  );
}
