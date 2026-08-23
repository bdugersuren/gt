'use client';
import React, { useState } from 'react';
import { CheckCircle2, XCircle } from 'lucide-react';

interface CheckpointProps {
  question: string;
  options: string; // Comma-separated options
  answer: string;  // Correct option
}

export default function Checkpoint({ question, options, answer }: CheckpointProps) {
  const choices = options.split(',').map((o) => o.trim());
  const [selected, setSelected] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState(false);

  const isCorrect = selected === answer;

  return (
    <div className="checkpoint-widget p-6 my-6 bg-slate-50 dark:bg-slate-900 border border-slate-200/60 dark:border-slate-800 rounded-2xl shadow-sm">
      <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200 mb-3 flex items-center gap-1.5">
        <span>📝</span> Өөрийгөө шалгах сорил
      </h4>
      <p className="text-slate-700 dark:text-slate-300 text-sm mb-4">{question}</p>
      
      <div className="space-y-2 mb-4">
        {choices.map((choice, i) => (
          <button
            key={i}
            onClick={() => !submitted && setSelected(choice)}
            disabled={submitted}
            className={`w-full text-left p-3 text-sm rounded-xl border transition-all duration-200 ${
              selected === choice
                ? 'border-teal-600 bg-teal-50/20 text-teal-700 dark:text-teal-400 font-medium'
                : 'border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-950 hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400'
            }`}
          >
            {choice}
          </button>
        ))}
      </div>

      {!submitted ? (
        <button
          onClick={() => selected && setSubmitted(true)}
          disabled={!selected}
          className="px-4 py-2 text-xs font-semibold text-white bg-slate-800 hover:bg-slate-900 dark:bg-slate-700 dark:hover:bg-slate-600 disabled:opacity-50 rounded-xl transition-colors duration-200"
        >
          Илгээх
        </button>
      ) : (
        <div className="space-y-3">
          <div
            className={`flex items-center gap-2 p-3 rounded-xl text-sm ${
              isCorrect
                ? 'bg-emerald-50 dark:bg-emerald-950/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900'
                : 'bg-rose-50 dark:bg-rose-950/20 text-rose-700 dark:text-rose-400 border border-rose-100 dark:border-rose-900'
            }`}
          >
            {isCorrect ? (
              <>
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0" />
                <span>Зөв байна! Та чадамжийн элементийг амжилттай ойлгосон байна.</span>
              </>
            ) : (
              <>
                <XCircle className="w-5 h-5 text-rose-600 shrink-0" />
                <span>Хараахан зөв биш байна. Дахин оролдоно уу.</span>
              </>
            )}
          </div>
          {!isCorrect && (
            <button
              onClick={() => {
                setSubmitted(false);
                setSelected(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 dark:text-slate-400 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-900 rounded-xl transition-all duration-200"
            >
              Дахин оролдох
            </button>
          )}
        </div>
      )}
    </div>
  );
}
