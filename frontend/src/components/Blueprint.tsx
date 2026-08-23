'use client';
import React from 'react';
import { FileDown, Image } from 'lucide-react';

interface BlueprintProps {
  title: string;
  imageUrl: string;
  downloadUrl: string;
}

export default function Blueprint({ title, imageUrl, downloadUrl }: BlueprintProps) {
  return (
    <div className="blueprint-widget my-6 border border-slate-200 dark:border-slate-800 rounded-2xl overflow-hidden shadow-sm bg-white dark:bg-slate-950">
      <div className="p-4 bg-slate-900 text-white flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Image className="w-5 h-5 text-teal-400" />
          <span className="text-sm font-semibold tracking-wide">{title}</span>
        </div>
        <a
          href={downloadUrl}
          download
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-900 bg-teal-400 hover:bg-teal-300 rounded-xl transition-all duration-200"
        >
          <FileDown className="w-3.5 h-3.5" />
          Татах
        </a>
      </div>
      {imageUrl && (
        <div className="bg-slate-100 dark:bg-slate-900 flex justify-center items-center p-4 border-t border-slate-200 dark:border-slate-800">
          <img
            src={imageUrl}
            alt={title}
            className="max-h-72 object-contain rounded-lg border border-slate-200/60 dark:border-slate-800 shadow-sm"
          />
        </div>
      )}
    </div>
  );
}
