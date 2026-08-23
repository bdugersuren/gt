'use client';
import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface FlashcardProps {
  front: string;
  back: string;
}

export default function Flashcard({ front = '', back = '' }: FlashcardProps) {
  const [flipped, setFlipped] = useState(false);
  const [currentIndex, setCurrentIndex] = useState(0);

  const fronts = front.split('|').map((s) => s.trim());
  const backs = back.split('|').map((s) => s.trim());
  const totalCards = Math.min(fronts.length, backs.length);

  const handleNext = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev + 1) % totalCards);
    }, 150);
  };

  const handlePrev = (e: React.MouseEvent) => {
    e.stopPropagation();
    setFlipped(false);
    setTimeout(() => {
      setCurrentIndex((prev) => (prev - 1 + totalCards) % totalCards);
    }, 150);
  };

  const currentFront = fronts[currentIndex] || '';
  const currentBack = backs[currentIndex] || '';

  return (
    <div className="w-full max-w-sm my-6 mx-auto flex flex-col items-center gap-3">
      <div
        onClick={() => setFlipped(!flipped)}
        className="flashcard-container cursor-pointer perspective-1000 w-full h-48"
      >
        <div
          className={`relative w-full h-full text-center transition-transform duration-500 transform-style-3d ${
            flipped ? 'rotate-y-180' : ''
          }`}
        >
          {/* Front Side */}
          <div className="absolute inset-0 w-full h-full backface-hidden flex flex-col justify-center items-center p-6 bg-white dark:bg-slate-950 border-2 border-dashed border-teal-500 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-teal-600 dark:text-teal-400 mb-2 uppercase tracking-wide flex items-center gap-1">
              💡 Санах карт
            </span>
            <p className="text-slate-800 dark:text-slate-200 font-medium text-base px-2">{currentFront}</p>
            <span className="text-[10px] text-slate-400 mt-4">Эргүүлж харахын тулд дарна уу</span>
          </div>

          {/* Back Side (Flipped) */}
          <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180 flex flex-col justify-center items-center p-6 bg-teal-50/50 dark:bg-teal-950/20 border-2 border-teal-500 rounded-2xl shadow-sm">
            <span className="text-xs font-semibold text-teal-700 dark:text-teal-400 mb-2 uppercase tracking-wide">
              Хариулт
            </span>
            <p className="text-teal-950 dark:text-teal-200 font-semibold text-base px-2">{currentBack}</p>
          </div>
        </div>
      </div>

      {/* Navigation Controls for Multi-card Deck */}
      {totalCards > 1 && (
        <div className="flex items-center justify-between w-full px-4">
          <button
            onClick={handlePrev}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs font-bold text-slate-500">
            {currentIndex + 1} / {totalCards}
          </span>
          <button
            onClick={handleNext}
            className="p-1.5 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-400 border border-slate-200 dark:border-slate-800 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
}
